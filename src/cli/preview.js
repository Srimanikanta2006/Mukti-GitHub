#!/usr/bin/env node
/**
 * MUKTI - Organizer Event Preview CLI
 * 
 * Securely displays event parameters, complete secret sentence,
 * full assignment directory, initial vs expected final README,
 * and system health verification.
 * 
 * Usage:
 *   npm run preview
 */

const EventConfigManager = require('../config/event-config');
const ReadmeBuilder = require('../reconstruction/readme-builder');
const Tokenizer = require('../utils/tokenizer');

function runPreview() {
  console.log(`\n======================================================`);
  console.log(`🔒 MUKTI - ORGANIZER CONFIDENTIAL PREVIEW`);
  console.log(`======================================================\n`);

  const manager = new EventConfigManager();
  if (!manager.hasExistingConfig()) {
    console.error('❌ No event configuration found. Run: npm run setup -- --participants <N>');
    process.exit(1);
  }

  const config = manager.loadConfig();
  const state = manager.loadState();

  const words = Tokenizer.tokenize(config.secretSentence);
  const isValidLength = words.length === config.totalParticipants;

  console.log(`1. EVENT SPECIFICATION`);
  console.log(`   - Event ID:              ${config.eventId}`);
  console.log(`   - Total Participant Slots: ${config.totalParticipants}`);
  console.log(`   - Total Word Count:       ${words.length}`);
  console.log(`   - Configuration Health:   ${isValidLength ? '✅ VALID (1:1 slot-to-word match)' : '❌ INVALID'}`);
  console.log(`   - Current Reveal Status:  ${state.revealStatus || 'LOCKED'}`);

  console.log(`\n2. COMPLETE SECRET SENTENCE (ORGANIZER ONLY)`);
  console.log(`   "${config.secretSentence}"`);

  console.log(`\n3. COMPLETE PARTICIPANT ASSIGNMENTS MATRIX`);
  console.log(`   --------------------------------------------------------------`);
  console.log(`   Slot # | Word            | Participant ID | Authorized Handle`);
  console.log(`   --------------------------------------------------------------`);
  for (const s of config.slots) {
    const slotStr = String(s.slot).padEnd(6);
    const wordStr = s.word.padEnd(15);
    const partStr = s.participantId.padEnd(14);
    const userStr = s.githubUsername || '*';
    console.log(`   ${slotStr} | ${wordStr} | ${partStr} | ${userStr}`);
  }
  console.log(`   --------------------------------------------------------------`);

  console.log(`\n4. INITIAL README SENTENCE LINE (PUBLIC PARTICIPANT VIEW)`);
  const initialSentence = ReadmeBuilder.buildSentence(config, { slots: {}, contributions: {} });
  console.log(`   "${initialSentence}"`);

  console.log(`\n5. EXPECTED FINAL REVEALED README SENTENCE LINE`);
  // Mock full state
  const mockCompletedState = {
    totalSlots: config.totalParticipants,
    acceptedCount: config.totalParticipants,
    slots: {}
  };
  for (const s of config.slots) {
    mockCompletedState.slots[String(s.slot)] = {
      slot: s.slot,
      word: s.word,
      status: 'accepted'
    };
  }
  const finalSentence = ReadmeBuilder.buildSentence(config, mockCompletedState);
  console.log(`   "${finalSentence}"`);

  console.log(`\n⚠️ SECURITY & SECRECY DISCLOSURE:`);
  console.log(`   Note: In public GitHub repositories, files committed to 'main' (such as event-config.json)`);
  console.log(`   are publicly viewable by tech-savvy users inspecting commit history or repository files.`);
  console.log(`   To maintain 100% secrecy before the reveal, keep the repository PRIVATE during setup,`);
  console.log(`   or configure GitHub Actions repository secrets for sensitive phrases before flipping to public.`);

  console.log(`\n======================================================`);
  console.log(`✅ Organizer Preview Complete.`);
  console.log(`======================================================\n`);
}

if (require.main === module) {
  runPreview();
}

module.exports = { runPreview };
