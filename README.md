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
- **840 raw rows total in `bank.json`** (**120 rows per category**)
- **672 unique playable stems total** (**96 unique stems per category**) once the current wrapper prefixes and `Practice Variant N` suffixes are normalized
- Each stem currently appears as multiple practice variants, so the bank does **not** yet contain 100 distinct prompts per category

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
- **Basic quality gate**: `npm test` validates `bank.json` structure, answer integrity, at least 100 raw rows per category, and 100 unique normalized stems per category after wrapper/punctuation normalization.
- **Round selection behavior**: rounds are built by **randomized sampling**, not by a fully exhaustive fixed queue. The app groups practice variants by normalized stem, picks up to 10 unique stems per round, prefers stems not seen in the most recent rounds for that category, and only reuses prior stems after that shortlist is exhausted.
- **Content target (not yet met)**: ship-ready content should reach **100 distinct playable prompts per category**. The current bank normalizes down to **96 unique stems per category**, so `npm test` now fails until the remaining wrapper/variant duplicates are replaced with new prompts.

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

- [ ] Expand every category from the current **96 unique normalized stems** to **100 distinct playable prompts** (raw row count alone is not enough).
- [x] Tighten the validator so `npm test` fails unless each category has **100 unique normalized stems**, not just 100+ rows and a minimum stem-variety floor.
- [ ] Keep round generation on randomized stem sampling unless product direction changes to an explicitly exhaustive queue.
- [ ] Add progress persistence (last category, high scores).
- [ ] Add UI polish: haptics/sounds, streaks, animations.
- [ ] Add automated browser E2E checks (Playwright).
- [ ] Create release pipeline (deploy + Android build).
