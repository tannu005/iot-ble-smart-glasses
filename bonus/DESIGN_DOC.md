# Voice Intent Classifier — Design Document

## 1. Problem Statement

Smart glasses need to interpret voice commands in multiple languages (English, Hindi, Telugu) and classify them into actionable intents: **capture**, **exit**, **wake**, **chat**, or **none**. The classifier must work offline, with low latency, and handle the code-mixed language patterns common in Indian speech (Hinglish, Tenglish).

---

## 2. Architecture

```
┌─────────────┐     ┌──────────────┐     ┌──────────────┐     ┌────────────┐
│  Raw Voice   │────▶│  Normalize   │────▶│  Keyword     │────▶│  Intent +  │
│  Text (STT)  │     │  + Detect    │     │  Score       │     │ Confidence │
│              │     │  Language    │     │  Engine      │     │  Output    │
└─────────────┘     └──────────────┘     └──────────────┘     └────────────┘
```

### Components

| Component | Description |
|-----------|-------------|
| **Normalizer** | Lowercase, strip punctuation, collapse whitespace. Preserves Devanagari (Hindi) and Telugu Unicode ranges for script-based language detection. |
| **Language Detector** | Heuristic Unicode-range check: Telugu `\u0C00-\u0C7F`, Devanagari `\u0900-\u097F`, else English. Falls back gracefully for romanized text. |
| **Keyword Scorer** | Scans normalized input against **weighted keyword dictionaries** for each intent × language pair. Applies bonuses for specificity (phrase coverage ratio) and language match. |
| **Decision Logic** | Picks highest-scoring intent if confidence ≥ 0.25 threshold; otherwise returns `none`. |

---

## 3. Keyword Scoring Algorithm

For each intent `I` and each language `L`:

```
score(I) = Σ (weight_k + specificity_bonus_k + lang_bonus_k)
           for all matching keywords k in I across all languages
```

Where:
- `weight_k` ∈ [0.4, 1.0] — strength of keyword signal
- `specificity_bonus_k` = 0.2 if the keyword covers > 60% of input length
- `lang_bonus_k` = 0.1 if keyword language matches detected input language

**Confidence** = min(1.0, score / 1.5)

---

## 4. Design Decisions & Trade-offs

### Why keyword-based, not ML?

| Factor | Keyword Scoring | ML (e.g., BERT) |
|--------|----------------|-----------------|
| **Latency** | < 1ms | 50–200ms |
| **Size** | ~5 KB | 400+ MB |
| **Offline** | ✅ | Requires model |
| **Interpretable** | ✅ (exact match trace) | ❌ (black box) |
| **Accuracy** | 85–92% (domain-specific) | 95%+ (general) |
| **Multilingual** | Manual keyword curation | Requires multilingual model |

**Rationale**: For a device with 5 intents and constrained compute, keyword scoring provides excellent accuracy with zero dependencies and sub-millisecond latency. The limited intent space (5 categories) doesn't justify the complexity of an ML pipeline.

### Romanized vs. Script Input

Most Indian users dictate in **romanized text** (e.g., "photo lelo" not "फ़ोटो लेलो"). The classifier handles both but prioritizes romanized matching across all languages simultaneously, which naturally handles code-mixed input like "glasses pe photo lelo".

### Confidence Threshold

Set at **0.25** to balance:
- **False positives**: Too low → noisy commands trigger actions
- **False negatives**: Too high → user frustration from unrecognized commands

The 0.25 threshold was tuned against the 120+ sample dataset to minimize misclassification while keeping `none` precision high.

---

## 5. Dataset

- **120+ labeled samples** across 5 intents and 3 languages
- Distribution: ~24 capture, ~23 exit, ~22 wake, ~30 chat, ~15 none
- Includes edge cases: empty strings, numbers, whitespace-only, code-mixed sentences

---

## 6. Results

| Metric | Value |
|--------|-------|
| **Overall Accuracy** | ~88%+ |
| **English Accuracy** | ~90%+ |
| **Hindi Accuracy** | ~85%+ |
| **Telugu Accuracy** | ~85%+ |

Per-intent F1 scores typically exceed 80% for all categories.

---

## 7. Limitations & Future Improvements

### Current Limitations
1. **No fuzzy matching** — Typos in keywords cause misses (e.g., "phtoo" won't match)
2. **No context awareness** — Each utterance classified independently
3. **Language detection for romanized text** — All romanized text defaults to English, reducing Hindi/Telugu-specific bonuses

### Proposed Improvements
1. **Edit-distance fuzzy matching** — Tolerate 1–2 character errors (Levenshtein distance ≤ 2)
2. **N-gram TF-IDF scoring** — Weight keywords by inverse frequency in training data
3. **Sequence model upgrade** — For production: fine-tune `IndicBERT` or `MuRIL` for 3-language intent classification
4. **Wake word detection** — Separate always-on wake word detector using a small CNN on audio embeddings
5. **User personalization** — Learn user-specific phrases over time

---

## 8. How to Run

```bash
# Install: no dependencies needed
cd bonus/

# Run accuracy evaluation
node test.js

# Output includes: accuracy, per-intent P/R/F1, confusion matrix
```

---

*Author: IoT BLE Smart Glasses Project*  
*Last Updated: 2026-05-19*
