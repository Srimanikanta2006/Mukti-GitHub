/**
 * MUKTI Test Suite: Full 10-Participant Simulation Test
 * 
 * Simulates 10 participants creating branches from the EXACT same base commit,
 * modifying the same line in README.md, and processing their PRs in shuffled order.
 * 
 * Verifies Requirements 1, 2, 3, 4:
 * 1. All 10 valid participants independently submit PRs from the same original commit.
 * 2. Multiple PRs modify the same README line.
 * 3. PRs are processed in different orders.
 * 4. All valid words are preserved.
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const EventConfigManager = require('../src/config/event-config');
const ContributionProcessor = require('../src/processing/contribution-processor');
const ReadmeBuilder = require('../src/reconstruction/readme-builder');

function runFullSimulation() {
  console.log('--- Running Full 10-Participant End-to-End Simulation ---');

  const testDir = path.join(__dirname, '.tmp-simulation');
  if (fs.existsSync(testDir)) {
    fs.rmSync(testDir, { recursive: true, force: true });
  }
  fs.mkdirSync(testDir, { recursive: true });

  const manager = new EventConfigManager(testDir);
  const targetWords = [
    'Open', 'source', 'brings', 'people', 'together',
    'to', 'build', 'remarkable', 'community', 'solutions'
  ];
  const targetSentence = targetWords.join(' ');

  const config = manager.buildConfig(10, targetWords, 'sim-event-10');
  manager.saveConfig(config);

  const processor = new ContributionProcessor(manager);

  // Initial README (Root Base Commit)
  const baseReadme = ReadmeBuilder.buildReadme(config, { contributions: {} });
  fs.writeFileSync(path.join(testDir, 'README.md'), baseReadme, 'utf8');

  console.log('1. Base commit initialized with single line:');
  console.log(`   "${ReadmeBuilder.extractSentence(baseReadme).sentence}"`);

  // 2. 10 participants independently create branches from the exact same base commit
  console.log('\n2. 10 participants branching from the EXACT same base commit:');
  const participants = [
    { slot: 1, word: 'Open', user: 'alice' },
    { slot: 2, word: 'source', user: 'bob' },
    { slot: 3, word: 'brings', user: 'charlie' },
    { slot: 4, word: 'people', user: 'david' },
    { slot: 5, word: 'together', user: 'emma' },
    { slot: 6, word: 'to', user: 'frank' },
    { slot: 7, word: 'build', user: 'grace' },
    { slot: 8, word: 'remarkable', user: 'heidi' },
    { slot: 9, word: 'community', user: 'ivan' },
    { slot: 10, word: 'solutions', user: 'judy' }
  ];

  const participantBranches = {};
  for (const p of participants) {
    const tokens = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10'];
    tokens[p.slot - 1] = p.word;
    const modifiedSentence = tokens.join(' ');
    
    // Each participant's README branched from base
    participantBranches[p.slot] = baseReadme.replace('1 2 3 4 5 6 7 8 9 10', modifiedSentence);
    console.log(`   - Participant #${p.slot} (@${p.user}): Replaced ${p.slot} -> "${p.word}"`);
  }

  // 3. Process PRs in NON-SEQUENTIAL / SHUFFLED order (Requirement 3)
  // Order: Slot 7, 2, 9, 1, 4, 3, 10, 5, 8, 6
  const arrivalOrder = [7, 2, 9, 1, 4, 3, 10, 5, 8, 6];
  console.log(`\n3. Processing PRs in non-sequential arrival order: [${arrivalOrder.join(', ')}]:`);

  let step = 1;
  for (const slotNum of arrivalOrder) {
    const p = participants.find(part => part.slot === slotNum);
    const prContent = participantBranches[slotNum];

    const result = processor.process({
      prNumber: 200 + step,
      author: p.user,
      changedFiles: ['README.md'],
      baseContent: baseReadme,
      prContent: prContent
    });

    assert.strictEqual(result.success, true, `Processing failed for slot ${slotNum}`);
    console.log(`   [Step ${step}/10] PR for slot #${p.slot} (@${p.user}) -> "${result.reconstructedSentence}" (${result.progress.percentComplete}%)`);
    step++;
  }

  // 4. Verify Final State & README (Requirement 4)
  console.log('\n4. Verifying final reconstructed README and state:');
  const finalState = manager.loadState();
  assert.strictEqual(finalState.acceptedCount, 10);

  const finalReadmeContent = fs.readFileSync(path.join(testDir, 'README.md'), 'utf8');
  const finalSentence = ReadmeBuilder.extractSentence(finalReadmeContent).sentence;

  console.log(`\nFinal Sentence:\n"${finalSentence}"`);
  assert.strictEqual(finalSentence, targetSentence, 'Final sentence does not match target message verbatim');
  console.log('✅ Final sentence matches target message 100% verbatim!');

  // Verify all 10 words exist in correct order
  for (let i = 0; i < 10; i++) {
    const wordInSentence = finalSentence.split(/\s+/)[i];
    assert.strictEqual(wordInSentence, targetWords[i]);
  }
  console.log('✅ All 10 words preserved in their exact designated positions without conflict!');

  // Clean up
  fs.rmSync(testDir, { recursive: true, force: true });
  console.log('\n✅ Full 10-Participant Simulation Passed Successfully!\n');
  return true;
}

if (require.main === module) {
  runFullSimulation();
}

module.exports = { runFullSimulation };
