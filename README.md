# TriviaQuest

A trivia game upgraded to be **installable on Android** as a PWA, now with an external `bank.json` to avoid giant merge conflicts and keep PRs clean.

## Quick start

```bash
npm test
npm run serve
```

Then open `http://localhost:4173`.

## Current content volume

- **7 categories**
- **840 total rows in `bank.json`** (**120 rows per category**)
- **840 real unique prompts total** (**120 unique prompts per category**)
- `npm test` now enforces **exactly 120 rows and 120 unique prompts per category** before the bank can ship
- `npm run audit:bank` exists to report duplicate and wrapper health separately from the ship gate

## Data layout (merge-conflict friendly)

- Question content is stored in `bank.json` (not embedded in HTML), so content updates no longer create huge `index.html` conflicts.
- `index.html` still keeps an empty `#embeddedBank` slot only for one-file backup exports.
- `npm test` validates `bank.json` directly.

## Admin CSV import format

- CSV imports must use this header row: `question,optionA,optionB,optionC,optionD,correct,explanation,difficulty,category`.
- Wrap any text field that contains commas in double quotes so it stays in a single column.
- Escape literal double quotes inside quoted text by doubling them as `""`.
- Blank trailing columns are allowed and will still be imported as empty values.

## What changed for "next level"

- **PWA support**: manifest + service worker + install button.
- **Offline gameplay**: core assets are cached and still open when the network is down.
- **Install UX**: when install is available, users get a direct **Install App** button.
- **Shipped quality gate**: `npm test` validates `bank.json` structure, answer integrity, and enforces **exactly 120 rows plus 120 unique prompts per category**.
- **Audit visibility**: `npm run audit:bank` reports duplicate-prompt and wrapper/variant health without changing the ship gate.
- **Round selection behavior**: rounds are built by randomized sampling from the category's **real full 120-prompt pool**, so each round draws from the shipped bank instead of a reduced transitional subset.

## Deploy on GitHub Pages (recommended)

1. Push this repo to GitHub.
2. Keep the workflow file at `.github/workflows/deploy-pages.yml` (already included).
3. In GitHub: **Settings → Pages → Build and deployment → Source: GitHub Actions**.
4. Push to `main` (or `master`) to auto-deploy.
5. Open your live URL: `https://<your-user>.github.io/<repo-name>/`.
6. On Android Chrome, open that URL and tap **Install App**.

## Use on Android (fastest path)

1. Deploy these files to HTTPS (Netlify, Vercel, GitHub Pages, Firebase Hosting, etc.).
2. Open the URL in Chrome on Android.
3. Tap the in-app **Install App** button (or Chrome menu → *Install app*).
4. App runs fullscreen and can work offline after first load.

## Downloadable Android APK (ship-ready path)

If you want a direct `.apk`:

1. Install tools: Android Studio + JDK 17 + Node.js LTS.
2. Initialize Capacitor in this repo:
   ```bash
   npm i -D @capacitor/cli
   npm i @capacitor/core @capacitor/android
   npx cap init TriviaQuest com.triviaquest.app --web-dir .
   npx cap add android
   npx cap sync android
   npx cap open android
   ```
3. In Android Studio, build:
   - Debug APK: *Build > Build Bundle(s) / APK(s) > Build APK(s)*
   - Release AAB/APK for Play Store: *Build > Generate Signed Bundle / APK*

## Iteration checklist (vibecode to ship-ready)

- [x] Ship **7 categories / 840 total rows / 120 real unique prompts per category** in `bank.json`.
- [x] Tighten the validator so `npm test` fails unless each category has **exactly 120 rows and 120 unique prompts**.
- [x] Add a bank audit script so duplicate-prompt and wrapper/variant health can be inspected with `npm run audit:bank`.
- [x] Keep round generation drawing from the category's real full pool rather than a reduced transitional subset.
- [ ] Add progress persistence (last category, high scores).
- [ ] Add UI polish: haptics/sounds, streaks, animations.
- [ ] Add automated browser E2E checks (Playwright).
- [ ] Create release pipeline (deploy + Android build).
