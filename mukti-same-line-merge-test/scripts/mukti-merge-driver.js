#!/usr/bin/env node
/**
 * MUKTI Git Custom Merge Driver
 * 
 * Invoked by Git for 3-way line merges on README.md.
 * Git CLI usage configured in .git/config:
 *   [merge "mukti-merge-driver"]
 *     name = Mukti Sentence Merge Driver
 *     driver = node scripts/mukti-merge-driver.js %O %A %B %P
 * 
 * Arguments:
 *   %O: Ancestor (Merge Base) temporary file path
 *   %A: Ours (Current branch / main) temporary file path
 *   %B: Theirs (Incoming PR branch) temporary file path
 *   %P: Original file path (e.g. README.md)
 */

const fs = require('fs');

const [,, baseFile, oursFile, theirsFile, filePath] = process.argv;

if (!baseFile || !oursFile || !theirsFile) {
  console.error('Usage: node mukti-merge-driver.js %O %A %B %P');
  process.exit(1);
}

const SENTENCE_START_TAG = '<!-- MUKTI-SENTENCE-START -->';
const SENTENCE_END_TAG = '<!-- MUKTI-SENTENCE-END -->';

function extractSentence(content) {
  const lines = content.split(/\r?\n/);
  const startIndex = lines.findIndex(l => l.includes(SENTENCE_START_TAG));
  const endIndex = lines.findIndex(l => l.includes(SENTENCE_END_TAG));

  if (startIndex !== -1 && endIndex !== -1 && endIndex > startIndex + 1) {
    return {
      sentence: lines[startIndex + 1].trim(),
      lineIndex: startIndex + 1,
      lines: lines
    };
  }

  for (let i = 0; i < lines.length; i++) {
    const trimmed = lines[i].trim();
    if (/^1\s+2\s+3\b/.test(trimmed) || /^\b\w+\s+2\s+3\b/.test(trimmed)) {
      return {
        sentence: trimmed,
        lineIndex: i,
        lines: lines
      };
    }
  }

  return null;
}

try {
  const baseContent = fs.readFileSync(baseFile, 'utf8');
  const oursContent = fs.readFileSync(oursFile, 'utf8');
  const theirsContent = fs.readFileSync(theirsFile, 'utf8');

  const baseExt = extractSentence(baseContent);
  const oursExt = extractSentence(oursContent);
  const theirsExt = extractSentence(theirsContent);

  if (!baseExt || !oursExt || !theirsExt) {
    // If we cannot find the sentence, fallback to standard git merge
    console.warn('[mukti-driver] Could not locate sentence tags; falling back to default conflict markers.');
    process.exit(1);
  }

  const baseTokens = baseExt.sentence.split(/\s+/).filter(Boolean);
  const oursTokens = oursExt.sentence.split(/\s+/).filter(Boolean);
  const theirsTokens = theirsExt.sentence.split(/\s+/).filter(Boolean);

  if (baseTokens.length !== oursTokens.length || baseTokens.length !== theirsTokens.length) {
    console.error('[mukti-driver] Token length changed; manual resolution required.');
    process.exit(1);
  }

  const mergedTokens = [...oursTokens];
  let conflictDetected = false;

  for (let i = 0; i < baseTokens.length; i++) {
    const baseVal = baseTokens[i];
    const oursVal = oursTokens[i];
    const theirsVal = theirsTokens[i];

    const oursChanged = oursVal !== baseVal;
    const theirsChanged = theirsVal !== baseVal;

    if (oursChanged && theirsChanged) {
      if (oursVal.toLowerCase() === theirsVal.toLowerCase()) {
        // Both changed to the same word - clean
        mergedTokens[i] = oursVal;
      } else {
        // Real conflict: two different words for the exact same slot!
        console.error(`[mukti-driver] Slot #${i + 1} conflict: "${oursVal}" vs "${theirsVal}"`);
        conflictDetected = true;
      }
    } else if (theirsChanged) {
      // Incoming branch changed this slot cleanly
      mergedTokens[i] = theirsVal;
    } else if (oursChanged) {
      // Current branch changed this slot cleanly
      mergedTokens[i] = oursVal;
    }
  }

  if (conflictDetected) {
    process.exit(1);
  }

  // Write merged output back to ours (%A)
  const resultLines = [...oursExt.lines];
  resultLines[oursExt.lineIndex] = mergedTokens.join(' ');
  fs.writeFileSync(oursFile, resultLines.join('\n'), 'utf8');

  console.log(`[mukti-driver] Successfully merged word contributions for ${filePath}`);
  process.exit(0);
} catch (err) {
  console.error('[mukti-driver] Error during 3-way merge:', err);
  process.exit(1);
}

