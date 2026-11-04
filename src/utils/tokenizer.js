/**
 * MUKTI - Canonical Tokenizer Utility
 * 
 * Defines the single, authoritative tokenization rules used across:
 * - Sentence validation
 * - Assignment generation
 * - README generation & extraction
 * - PR contribution validation
 * 
 * Tokenization Rules:
 * 1. Delimiters: Tokens are separated by one or more whitespace characters (\\s+).
 * 2. Words: Allowed characters include Unicode letters (a-z, A-Z), numbers, interior hyphens (e.g. "open-source"),
 *    and apostrophes for contractions (e.g. "we'll", "it's").
 * 3. Normalization: Leading and trailing quotation marks (' " `) and trailing sentence punctuation (. , ! ? ; :)
 *    are stripped when validating a participant's submitted word.
 * 4. Case-insensitivity: Token matching is case-insensitive, while the canonical casing defined
 *    in event-config.json is always used for authoritative README reconstruction.
 */

class Tokenizer {
  /**
   * Split a text string into an array of clean, non-empty word tokens.
   * @param {string} text - Raw input sentence or slot string
   * @returns {string[]} - Array of word tokens
   */
  static tokenize(text) {
    if (!text || typeof text !== 'string') return [];
    return text
      .trim()
      .split(/\s+/)
      .map(t => this.cleanToken(t))
      .filter(Boolean);
  }

  /**
   * Strip leading/trailing formatting quotes and accidental punctuation.
   * Preserves interior hyphens and contractions.
   * @param {string} token - Raw token string
   * @returns {string} - Cleaned token
   */
  static cleanToken(token) {
    if (!token) return '';
    // Strip leading/trailing quotes, ticks, and standard punctuation marks
    return token
      .trim()
      .replace(/^['"`]+|['"`.,!?;:]+$/g, '')
      .trim();
  }

  /**
   * Validate if a word matches standard acceptable token characters.
   * @param {string} word 
   * @returns {boolean}
   */
  static isValidWordFormat(word) {
    if (!word || typeof word !== 'string') return false;
    const cleaned = this.cleanToken(word);
    if (!cleaned) return false;
    // Must contain alphanumeric characters, optionally with interior hyphens or apostrophes
    return /^[a-zA-Z0-9]+([-_'’][a-zA-Z0-9]+)*$/.test(cleaned);
  }

  /**
   * Compare submitted token against expected canonical token.
   * @param {string} submitted 
   * @param {string} expected 
   * @returns {boolean}
   */
  static wordsMatch(submitted, expected) {
    const cleanSub = this.cleanToken(submitted).toLowerCase();
    const cleanExp = this.cleanToken(expected).toLowerCase();
    return cleanSub === cleanExp;
  }
}

module.exports = Tokenizer;
