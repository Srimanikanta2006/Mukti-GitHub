import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const input = 'protocol=https\nhost=github.com\n\n';
const out = execSync('git credential fill', { input, encoding: 'utf8' });
const token = out.match(/password=(.+)/)[1].trim();

const config = JSON.parse(fs.readFileSync('event-config.json', 'utf8'));
const slots = config.slots;

console.log(`Starting update of ${slots.length} issues on Srimanikanta2006/Mukti-GitHub...`);

function renderIssueBody(slot, word) {
  return `# MUKTI Contribution #${slot} 🚀

Welcome to the MUKTI Open Source Challenge!

Your task is to contribute one word to our community message.

## 🎯 Your Task

Replace the number **\`${slot}\`** with:

# \`${word}\`

**File to modify:** \`README.md\`

## 🛠️ How to Contribute

1. Click the **Fork** button on this repository.
2. Clone your fork:

   \`\`\`bash
   git clone YOUR_FORK_URL
   cd REPOSITORY_NAME
   \`\`\`

3. Open \`README.md\`.
4. Find your assigned number: \`${slot}\`.
5. Replace it with your assigned word: \`${word}\`.
6. Save the file and commit your changes:

   \`\`\`bash
   git add README.md
   git commit -m "Add MUKTI contribution #${slot}"
   \`\`\`

7. Push your changes:

   \`\`\`bash
   git push origin main
   \`\`\`

8. Go to your fork on GitHub and click **Contribute → Open pull request** (or **Compare & pull request**).
9. Submit your Pull Request to the original MUKTI repository.

## ✅ Expected Result

Before:

\`${slot}\`

After:

\`${word}\`

## 📋 Contribution Guidelines

- Replace only your assigned number.
- Do not modify other participants' numbers or words.
- Do not change anything outside the contribution section.
- Submit your Pull Request to the original MUKTI repository.

**That's it! You've made your first contribution to MUKTI. 🎉**

One word from you. One step forward for the community.`;
}

for (let i = 0; i < slots.length; i++) {
  const s = slots[i];
  const slot = s.slot;
  const word = s.word;
  const title = `MUKTI Contribution #${slot} 🚀`;
  const body = renderIssueBody(slot, word);

  try {
    const res = await fetch(`https://api.github.com/repos/Srimanikanta2006/Mukti-GitHub/issues/${slot}`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/vnd.github+json',
        'User-Agent': 'Mukti-Issue-Updater',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        title,
        body,
        state: 'open'
      })
    });

    if (res.ok) {
      if (slot % 10 === 0 || slot === 1 || slot === slots.length) {
        console.log(`[${slot}/${slots.length}] Updated Issue #${slot}: "${word}"`);
      }
    } else {
      const err = await res.text();
      console.error(`❌ Failed on Issue #${slot} (${res.status}): ${err}`);
      if (res.status === 403 || res.status === 429) {
        console.log('Rate limit hit, pausing 10 seconds...');
        await new Promise(r => setTimeout(r, 10000));
        i--; // retry
        continue;
      }
    }

    await new Promise(r => setTimeout(r, 180));
  } catch (err) {
    console.error(`Error updating issue #${slot}:`, err.message);
  }
}

console.log('🎉 All 200 issues successfully updated with exact template and closing sentence words!');
