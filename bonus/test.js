/**
 * ════════════════════════════════════════════════════════════════
 *  Voice Intent Classifier — Accuracy Evaluation
 * ════════════════════════════════════════════════════════════════
 *
 *  Runs the classifier against the full test dataset and reports:
 *   - Overall accuracy
 *   - Per-intent precision, recall, F1
 *   - Per-language accuracy
 *   - Confusion matrix
 *   - Failed examples for debugging
 *
 *  Run: node test.js
 */

'use strict';

const { classify, INTENTS } = require('./classifier.js');
const { TEST_DATASET } = require('./dataset.js');

// ── ANSI colors for terminal ──────────────────────────────────
const C = {
  reset:  '\x1b[0m',
  bold:   '\x1b[1m',
  dim:    '\x1b[2m',
  green:  '\x1b[32m',
  red:    '\x1b[31m',
  yellow: '\x1b[33m',
  cyan:   '\x1b[36m',
  magenta:'\x1b[35m',
  white:  '\x1b[37m',
};

function colorize(text, color) { return `${color}${text}${C.reset}`; }

// ── Run evaluation ────────────────────────────────────────────

console.log('\n' + colorize('═'.repeat(64), C.cyan));
console.log(colorize('  Voice Intent Classifier — Accuracy Evaluation', C.bold));
console.log(colorize('═'.repeat(64), C.cyan) + '\n');

const results = [];
const failures = [];
const confusionMatrix = {};
const langStats = {};

// Initialize confusion matrix
for (const actual of INTENTS) {
  confusionMatrix[actual] = {};
  for (const predicted of INTENTS) {
    confusionMatrix[actual][predicted] = 0;
  }
}

// Classify each sample
for (const sample of TEST_DATASET) {
  const result = classify(sample.text);
  const correct = result.intent === sample.expected;

  results.push({ ...sample, predicted: result.intent, confidence: result.confidence, correct });
  confusionMatrix[sample.expected][result.intent]++;

  // Per-language tracking
  if (!langStats[sample.lang]) {
    langStats[sample.lang] = { correct: 0, total: 0 };
  }
  langStats[sample.lang].total++;
  if (correct) langStats[sample.lang].correct++;

  if (!correct) {
    failures.push({
      text: sample.text,
      expected: sample.expected,
      predicted: result.intent,
      confidence: result.confidence,
      lang: sample.lang,
    });
  }
}

// ── Overall Accuracy ──────────────────────────────────────────

const totalCorrect = results.filter(r => r.correct).length;
const totalSamples = results.length;
const accuracy = (totalCorrect / totalSamples * 100).toFixed(1);

const accColor = accuracy >= 85 ? C.green : accuracy >= 70 ? C.yellow : C.red;
console.log(`${C.bold}Overall Accuracy:${C.reset}  ${colorize(accuracy + '%', accColor)}  (${totalCorrect}/${totalSamples})\n`);

// ── Per-Intent Metrics ────────────────────────────────────────

console.log(colorize('Per-Intent Metrics:', C.bold));
console.log('─'.repeat(58));
console.log(`${'Intent'.padEnd(12)} ${'Precision'.padEnd(12)} ${'Recall'.padEnd(12)} ${'F1 Score'.padEnd(12)} ${'Support'.padEnd(8)}`);
console.log('─'.repeat(58));

for (const intent of INTENTS) {
  const tp = confusionMatrix[intent][intent];
  const actualTotal = Object.values(confusionMatrix[intent]).reduce((a, b) => a + b, 0);
  let predictedTotal = 0;
  for (const actual of INTENTS) {
    predictedTotal += confusionMatrix[actual][intent];
  }

  const precision = predictedTotal > 0 ? (tp / predictedTotal) : 0;
  const recall = actualTotal > 0 ? (tp / actualTotal) : 0;
  const f1 = (precision + recall) > 0 ? (2 * precision * recall / (precision + recall)) : 0;

  const pStr = (precision * 100).toFixed(1) + '%';
  const rStr = (recall * 100).toFixed(1) + '%';
  const fStr = (f1 * 100).toFixed(1) + '%';
  const fColor = f1 >= 0.85 ? C.green : f1 >= 0.7 ? C.yellow : C.red;

  console.log(
    `${colorize(intent.padEnd(12), C.cyan)} ${pStr.padEnd(12)} ${rStr.padEnd(12)} ${colorize(fStr.padEnd(12), fColor)} ${String(actualTotal).padEnd(8)}`
  );
}
console.log('─'.repeat(58));

