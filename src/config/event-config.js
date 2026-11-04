/**
 * MUKTI - Event Configuration and State Storage Manager
 * 
 * Manages loading, validating, persisting, and backing up event-config.json
 * and the authoritative contribution ledger event-state.json.
 */

const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.resolve(__dirname, '..', '..');

class EventConfigManager {
  constructor(rootDir = ROOT_DIR) {
    this.rootDir = rootDir;
    this.configFile = path.join(rootDir, 'event-config.json');
    this.stateFile = path.join(rootDir, 'event-state.json');
    this.legacyAssignmentsFile = path.join(rootDir, 'assignments.json');
    this.backupDir = path.join(rootDir, 'backups');
  }

  hasExistingConfig() {
    return fs.existsSync(this.configFile);
  }

  loadConfig() {
    if (!fs.existsSync(this.configFile)) {
      if (fs.existsSync(this.legacyAssignmentsFile)) {
        const legacy = JSON.parse(fs.readFileSync(this.legacyAssignmentsFile, 'utf8'));
        return {
          version: '1.0.0',
          eventId: 'mukti-legacy',
          totalParticipants: legacy.totalSlots || legacy.assignments.length,
          secretSentence: legacy.secretMessage,
          slots: legacy.assignments,
          createdAt: new Date().toISOString()
        };
      }
      throw new Error(`Event configuration not found at ${this.configFile}. Run 'npm run setup' first.`);
    }

    return JSON.parse(fs.readFileSync(this.configFile, 'utf8'));
  }

  /**
   * Load authoritative state with full lifecycle status mapping.
   */
  loadState() {
    if (!fs.existsSync(this.stateFile)) {
      return {
        eventId: 'initial',
        totalSlots: 0,
        acceptedCount: 0,
        pendingCount: 0,
        rejectedCount: 0,
        organizerCompletedCount: 0,
        revealStatus: 'LOCKED',
        slots: {},
        contributions: {}, // Convenience map of accepted words { [slot]: { word, contributor, ... } }
        activityLog: [],
        lastUpdated: new Date().toISOString()
      };
    }

    const state = JSON.parse(fs.readFileSync(this.stateFile, 'utf8'));
    // Ensure contributions dictionary is always synchronized for backwards compatibility
    if (!state.contributions) state.contributions = {};
    return state;
  }

  saveState(state) {
    state.lastUpdated = new Date().toISOString();
    // Recompute counts
    let accepted = 0;
    let pending = 0;
    let rejected = 0;
    let organizerCompleted = 0;

    for (const key of Object.keys(state.slots || {})) {
      const s = state.slots[key];
      if (s.status === 'accepted') accepted++;
      else if (s.status === 'organizer-completed') organizerCompleted++;
      else if (s.status === 'rejected') rejected++;
      else pending++;
    }

    state.acceptedCount = accepted;
    state.organizerCompletedCount = organizerCompleted;
    state.rejectedCount = rejected;
    state.pendingCount = state.totalSlots - (accepted + organizerCompleted);

    // Keep legacy contributions mapping updated
    state.contributions = {};
    for (const key of Object.keys(state.slots || {})) {
      const s = state.slots[key];
      if (s.status === 'accepted' || s.status === 'organizer-completed') {
        state.contributions[key] = {
          slot: s.slot,
          word: s.word || s.expectedWord,
          contributor: s.contributor,
          prNumber: s.prNumber,
          commitSha: s.commitSha,
          status: s.status,
          timestamp: s.acceptedAt || state.lastUpdated
        };
      }
    }

    const tempPath = `${this.stateFile}.tmp`;
    fs.writeFileSync(tempPath, JSON.stringify(state, null, 2), 'utf8');
    fs.renameSync(tempPath, this.stateFile);
  }

  saveConfig(config, options = { force: false }) {
    if (this.hasExistingConfig() && !options.force) {
      throw new Error('An event configuration already exists. Use --force to overwrite and archive previous event.');
    }

    if (this.hasExistingConfig()) {
      this.createBackup();
    }

    fs.writeFileSync(this.configFile, JSON.stringify(config, null, 2), 'utf8');

    // Also mirror to legacy assignments.json for compatibility
    const legacyData = {
      totalSlots: config.totalParticipants,
      secretMessage: config.secretSentence,
      assignments: config.slots
    };
    fs.writeFileSync(this.legacyAssignmentsFile, JSON.stringify(legacyData, null, 2), 'utf8');

    // Initialize clean authoritative ledger
    const initialSlots = {};
    for (const s of config.slots) {
      initialSlots[String(s.slot)] = {
        slot: s.slot,
        expectedWord: s.word,
        status: 'pending', // 'pending' | 'processing' | 'accepted' | 'rejected' | 'organizer-completed'
        prNumber: null,
        contributor: null,
        acceptedAt: null,
        completedBy: null,
        attemptCount: 0,
        commitSha: null,
        errorDetails: null
      };
    }

    const initialState = {
      eventId: config.eventId,
      totalSlots: config.totalParticipants,
      acceptedCount: 0,
      pendingCount: config.totalParticipants,
      rejectedCount: 0,
      organizerCompletedCount: 0,
      revealStatus: 'LOCKED',
      slots: initialSlots,
      contributions: {},
      activityLog: [
        {
          timestamp: new Date().toISOString(),
          type: 'EVENT_INITIALIZED',
          message: `Event initialized with ${config.totalParticipants} slots.`
        }
      ],
      lastUpdated: new Date().toISOString()
    };

    this.saveState(initialState);
  }

  createBackup() {
    if (!fs.existsSync(this.backupDir)) {
      fs.mkdirSync(this.backupDir, { recursive: true });
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    if (fs.existsSync(this.configFile)) {
      fs.copyFileSync(this.configFile, path.join(this.backupDir, `event-config-${timestamp}.json`));
    }
    if (fs.existsSync(this.stateFile)) {
      fs.copyFileSync(this.stateFile, path.join(this.backupDir, `event-state-${timestamp}.json`));
    }
  }

  buildConfig(participantCount, words, eventId = `mukti-${Date.now()}`) {
    const slots = words.map((word, index) => {
      const slot = index + 1;
      return {
        slot: slot,
        word: word,
        participantId: String(slot).padStart(3, '0'),
        githubUsername: '*'
      };
    });

    return {
      version: '1.0.0',
      eventId: eventId,
      totalParticipants: participantCount,
      secretSentence: words.join(' '),
      slots: slots,
      createdAt: new Date().toISOString()
    };
  }
}

module.exports = EventConfigManager;
