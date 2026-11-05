const fs = require('fs');
const path = require('path');
const Tokenizer = require('../src/utils/tokenizer');
const EventConfigManager = require('../src/config/event-config');
const ReadmeBuilder = require('../src/reconstruction/readme-builder');

const sentence = `As the MUKTI event comes to a close, we celebrate the contributions made today and the people, ideas, and spirit that brought us together. Every participant added one word, yet those words became a message no individual could create alone. This is the power of open source: people with different experiences learning, building, improving, and creating together. The MUKTI club encourages this spirit by creating opportunities to explore technology, share knowledge, support beginners, and participate in the open source community. Today, we practised forking repositories, creating branches, submitting pull requests, and reviewing code. More importantly, we experienced how individual efforts combine into something meaningful. Every issue opened, every change proposed, and every pull request merged represented curiosity, courage, and collaboration. To everyone who participated, thank you for bringing your time, enthusiasm, and ideas to this shared creation. May this be more than a one-day activity; may it begin your journey as contributors who ask questions, help others, and build in the open. As we leave, let us carry forward what we created together: one contribution, one connection, and one community. Let this spirit guide everything we build next. This is MUKTI, and our story continues with every contribution. Thank you`;

const words = Tokenizer.tokenize(sentence);
console.log('Words count:', words.length);

if (words.length !== 200) {
  throw new Error(`Expected 200 words, got ${words.length}`);
}

const configManager = new EventConfigManager(path.resolve(__dirname, '..'));
const eventConfig = configManager.buildConfig(200, words, 'mukti-closing-sentence');
eventConfig.secretSentence = sentence;

const initialState = {
  eventId: eventConfig.eventId,
  acceptedCount: 0,
  totalSlots: 200,
  pendingCount: 200,
  rejectedCount: 0,
  organizerCompletedCount: 0,
  revealStatus: 'LOCKED',
  slots: {},
  contributions: {},
  activityLog: [
    {
      timestamp: new Date().toISOString(),
      type: 'EVENT_INITIALIZED',
      message: 'MUKTI workshop event initialized with 200 participants and custom closing sentence.'
    }
  ],
  lastUpdated: new Date().toISOString()
};

for (const s of eventConfig.slots) {
  initialState.slots[String(s.slot)] = {
    slot: s.slot,
    expectedWord: s.word,
    status: 'pending',
    prNumber: null,
    contributor: null,
    acceptedAt: null,
    completedBy: null,
    attemptCount: 0,
    commitSha: null,
    errorDetails: null
  };
}

configManager.saveConfig(eventConfig, { force: true });
configManager.saveState(initialState);

// Write assignments.json
fs.writeFileSync(path.join(configManager.rootDir, 'assignments.json'), JSON.stringify(eventConfig.slots, null, 2), 'utf8');

// Write README.md
const readme = ReadmeBuilder.buildReadme(eventConfig, initialState);
fs.writeFileSync(path.join(configManager.rootDir, 'README.md'), readme, 'utf8');

// Write PARTICIPANTS.md
const guide = ReadmeBuilder.buildParticipantsGuide(eventConfig);
fs.writeFileSync(path.join(configManager.rootDir, 'PARTICIPANTS.md'), guide, 'utf8');

console.log('✅ Successfully configured MUKTI for 200 participants with user closing sentence!');
