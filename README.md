# TriviaQuest

A single-file-first trivia game, now upgraded to be **installable on Android** as a PWA and testable with a local validation script.

## Quick start

```bash
npm test
npm run serve
```

Then open `http://localhost:4173`.

## Current content volume

- **7 categories**
- **700 total questions** (100 per category, 4 options each)

## What changed for "next level"

- **PWA support**: manifest + service worker + install button.
- **Offline gameplay**: core assets are cached and still open when the network is down.
- **Install UX**: when install is available, users get a direct **Install App** button.
- **Basic quality gate**: embedded question bank schema check via `npm test`.
- **No-repeat rounds**: the game now samples one question stem per round slot first, so a 10-question round avoids near-duplicate variants.

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

- [ ] Increase question volume per category.
- [ ] Add progress persistence (last category, high scores).
- [ ] Add UI polish: haptics/sounds, streaks, animations.
- [ ] Add automated browser E2E checks (Playwright).
- [ ] Create release pipeline (deploy + Android build).
