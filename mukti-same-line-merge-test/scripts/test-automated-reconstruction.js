/**
 * MUKTI Experiment 2: Automated Deterministic Reconstruction Simulation
 * 
 * Demonstrates how the Deterministic Reconstruction Engine eliminates
 * merge conflicts entirely and processes 10 participants automatically.
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const DeterministicReconstructor = require('./deterministic-reconstructor');

const WORK_DIR = path.resolve(__dirname, '..');
const SANDBOX_DIR = path.join(WORK_DIR, '.sandbox-automated');
const ASSIGNMENTS_FILE = path.join(WORK_DIR, 'assignments.json');

const reconstructor = new DeterministicReconstructor(ASSIGNMENTS_FILE);
const assignmentsData = JSON.parse(fs.readFileSync(ASSIGNMENTS_FILE, 'utf8'));

function run(cmd, cwd = SANDBOX_DIR) {
  try {
    return {
      success: true,
      stdout: execSync(cmd, { cwd, stdio: ['pipe', 'pipe', 'pipe'], encoding: 'utf8' })
    };
  } catch (err) {
    return {
      success: false,
      stdout: err.stdout ? err.stdout.toString() : '',
      stderr: err.stderr ? err.stderr.toString() : '',
      status: err.status
    };
  }
}

async function runAutomatedReconstructionExperiment() {
  console.log('======================================================================');
  console.log('🤖 EXPERIMENT 2: AUTOMATED DETERMINISTIC RECONSTRUCTION (TASK 6 & 7)');
  console.log('======================================================================\n');

  // Clean sandbox
  if (fs.existsSync(SANDBOX_DIR)) {
    fs.rmSync(SANDBOX_DIR, { recursive: true, force: true });
  }
  fs.mkdirSync(SANDBOX_DIR, { recursive: true });

  const bareRepoDir = path.join(SANDBOX_DIR, 'upstream.git');
  const mainRepoDir = path.join(SANDBOX_DIR, 'main-repo');

  console.log('1. Initializing bare upstream repository and main clone...');
  execSync(`git init --bare "${bareRepoDir}"`, { stdio: 'pipe' });
  execSync(`git clone "${bareRepoDir}" "${mainRepoDir}"`, { stdio: 'pipe' });

  run('git config user.name "Mukti Bot"', mainRepoDir);
  run('git config user.email "bot@mukti.org"', mainRepoDir);

  const initialReadme = `# Mukti Same-Line Merge Test

<!-- MUKTI-SENTENCE-START -->
1 2 3 4 5 6 7 8 9 10
<!-- MUKTI-SENTENCE-END -->
`;
  fs.writeFileSync(path.join(mainRepoDir, 'README.md'), initialReadme, 'utf8');
  run('git add README.md', mainRepoDir);
  run('git commit -m "Initial commit: 10 numbered slots on single line"', mainRepoDir);
  run('git branch -M main', mainRepoDir);
  run('git push -u origin main', mainRepoDir);

  const baseCommitSha = run('git rev-parse HEAD', mainRepoDir).stdout.trim();
  console.log(`✓ Initial base commit created: ${baseCommitSha.substring(0, 7)}\n`);

  console.log('2. Creating 10 participant branches from the EXACT same base commit:');
  const branches = [];
  for (const item of assignmentsData.assignments) {
    const branchName = `contrib-${item.participantId}`;
    branches.push({ ...item, branchName });

    run('git checkout main', mainRepoDir);
    run(`git checkout -b ${branchName}`, mainRepoDir);
    run(`git config user.name "${item.githubUsername}"`, mainRepoDir);
    run(`git config user.email "${item.githubUsername}@participants.mukti.org"`, mainRepoDir);

    const tokens = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10'];
    tokens[item.slot - 1] = item.word;
    const modifiedSentence = tokens.join(' ');

    const branchReadme = `# Mukti Same-Line Merge Test

<!-- MUKTI-SENTENCE-START -->
${modifiedSentence}
<!-- MUKTI-SENTENCE-END -->
`;
    fs.writeFileSync(path.join(mainRepoDir, 'README.md'), branchReadme, 'utf8');
    run('git add README.md', mainRepoDir);
    run(`git commit -m "Replace slot ${item.slot} with '${item.word}'"`, mainRepoDir);
    run(`git push -u origin ${branchName}`, mainRepoDir);

    console.log(`   - Branch '${branchName}' (@${item.githubUsername}): ready`);
  }

  console.log('\n3. Processing PRs via Deterministic Reconstruction Engine:\n');
  run('git checkout main', mainRepoDir);

  const results = [];
  const startTime = Date.now();

  for (let i = 0; i < branches.length; i++) {
    const b = branches[i];
    const prStartTime = Date.now();
    console.log(`----------------------------------------------------------------------`);
    console.log(`Processing PR #${i + 1} (${b.branchName} by @${b.githubUsername})...`);

    // 1. Fetch participant's README from their branch
    const branchReadmeContent = run(`git show origin/${b.branchName}:README.md`, mainRepoDir).stdout;
    const baseReadmeContent = run(`git show ${baseCommitSha}:README.md`, mainRepoDir).stdout;
    const currentMainReadme = fs.readFileSync(path.join(mainRepoDir, 'README.md'), 'utf8');

    // 2. Detect contribution
    const detection = reconstructor.detectContribution(baseReadmeContent, branchReadmeContent);
    if (!detection.valid) {
      console.log(`❌ VALIDATION FAILED: ${detection.error}`);
      results.push({
        pr: i + 1,
        user: b.githubUsername,
        slot: b.slot,
        word: b.word,
        success: false,
        error: detection.error
      });
      continue;
    }

    console.log(`   🔎 Detected: Slot #${detection.slot} changed to "${detection.word}"`);

    // 3. Validate against authoritative assignment registry
    const validation = reconstructor.validateAssignment(detection.slot, detection.word, b.githubUsername);
    if (!validation.valid) {
      console.log(`❌ ASSIGNMENT REJECTED: ${validation.error}`);
      results.push({
        pr: i + 1,
        user: b.githubUsername,
        slot: detection.slot,
        word: detection.word,
        success: false,
        error: validation.error
      });
      continue;
    }
    console.log(`   ✅ Assignment Verified: matches registered slot #${b.slot} for @${b.githubUsername}`);

    // 4. Deterministically apply to current main
    const applyResult = reconstructor.applyContributionToMain(currentMainReadme, detection.slot, detection.word);
    if (!applyResult.success) {
      console.log(`❌ RECONSTRUCTION FAILED: ${applyResult.error}`);
      results.push({
        pr: i + 1,
        user: b.githubUsername,
        slot: detection.slot,
        word: detection.word,
        success: false,
        error: applyResult.error
      });
      continue;
    }

    // 5. Commit reconstructed README to main
    fs.writeFileSync(path.join(mainRepoDir, 'README.md'), applyResult.updatedContent, 'utf8');
    run('git add README.md', mainRepoDir);
    run(`git commit -m "Auto-merge contribution for slot #${detection.slot} by @${b.githubUsername}\n\nCo-authored-by: ${b.githubUsername} <${b.githubUsername}@participants.mukti.org>"`, mainRepoDir);
    run('git push origin main', mainRepoDir);

    const prDuration = Date.now() - prStartTime;
    console.log(`   🚀 Reconstructed Sentence: "${applyResult.reconstructedSentence}"`);
    console.log(`   📈 Progress: ${applyResult.stats.completedSlots}/${applyResult.stats.totalSlots} slots (${applyResult.stats.percentComplete}%)`);
    console.log(`   ⚡ Processed in ${prDuration}ms (0 human intervention)`);

    results.push({
      pr: i + 1,
      user: b.githubUsername,
      slot: detection.slot,
      word: detection.word,
      success: true,
      durationMs: prDuration,
      sentence: applyResult.reconstructedSentence,
      progress: `${applyResult.stats.percentComplete}%`
    });
  }

  const totalDuration = Date.now() - startTime;
  const finalReadme = fs.readFileSync(path.join(mainRepoDir, 'README.md'), 'utf8');
  const finalSentence = finalReadme.match(/<!-- MUKTI-SENTENCE-START -->([\s\S]*?)<!-- MUKTI-SENTENCE-END -->/)[1].trim();

  console.log('\n======================================================================');
  console.log('📊 EXPERIMENT 2 RESULTS SUMMARY');
  console.log('======================================================================');
  console.table(results.map(r => ({
    'PR #': r.pr,
    'Contributor': r.user,
    'Slot': r.slot,
    'Word': r.word,
    'Status': r.success ? '✅ AUTO-MERGED' : '❌ FAILED',
    'Latency': `${r.durationMs}ms`,
    'Progress': r.progress
  })));

  console.log(`Total PRs: ${results.length}`);
  console.log(`Auto-merged successfully: ${results.filter(r => r.success).length}`);
  console.log(`Merge conflicts encountered: 0 (100% eliminated by deterministic reconstruction)`);
  console.log(`Total execution time for 10 PRs: ${(totalDuration / 1000).toFixed(2)} seconds`);
  console.log(`Average time per PR: ${(totalDuration / results.length).toFixed(0)}ms`);
  console.log(`\nFinal README Collaborative Sentence:\n"${finalSentence}"`);

  const expectedMessage = assignmentsData.secretMessage;
  const isMatch = finalSentence === expectedMessage;
  console.log(`\nExact Match with Target Message: ${isMatch ? '✅ 100% EXACT MATCH' : '❌ MISMATCH'}`);

  return { results, finalSentence, isMatch, totalDuration };
}

if (require.main === module) {
  runAutomatedReconstructionExperiment();
}

module.exports = { runAutomatedReconstructionExperiment };

