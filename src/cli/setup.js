#!/usr/bin/env node
/**
 * MUKTI - Event Setup CLI
 * 
 * Configures the workshop for dynamic participant counts (e.g. 10, 137, 200).
 * Generates assignments, validates sentence length, initializes authoritative state,
 * and builds initial README.md and PARTICIPANTS.md.
 * 
 * Usage:
 *   npm run setup -- --participants 10
 *   npm run setup -- --participants 137 --generate
 *   npm run setup -- --participants 10 --sentence "Open source brings people together to build remarkable community solutions"
 *   npm run setup -- --participants 137 --dry-run
 *   npm run setup -- --participants 137 --force
 */

const fs = require('fs');
const path = require('path');
const { generateSentence, validateSentence } = require('./sentence-bank');
const EventConfigManager = require('../config/event-config');
const ReadmeBuilder = require('../reconstruction/readme-builder');

function parseArgs(args) {
  const options = {
    participants: null,
    sentence: null,
    generate: false,
    dryRun: false,
    force: false,
    help: false
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--participants' || arg === '-p') {
      options.participants = parseInt(args[++i], 10);
    } else if (arg === '--sentence' || arg === '-s') {
      options.sentence = args[++i];
    } else if (arg === '--generate' || arg === '-g') {
      options.generate = true;
    } else if (arg === '--dry-run' || arg === '-d') {
      options.dryRun = true;
    } else if (arg === '--force' || arg === '-f') {
      options.force = true;
    } else if (arg === '--help' || arg === '-h') {
      options.help = true;
    }
  }

  return options;
}

function printUsage() {
  console.log(`
MUKTI Event Setup CLI
=====================
Usage:
  node src/cli/setup.js --participants <N> [options]

Options:
  -p, --participants <N>    Required. Number of participants/words (e.g. 10, 137, 200)
  -s, --sentence "<text>"   Optional. Custom sentence containing exactly N words
  -g, --generate            Optional. Automatically generate a meaningful sentence of N words
  -d, --dry-run             Optional. Preview configuration without writing to disk
  -f, --force               Optional. Overwrite existing event configuration (archives previous)
  -h, --help                Show this help message

Examples:
  npm run setup -- --participants 10
  npm run setup -- --participants 137
  npm run setup -- --participants 10 --sentence "Open source brings people together to build remarkable community solutions"
  npm run setup -- --participants 137 --dry-run
`);
}

function runSetup() {
  const rawArgs = process.argv.slice(2);
  const options = parseArgs(rawArgs);

  if (options.help || rawArgs.length === 0) {
    printUsage();
    process.exit(0);
  }

  if (!options.participants || isNaN(options.participants) || options.participants <= 0) {
    console.error('❌ Error: --participants must be a positive integer.');
    console.error('Example: npm run setup -- --participants 10');
    process.exit(1);
  }

  const count = options.participants;
  console.log(`\n======================================================`);
  console.log(`🚀 MUKTI Event Setup: Configuring for ${count} Participants`);
  console.log(`======================================================\n`);

  // 1. Resolve sentence
  let sentence = options.sentence;
  if (!sentence) {
    console.log(`ℹ️ No custom sentence provided; generating meaningful open-source sentence for ${count} words...`);
    sentence = generateSentence(count);
  }

  // 2. Validate sentence word count
  const validation = validateSentence(sentence, count);
  if (!validation.valid) {
    console.error(`❌ Validation Error: ${validation.error}`);
    process.exit(1);
  }
  console.log(`✅ Sentence validated: Contains exactly ${count} words.\n`);
  console.log(`📜 Target Secret Sentence:\n"${sentence}"\n`);

  // 3. Build configuration
  const configManager = new EventConfigManager();
  const eventConfig = configManager.buildConfig(count, validation.words);
  const initialState = {
    eventId: eventConfig.eventId,
    acceptedCount: 0,
    totalSlots: count,
    contributions: {},
    lastUpdated: new Date().toISOString()
  };

  const initialReadme = ReadmeBuilder.buildReadme(eventConfig, initialState);
  const participantsGuide = ReadmeBuilder.buildParticipantsGuide(eventConfig);

  // 4. Handle Dry Run
  if (options.dryRun) {
    console.log(`🔍 [DRY RUN MODE ENABLED] - No files written to disk.\n`);
    console.log(`Summary of generated configuration:`);
    console.log(`- Event ID: ${eventConfig.eventId}`);
    console.log(`- Total Slots: ${eventConfig.totalParticipants}`);
    console.log(`- First 3 assignments:`, eventConfig.slots.slice(0, 3));
    console.log(`- Last 3 assignments:`, eventConfig.slots.slice(-3));
    console.log(`\nInitial README sentence line:`);
    console.log(ReadmeBuilder.extractSentence(initialReadme).sentence);
    process.exit(0);
  }

  // 5. Guard against accidental overwrite
  if (configManager.hasExistingConfig() && !options.force) {
    console.warn(`⚠️ Warning: An event configuration already exists at ${configManager.configFile}`);
    console.warn(`To overwrite existing event and archive previous data to backups/, re-run with --force:`);
    console.warn(`  npm run setup -- --participants ${count} --force\n`);
    process.exit(1);
  }

  // 6. Write configuration & initial files
  try {
    configManager.saveConfig(eventConfig, { force: options.force });

    // Write initial README.md
    const readmePath = path.join(configManager.rootDir, 'README.md');
    fs.writeFileSync(readmePath, initialReadme, 'utf8');

    // Write PARTICIPANTS.md
    const guidePath = path.join(configManager.rootDir, 'PARTICIPANTS.md');
    fs.writeFileSync(guidePath, participantsGuide, 'utf8');

    console.log(`✅ Event configuration saved to: event-config.json`);
    console.log(`✅ Authoritative ledger initialized: event-state.json`);
    console.log(`✅ Initial README initialized: README.md (${count} numbered slots on single line)`);
    console.log(`✅ Participant assignments guide generated: PARTICIPANTS.md`);

    console.log(`\n======================================================`);
    console.log(`🎉 Setup Complete! Ready for ${count} participants.`);
    console.log(`======================================================\n`);
  } catch (err) {
    console.error(`❌ Setup failed: ${err.message}`);
    process.exit(1);
  }
}

if (require.main === module) {
  runSetup();
}

module.exports = { runSetup, parseArgs };

