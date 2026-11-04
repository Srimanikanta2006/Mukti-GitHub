/**
 * MUKTI - Deterministic README Reconstruction Engine
 * 
 * Generates the README deterministically from the authoritative event configuration
 * and accepted contribution state ledger.
 */

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
      const contribution = eventState.contributions && eventState.contributions[String(slot)];
      if (contribution && contribution.word) {
        tokens.push(contribution.word);
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
    const acceptedCount = Object.keys(eventState.contributions || {}).length;
    const percent = Math.round((acceptedCount / total) * 100);

    const barLength = 20;
    const filledChars = Math.round((percent / 100) * barLength);
    const progressBar = '█'.repeat(filledChars) + '░'.repeat(barLength - filledChars);

    return `# Mukti Git & Open Source Contribution Workshop 🚀

Welcome to the **MUKTI — One Contribution, One Community** interactive open-source challenge!

This repository is a live, collaborative canvas for learning Git and open-source contribution workflows.

---

## 🎯 The Secret Sentence Challenge

Below is our community message where each word is represented by a numbered slot.

Each participant is assigned a specific number (and a secret word by the organizers). When you submit a Pull Request replacing your assigned number with your word, the sentence will be automatically verified and revealed in real time!

---

## 📜 The Secret Sentence

${SENTENCE_START_TAG}
${sentence}
${SENTENCE_END_TAG}

---

## 📊 Live Progress: ${acceptedCount}/${total} Words Revealed (${percent}%)

\`[${progressBar}]\`

*Last updated: ${eventState.lastUpdated || new Date().toISOString()}*

---

## 🛠️ How to Contribute

1. **Find your assigned slot:** Check with the organizers or find your assigned number in the [Participants Directory](PARTICIPANTS.md).
2. **Fork this repository:** Click the **Fork** button at the top-right of this page.
3. **Clone your fork:**
   \`\`\`bash
   git clone https://github.com/<your-username>/Mukti-GitHub.git
   cd Mukti-GitHub
   \`\`\`
4. **Create your contribution branch:**
   \`\`\`bash
   git checkout -b contrib-<your-slot-number>
   \`\`\`
5. **Make your edit:** Open \`README.md\`, find your assigned number in the single sentence above, and replace **ONLY** that number with your assigned word. Do not modify any other numbers or files!
6. **Commit and push:**
   \`\`\`bash
   git add README.md
   git commit -m "Replace slot <your-slot-number> with assigned word"
   git push origin contrib-<your-slot-number>
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
      return {
        sentence: lines[startIndex + 1].trim(),
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
