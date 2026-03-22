---
name: quiz-game-dev
description: "Android quiz/trivia game development intelligence. Covers: game architecture, question data modeling, scoring systems, timer mechanics, round lifecycle, state machines, PWA patterns, offline-first design, Capacitor/Android distribution, question bank management, stem normalization, difficulty progression, streak multipliers, UI/UX for quiz apps, accessibility. Actions: plan, build, create, design, implement, review, fix, improve quiz/trivia game features. Trigger on: quiz, trivia, question bank, game round, scoring, timer, leaderboard, category, difficulty, streak, power-up, hint system."
---

# Quiz Game Dev - Trivia App Development Intelligence

Comprehensive development guide for building Android quiz and trivia games. Covers game architecture, question data modeling, scoring systems, timer mechanics, round lifecycle, PWA patterns, and Android distribution. Designed for TriviaQuest's vanilla JS PWA stack but applicable to any quiz app.

## When to Apply

Reference these guidelines when:
- Building or modifying quiz/trivia game features
- Designing question data models or bank structures
- Implementing scoring, timers, or round logic
- Working on game state management
- Adding new categories or question content
- Building offline-first PWA features
- Preparing for Android distribution (PWA install, Capacitor, native)

---

## Core Architecture: Game State Machine

Every quiz game is a **finite state machine**. Never use scattered booleans — use explicit states.

```
HOME → CATEGORY_SELECT → LOADING → PLAYING → ANSWER_FEEDBACK → ROUND_COMPLETE → RESULTS
  ↑                                    ↑              |                              |
  |                                    +--------------+                              |
  +---------------------------------------------------------------------------------+
```

### State Definitions

| State | Description | Allowed Transitions |
|-------|-------------|-------------------|
| `HOME` | Main menu / landing | → CATEGORY_SELECT |
| `CATEGORY_SELECT` | Player picks a category | → LOADING, → HOME |
| `LOADING` | Fetching/preparing questions | → PLAYING |
| `PLAYING` | Question displayed, timer running | → ANSWER_FEEDBACK (on answer or timeout) |
| `ANSWER_FEEDBACK` | Showing correct/incorrect + explanation | → PLAYING (next Q), → RESULTS (last Q) |
| `RESULTS` | Score summary, star rating | → HOME, → CATEGORY_SELECT |

### Rules
- **One state variable, never booleans** — `gameState = 'PLAYING'`, not `isPlaying && !isPaused && !isFinished`
- **Transitions are explicit functions** — `transitionTo(newState)` with validation
- **UI renders from state** — each state maps to exactly one screen/view
- **Timer only runs in PLAYING state** — start on enter, stop on exit

---

## Question Data Model

### Minimal Schema (bank.json format)

```json
{
  "question": "Which Indian city is known as the Silicon Valley of India?",
  "options": ["Hyderabad", "Chennai", "Bengaluru", "Pune"],
  "correct": 2,
  "explanation": "Bengaluru hosts the largest concentration of IT firms in India.",
  "category": "india",
  "difficulty": "Masters"
}
```

### Required Fields

| Field | Type | Validation | Notes |
|-------|------|-----------|-------|
| `question` | string | Non-empty, 10-500 chars | The question text |
| `options` | string[] | Exactly 4 items, all non-empty, all unique | Multiple choice answers |
| `correct` | number | 0-3 (valid index into options) | Index of correct answer |
| `category` | string | Must match a defined category slug | Lowercase, hyphenated |

### Recommended Fields

| Field | Type | Default | Notes |
|-------|------|---------|-------|
| `explanation` | string | "" | Shown after answering — educational value |
| `difficulty` | string | "medium" | "easy", "medium", "hard", "masters" |
| `tags` | string[] | [] | Cross-cutting topics for search/filter |
| `source` | string | "" | Attribution for external questions |

### Stem Normalization (Deduplication)

Questions often have practice variants (rewording of same concept). Group them by **normalized stem**:

1. Strip wrapper prefixes ("Which of the following...", "In practice, ...")
2. Remove articles and filler words
3. Lowercase and trim punctuation
4. Questions with same normalized stem are **variants** of one concept
5. Each round should pick at most **one variant per stem**

