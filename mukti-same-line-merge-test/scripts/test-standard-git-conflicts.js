/**
 * MUKTI Experiment 1: Standard Git Merge Behavior Simulation
 * 
 * Tests what happens when 10 participants branch from the same base commit
 * and modify different words on the SAME LINE in README.md.
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const WORK_DIR = path.resolve(__dirname, '..');
const SANDBOX_DIR = path.join(WORK_DIR, '.sandbox-standard');
const ASSIGNMENTS_FILE = path.join(WORK_DIR, 'assignments.json');

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

async function runStandardGitExperiment() {
  console.log('======================================================================');
  console.log('🧪 EXPERIMENT 1: STANDARD GIT MERGE CONFLICT BEHAVIOR (TASK 4 & 5)');
  console.log('======================================================================\n');

  // Clean sandbox
  if (fs.existsSync(SANDBOX_DIR)) {
    fs.rmSync(SANDBOX_DIR, { recursive: true, force: true });
  }
  fs.mkdirSync(SANDBOX_DIR, { recursive: true });

  const bareRepoDir = path.join(SANDBOX_DIR, 'upstream.git');
  const mainRepoDir = path.join(SANDBOX_DIR, 'main-repo');

  console.log('1. Setting up bare upstream repository and main clone...');
  execSync(`git init --bare "${bareRepoDir}"`, { stdio: 'pipe' });
  execSync(`git clone "${bareRepoDir}" "${mainRepoDir}"`, { stdio: 'pipe' });

  // Configure author
  run('git config user.name "Mukti Organizer"', mainRepoDir);
  run('git config user.email "organizer@mukti.org"', mainRepoDir);

  // Initial README with line: "1 2 3 4 5 6 7 8 9 10"
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

  console.log('2. Simulating 10 participants creating branches from the EXACT same base commit:');
  const branches = [];

  for (const item of assignmentsData.assignments) {
    const branchName = `contrib-${item.participantId}`;
    branches.push({ ...item, branchName });

    // Switch to base commit
    run(`git checkout main`, mainRepoDir);
    run(`git checkout -b ${branchName}`, mainRepoDir);
    run(`git config user.name "${item.githubUsername}"`, mainRepoDir);
    run(`git config user.email "${item.githubUsername}@participants.mukti.org"`, mainRepoDir);

    // Modify ONLY assigned slot
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

    console.log(`   - Branch '${branchName}' (@${item.githubUsername}): replaced ${item.slot} -> "${item.word}"`);
  }

  console.log('\n3. Starting sequential merge attempts into main (simulating PR merges):\n');
  run('git checkout main', mainRepoDir);
  run('git config user.name "Mukti Organizer"', mainRepoDir);
  run('git config user.email "organizer@mukti.org"', mainRepoDir);

  const results = [];

  for (let i = 0; i < branches.length; i++) {
    const b = branches[i];
    console.log(`----------------------------------------------------------------------`);
    console.log(`Merging PR #${i + 1} (${b.branchName} by @${b.githubUsername}, slot #${b.slot} -> "${b.word}")...`);

    const mergeRes = run(`git merge --no-ff -m "Merge PR #${i + 1} from ${b.branchName}" origin/${b.branchName}`, mainRepoDir);

    if (mergeRes.success) {
      console.log(`✅ MERGE SUCCESSFUL: PR #${i + 1} merged cleanly without conflict.`);
      results.push({
        pr: i + 1,
        branch: b.branchName,
        user: b.githubUsername,
        slot: b.slot,
        word: b.word,
        conflict: false,
        resolutionTimeSec: 0,
        notes: 'Merged cleanly (first PR)'
      });
    } else {
      console.log(`❌ MERGE CONFLICT DETECTED! PR #${i + 1} cannot be merged automatically.`);
      console.log(`   Standard Git output:`);
      console.log(`   ${mergeRes.stdout.trim() || mergeRes.stderr.trim()}`);

      // Read conflicting README.md to display conflict markers
      const conflictFile = fs.readFileSync(path.join(mainRepoDir, 'README.md'), 'utf8');
      const conflictMarkers = conflictFile.match(/<<<<<<< HEAD[\s\S]*?>>>>>>> [^\n]+/);
      if (conflictMarkers) {
        console.log('\n   [Conflict Markers in README.md]:');
        console.log(conflictMarkers[0].split('\n').map(l => '   | ' + l).join('\n'));
      }

      // Simulate Manual Resolution:
      // An organizer opens the file, inspects both sides, preserves previously merged words + adds new word
      console.log('\n   🔧 Performing MANUAL resolution (as an organizer would):');
      const currentHeadTokens = conflictFile
        .substring(conflictFile.indexOf('<<<<<<< HEAD') + 12, conflictFile.indexOf('======='))
        .trim().split(/\s+/).filter(Boolean);
      
      // Update the slot
      currentHeadTokens[b.slot - 1] = b.word;
      const resolvedSentence = currentHeadTokens.join(' ');

      const resolvedReadme = `# Mukti Same-Line Merge Test

<!-- MUKTI-SENTENCE-START -->
${resolvedSentence}
<!-- MUKTI-SENTENCE-END -->
`;
      fs.writeFileSync(path.join(mainRepoDir, 'README.md'), resolvedReadme, 'utf8');
      run('git add README.md', mainRepoDir);
      run(`git commit -m "Manual conflict resolution for PR #${i + 1} (${b.branchName})"`, mainRepoDir);

      console.log(`   ✅ Manually resolved and committed: "${resolvedSentence}"`);

      results.push({
        pr: i + 1,
        branch: b.branchName,
        user: b.githubUsername,
        slot: b.slot,
        word: b.word,
        conflict: true,
        resolutionTimeSec: 90, // Estimated real human manual resolution time
        notes: 'Required manual 3-way line conflict resolution'
      });
    }
  }

  // Verify final README
  const finalReadme = fs.readFileSync(path.join(mainRepoDir, 'README.md'), 'utf8');
  console.log('\n======================================================================');
  console.log('📊 EXPERIMENT 1 RESULTS SUMMARY');
  console.log('======================================================================');
  console.table(results.map(r => ({
    'PR #': r.pr,
    'Contributor': r.user,
    'Slot': r.slot,
    'Word': r.word,
    'Conflict?': r.conflict ? '❌ YES' : '✅ NO',
    'Est. Manual Time': `${r.resolutionTimeSec}s`
  })));

  const totalConflicts = results.filter(r => r.conflict).length;
  const conflictRate = ((totalConflicts / results.length) * 100).toFixed(1);
  console.log(`Total PRs: ${results.length}`);
  console.log(`Clean merges: ${results.length - totalConflicts}`);
  console.log(`Conflicts encountered: ${totalConflicts} (${conflictRate}%)`);
  console.log(`\nFinal README Collaborative Sentence:\n${finalReadme.match(/<!-- MUKTI-SENTENCE-START -->([\s\S]*?)<!-- MUKTI-SENTENCE-END -->/)[1].trim()}`);

  return { results, totalConflicts, conflictRate };
}

if (require.main === module) {
  runStandardGitExperiment();
}

module.exports = { runStandardGitExperiment };

