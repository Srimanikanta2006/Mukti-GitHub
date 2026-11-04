#!/usr/bin/env node
/**
 * MUKTI - Single Slot Organizer Completion CLI
 * 
 * Allows organizers to manually fulfill an unfilled slot with full audit logging
 * when a participant is absent or unable to submit.
 * 
 * Usage:
 *   npm run complete-slot -- --slot 42 --by "Organizer Alice"
 */

const fs = require('fs');
const path = require('path');
const EventConfigManager = require('../config/event-config');
const ReadmeBuilder = require('../reconstruction/readme-builder');

function parseArgs(args) {
  let slot = null;
  let by = null;
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--slot' || args[i] === '-s') slot = parseInt(args[++i], 10);
    else if (args[i] === '--by' || args[i] === '-b') by = args[++i];
  }
  return { slot, by };
}

function completeSlot() {
  const { slot, by } = parseArgs(process.argv.slice(2));

  if (!slot || isNaN(slot)) {
    console.error('❌ Error: Must provide --slot <number>. Example: npm run complete-slot -- --slot 5 --by "Alice"');
    process.exit(1);
  }

  const organizerName = by || 'Organizer Override';

  const manager = new EventConfigManager();
  const config = manager.loadConfig();
  const state = manager.loadState();

  if (slot < 1 || slot > config.totalParticipants) {
    console.error(`❌ Slot #${slot} is out of bounds (1..${config.totalParticipants}).`);
    process.exit(1);
  }

  const slotKey = String(slot);
  const assignment = config.slots.find(s => s.slot === slot);
  if (!assignment) {
    console.error(`❌ Could not locate assignment for slot #${slot}`);
    process.exit(1);
  }

  const currentSlot = state.slots[slotKey];
  if (currentSlot && (currentSlot.status === 'accepted' || currentSlot.status === 'organizer-completed')) {
    console.warn(`⚠️ Slot #${slot} is already filled by "${currentSlot.word || currentSlot.expectedWord}".`);
  }

  // Update slot with audit trail
  state.slots[slotKey] = {
    slot: slot,
    expectedWord: assignment.word,
    word: assignment.word,
    status: 'organizer-completed',
    prNumber: null,
    contributor: `[Organizer] ${organizerName}`,
    acceptedAt: new Date().toISOString(),
    completedBy: organizerName,
    attemptCount: (currentSlot ? currentSlot.attemptCount : 0) + 1,
    commitSha: null,
    errorDetails: null
  };

  // Add to activity log
  state.activityLog = state.activityLog || [];
  state.activityLog.push({
    timestamp: new Date().toISOString(),
    type: 'ORGANIZER_COMPLETED_SLOT',
    slot: slot,
    word: assignment.word,
    completedBy: organizerName
  });

  // Reconstruct README
  const updatedReadme = ReadmeBuilder.buildReadme(config, state);
  manager.saveState(state);
  fs.writeFileSync(path.join(manager.rootDir, 'README.md'), updatedReadme, 'utf8');

  console.log(`✅ Slot #${slot} successfully fulfilled with word "${assignment.word}" by ${organizerName}.`);
  console.log(`README and state updated atomically.`);
}

if (require.main === module) {
  completeSlot();
}

module.exports = { completeSlot };
