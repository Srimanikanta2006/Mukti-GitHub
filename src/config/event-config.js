/**
 * MUKTI - Event Configuration and State Storage Manager
 * 
 * Manages loading, validating, persisting, and backing up event-config.json
 * and the authoritative contribution ledger event-state.json.
 */

const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.resolve(__dirname, '..', '..');
const CONFIG_FILE = path.join(ROOT_DIR, 'event-config.json');
const STATE_FILE = path.join(ROOT_DIR, 'event-state.json');
const LEGACY_ASSIGNMENTS_FILE = path.join(ROOT_DIR, 'assignments.json');
const BACKUP_DIR = path.join(ROOT_DIR, 'backups');

class EventConfigManager {
  constructor(rootDir = ROOT_DIR) {
    this.rootDir = rootDir;
    this.configFile = path.join(rootDir, 'event-config.json');
    this.stateFile = path.join(rootDir, 'event-state.json');
    this.legacyAssignmentsFile = path.join(rootDir, 'assignments.json');
    this.backupDir = path.join(rootDir, 'backups');
  }

  /**
   * Check if an active event configuration already exists.
   */
  hasExistingConfig() {
    return fs.existsSync(this.configFile);
  }

  /**
   * Load the authoritative event configuration.
   */
  loadConfig() {
    if (!fs.existsSync(this.configFile)) {
      // Fallback to legacy assignments.json if event-config.json doesn't exist yet
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
   * Load the authoritative accepted contribution ledger.
   */
  loadState() {
    if (!fs.existsSync(this.stateFile)) {
      return {
        eventId: 'initial',
        acceptedCount: 0,
        totalSlots: 0,
        contributions: {},
        lastUpdated: new Date().toISOString()
      };
    }

    return JSON.parse(fs.readFileSync(this.stateFile, 'utf8'));
  }

  /**
   * Save the authoritative state file atomically.
   */
  saveState(state) {
    state.lastUpdated = new Date().toISOString();
    const tempPath = `${this.stateFile}.tmp`;
    fs.writeFileSync(tempPath, JSON.stringify(state, null, 2), 'utf8');
    fs.renameSync(tempPath, this.stateFile);
  }

  /**
   * Create or update event configuration with automatic backup protection.
   */
  saveConfig(config, options = { force: false }) {
    if (this.hasExistingConfig() && !options.force) {
      throw new Error('An event configuration already exists. Use --force to overwrite and archive previous event.');
    }

    // Archive existing configuration & state before overwriting
    if (this.hasExistingConfig()) {
      this.createBackup();
    }

    // Write event-config.json
    fs.writeFileSync(this.configFile, JSON.stringify(config, null, 2), 'utf8');

    // Also mirror to legacy assignments.json for backwards compatibility with any older scripts
    const legacyData = {
      totalSlots: config.totalParticipants,
      secretMessage: config.secretSentence,
      assignments: config.slots
    };
    fs.writeFileSync(this.legacyAssignmentsFile, JSON.stringify(legacyData, null, 2), 'utf8');

    // Initialize clean event-state.json
    const initialState = {
      eventId: config.eventId,
      acceptedCount: 0,
      totalSlots: config.totalParticipants,
      contributions: {},
      lastUpdated: new Date().toISOString()
    };
    this.saveState(initialState);
  }

  /**
   * Archive existing event configuration to backups/ directory.
   */
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

  /**
   * Create configuration object from participant count and sentence.
   */
  buildConfig(participantCount, words, eventId = `mukti-${Date.now()}`) {
    const slots = words.map((word, index) => {
      const slot = index + 1;
      return {
        slot: slot,
        word: word,
        participantId: String(slot).padStart(3, '0'),
        githubUsername: '*' // Wildcard enables open participation with word verification
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
