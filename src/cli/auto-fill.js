#!/usr/bin/env node
/**
 * MUKTI - Auto-Fill Remaining Unfilled Slots CLI
 * 
 * Fulfills all remaining pending slots with their authoritative words
 * to allow the event to reach 100% completion when some attendees are missing.
 * 
 * Usage:
 *   npm run auto-fill -- --by "Organizing Team"
 */

const fs = require('fs');
const path = require('path');
const EventConfigManager = require('../config/event-config');
const ReadmeBuilder = require('../reconstruction/readme-builder');

function parseArgs(args) {
  let by = null;
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--by' || args[i] === '-b') by = args[++i];
  }
  return { by };
}

function autoFill() {
  const { by } = parseArgs(process.argv.slice(2));
  const organizerName = by || 'Mukti Organizing Team';

  const manager = new EventConfigManager();
  const config = manager.loadConfig();
  const state = manager.loadState();

  const total = config.totalParticipants;
  const unfilledSlots = [];

  for (let i = 1; i <= total; i++) {
    const slotKey = String(i);
    const slotObj = state.slots[slotKey];
    const isFilled = slotObj && (slotObj.status === 'accepted' || slotObj.status === 'organizer-completed');
    if (!isFilled) {
      unfilledSlots.push(i);
    }
  }

  if (unfilledSlots.length === 0) {
    console.log('✅ All slots are already fulfilled! No auto-fill needed.');
    process.exit(0);
  }

  console.log(`Auto-filling ${unfilledSlots.length} unfilled slots by ${organizerName}...`);

  for (const slot of unfilledSlots) {
    const slotKey = String(slot);
    const assignment = config.slots.find(s => s.slot === slot);
    state.slots[slotKey] = {
      slot: slot,
      expectedWord: assignment.word,
      word: assignment.word,
      status: 'organizer-completed',
      prNumber: null,
      contributor: `[Organizer] ${organizerName}`,
      acceptedAt: new Date().toISOString(),
      completedBy: organizerName,
      attemptCount: 1,
      commitSha: null,
      errorDetails: null
    };
  }

  state.revealStatus = 'REVEALED';
  state.activityLog = state.activityLog || [];
  state.activityLog.push({
    timestamp: new Date().toISOString(),
    type: 'ORGANIZER_AUTO_FILL',
    filledCount: unfilledSlots.length,
    completedBy: organizerName
  });

  const updatedReadme = ReadmeBuilder.buildReadme(config, state);
  manager.saveState(state);
  fs.writeFileSync(path.join(manager.rootDir, 'README.md'), updatedReadme, 'utf8');

  console.log(`🎉 Successfully auto-filled ${unfilledSlots.length} slots!`);
  console.log(`Progress: 100% (${total}/${total} words revealed).`);
  console.log(`README updated with complete revealed secret sentence!`);
}

if (require.main === module) {
  autoFill();
}

module.exports = { autoFill };
