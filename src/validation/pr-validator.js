/**
 * MUKTI - Contribution Validation Engine
 * 
 * Validates Pull Requests against authoritative event configuration
 * and accepted contribution state using canonical Tokenizer.
 */

const ReadmeBuilder = require('../reconstruction/readme-builder');
const Tokenizer = require('../utils/tokenizer');

class PrValidator {
  /**
   * Validate an incoming Pull Request.
   * 
   * @param {object} params
   * @param {string[]} params.changedFiles - List of filenames modified in the PR
   * @param {string} params.baseContent - README.md content from PR base commit
   * @param {string} params.prContent - README.md content from PR head commit
   * @param {string} params.author - GitHub username of contributor
   * @param {object} params.eventConfig - Authoritative event-config.json
   * @param {object} params.eventState - Authoritative event-state.json
   * @returns {{ valid: boolean, error?: string, slot?: number, word?: string, expectedWord?: string }}
   */
  static validate({ changedFiles, baseContent, prContent, author, eventConfig, eventState }) {
    // 1. Security Check: Unrelated files modified
    if (changedFiles && Array.isArray(changedFiles)) {
      const nonReadmeFiles = changedFiles.filter(f => f !== 'README.md');
      if (nonReadmeFiles.length > 0) {
        return {
          valid: false,
          error: `Security violation: Pull Request modifies unauthorized files (${nonReadmeFiles.join(', ')}). Participants are strictly permitted to modify ONLY README.md.`
        };
      }
      if (!changedFiles.includes('README.md')) {
        return {
          valid: false,
          error: `Pull Request does not modify README.md.`
        };
      }
    }

    // 2. Extract collaborative sentence tags and tokens
    let baseExtracted, prExtracted;
    try {
      baseExtracted = ReadmeBuilder.extractSentence(baseContent);
      prExtracted = ReadmeBuilder.extractSentence(prContent);
    } catch (err) {
      return {
        valid: false,
        error: `Malformed README formatting: ${err.message}`
      };
    }

    const baseTokens = baseExtracted.sentence.split(/\s+/).filter(Boolean);
    const prTokens = prExtracted.sentence.split(/\s+/).filter(Boolean);

    // 3. Token count validation
    if (prTokens.length !== eventConfig.totalParticipants) {
      return {
        valid: false,
        error: `Token count mismatch: Expected exactly ${eventConfig.totalParticipants} tokens in the sentence, but received ${prTokens.length}. Did you accidentally delete or insert extra words or spaces?`
      };
    }

    // 4. Detect slot differences compared to base commit
    const diffs = [];
    for (let i = 0; i < baseTokens.length; i++) {
      if (baseTokens[i] !== prTokens[i]) {
        diffs.push({
          slot: i + 1,
          oldValue: baseTokens[i],
          newValue: prTokens[i]
        });
      }
    }

    if (diffs.length === 0) {
      return {
        valid: false,
        error: 'No modifications detected in the collaborative sentence.'
      };
    }

    if (diffs.length > 1) {
      const slotsList = diffs.map(d => `#${d.slot}`).join(', ');
      return {
        valid: false,
        error: `Multiple slot modifications detected (${slotsList}). Each participant is authorized to modify ONLY their ONE assigned slot.`
      };
    }

    const diff = diffs[0];
    const slotNumber = diff.slot;

    // 5. Ensure participant replaced a numbered slot, not an already merged word in their base
    if (!/^\d+$/.test(diff.oldValue)) {
      return {
        valid: false,
        error: `Slot #${slotNumber} in your base branch already contained word "${diff.oldValue}". You cannot overwrite another participant's word.`
      };
    }

    // 6. Check authoritative assignments
    const assignment = eventConfig.slots.find(s => s.slot === slotNumber);
    if (!assignment) {
      return {
        valid: false,
        error: `Slot #${slotNumber} is out of bounds (1..${eventConfig.totalParticipants}).`
      };
    }

    // 7. Sanitize and validate word format using canonical Tokenizer
    const submittedWord = Tokenizer.cleanToken(diff.newValue);
    if (!Tokenizer.isValidWordFormat(submittedWord)) {
      return {
        valid: false,
        error: `Invalid word format "${diff.newValue}". Words must contain standard letters and punctuation only (no HTML, markdown, or scripts).`
      };
    }

    // 8. Word match validation using canonical Tokenizer
    if (!Tokenizer.wordsMatch(submittedWord, assignment.word)) {
      return {
        valid: false,
        error: `Word mismatch for slot #${slotNumber}: Expected word "${assignment.word}", but received "${submittedWord}".`
      };
    }

    // 9. Check if slot has already been accepted in authoritative event-state.json
    const slotKey = String(slotNumber);
    const existingSlot = (eventState.slots && eventState.slots[slotKey]) || null;
    const existingContribution = (eventState.contributions && eventState.contributions[slotKey]) || null;

    const isAlreadyFilled = (existingSlot && (existingSlot.status === 'accepted' || existingSlot.status === 'organizer-completed')) ||
                           (existingContribution && existingContribution.word);

    if (isAlreadyFilled) {
      const existingAuthor = (existingSlot && existingSlot.contributor) || (existingContribution && existingContribution.contributor);
      // Check if this is an idempotent re-run of the same PR/author
      if (author && existingAuthor && author.toLowerCase() === existingAuthor.toLowerCase()) {
        return {
          valid: true,
          isAlreadyAccepted: true,
          slot: slotNumber,
          word: assignment.word,
          expectedWord: assignment.word
        };
      }

      const existingWord = (existingSlot && (existingSlot.word || existingSlot.expectedWord)) || existingContribution.word;
      return {
        valid: false,
        error: `Duplicate contribution: Slot #${slotNumber} has already been accepted from @${existingAuthor || 'another participant'} ("${existingWord}").`
      };
    }

    // 10. Contributor authorization check (if assigned to specific GitHub handle)
    if (author && assignment.githubUsername && assignment.githubUsername !== '*') {
      if (author.toLowerCase() !== assignment.githubUsername.toLowerCase()) {
        return {
          valid: false,
          error: `Participant identity mismatch: Slot #${slotNumber} is reserved for @${assignment.githubUsername}, but submitted by @${author}.`
        };
      }
    }

    return {
      valid: true,
      isAlreadyAccepted: false,
      slot: slotNumber,
      word: assignment.word, // Canonical casing
      expectedWord: assignment.word
    };
  }
}

module.exports = PrValidator;
