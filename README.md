# Gym Tracker

Android-first local PWA for logging workouts from the initial full-body A/B/C
program.

The app is local-first: workout data stays in the current browser profile through
IndexedDB. The public static site can be shared, but personal data is not synced
or uploaded.

## Development

```bash
npm install
npm run dev
```

Open the local URL from Vite. For phone testing on the same network, open the
network URL printed by Vite, for example `http://192.168.x.x:5173/`.

## Checks

```bash
npm run test
npm run build
npm run smoke:prod
```

`npm run smoke:prod` builds the app and checks the production `dist/` output:
manifest, service worker, icons, static-host headers, and all offline exercise
images.

## Production Preview

```bash
npm run smoke:prod
npm run preview
```

Open `http://localhost:4173/` locally, or the network URL printed by Vite from
an Android phone on the same network.

## Static Deploy

Publish the generated `dist/` directory to a static host such as Cloudflare Pages
or Netlify.

Recommended build settings:

- build command: `npm run smoke:prod`
- publish directory: `dist`
- Node.js: current LTS

The included `public/_headers` file keeps service worker files fresh while
allowing long-lived caching for hashed assets and offline exercise images.

## GitHub Pages

This repository is configured for the project URL
`https://<username>.github.io/gym/`.

In GitHub:

1. Open `Settings -> Pages`.
2. Set `Build and deployment -> Source` to `GitHub Actions`.
3. Push `main`.
4. Open the deployment URL from the completed `Deploy GitHub Pages` action.

The Vite `base` option is set to `/gym/`, so rename the repository only together
with the matching `base` value in `vite.config.ts`.

## Android Install

1. Open the production URL in Chrome on Android.
2. Open the browser menu.
3. Choose install/add to home screen.
4. Open Gym from the home screen before going to the gym.
5. Keep a recent JSON backup before changing phone, browser, or hosting URL.

## Data

Workout data is stored locally in the phone browser through IndexedDB. Use
Settings -> Download JSON backup to save the full local database. Restore
replaces the current local database after confirmation.

Back up before:

- clearing browser data;
- changing phones;
- switching browsers;
- restoring from another backup;
- relying on a new production URL.
