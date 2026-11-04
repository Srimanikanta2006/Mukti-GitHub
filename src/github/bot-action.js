/**
 * MUKTI - GitHub Actions Automated PR Runner
 * 
 * Invoked by .github/workflows/mukti-contribution-bot.yml
 * Parses PR event, verifies files, invokes ContributionProcessor,
 * updates main branch, and posts real-time comments to the PR.
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const ContributionProcessor = require('../processing/contribution-processor');

async function githubRequest(endpoint, options = {}) {
  const token = process.env.GITHUB_TOKEN;
  if (!token) throw new Error('GITHUB_TOKEN environment variable is missing.');

  const url = `https://api.github.com${endpoint}`;
  const response = await fetch(url, {
    ...options,
    headers: {
      'Authorization': `token ${token}`,
      'Accept': 'application/vnd.github.v3+json',
      'User-Agent': 'Mukti-Bot',
      ...(options.headers || {})
    }
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`GitHub API error (${response.status} on ${endpoint}): ${errorText}`);
  }

  return response.json();
}

async function runBot() {
  console.log('🤖 MUKTI Automated PR Processing Bot starting...');

  // 1. Read event payload
  const eventPath = process.env.GITHUB_EVENT_PATH;
  if (!eventPath || !fs.existsSync(eventPath)) {
    throw new Error(`GITHUB_EVENT_PATH is not accessible: ${eventPath}`);
  }

  const eventData = JSON.parse(fs.readFileSync(eventPath, 'utf8'));
  const pr = eventData.pull_request;
  if (!pr) {
    console.log('Event is not a pull request. Exiting.');
    return;
  }

  const repoFullName = process.env.GITHUB_REPOSITORY || `${pr.base.repo.owner.login}/${pr.base.repo.name}`;
  const [owner, repo] = repoFullName.split('/');
  const prNumber = pr.number;
  const author = pr.user.login;
  const baseSha = pr.base.sha;
  const headSha = pr.head.sha;

  console.log(`Processing PR #${prNumber} by @${author} in ${repoFullName}`);

  // 2. Fetch list of modified files in the PR
  let changedFiles = [];
  try {
    const filesData = await githubRequest(`/repos/${owner}/${repo}/pulls/${prNumber}/files`);
    changedFiles = filesData.map(f => f.filename);
    console.log(`Changed files in PR: ${changedFiles.join(', ')}`);
  } catch (err) {
    console.error('Could not fetch PR files:', err.message);
    changedFiles = ['README.md']; // Fallback
  }

  // 3. Fetch PR head content (README.md)
  let prContent = '';
  try {
    const headFile = await githubRequest(`/repos/${owner}/${repo}/contents/README.md?ref=${headSha}`);
    prContent = Buffer.from(headFile.content, 'base64').toString('utf8');
  } catch (err) {
    await githubRequest(`/repos/${owner}/${repo}/issues/${prNumber}/comments`, {
      method: 'POST',
      body: JSON.stringify({
        body: `❌ **README.md Missing**\n\nCould not locate \`README.md\` in your branch. Please ensure your fork modifies \`README.md\` at the root of the repository.`
      })
    });
    console.error('PR does not contain README.md');
    process.exit(1);
  }

  // 4. Fetch Base commit content (README.md)
  let baseContent = '';
  try {
    const baseFile = await githubRequest(`/repos/${owner}/${repo}/contents/README.md?ref=${baseSha}`);
    baseContent = Buffer.from(baseFile.content, 'base64').toString('utf8');
  } catch (err) {
    // Fallback to local README.md
    baseContent = fs.readFileSync(path.join(process.cwd(), 'README.md'), 'utf8');
  }

  // 5. Execute transactional processor
  const processor = new ContributionProcessor();
  const result = processor.process({
    prNumber,
    author,
    changedFiles,
    baseContent,
    prContent,
    commitSha: headSha
  });

  // 6. Post PR comment with feedback
  try {
    await githubRequest(`/repos/${owner}/${repo}/issues/${prNumber}/comments`, {
      method: 'POST',
      body: JSON.stringify({ body: result.commentBody })
    });
  } catch (err) {
    console.warn('Could not post comment to PR:', err.message);
  }

  // 7. If rejected, stop workflow and report error
  if (!result.success) {
    console.error(`Validation failed: ${result.error}`);
    process.exit(1);
  }

  // 8. If already accepted, no git push needed
  if (result.alreadyProcessed) {
    console.log(`PR #${prNumber} was already accepted; skipped redundant commit.`);
    return;
  }

  // 9. Atomic commit and push to main
  console.log(`Committing reconstructed README and state to main for slot #${result.slot}...`);
  execSync('git config user.name "Mukti Bot"');
  execSync('git config user.email "bot@mukti.org"');
  execSync('git add README.md event-state.json');
  
  const commitMsg = `Merge contribution for slot #${result.slot} (${result.word}) from @${author} (#${prNumber})\n\nCo-authored-by: ${author} <${author}@users.noreply.github.com>`;
  execSync(`git commit -m "${commitMsg.replace(/"/g, '\\"')}"`);
  execSync('git push origin main');

  // 10. Close PR
  try {
    await githubRequest(`/repos/${owner}/${repo}/pulls/${prNumber}`, {
      method: 'PATCH',
      body: JSON.stringify({ state: 'closed' })
    });
    console.log(`Closed PR #${prNumber}`);
  } catch (err) {
    console.warn(`Could not close PR #${prNumber}:`, err.message);
  }

  console.log(`🎉 PR #${prNumber} processed and integrated successfully!`);
}

if (require.main === module) {
  runBot().catch(err => {
    console.error('Fatal error in bot runner:', err);
    process.exit(1);
  });
}

module.exports = { runBot };

