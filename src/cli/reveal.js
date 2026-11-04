#!/usr/bin/env node
/**
 * MUKTI - Final Sentence Reveal & Event Report Generator CLI
 * 
 * Verifies all slots are complete, validates the final sentence verbatim,
 * unlocks the public README reveal, and generates FINAL_REPORT.md.
 * 
 * Usage:
 *   npm run reveal
 *   npm run reveal -- --partial
 */

const fs = require('fs');
const path = require('path');
const EventConfigManager = require('../config/event-config');
const ReadmeBuilder = require('../reconstruction/readme-builder');

function parseArgs(args) {
  return {
    partial: args.includes('--partial') || args.includes('-p')
  };
}

function runReveal() {
  const { partial } = parseArgs(process.argv.slice(2));

  console.log(`\n======================================================`);
  console.log(`🎊 MUKTI - FINAL SENTENCE REVEAL CEREMONY`);
  console.log(`======================================================\n`);

  const manager = new EventConfigManager();
  const config = manager.loadConfig();
  const state = manager.loadState();

  const total = config.totalParticipants;
  const accepted = state.acceptedCount || 0;
  const orgDone = state.organizerCompletedCount || 0;
  const filled = accepted + orgDone;

  const isFullyComplete = filled === total;

  if (!isFullyComplete && !partial) {
    console.error(`⚠️ Cannot reveal message: ${total - filled} slots are still pending (${filled}/${total} complete).`);
    console.error(`To reveal anyway with existing words, use: npm run reveal -- --partial`);
    console.error(`Or auto-fill missing slots first: npm run auto-fill\n`);
    process.exit(1);
  }

  // Set reveal status
  state.revealStatus = isFullyComplete ? 'REVEALED' : 'PARTIAL_REVEAL';

  const sentence = ReadmeBuilder.buildSentence(config, state);
  const updatedReadme = ReadmeBuilder.buildReadme(config, state);

  manager.saveState(state);
  fs.writeFileSync(path.join(manager.rootDir, 'README.md'), updatedReadme, 'utf8');

  // Generate FINAL_REPORT.md
  let report = `# MUKTI Event: Final Contribution Report 🏆\n\n`;
  report += `**Event ID:** \`${config.eventId}\`\n`;
  report += `**Completion Date:** \`${new Date().toISOString()}\`\n`;
  report += `**Status:** \`${state.revealStatus}\`\n\n`;
  report += `## 📜 Revealed Community Message\n\n`;
  report += `> **"${sentence}"**\n\n`;
  report += `## 📊 Contribution Metrics\n\n`;
  report += `- **Total Slots:** ${total}\n`;
  report += `- **Community Accepted:** ${accepted}\n`;
  report += `- **Organizer Completed:** ${orgDone}\n`;
  report += `- **Final Completion Rate:** ${((filled / total) * 100).toFixed(1)}%\n\n`;
  report += `## 🌟 Contributor Honor Roll\n\n`;
  report += `| Slot | Word | Contributor | Status | Time |\n`;
  report += `| :--- | :--- | :--- | :--- | :--- |\n`;

  for (let i = 1; i <= total; i++) {
    const s = state.slots[String(i)] || {};
    report += `| **#${i}** | \`${s.word || s.expectedWord || '?'}\` | @${s.contributor || 'unknown'} | ${s.status} | ${s.acceptedAt || '-'} |\n`;
  }

  const reportPath = path.join(manager.rootDir, 'FINAL_REPORT.md');
  fs.writeFileSync(reportPath, report, 'utf8');

  console.log(`🏆 SUCCESS: Message unlocked and set to ${state.revealStatus}!`);
  console.log(`\nRevealed Sentence:`);
  console.log(`"${sentence}"\n`);
  console.log(`✅ README.md updated with celebration banner.`);
  console.log(`✅ Comprehensive event report generated: FINAL_REPORT.md`);
  console.log(`\n======================================================`);
  console.log(`🎉 CONGRATULATIONS TO THE MUKTI COMMUNITY!`);
  console.log(`======================================================\n`);
}

if (require.main === module) {
  runReveal();
}

module.exports = { runReveal };
