/**
 * MUKTI - Contribution Processor
 * 
 * Executes the authoritative contribution transaction:
 * Validation -> Ledger State Update -> Deterministic Reconstruction -> Persistence.
 */

const fs = require('fs');
const path = require('path');
const PrValidator = require('../validation/pr-validator');
const ReadmeBuilder = require('../reconstruction/readme-builder');
const EventConfigManager = require('../config/event-config');

class ContributionProcessor {
  constructor(configManager = new EventConfigManager()) {
    this.configManager = configManager;
  }

  /**
   * Process an incoming Pull Request contribution.
   * 
   * @param {object} params
   * @param {number} params.prNumber - Pull Request number
   * @param {string} params.author - Contributor GitHub username
   * @param {string[]} params.changedFiles - List of changed filenames
   * @param {string} params.baseContent - README content at PR base commit
   * @param {string} params.prContent - README content at PR head commit
   * @param {string} [params.commitSha] - Head commit SHA
   * @returns {object} - Detailed result object
   */
  process({ prNumber, author, changedFiles, baseContent, prContent, commitSha = '' }) {
    const eventConfig = this.configManager.loadConfig();
    const eventState = this.configManager.loadState();

    // 1. Run strict validation
    const validation = PrValidator.validate({
      changedFiles,
      baseContent,
      prContent,
      author,
      eventConfig,
      eventState
    });

    if (!validation.valid) {
      // Record rejection in activity log
      eventState.activityLog = eventState.activityLog || [];
      eventState.activityLog.push({
        timestamp: new Date().toISOString(),
        type: 'CONTRIBUTION_REJECTED',
        prNumber: prNumber,
        author: author,
        error: validation.error
      });
      this.configManager.saveState(eventState);

      return {
        success: false,
        status: 'REJECTED',
        error: validation.error,
        commentBody: `❌ **Contribution Validation Failed**\n\n${validation.error}\n\n*Please correct the issue on your branch and push an update.*`
      };
    }

    // 2. Handle Idempotency (Same PR processed twice)
    if (validation.isAlreadyAccepted) {
      const sentence = ReadmeBuilder.buildSentence(eventConfig, eventState);
      return {
        success: true,
        status: 'ALREADY_ACCEPTED',
        slot: validation.slot,
        word: validation.word,
        alreadyProcessed: true,
        sentence: sentence,
        commentBody: `ℹ️ **Already Accepted**\n\nYour contribution for **Slot #${validation.slot}** (\`${validation.word}\`) has already been accepted and merged into \`main\`! 🎉`
      };
    }

    // 3. Apply state mutation to authoritative ledger
    const slotKey = String(validation.slot);
    if (!eventState.slots) eventState.slots = {};
    
    const prevAttempts = (eventState.slots[slotKey] && eventState.slots[slotKey].attemptCount) || 0;

    eventState.slots[slotKey] = {
      slot: validation.slot,
      expectedWord: validation.expectedWord,
      word: validation.word,
      status: 'accepted',
      prNumber: prNumber,
      contributor: author,
      acceptedAt: new Date().toISOString(),
      completedBy: null,
      attemptCount: prevAttempts + 1,
      commitSha: commitSha,
      errorDetails: null
    };

    // Log to activity log
    eventState.activityLog = eventState.activityLog || [];
    eventState.activityLog.push({
      timestamp: new Date().toISOString(),
      type: 'CONTRIBUTION_ACCEPTED',
      slot: validation.slot,
      word: validation.word,
      contributor: author,
      prNumber: prNumber
    });

    // Check if fully completed
    const filledCount = Object.values(eventState.slots).filter(s => s.status === 'accepted' || s.status === 'organizer-completed').length;
    if (filledCount === eventConfig.totalParticipants) {
      eventState.revealStatus = 'REVEALED';
      eventState.activityLog.push({
        timestamp: new Date().toISOString(),
        type: 'EVENT_COMPLETED',
        message: `All ${eventConfig.totalParticipants} slots have been completed! Secret sentence unlocked.`
      });
    }

    // 4. Deterministically reconstruct README
    const reconstructedReadme = ReadmeBuilder.buildReadme(eventConfig, eventState);
    const reconstructedSentence = ReadmeBuilder.buildSentence(eventConfig, eventState);

    // 5. Atomic persistence to disk
    this.configManager.saveState(eventState);
    const readmePath = path.join(this.configManager.rootDir, 'README.md');
    fs.writeFileSync(readmePath, reconstructedReadme, 'utf8');

    // 6. Generate progress metrics & PR feedback
    const total = eventConfig.totalParticipants;
    const filled = filledCount;
    const percent = Math.round((filled / total) * 100);
    const barLength = 20;
    const filledChars = Math.round((percent / 100) * barLength);
    const progressBar = '█'.repeat(filledChars) + '░'.repeat(barLength - filledChars);

    const isComplete = filled === total;

    const commentBody = `🎉 **Contribution Accepted @${author}!**\n\n` +
      `Your assigned word **"${validation.word}"** has been verified and deterministically merged into **Slot #${validation.slot}**!\n\n` +
      `### 📊 Secret Message Progress: ${filled}/${total} Words (${percent}%)\n` +
      `\`[${progressBar}]\`\n\n` +
      `> **${reconstructedSentence}**\n\n` +
      (isComplete ? `🏆 **CONGRATULATIONS TO THE ENTIRE COMMUNITY! All ${total} words have been revealed!** 🌟` : `Thank you for contributing to **MUKTI — One Contribution, One Community**! 🚀`);

    return {
      success: true,
      status: 'ACCEPTED',
      slot: validation.slot,
      word: validation.word,
      contributor: author,
      reconstructedSentence,
      reconstructedReadme,
      progress: {
        totalSlots: total,
        acceptedCount: filled,
        percentComplete: percent,
        isComplete: isComplete
      },
      commentBody
    };
  }
}

module.exports = ContributionProcessor;
