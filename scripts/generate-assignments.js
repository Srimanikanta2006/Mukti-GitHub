#!/usr/bin/env node
/**
 * MUKTI - Assignment Generator Utility
 * 
 * Generates an assignments.json file and matching README slot string
 * from any message sentence.
 * 
 * Usage:
 *   node scripts/generate-assignments.js "Your secret sentence here"
 */

const fs = require('fs');
const path = require('path');

const sentence = process.argv[2] || "Open source brings people together to build remarkable community solutions";
const words = sentence.trim().split(/\s+/).filter(Boolean);

const assignments = words.map((word, index) => {
  const slot = index + 1;
  const participantId = String(slot).padStart(3, '0');
  return {
    slot: slot,
    word: word,
    participantId: participantId,
    githubUsername: "*" // Wildcard allows any participant with the correct word to merge
  };
});

const data = {
  totalSlots: words.length,
  secretMessage: words.join(' '),
  assignments: assignments
};

const outputPath = path.resolve(__dirname, '..', 'assignments.json');
fs.writeFileSync(outputPath, JSON.stringify(data, null, 2), 'utf8');

console.log(`✅ Successfully generated assignments.json with ${words.length} slots!`);
console.log(`\nREADME Sentence Slot String:`);
console.log(Array.from({ length: words.length }, (_, i) => i + 1).join(' '));