```javascript
function normalizeStem(text) {
  return text
    .replace(/^(which of the following|in practice,?\s*)/i, '')
    .replace(/[?.!,;:'"]/g, '')
    .toLowerCase()
    .trim();
}
```

### Quality Gates

- Minimum **100 unique normalized stems per category** — ensures 10+ non-repeating rounds
- All options must be plausible (no joke answers)
- Explanation should teach, not just confirm
- `npm test` (validate-bank.mjs) enforces schema + stem count

---

## Scoring Systems

### Basic (Current TriviaQuest)
- 1 point per correct answer
- Star rating: 80%+ = 3 stars, 50-79% = 2 stars, <50% = 1 star

### Enhanced (Recommended Additions)

| Mechanic | Formula | UX Impact |
|----------|---------|-----------|
| **Time bonus** | `max(0, timeRemaining * 10)` | Rewards quick answers |
| **Streak multiplier** | `basePoints * streakCount` (cap at 5x) | Rewards consistency |
| **Difficulty bonus** | Easy=1x, Medium=2x, Hard=3x | Rewards challenge |
| **Perfect round** | +50% bonus if all correct | Rewards mastery |

### Implementation Rules
- **Show score changes in real-time** — animate point additions
- **Never subtract points** — wrong answers score 0, not negative
- **Persist high scores per category** in localStorage
- **Show streak counter** visually during play

---

## Timer Mechanics

### Design Principles
- **Visual countdown** — SVG ring, progress bar, or numeric display
- **Color transitions** — Green (>50%) → Yellow (25-50%) → Red (<25%)
- **Audio/haptic warning** at 25% and 10% remaining (optional)
- **Auto-advance on timeout** — treat as wrong answer, show correct answer
- **Pause timer during feedback** — don't count explanation reading time

### Implementation Pattern

```javascript
const PER_QUESTION_SECONDS = 45;
let timerInterval = null;
let timeRemaining = PER_QUESTION_SECONDS;

function startTimer() {
  clearInterval(timerInterval);
  timeRemaining = PER_QUESTION_SECONDS;
  timerInterval = setInterval(() => {
    timeRemaining--;
    updateTimerDisplay(timeRemaining);
    if (timeRemaining <= 0) {
      clearInterval(timerInterval);
      handleTimeout(); // Auto-answer as wrong
    }
  }, 1000);
}

function stopTimer() {
  clearInterval(timerInterval);
}

// CRITICAL: Always stopTimer() before transitioning out of PLAYING state
```

---

## Round Lifecycle

### Question Selection Algorithm

1. **Build category pool** — group all questions by normalized stem
2. **Track round history** — which stems were used in recent rounds (localStorage)
3. **Prefer unseen stems** — pick stems not in last N rounds
4. **Random variant selection** — from each stem group, pick one random variant
5. **Shuffle order** — randomize question order within the round
6. **On pool exhaustion** — reset history, re-shuffle all stems

### Round Flow

```
pickRoundDeck(category, 10)
  → filter stems by "not recently seen"
  → if fewer than 10 unseen, add random seen stems
  → for each stem, pick random variant
  → shuffle final deck
  → return 10 questions
```

### Rules
- **Never repeat a question within the same round**
- **Prefer variety across rounds** — track stem usage history
- **Depletion is graceful** — when all stems are seen, reset and re-shuffle
- **Round size is configurable** — default 10, but allow 5/10/15/20

---

## PWA & Offline-First Patterns

### Service Worker Strategy

```javascript
// Cache-first for static assets, network-first for dynamic content
const CACHE_NAME = 'trivia-v1';
const CORE_ASSETS = ['index.html', 'bank.json', 'manifest.webmanifest'];

self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then(cached => cached || fetch(event.request))
  );
});
```

### Rules
- **Cache core assets on install** — HTML, JS, CSS, question bank, icons
- **Version the cache name** — bump on deploy to invalidate stale content
- **Offline fallback** — serve cached version when network fails
- **Background sync** — update cache when online without disrupting play
- **localStorage for game state** — round history, high scores, preferences

### Data Persistence Keys

