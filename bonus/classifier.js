/**
 * ════════════════════════════════════════════════════════════════
 *  Voice Intent Classifier — Multilingual (EN / HI / TE)
 * ════════════════════════════════════════════════════════════════
 *
 *  Intents: capture | exit | wake | chat | none
 *
 *  Architecture: Weighted keyword scoring with n-gram matching,
 *  language detection heuristics, and confidence thresholds.
 *  Zero external dependencies — runs in Node.js or browser.
 *
 *  See DESIGN_DOC.md for full architecture explanation.
 */

'use strict';

// ── Intent Definitions ────────────────────────────────────────

const INTENTS = ['capture', 'exit', 'wake', 'chat', 'none'];

// ── Multilingual Keyword Dictionaries ─────────────────────────
// Each keyword has a weight (1.0 = strong signal, 0.5 = weak signal)

const INTENT_KEYWORDS = {
  capture: {
    en: [
      { phrase: 'take a photo',       weight: 1.0 },
      { phrase: 'take photo',         weight: 1.0 },
      { phrase: 'take a picture',     weight: 1.0 },
      { phrase: 'take picture',       weight: 1.0 },
      { phrase: 'capture',            weight: 0.9 },
      { phrase: 'snap',               weight: 0.8 },
      { phrase: 'click',              weight: 0.6 },
      { phrase: 'photograph',         weight: 0.8 },
      { phrase: 'shoot',              weight: 0.6 },
      { phrase: 'record this',        weight: 0.7 },
      { phrase: 'save this view',     weight: 0.7 },
      { phrase: 'camera',             weight: 0.5 },
      { phrase: 'selfie',             weight: 0.8 },
      { phrase: 'screenshot',         weight: 0.7 },
    ],
    hi: [
      { phrase: 'photo lo',           weight: 1.0 },
      { phrase: 'photo lelo',         weight: 1.0 },
      { phrase: 'photo le lo',        weight: 1.0 },
      { phrase: 'tasveer lo',         weight: 1.0 },
      { phrase: 'tasveer lelo',       weight: 1.0 },
      { phrase: 'photo kheencho',     weight: 0.9 },
      { phrase: 'photo khincho',      weight: 0.9 },
      { phrase: 'photo khicho',       weight: 0.9 },
      { phrase: 'snap karo',          weight: 0.8 },
      { phrase: 'click karo',         weight: 0.7 },
      { phrase: 'capture karo',       weight: 0.9 },
      { phrase: 'photo nikal',        weight: 0.8 },
      { phrase: 'camera chalao',      weight: 0.6 },
      { phrase: 'ek photo',           weight: 0.7 },
    ],
    te: [
      { phrase: 'photo teesko',       weight: 1.0 },
      { phrase: 'photo tisku',        weight: 1.0 },
      { phrase: 'photo tisko',        weight: 1.0 },
      { phrase: 'padham teesko',      weight: 1.0 },
      { phrase: 'bommanu teesko',     weight: 0.9 },
      { phrase: 'capture cheyyi',     weight: 0.9 },
      { phrase: 'snap cheyyi',        weight: 0.8 },
      { phrase: 'click cheyyi',       weight: 0.7 },
      { phrase: 'photo teeyandi',     weight: 0.9 },
      { phrase: 'camera pettandi',    weight: 0.6 },
      { phrase: 'photo',              weight: 0.4 },
    ],
  },

  exit: {
    en: [
      { phrase: 'exit',               weight: 1.0 },
      { phrase: 'quit',               weight: 1.0 },
      { phrase: 'close',              weight: 0.8 },
      { phrase: 'shut down',          weight: 0.9 },
      { phrase: 'shutdown',           weight: 0.9 },
      { phrase: 'turn off',           weight: 0.9 },
      { phrase: 'power off',          weight: 0.9 },
      { phrase: 'stop',               weight: 0.6 },
      { phrase: 'goodbye',            weight: 0.7 },
      { phrase: 'bye',                weight: 0.6 },
      { phrase: 'disconnect',         weight: 0.8 },
      { phrase: 'sleep mode',         weight: 0.7 },
      { phrase: 'go to sleep',        weight: 0.7 },
      { phrase: 'end session',        weight: 0.8 },
      { phrase: 'end this session',   weight: 0.9 },
    ],
    hi: [
      { phrase: 'band karo',          weight: 1.0 },
      { phrase: 'bandh karo',         weight: 1.0 },
      { phrase: 'bnd karo',           weight: 0.9 },
      { phrase: 'exit karo',          weight: 1.0 },
      { phrase: 'quit karo',          weight: 1.0 },
      { phrase: 'chalega ab',         weight: 0.5 },
      { phrase: 'bas',                weight: 0.5 },
      { phrase: 'ruk jao',            weight: 0.6 },
      { phrase: 'band kar do',        weight: 1.0 },
      { phrase: 'bye bye',            weight: 0.6 },
      { phrase: 'hatao',              weight: 0.5 },
      { phrase: 'chalo ab',           weight: 0.4 },
    ],
    te: [
      { phrase: 'aapeyyi',            weight: 1.0 },
      { phrase: 'aapu',               weight: 0.9 },
      { phrase: 'aapandi',            weight: 1.0 },
      { phrase: 'exit cheyyi',        weight: 1.0 },
      { phrase: 'band cheyyi',        weight: 1.0 },
      { phrase: 'aapivettu',          weight: 0.9 },
      { phrase: 'poyandi',            weight: 0.5 },
      { phrase: 'off cheyyi',         weight: 0.9 },
      { phrase: 'close cheyyi',       weight: 0.9 },
      { phrase: 'aapeseyyi',          weight: 1.0 },
    ],
  },

  wake: {
    en: [
      { phrase: 'hey glasses',        weight: 1.0 },
      { phrase: 'hello glasses',      weight: 1.0 },
      { phrase: 'hi glasses',         weight: 1.0 },
      { phrase: 'ok glasses',         weight: 1.0 },
      { phrase: 'wake up',            weight: 0.9 },
      { phrase: 'hey there',          weight: 0.6 },
      { phrase: 'are you there',      weight: 0.7 },
      { phrase: 'activate',           weight: 0.8 },
      { phrase: 'listen up',          weight: 0.7 },
      { phrase: 'start listening',    weight: 0.7 },
      { phrase: 'hey smart glasses',  weight: 1.0 },
      { phrase: 'glass',              weight: 0.4 },
    ],
    hi: [
      { phrase: 'chashma sun',        weight: 1.0 },
      { phrase: 'chasma sun',         weight: 1.0 },
      { phrase: 'hey chashme',        weight: 1.0 },
      { phrase: 'jago',               weight: 0.8 },
      { phrase: 'jaag jao',           weight: 0.8 },
      { phrase: 'uth jao',            weight: 0.7 },
      { phrase: 'suno',               weight: 0.5 },
      { phrase: 'shuru karo',         weight: 0.7 },
      { phrase: 'start karo',         weight: 0.6 },
      { phrase: 'hello ji',           weight: 0.5 },
      { phrase: 'tum sun rhe ho',     weight: 0.6 },
    ],
    te: [
      { phrase: 'hey kannadalu',      weight: 1.0 },
      { phrase: 'ra kannadalu',       weight: 0.9 },
      { phrase: 'lecho',              weight: 0.8 },
      { phrase: 'lechi ra',           weight: 0.8 },
      { phrase: 'start avvu',         weight: 0.7 },
      { phrase: 'wake avvu',          weight: 0.8 },
      { phrase: 'hey anna',           weight: 0.5 },
      { phrase: 'vinu',               weight: 0.6 },
      { phrase: 'vinandi',            weight: 0.6 },
    ],
  },

  chat: {
    en: [
      { phrase: 'tell me',            weight: 0.8 },
      { phrase: 'what is',            weight: 0.7 },
      { phrase: 'what are',           weight: 0.7 },
      { phrase: 'how to',             weight: 0.7 },
      { phrase: 'how do',             weight: 0.7 },
      { phrase: 'explain',            weight: 0.8 },
      { phrase: 'describe',           weight: 0.7 },
      { phrase: 'who is',             weight: 0.7 },
      { phrase: 'where is',           weight: 0.7 },
      { phrase: 'when was',           weight: 0.6 },
      { phrase: 'search for',         weight: 0.7 },
      { phrase: 'look up',            weight: 0.7 },
      { phrase: 'can you',            weight: 0.5 },
      { phrase: 'please tell',        weight: 0.8 },
      { phrase: 'what time',          weight: 0.6 },
      { phrase: 'navigate to',        weight: 0.7 },
      { phrase: 'directions to',      weight: 0.7 },
      { phrase: 'translate',          weight: 0.7 },
      { phrase: 'read this',          weight: 0.6 },
      { phrase: 'summarize',          weight: 0.7 },
    ],
    hi: [
      { phrase: 'batao',              weight: 0.8 },
      { phrase: 'bata do',            weight: 0.8 },
      { phrase: 'kya hai',            weight: 0.7 },
      { phrase: 'kya hota hai',       weight: 0.7 },
      { phrase: 'kaise',              weight: 0.6 },
      { phrase: 'kaise kare',         weight: 0.7 },
      { phrase: 'samjhao',            weight: 0.8 },
      { phrase: 'explain karo',       weight: 0.8 },
      { phrase: 'kaun hai',           weight: 0.6 },
      { phrase: 'kahan hai',          weight: 0.6 },
      { phrase: 'dhundho',            weight: 0.6 },
      { phrase: 'search karo',        weight: 0.7 },
      { phrase: 'translate karo',     weight: 0.7 },
      { phrase: 'padho',              weight: 0.6 },
      { phrase: 'navigate karo',      weight: 0.7 },
      { phrase: 'rasta batao',        weight: 0.7 },
    ],
    te: [
      { phrase: 'cheppu',             weight: 0.8 },
      { phrase: 'cheppandi',          weight: 0.8 },
      { phrase: 'enti',               weight: 0.5 },
      { phrase: 'enti idi',           weight: 0.6 },
      { phrase: 'ela',                weight: 0.5 },
      { phrase: 'ela cheyali',        weight: 0.7 },
      { phrase: 'explain cheyyi',     weight: 0.8 },
      { phrase: 'evaru',              weight: 0.5 },
      { phrase: 'ekkada',             weight: 0.5 },
      { phrase: 'search cheyyi',      weight: 0.7 },
      { phrase: 'translate cheyyi',   weight: 0.7 },
      { phrase: 'chaduvandi',         weight: 0.6 },
      { phrase: 'daari cheppu',       weight: 0.7 },
    ],
  },
};

