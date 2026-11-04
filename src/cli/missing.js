#!/usr/bin/env node
/**
 * MUKTI - Missing Participants & Pending Slots CLI
 * 
 * Inspects authoritative state to identify unfilled slots,
 * pending count, and completion metrics.
 * 
 * Usage:
 *   npm run missing
 */

const EventConfigManager = require('../config/event-config');

function checkMissing() {
  console.log(`\n======================================================`);
  console.log(`🔎 MUKTI - Missing Participants & Unfilled Slots`);
  console.log(`======================================================\n`);

  const manager = new EventConfigManager();
  if (!manager.hasExistingConfig()) {
    console.error('❌ No event configuration found.');
    process.exit(1);
  }

  const config = manager.loadConfig();
  const state = manager.loadState();

  const total = config.totalParticipants;
  const accepted = state.acceptedCount || 0;
  const organizerDone = state.organizerCompletedCount || 0;
  const filled = accepted + organizerDone;
  const missingCount = total - filled;
  const pct = Math.round((filled / total) * 100);

  console.log(`Event:                 ${config.eventId}`);
  console.log(`Total Expected Slots:  ${total}`);
  console.log(`Accepted Contributions: ${accepted}`);
  console.log(`Organizer-Completed:   ${organizerDone}`);
  console.log(`Missing / Pending:     ${missingCount}`);
  console.log(`Completion Rate:       ${pct}%\n`);

  const pendingSlots = [];
  for (let i = 1; i <= total; i++) {
    const slotObj = state.slots && state.slots[String(i)];
    const isFilled = slotObj && (slotObj.status === 'accepted' || slotObj.status === 'organizer-completed');
    if (!isFilled) {
      const assignment = config.slots.find(s => s.slot === i);
      pendingSlots.push({
        slot: i,
        expectedWord: assignment ? assignment.word : '?',
        participantId: assignment ? assignment.participantId : '?'
      });
    }
  }

  if (pendingSlots.length === 0) {
    console.log(`🎉 ALL ${total} SLOTS COMPLETED! No missing participants.`);
  } else {
    console.log(`Unfilled Slots Detail (${pendingSlots.length} remaining):`);
    console.log(`------------------------------------------------------`);
    console.log(`Slot # | Expected Word   | Assigned Participant ID`);
    console.log(`------------------------------------------------------`);
    for (const p of pendingSlots) {
      console.log(`${String(p.slot).padEnd(6)} | ${p.expectedWord.padEnd(15)} | ${p.participantId}`);
    }
    console.log(`------------------------------------------------------\n`);
    console.log(`To complete a specific slot:`);
    console.log(`  npm run complete-slot -- --slot <N> --by "Your Name"\n`);
    console.log(`To auto-fill all remaining unfilled slots before revealing:`);
    console.log(`  npm run auto-fill -- --by "Your Name"\n`);
  }
}

if (require.main === module) {
  checkMissing();
}

module.exports = { checkMissing };