| Key | Purpose | Format |
|-----|---------|--------|
| `BANK_LOCAL` | User's local question overrides | JSON (same schema as bank.json) |
| `ROUND_QUEUE_STATE_V1` | Per-category stem usage history | JSON map of category → stem[] |
| `HIGH_SCORES` | Best score per category | JSON map of category → number |
| `PREFERENCES` | Sound, timer, difficulty settings | JSON object |

---

## Android Distribution

### Path 1: PWA Install (Simplest)
- User visits site in Chrome → "Add to Home Screen" prompt
- `manifest.webmanifest` with `display: standalone` makes it feel native
- No app store needed, instant updates

### Path 2: Capacitor Wrapper (Recommended for Play Store)

```bash
npm install @capacitor/core @capacitor/cli
npx cap init TriviaQuest com.example.triviaquest --web-dir .
npx cap add android
npx cap sync
npx cap open android  # Opens in Android Studio
```

**Key Capacitor plugins for quiz games:**
- `@capacitor/haptics` — vibration on correct/wrong
- `@capacitor/local-notifications` — daily challenge reminders
- `@capacitor/share` — share scores to social media
- `@capacitor/splash-screen` — branded loading screen

### Path 3: Native Kotlin + Jetpack Compose (Full Rewrite)
- MVVM architecture with ViewModel + StateFlow
- Room DB for local questions, DataStore for preferences
- Jetpack Compose + Material 3 for UI
- Dagger Hilt for dependency injection
- Only justified if PWA/Capacitor limitations are blocking

---

## Common Anti-Patterns

| Anti-Pattern | Problem | Fix |
|-------------|---------|-----|
| Boolean state flags | `isPlaying && !isPaused && !isFinished` is error-prone | Use enum/string state machine |
| Timer leak | Timer keeps running after leaving game screen | Always `clearInterval` on state exit |
| Same questions every round | No randomization or history tracking | Track stem usage, prefer unseen |
| Hardcoded question count | Can't adjust round length | Make `ROUND_COUNT` configurable |
| No explanation after answer | Missed learning opportunity | Always show explanation text |
| Blocking fetch on start | Slow start if bank.json not cached | Pre-cache in service worker |
| localStorage without versioning | Schema changes break saved data | Version keys, migrate on load |
| No offline detection | Confusing errors when offline | Check `navigator.onLine`, show offline badge |

---

## Pre-Build Checklist

Before implementing any quiz game feature, verify:

### Data
- [ ] Question schema matches bank.json format (see data/question-schema.csv)
- [ ] All questions have 4 options with unique, plausible answers
- [ ] Correct index is valid (0-3)
- [ ] Explanations are educational, not just "correct answer is X"
- [ ] Minimum 100 unique stems per category
- [ ] `npm test` passes (validate-bank.mjs)

### Game Logic
- [ ] State machine has no impossible transitions
- [ ] Timer starts/stops at correct state boundaries
- [ ] No question repeats within a single round
- [ ] Scoring is transparent (player understands how points work)
- [ ] Results accurately reflect performance

### UI/UX (see data/quiz-ui.csv)
- [ ] Answer buttons are large enough (min 44x44px touch target)
- [ ] Color feedback: green=correct, red=incorrect
- [ ] Timer visualization changes color as time runs low
- [ ] Progress indicator shows current question number
- [ ] Results screen shows score, rating, and action buttons

### Offline & PWA
- [ ] Service worker caches all core assets
- [ ] Game works fully offline after first load
- [ ] manifest.webmanifest is valid
- [ ] Icons are provided at 192px and 512px

### Accessibility
- [ ] Keyboard navigation works for answer selection
- [ ] Screen reader announces question and options
- [ ] Color is not the only feedback mechanism (use icons + text too)
- [ ] Timer countdown is announced or visually prominent

---

## Data Files Reference

For detailed, searchable reference data, see:

- **[data/game-patterns.csv](data/game-patterns.csv)** — 40+ game mechanic patterns (state, scoring, timer, data, offline)
- **[data/quiz-ui.csv](data/quiz-ui.csv)** — 35+ quiz-specific UI/UX guidelines (cards, buttons, feedback, animations)
- **[data/question-schema.csv](data/question-schema.csv)** — Complete question field reference with validation rules