// ── Preprocessing ─────────────────────────────────────────────

function normalize(text) {
  if (!text || typeof text !== 'string') return '';
  return text
    .toLowerCase()
    .replace(/[^\w\s\u0900-\u097F\u0C00-\u0C7F]/g, ' ')  // keep Devanagari + Telugu
    .replace(/\s+/g, ' ')
    .trim();
}

// ── Language Detection (heuristic) ────────────────────────────

function detectLanguage(text) {
  const devanagari = /[\u0900-\u097F]/;
  const telugu     = /[\u0C00-\u0C7F]/;

  if (telugu.test(text))     return 'te';
  if (devanagari.test(text)) return 'hi';
  return 'en';  // default (also covers romanized Hindi/Telugu)
}

// ── Classifier Core ───────────────────────────────────────────

/**
 * Classify a text utterance into an intent.
 *
 * @param {string} text  Voice command text
 * @returns {{ intent: string, confidence: number, language: string, scores: object }}
 */
function classify(text) {
  const normalized = normalize(text);
  if (!normalized) {
    return { intent: 'none', confidence: 1.0, language: 'en', scores: {} };
  }

  const detectedLang = detectLanguage(text);
  const scores = {};

  for (const intent of INTENTS) {
    if (intent === 'none') continue;
    scores[intent] = 0;

    const keywords = INTENT_KEYWORDS[intent];
    if (!keywords) continue;

    // Score against ALL languages (handles romanized input)
    for (const lang of ['en', 'hi', 'te']) {
      const langKeywords = keywords[lang] || [];
      for (const { phrase, weight } of langKeywords) {
        const normalizedPhrase = normalize(phrase);
        if (normalized.includes(normalizedPhrase)) {
          // Bonus for exact match, length-ratio bonus for specificity
          const coverage = normalizedPhrase.length / Math.max(normalized.length, 1);
          const specificityBonus = coverage > 0.6 ? 0.2 : 0;
          const langBonus = (lang === detectedLang) ? 0.1 : 0;
          scores[intent] += weight + specificityBonus + langBonus;
        }
      }
    }
  }

  // Find best intent
  let bestIntent = 'none';
  let bestScore = 0;

  for (const [intent, score] of Object.entries(scores)) {
    if (score > bestScore) {
      bestScore = score;
      bestIntent = intent;
    }
  }

  // Confidence: normalize score to [0, 1]
  // A single strong keyword match (weight 1.0) should give ~0.8 confidence
  const confidence = bestScore > 0
    ? Math.min(1.0, bestScore / 1.5)
    : 0;

  // Threshold: require minimum confidence
  const CONFIDENCE_THRESHOLD = 0.25;
  if (confidence < CONFIDENCE_THRESHOLD) {
    bestIntent = 'none';
  }

  return {
    intent: bestIntent,
    confidence: Math.round(confidence * 100) / 100,
    language: detectedLang,
    scores,
  };
}

// ── Batch Classification ──────────────────────────────────────

function classifyBatch(texts) {
  return texts.map(text => ({
    input: text,
    ...classify(text),
  }));
}

// ── Exports ───────────────────────────────────────────────────

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    INTENTS,
    INTENT_KEYWORDS,
    classify,
    classifyBatch,
    normalize,
    detectLanguage,
  };
}
