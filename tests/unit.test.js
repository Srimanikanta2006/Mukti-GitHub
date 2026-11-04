/**
 * MUKTI Test Suite: Unit Tests
 * 
 * Verifies Sentence Bank, Config Manager, and Readme Builder components.
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { generateSentence, validateSentence } = require('../src/cli/sentence-bank');
const EventConfigManager = require('../src/config/event-config');
const ReadmeBuilder = require('../src/reconstruction/readme-builder');

function runUnitTests() {
  console.log('--- Running Unit Tests ---');

  // Test 1: Sentence Bank Generation & Validation
  console.log('1. Testing Sentence Bank generation for various lengths...');
  for (const n of [10, 20, 50, 100, 137, 200]) {
    const s = generateSentence(n);
    const v = validateSentence(s, n);
    assert.strictEqual(v.valid, true, `Generated sentence for ${n} words failed validation`);
    assert.strictEqual(v.actualCount, n, `Expected ${n} words, got ${v.actualCount}`);
  }
  console.log('   ✅ All target word counts generated and validated with exact lengths.');

  // Test 2: Custom Sentence Validation
  console.log('2. Testing custom sentence validation...');
  const validSentence = "Open source brings people together to build remarkable community solutions";
  const valRes = validateSentence(validSentence, 10);
  assert.strictEqual(valRes.valid, true);

  const invalidRes = validateSentence(validSentence, 15);
  assert.strictEqual(invalidRes.valid, false);
  assert.ok(invalidRes.error.includes('Word count mismatch'));
  console.log('   ✅ Word count validation accurately detects mismatches.');

  // Test 3: ReadmeBuilder sentence and template rendering
  console.log('3. Testing ReadmeBuilder deterministic rendering...');
  const testConfig = {
    eventId: 'test-event',
    totalParticipants: 5,
    secretSentence: 'Alpha Beta Gamma Delta Epsilon',
    slots: [
      { slot: 1, word: 'Alpha', participantId: '001', githubUsername: '*' },
      { slot: 2, word: 'Beta', participantId: '002', githubUsername: '*' },
      { slot: 3, word: 'Gamma', participantId: '003', githubUsername: '*' },
      { slot: 4, word: 'Delta', participantId: '004', githubUsername: '*' },
      { slot: 5, word: 'Epsilon', participantId: '005', githubUsername: '*' }
    ]
  };

  const testState = {
    eventId: 'test-event',
    acceptedCount: 2,
    totalSlots: 5,
    contributions: {
      '1': { slot: 1, word: 'Alpha', contributor: 'user1' },
      '4': { slot: 4, word: 'Delta', contributor: 'user4' }
    }
  };

  const reconstructedSentence = ReadmeBuilder.buildSentence(testConfig, testState);
  assert.strictEqual(reconstructedSentence, 'Alpha 2 3 Delta 5');
  console.log(`   ✅ Sentence reconstructed deterministically: "${reconstructedSentence}"`);

  const fullReadme = ReadmeBuilder.buildReadme(testConfig, testState);
  const extracted = ReadmeBuilder.extractSentence(fullReadme);
  assert.strictEqual(extracted.sentence, 'Alpha 2 3 Delta 5');
  console.log('   ✅ Full README generated and extracted with intact sentence tags.');

  console.log('✅ Unit Tests Passed!\n');
  return true;
}

if (require.main === module) {
  runUnitTests();
}

module.exports = { runUnitTests };

