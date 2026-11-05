/**
 * MUKTI Test Suite: Validation Engine Tests
 * 
 * Verifies strict validation rules, security checks, and duplicate rejection.
 */

const assert = require('assert');
const PrValidator = require('../src/validation/pr-validator');
const ReadmeBuilder = require('../src/reconstruction/readme-builder');

function runValidationTests() {
  console.log('--- Running Validation Engine Tests ---');

  const eventConfig = {
    eventId: 'mukti-test',
    totalParticipants: 5,
    secretSentence: 'Open source brings people together',
    slots: [
      { slot: 1, word: 'Open', participantId: '001', githubUsername: 'alice' },
      { slot: 2, word: 'source', participantId: '002', githubUsername: 'bob' },
      { slot: 3, word: 'brings', participantId: '003', githubUsername: '*' },
      { slot: 4, word: 'people', participantId: '004', githubUsername: '*' },
      { slot: 5, word: 'together', participantId: '005', githubUsername: '*' }
    ]
  };

  const eventState = {
    eventId: 'mukti-test',
    acceptedCount: 1,
    totalSlots: 5,
    contributions: {
      '1': { slot: 1, word: 'Open', contributor: 'alice', prNumber: 1 }
    }
  };

  const baseReadme = ReadmeBuilder.buildReadme(eventConfig, { contributions: {} });

  // Test 1: Valid PR
  console.log('1. Testing valid PR (Bob for slot 2)...');
  const bobReadme = baseReadme.replace('2. 2', '2. source');
  const val1 = PrValidator.validate({
    changedFiles: ['README.md'],
    baseContent: baseReadme,
    prContent: bobReadme,
    author: 'bob',
    eventConfig,
    eventState
  });
  assert.strictEqual(val1.valid, true);
  assert.strictEqual(val1.slot, 2);
  assert.strictEqual(val1.word, 'source');
  console.log('   ✅ Valid contribution accepted.');

  // Test 2: Unrelated file modified (Requirement 8)
  console.log('2. Testing modification of unrelated files (Security violation)...');
  const val2 = PrValidator.validate({
    changedFiles: ['README.md', 'package.json'],
    baseContent: baseReadme,
    prContent: bobReadme,
    author: 'bob',
    eventConfig,
    eventState
  });
  assert.strictEqual(val2.valid, false);
  assert.ok(val2.error.includes('Security violation: Pull Request modifies unauthorized files'));
  console.log('   ✅ Modifications to unauthorized files rejected.');

  // Test 3: Word mismatch (Requirement 5)
  console.log('3. Testing invalid word assignment...');
  const wrongWordReadme = baseReadme.replace('2. 2', '2. wrongword');
  const val3 = PrValidator.validate({
    changedFiles: ['README.md'],
    baseContent: baseReadme,
    prContent: wrongWordReadme,
    author: 'bob',
    eventConfig,
    eventState
  });
  assert.strictEqual(val3.valid, false);
  assert.ok(val3.error.includes('Word mismatch for slot #2'));
  console.log('   ✅ Invalid word contribution rejected.');

  // Test 4: Modifying another participant's slot (Requirement 7)
  console.log("4. Testing unauthorized participant modifying another's slot...");
  const val4 = PrValidator.validate({
    changedFiles: ['README.md'],
    baseContent: baseReadme,
    prContent: bobReadme,
    author: 'mallory', // Bob's slot 2 is restricted to @bob
    eventConfig,
    eventState
  });
  assert.strictEqual(val4.valid, false);
  assert.ok(val4.error.includes('Participant identity mismatch'));
  console.log('   ✅ Unauthorized participant claiming restricted slot rejected.');

  // Test 5: Duplicate submission on already accepted slot (Requirement 6)
  console.log('5. Testing duplicate submission on already accepted slot...');
  const duplicateSlot1Readme = baseReadme.replace('1. 1', '1. Open');
  const val5 = PrValidator.validate({
    changedFiles: ['README.md'],
    baseContent: baseReadme,
    prContent: duplicateSlot1Readme,
    author: 'eve',
    eventConfig,
    eventState // slot 1 already accepted from alice
  });
  assert.strictEqual(val5.valid, false);
  assert.ok(val5.error.includes('Duplicate contribution: Slot #1 has already been accepted'));
  console.log('   ✅ Duplicate submission on claimed slot rejected.');

  // Test 6: Same PR processed twice / Idempotency (Requirement 9)
  console.log('6. Testing idempotent re-processing of the same PR...');
  const val6 = PrValidator.validate({
    changedFiles: ['README.md'],
    baseContent: baseReadme,
    prContent: duplicateSlot1Readme,
    author: 'alice', // Original author of slot 1
    eventConfig,
    eventState
  });
  assert.strictEqual(val6.valid, true);
  assert.strictEqual(val6.isAlreadyAccepted, true);
  console.log('   ✅ Idempotent re-processing handled cleanly.');

  // Test 7: Participant modifies multiple slots
  console.log('7. Testing multiple slot modifications...');
  const multiSlotReadme = baseReadme.replace('2. 2', '2. source').replace('3. 3', '3. brings');
  const val7 = PrValidator.validate({
    changedFiles: ['README.md'],
    baseContent: baseReadme,
    prContent: multiSlotReadme,
    author: 'bob',
    eventConfig,
    eventState
  });
  assert.strictEqual(val7.valid, false);
  assert.ok(val7.error.includes('Multiple slot modifications detected'));
  console.log('   ✅ Multiple slot changes rejected.');

  console.log('✅ All Validation Tests Passed!\n');
  return true;
}

if (require.main === module) {
  runValidationTests();
}

module.exports = { runValidationTests };

