/**
 * MUKTI - Deterministic README Reconstruction Engine
 * 
 * Generates the README deterministically from the authoritative event configuration
 * and accepted contribution state ledger.
 */

const Tokenizer = require('../utils/tokenizer');

const SENTENCE_START_TAG = '<!-- MUKTI-SENTENCE-START -->';
const SENTENCE_END_TAG = '<!-- MUKTI-SENTENCE-END -->';

class ReadmeBuilder {
  /**
   * Reconstruct the single-line collaborative sentence from config and state.
   * @param {object} eventConfig - Authoritative event configuration
   * @param {object} eventState - Authoritative accepted contributions ledger
   * @returns {string} - Deterministically generated sentence line
   */
  static buildSentence(eventConfig, eventState) {
    const totalSlots = eventConfig.totalParticipants;
    const tokens = [];

    for (let slot = 1; slot <= totalSlots; slot++) {
      const slotKey = String(slot);
      const slotObj = (eventState.slots && eventState.slots[slotKey]) || null;
      const legacyContrib = (eventState.contributions && eventState.contributions[slotKey]) || null;

      const isFilled = (slotObj && (slotObj.status === 'accepted' || slotObj.status === 'organizer-completed')) ||
                       (legacyContrib && legacyContrib.word);

      if (isFilled) {
        const word = (slotObj && (slotObj.word || slotObj.expectedWord)) || legacyContrib.word;
        tokens.push(Tokenizer.cleanToken(word));
      } else {
        tokens.push(String(slot));
      }
    }

    return tokens.join(' ');
  }

  /**
   * Build complete README.md text from config and state.
   */
  static buildReadme(eventConfig, eventState) {
    const sentence = this.buildSentence(eventConfig, eventState);
    const total = eventConfig.totalParticipants;
    const acceptedCount = (eventState.acceptedCount || 0) + (eventState.organizerCompletedCount || 0);
    const percent = Math.round((acceptedCount / total) * 100);

    const barLength = 20;
    const filledChars = Math.round((percent / 100) * barLength);
    const progressBar = '█'.repeat(filledChars) + '░'.repeat(barLength - filledChars);

    const isRevealed = eventState.revealStatus === 'REVEALED' || (acceptedCount === total && percent === 100);

    let revealSection = '';
    if (isRevealed) {
      revealSection = `
> [!NOTE]
> ### 🏆 THE SECRET SENTENCE HAS BEEN REVEALED!
> **"${eventConfig.secretSentence}"**
> 
> *Congratulations to all ${total} contributors who built this together!* 🎉
`;
    }

    return `# Mukti Git & Open Source Contribution Workshop 🚀

Welcome to the **MUKTI — One Contribution, One Community** interactive open-source challenge!

This repository is a live, collaborative canvas for learning Git and open-source contribution workflows.

---

## 🎯 The Secret Sentence Challenge

Below is our community message where each word is represented by a numbered slot.

Each participant is assigned a specific number (and a secret word by the organizers). When you submit a Pull Request replacing your assigned number with your word, the sentence will be automatically verified and revealed in real time!
${revealSection}
---

## 📜 The Secret Sentence

${SENTENCE_START_TAG}
${sentence}
${SENTENCE_END_TAG}

---

## 📊 Live Progress: ${acceptedCount}/${total} Words Revealed (${percent}%)

\`[${progressBar}]\`

*Status: **${eventState.revealStatus || 'LOCKED'}** | Last updated: ${eventState.lastUpdated || new Date().toISOString()}*

---

## 🛠️ How to Contribute

1. **Find your assigned slot:** Check with the organizers or find your assigned number in the [Participants Directory](PARTICIPANTS.md).
2. **Fork this repository:** Click the **Fork** button at the top-right of this page.
3. **Clone your fork:**
   \`\`\`bash
   git clone https://github.com/<your-username>/Mukti-GitHub.git
   cd Mukti-GitHub
   \`\`\`
4. **Find your assigned line:** Open \`README.md\`, find your assigned number line under *The Secret Sentence* above (e.g. \`1. 1\`).
5. **Replace only your number:** Change your line to your assigned word (e.g. \`1. Open\`). Leave all other lines and numbers untouched!
6. **Commit and push:**
   \`\`\`bash
   git add README.md
   git commit -m "Add MUKTI contribution #<your-slot-number>"
   git push origin main
   \`\`\`
7. **Open a Pull Request:** Go to your fork on GitHub and click **Compare & pull request**.
8. **Automated verification:** The Mukti Bot will automatically validate your submission, merge your word, update the sentence, and comment with live progress! 🎉
`;
  }

  /**
   * Extract the sentence string and line index from markdown content.
   */
  static extractSentence(content) {
    if (!content) throw new Error('README content is empty');
    const lines = content.split(/\r?\n/);
    const startIndex = lines.findIndex(l => l.includes(SENTENCE_START_TAG));
    const endIndex = lines.findIndex(l => l.includes(SENTENCE_END_TAG));

    if (startIndex !== -1 && endIndex !== -1 && endIndex > startIndex + 1) {
      const sentenceText = lines.slice(startIndex + 1, endIndex).join('\n').trim();
      return {
        sentence: sentenceText,
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

    throw new Error('Could not locate the Mukti collaborative sentence tags in README.');
  }

  /**
   * Generate PARTICIPANTS.md markdown directory for event organizers and attendees.
   */
  static buildParticipantsGuide(eventConfig) {
    let md = `# MUKTI Event: Participant Word Assignments Directory\n\n`;
    md += `**Event ID:** \`${eventConfig.eventId}\`\n`;
    md += `**Total Participants:** \`${eventConfig.totalParticipants}\`\n\n`;
    md += `> [!IMPORTANT]\n`;
    md += `> Each participant should replace **ONLY** their assigned slot number in \`README.md\` with their designated word.\n\n`;
    md += `| Slot # | Participant ID | Assigned Word | GitHub Username |\n`;
    md += `| :--- | :--- | :--- | :--- |\n`;

    for (const s of eventConfig.slots) {
      const user = s.githubUsername === '*' ? '*(Open to any attendee)*' : `@${s.githubUsername}`;
      md += `| **${s.slot}** | \`${s.participantId}\` | **${s.word}** | ${user} |\n`;
    }

    return md;
  }
}

module.exports = ReadmeBuilder;
