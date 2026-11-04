/**
 * MUKTI Test Suite: Dynamic Scaling Tests
 * 
 * Verifies dynamic scaling from 10 to 137 and 200 participants:
 * - Sentence generation with exact word counts
 * - Slot and assignment generation
 * - README template generation
 * - Configuration backup and restoration
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { generateSentence, validateSentence } = require('../src/cli/sentence-bank');
const EventConfigManager = require('../src/config/event-config');
const ReadmeBuilder = require('../src/reconstruction/readme-builder');

function runScaleTests() {
  console.log('--- Running Dynamic Scaling Tests (10 -> 137 -> 200) ---');

  const testDir = path.join(__dirname, '.tmp-scale');
  if (fs.existsSync(testDir)) {
    fs.rmSync(testDir, { recursive: true, force: true });
  }
  fs.mkdirSync(testDir, { recursive: true });

  const manager = new EventConfigManager(testDir);

  // 1. Initialize with 10 participants
  console.log('1. Configuring event for 10 participants (Day 1 test)...');
  const s10 = generateSentence(10);
  const words10 = validateSentence(s10, 10).words;
  const config10 = manager.buildConfig(10, words10, 'event-10');
  manager.saveConfig(config10);

  assert.strictEqual(manager.loadConfig().totalParticipants, 10);
  assert.strictEqual(manager.loadConfig().slots.length, 10);
  console.log('   ✅ Event configured for 10 participants.');

  // 2. Scale dynamically to 137 participants (Requirement 13)
  console.log('\n2. Scaling dynamically to 137 participants (Requirement 13)...');
  const s137 = generateSentence(137);
  // Validate sentence has exactly 137 words (Requirement 14)
  const val137 = validateSentence(s137, 137);
  assert.strictEqual(val137.valid, true, 'Generated sentence does not have 137 words');
  assert.strictEqual(val137.actualCount, 137);
  console.log(`   ✅ Sentence regenerated with exactly 137 words (Requirement 14).`);

  // Build and save 137 configuration with --force flag
  const config137 = manager.buildConfig(137, val137.words, 'event-137');
  manager.saveConfig(config137, { force: true });

  // 3. Verify all 137 assignments generated correctly (Requirement 15)
  console.log('3. Verifying all 137 assignments (Requirement 15)...');
  const loaded137 = manager.loadConfig();
  assert.strictEqual(loaded137.totalParticipants, 137);
  assert.strictEqual(loaded137.slots.length, 137);

  // Check every single slot from 1 to 137
  for (let i = 1; i <= 137; i++) {
    const slotObj = loaded137.slots[i - 1];
    assert.strictEqual(slotObj.slot, i);
    assert.strictEqual(typeof slotObj.word, 'string');
    assert.ok(slotObj.word.length > 0);
    assert.strictEqual(slotObj.participantId, String(i).padStart(3, '0'));
  }
  console.log('   ✅ All 137 slots & assignments correctly numbered, mapped, and typed.');

  // 4. Verify README rendered for 137 slots
  const initialReadme137 = ReadmeBuilder.buildReadme(loaded137, { contributions: {} });
  const sentenceLine137 = ReadmeBuilder.extractSentence(initialReadme137).sentence;
  const tokens137 = sentenceLine137.split(/\s+/).filter(Boolean);
  assert.strictEqual(tokens137.length, 137);
  assert.strictEqual(tokens137[0], '1');
  assert.strictEqual(tokens137[136], '137');
  console.log('   ✅ README generated with single line containing numbered slots 1 to 137.');

  // 5. Verify Backup archive of previous 10-person event was created
  const backups = fs.readdirSync(path.join(testDir, 'backups'));
  assert.ok(backups.length >= 1, 'Previous event configuration was not backed up');
  console.log(`   ✅ Previous event automatically archived in backups/ directory (${backups[0]}).`);

  // 6. Test scaling to 200 participants
  console.log('\n4. Scaling to 200 participants...');
  const s200 = generateSentence(200);
  const val200 = validateSentence(s200, 200);
  assert.strictEqual(val200.valid, true);
  assert.strictEqual(val200.actualCount, 200);
  const config200 = manager.buildConfig(200, val200.words, 'event-200');
  manager.saveConfig(config200, { force: true });
  assert.strictEqual(manager.loadConfig().totalParticipants, 200);
  console.log('   ✅ 200 participant event successfully configured.');

  // Clean up
  fs.rmSync(testDir, { recursive: true, force: true });
  console.log('✅ Dynamic Scaling Tests Passed!\n');
  return true;
}

if (require.main === module) {
  runScaleTests();
}

module.exports = { runScaleTests };
