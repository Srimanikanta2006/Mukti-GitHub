/**
 * MUKTI - Deterministic README Reconstruction Engine
 * 
 * Reconstructs a single-line collaborative sentence by deterministically applying
 * participant word contributions without relying on Git's standard 3-way line merge.
 */

const fs = require('fs');
const path = require('path');

const SENTENCE_START_TAG = '<!-- MUKTI-SENTENCE-START -->';
const SENTENCE_END_TAG = '<!-- MUKTI-SENTENCE-END -->';

class DeterministicReconstructor {
  constructor(assignmentsFilePath) {
    if (assignmentsFilePath && fs.existsSync(assignmentsFilePath)) {
      this.assignmentsData = JSON.parse(fs.readFileSync(assignmentsFilePath, 'utf8'));
    } else {
      this.assignmentsData = { totalSlots: 10, assignments: [] };
    }
  }

  /**
   * Extract the sentence string and line index from README markdown content.
   */
  extractSentence(content) {
    const lines = content.split(/\r?\n/);
    const startIndex = lines.findIndex(l => l.includes(SENTENCE_START_TAG));
    const endIndex = lines.findIndex(l => l.includes(SENTENCE_END_TAG));

    if (startIndex !== -1 && endIndex !== -1 && endIndex > startIndex + 1) {
      const sentenceLine = lines[startIndex + 1].trim();
      return {
        sentence: sentenceLine,
        lineIndex: startIndex + 1,
        lines: lines,
        hasTags: true
      };
    }

    // Fallback: search for line containing sequential numbers starting with '1'
    for (let i = 0; i < lines.length; i++) {
      const trimmed = lines[i].trim();
      if (/^1\s+2\s+3\b/.test(trimmed) || /^\b\w+\s+2\s+3\b/.test(trimmed)) {
        return {
          sentence: trimmed,
          lineIndex: i,
          lines: lines,
          hasTags: false
        };
      }
    }

    throw new Error('Could not locate the Mukti collaborative sentence line in README.');
  }

  /**
   * Parse sentence string into token array.
   */
  parseTokens(sentence) {
    return sentence.trim().split(/\s+/).filter(Boolean);
  }

  /**
   * Identify which slot a participant modified by comparing base content to participant content.
   */
  detectContribution(baseContent, participantContent) {
    const baseExtracted = this.extractSentence(baseContent);
    const partExtracted = this.extractSentence(participantContent);

    const baseTokens = this.parseTokens(baseExtracted.sentence);
    const partTokens = this.parseTokens(partExtracted.sentence);

    if (baseTokens.length !== partTokens.length) {
      return {
        valid: false,
        error: `Token count mismatch: base has ${baseTokens.length} tokens, but PR has ${partTokens.length} tokens. Did participant delete or insert extra words?`
      };
    }

    const diffs = [];
    for (let i = 0; i < baseTokens.length; i++) {
      if (baseTokens[i] !== partTokens[i]) {
        diffs.push({
          slot: i + 1,
          expectedSlotNumber: String(i + 1),
          oldValue: baseTokens[i],
          newValue: partTokens[i]
        });
      }
    }

    if (diffs.length === 0) {
      return {
        valid: false,
        error: 'No changes detected in the collaborative sentence.'
      };
    }

    if (diffs.length > 1) {
      return {
        valid: false,
        error: `Multiple slot modifications detected (${diffs.map(d => `#${d.slot}`).join(', ')}). Participants may only change their ONE assigned slot.`
      };
    }

    const diff = diffs[0];

    // Ensure the participant was modifying a number slot, not overwriting someone else's already merged word
    if (!/^\d+$/.test(diff.oldValue)) {
      return {
        valid: false,
        error: `Slot #${diff.slot} originally contained word "${diff.oldValue}", not a number. You cannot overwrite another participant's word.`
      };
    }

    // Verify sanitized word: alphanumeric and basic punctuation only, no markdown injection
    const cleanedWord = diff.newValue.trim().replace(/^['"`]+|['"`]+$/g, '');
    if (!/^[a-zA-Z0-9\-_.,!?'’]+$/.test(cleanedWord)) {
      return {
        valid: false,
        error: `Invalid word format "${diff.newValue}". Words must contain standard letters and punctuation only.`
      };
    }

    return {
      valid: true,
      slot: diff.slot,
      word: cleanedWord,
      oldValue: diff.oldValue
    };
  }

  /**
   * Validate detected contribution against the authoritative assignments registry.
   */
  validateAssignment(slot, word, usernameOrId = null) {
    const assignment = this.assignmentsData.assignments.find(a => a.slot === slot);
    if (!assignment) {
      return {
        valid: false,
        error: `Slot #${slot} does not exist in assignments registry.`
      };
    }

    // Check participant identity first if provided
    if (usernameOrId) {
      const matchHandle = assignment.githubUsername && 
        assignment.githubUsername.toLowerCase() === usernameOrId.toLowerCase();
      const matchId = assignment.participantId && 
        assignment.participantId.toLowerCase() === usernameOrId.toLowerCase();

      if (!matchHandle && !matchId) {
        return {
          valid: false,
          error: `Participant identity mismatch: slot #${slot} is assigned to @${assignment.githubUsername} (ID ${assignment.participantId}), not "${usernameOrId}".`
        };
      }
    }

    // Check word match (case-insensitive)
    if (assignment.word.toLowerCase() !== word.toLowerCase()) {
      return {
        valid: false,
        error: `Word mismatch for slot #${slot}: expected "${assignment.word}", but received "${word}".`
      };
    }

    return {
      valid: true,
      assignment: assignment
    };
  }

  /**
   * Reconstruct current README on main by safely applying the participant's contribution.
   */
  applyContributionToMain(currentMainContent, slot, word) {
    const extracted = this.extractSentence(currentMainContent);
    const tokens = this.parseTokens(extracted.sentence);

    const slotIndex = slot - 1;
    if (slotIndex < 0 || slotIndex >= tokens.length) {
      return {
        success: false,
        error: `Slot #${slot} is out of bounds (1..${tokens.length}).`
      };
    }

    // Check if slot is already filled on main
    const currentVal = tokens[slotIndex];
    if (!/^\d+$/.test(currentVal)) {
      // Slot is already filled by a word
      if (currentVal.toLowerCase() === word.toLowerCase()) {
        return {
          success: true,
          alreadyApplied: true,
          updatedContent: currentMainContent,
          reconstructedSentence: extracted.sentence,
          stats: this.calculateStats(tokens)
        };
      }
      return {
        success: false,
        error: `Slot #${slot} is already occupied on main by "${currentVal}". Cannot overwrite.`
      };
    }

    // Replace slot with word
    tokens[slotIndex] = word;
    const newSentence = tokens.join(' ');

    const newLines = [...extracted.lines];
    newLines[extracted.lineIndex] = newSentence;

    const updatedContent = newLines.join('\n');
    const stats = this.calculateStats(tokens);

    return {
      success: true,
      alreadyApplied: false,
      updatedContent: updatedContent,
      reconstructedSentence: newSentence,
      stats: stats
    };
  }

  /**
   * Calculate message progress stats.
   */
  calculateStats(tokens) {
    const total = tokens.length;
    let completed = 0;
    for (const t of tokens) {
      if (!/^\d+$/.test(t)) {
        completed++;
      }
    }
    const percent = Math.round((completed / total) * 100);
    return {
      totalSlots: total,
      completedSlots: completed,
      remainingSlots: total - completed,
      percentComplete: percent,
      isFullyComplete: completed === total
    };
  }
}

module.exports = DeterministicReconstructor;
