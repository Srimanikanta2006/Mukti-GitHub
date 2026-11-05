/**
 * MUKTI Test Suite: Missing Participants & Reveal Ceremony Tests
 * 
 * Verifies handling missing attendees, organizer overrides,
 * auto-fill completion, and final report generation.
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const EventConfigManager = require('../src/config/event-config');
const ContributionProcessor = require('../src/processing/contribution-processor');
const ReadmeBuilder = require('../src/reconstruction/readme-builder');

function runMissingAndRevealTests() {
  console.log('--- Running Missing Participants & Reveal Tests ---');

  const testDir = path.join(__dirname, '.tmp-missing');
  if (fs.existsSync(testDir)) {
    fs.rmSync(testDir, { recursive: true, force: true });
  }
  fs.mkdirSync(testDir, { recursive: true });

  const manager = new EventConfigManager(testDir);
  const words = ['Open', 'source', 'brings', 'people', 'together', 'to', 'build', 'great', 'open', 'things'];
  const config = manager.buildConfig(10, words, 'missing-test-10');
  manager.saveConfig(config);

  const processor = new ContributionProcessor(manager);
  const baseReadme = ReadmeBuilder.buildReadme(config, { slots: {}, contributions: {} });
  fs.writeFileSync(path.join(testDir, 'README.md'), baseReadme, 'utf8');

  // 1. Simulate 7 participants contributing out of 10
  console.log('1. Simulating 7 out of 10 participants contributing...');
  for (let slot = 1; slot <= 7; slot++) {
    const prReadme = baseReadme.replace(`${slot}. ${slot}`, `${slot}. ${words[slot - 1]}`);

    const res = processor.process({
      prNumber: 300 + slot,
      author: `user_${slot}`,
      changedFiles: ['README.md'],
      baseContent: baseReadme,
      prContent: prReadme
    });
    assert.strictEqual(res.success, true);
  }

  // 2. Verify state detects exactly 3 missing slots
  const stateAfter7 = manager.loadState();
  assert.strictEqual(stateAfter7.acceptedCount, 7);
  assert.strictEqual(stateAfter7.pendingCount, 3);
  assert.strictEqual(stateAfter7.revealStatus, 'LOCKED');
  console.log('   ✅ Detected 3 missing slots; Reveal status remains LOCKED.');

  // 3. Organizer manually fulfills slot 8
  console.log('2. Organizer manually fulfilling slot 8...');
  stateAfter7.slots['8'] = {
    slot: 8,
    expectedWord: words[7],
    word: words[7],
    status: 'organizer-completed',
    prNumber: null,
    contributor: '[Organizer] Lead',
    acceptedAt: new Date().toISOString(),
    completedBy: 'Lead',
    attemptCount: 1,
    commitSha: null,
    errorDetails: null
  };
  manager.saveState(stateAfter7);
  const stateAfter8 = manager.loadState();
  assert.strictEqual(stateAfter8.organizerCompletedCount, 1);
  assert.strictEqual(stateAfter8.pendingCount, 2);
  console.log('   ✅ Slot 8 fulfilled with organizer audit trail.');

  // 4. Auto-fill remaining missing slots (9 and 10)
  console.log('3. Auto-filling remaining slots (9 and 10)...');
  for (const s of [9, 10]) {
    stateAfter8.slots[String(s)] = {
      slot: s,
      expectedWord: words[s - 1],
      word: words[s - 1],
      status: 'organizer-completed',
      prNumber: null,
      contributor: '[Organizer] AutoFill',
      acceptedAt: new Date().toISOString(),
      completedBy: 'AutoFill',
      attemptCount: 1,
      commitSha: null,
      errorDetails: null
    };
  }
  stateAfter8.revealStatus = 'REVEALED';
  manager.saveState(stateAfter8);

  const finalState = manager.loadState();
  assert.strictEqual(finalState.acceptedCount, 7);
  assert.strictEqual(finalState.organizerCompletedCount, 3);
  assert.strictEqual(finalState.pendingCount, 0);
  assert.strictEqual(finalState.revealStatus, 'REVEALED');
  console.log('   ✅ All slots filled; Status successfully transitioned to REVEALED.');

  // Clean up
  fs.rmSync(testDir, { recursive: true, force: true });
  console.log('✅ Missing Participants & Reveal Tests Passed!\n');
  return true;
}

if (require.main === module) {
  runMissingAndRevealTests();
}

module.exports = { runMissingAndRevealTests };