// ── Per-Language Accuracy ─────────────────────────────────────

console.log('\n' + colorize('Per-Language Accuracy:', C.bold));
console.log('─'.repeat(40));

const langNames = { en: 'English', hi: 'Hindi', te: 'Telugu' };
for (const [lang, stats] of Object.entries(langStats)) {
  const pct = (stats.correct / stats.total * 100).toFixed(1);
  const color = pct >= 85 ? C.green : pct >= 70 ? C.yellow : C.red;
  console.log(
    `  ${(langNames[lang] || lang).padEnd(10)} ${colorize(pct + '%', color)}  (${stats.correct}/${stats.total})`
  );
}
console.log('─'.repeat(40));

// ── Confusion Matrix ──────────────────────────────────────────

console.log('\n' + colorize('Confusion Matrix (rows=actual, cols=predicted):', C.bold));
console.log('─'.repeat(56));

const header = '  Actual\\Pred'.padEnd(16) + INTENTS.map(i => i.substring(0, 7).padEnd(8)).join('');
console.log(colorize(header, C.dim));

for (const actual of INTENTS) {
  let row = `  ${actual.padEnd(14)}`;
  for (const predicted of INTENTS) {
    const count = confusionMatrix[actual][predicted];
    const isCorrect = actual === predicted;
    const countStr = String(count).padEnd(8);
    row += isCorrect ? colorize(countStr, C.green) : (count > 0 ? colorize(countStr, C.red) : C.dim + countStr + C.reset);
  }
  console.log(row);
}
console.log('─'.repeat(56));

// ── Failures ──────────────────────────────────────────────────

if (failures.length > 0) {
  console.log('\n' + colorize(`Misclassified Samples (${failures.length}):`, C.bold));
  console.log('─'.repeat(72));

  for (const f of failures.slice(0, 15)) {
    const text = f.text.length > 35 ? f.text.substring(0, 35) + '…' : f.text;
    console.log(
      `  ${colorize(f.lang.padEnd(4), C.dim)}` +
      `"${text.padEnd(37)}" ` +
      `expected=${colorize(f.expected.padEnd(8), C.green)} ` +
      `got=${colorize(f.predicted.padEnd(8), C.red)} ` +
      `conf=${f.confidence.toFixed(2)}`
    );
  }

  if (failures.length > 15) {
    console.log(colorize(`  ... and ${failures.length - 15} more`, C.dim));
  }
  console.log('─'.repeat(72));
}

// ── Summary ───────────────────────────────────────────────────

console.log('\n' + colorize('═'.repeat(64), C.cyan));
console.log(colorize('  Summary', C.bold));
console.log(colorize('═'.repeat(64), C.cyan));
console.log(`  Total samples:     ${totalSamples}`);
console.log(`  Correct:           ${totalCorrect}`);
console.log(`  Misclassified:     ${failures.length}`);
console.log(`  Overall accuracy:  ${colorize(accuracy + '%', accColor)}`);
console.log(`  Languages tested:  ${Object.keys(langStats).map(l => langNames[l]).join(', ')}`);
console.log(`  Intents tested:    ${INTENTS.join(', ')}`);
console.log(colorize('═'.repeat(64), C.cyan) + '\n');

// Exit with error code if accuracy below threshold
if (parseFloat(accuracy) < 70) {
  console.log(colorize('⚠ FAIL: Accuracy below 70% threshold', C.red));
  process.exit(1);
}
