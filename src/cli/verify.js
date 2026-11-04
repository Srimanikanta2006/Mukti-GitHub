#!/usr/bin/env node
/**
 * MUKTI - Event Verification & Status CLI
 * 
 * Inspects repository configuration, state, and README integrity.
 */

const EventConfigManager = require('../config/event-config');
const ReadmeBuilder = require('../reconstruction/readme-builder');
const fs = require('fs');
const path = require('path');

function verifyEvent() {
  console.log(`\n======================================================`);
  console.log(`🔍 MUKTI Event Verification & Progress Status`);
  console.log(`======================================================\n`);

  const manager = new EventConfigManager();

  if (!manager.hasExistingConfig()) {
    console.error('❌ No event configuration found. Run: npm run setup -- --participants <N>');
    process.exit(1);
  }

  const config = manager.loadConfig();
  const state = manager.loadState();

  console.log(`Event ID:            ${config.eventId}`);
  console.log(`Total Participants:  ${config.totalParticipants}`);
  console.log(`Accepted Words:      ${state.acceptedCount}/${config.totalParticipants}`);
  
  const pct = Math.round((state.acceptedCount / config.totalParticipants) * 100);
  const barLength = 25;
  const filledChars = Math.round((pct / 100) * barLength);
  const progressBar = '█'.repeat(filledChars) + '░'.repeat(barLength - filledChars);
  console.log(`Progress:            [${progressBar}] ${pct}%\n`);

  // Verify README
  const readmePath = path.join(manager.rootDir, 'README.md');
  if (!fs.existsSync(readmePath)) {
    console.error('❌ README.md missing from repository root!');
    process.exit(1);
  }

  const readmeContent = fs.readFileSync(readmePath, 'utf8');
  let extracted;
  try {
    extracted = ReadmeBuilder.extractSentence(readmeContent);
    console.log(`Current README Collaborative Sentence:\n"${extracted.sentence}"\n`);
  } catch (err) {
    console.error(`❌ README tag error: ${err.message}`);
    process.exit(1);
  }

  // Check remaining slots
  const remaining = [];
  for (let i = 1; i <= config.totalParticipants; i++) {
    if (!state.contributions || !state.contributions[String(i)]) {
      remaining.push(i);
    }
  }

  if (remaining.length === 0) {
    console.log(`🎉 ALL ${config.totalParticipants} SLOTS COMPLETED! Full message revealed.`);
  } else {
    console.log(`Remaining unfilled slots (${remaining.length}):`);
    console.log(remaining.slice(0, 20).map(s => `#${s}`).join(', ') + (remaining.length > 20 ? ` ... and ${remaining.length - 20} more` : ''));
  }

  console.log(`\n✅ Repository state is healthy and verified.`);
}

if (require.main === module) {
  verifyEvent();
}

module.exports = { verifyEvent };

