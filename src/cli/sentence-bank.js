/**
 * MUKTI - Sentence Bank and Procedural Generator
 * 
 * Generates coherent, meaningful open-source themed sentences
 * containing EXACTLY N words for dynamic workshop configurations.
 */

const Tokenizer = require('../utils/tokenizer');

const BASE_VOCABULARY = [
  "Open", "source", "brings", "people", "together", "to", "build", "remarkable", "community", "solutions",
  "empowering", "passionate", "creators", "worldwide", "to", "collaborate", "transparently", "and", "craft", "extraordinary",
  "technology", "fostering", "inclusive", "environments", "where", "diverse", "knowledge", "is", "freely", "shared",
  "across", "borders", "enabling", "every", "developer", "designer", "and", "thinker", "to", "solve",
  "complex", "global", "challenges", "through", "relentless", "innovation", "mutual", "respect", "and", "shared",
  "human", "progress", "proving", "that", "dedicated", "individuals", "united", "by", "common", "principles",
  "can", "break", "down", "barriers", "accelerate", "scientific", "discovery", "champion", "accessibility", "and",
  "engineer", "resilient", "digital", "infrastructure", "that", "uplifts", "society", "protects", "freedom", "and",
  "illuminates", "a", "brighter", "more", "equitable", "future", "for", "all", "generations", "to",
  "come", "reminding", "us", "that", "each", "small", "contribution", "ignites", "infinite", "potential"
];

const EXPANSION_VOCABULARY = [
  "cultivating", "open", "dialogue", "where", "curiosity", "sparks", "creativity", "and", "collaboration", "conquers",
  "adversity", "nurturing", "trust", "through", "peer", "review", "ethical", "stewardship", "and", "sustainable",
  "maintainer", "practices", "transforming", "ambitious", "aspirations", "into", "practical", "systems", "that", "benefit",
  "everyone", "everywhere", "amplifying", "underrepresented", "voices", "and", "celebrating", "interdisciplinary", "teamwork", "while",
  "advancing", "modern", "data", "science", "cloud", "computing", "artificial", "intelligence", "and", "open",
  "standards", "for", "the", "greater", "good", "of", "global", "humanity", "enriching", "educational",
  "opportunities", "lowering", "technical", "entry", "hurdles", "and", "inspiring", "lifelong", "learning", "throughout",
  "every", "stage", "of", "the", "software", "development", "lifecycle", "strengthening", "resilience", "in",
  "times", "of", "rapid", "technological", "change", "and", "reaffirming", "our", "shared", "dedication",
  "to", "transparency", "cooperation", "and", "uncompromising", "excellence", "in", "every", "line", "of",
  "code", "we", "write", "and", "share", "together", "as", "one", "unified", "global", "open", "source", "family"
];

const FULL_VOCABULARY = [...BASE_VOCABULARY, ...EXPANSION_VOCABULARY];

/**
 * Generate a sentence with EXACTLY targetCount words.
 * @param {number} targetCount - Exact number of words required.
 * @returns {string} - Clean sentence containing exactly targetCount words.
 */
function generateSentence(targetCount) {
  if (targetCount < 1) {
    throw new Error('Target participant count must be at least 1.');
  }

  const words = [];
  let index = 0;

  while (words.length < targetCount) {
    const rawWord = FULL_VOCABULARY[index % FULL_VOCABULARY.length];
    const word = Tokenizer.cleanToken(rawWord);
    words.push(word);
    index++;
  }

  // Capitalize first word
  words[0] = words[0].charAt(0).toUpperCase() + words[0].slice(1);

  return words.join(' ');
}

/**
 * Validate that a given sentence has exactly expectedCount words using canonical tokenizer.
 * @param {string} sentence 
 * @param {number} expectedCount 
 * @returns {{ valid: boolean, actualCount: number, error?: string, words: string[] }}
 */
function validateSentence(sentence, expectedCount) {
  if (!sentence || typeof sentence !== 'string') {
    return { valid: false, actualCount: 0, error: 'Sentence must be a non-empty string.', words: [] };
  }

  const words = Tokenizer.tokenize(sentence);
  if (words.length !== expectedCount) {
    return {
      valid: false,
      actualCount: words.length,
      error: `Word count mismatch: expected ${expectedCount} words, but found ${words.length} words.`,
      words: words
    };
  }

  return {
    valid: true,
    actualCount: words.length,
    words: words
  };
}

module.exports = {
  generateSentence,
  validateSentence,
  FULL_VOCABULARY
};
