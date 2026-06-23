# Gym Tracker Production PWA Design

## Context

Gym Tracker is already a local-first Android-focused React PWA. The MVP stores
personal workout data in IndexedDB, supports JSON backup/restore, includes
offline exercise images, and builds as static assets.

Production readiness for this stage means making the static PWA safe to publish
and easy to verify. It does not add accounts, sync, program editing, analytics,
or a backend.

## Goals

- Keep the app deployable as static files on a public host.
- Keep personal workout data local to the phone browser.
- Make production verification reproducible with one command after build.
- Confirm the production preview works on an Android-sized viewport.
- Document how to run, preview, publish, install on Android, and back up data.

## Non-Goals

- No remote sync.
- No hosted database.
- No authentication.
- No new workout tracking features.
- No migration away from IndexedDB.

## Production Shape

The app is published as a static PWA. Static hosts such as Cloudflare Pages or
Netlify can serve the generated `dist/` directory. The app shell, service
worker, manifest, icons, and exercise images are public. User workout data stays
inside the browser profile on the device that opened the app.

Production checks should validate the generated `dist/` output, not just source
files. The check should fail when required PWA files, icons, or exercise images
are missing.

## Deployment Flow

1. Run `npm test`.
2. Run `npm run smoke:prod`.
3. Publish `dist/` to a static host.
4. Open the public URL on Android.
5. Use browser menu -> add to home screen / install app.
6. Before replacing data or changing devices, use Settings -> Download JSON
   backup.

## Acceptance Criteria

- `npm run smoke:prod` builds the app and validates production output.
- Production output contains `index.html`, `manifest.webmanifest`, `sw.js`,
  PWA icons, and all 15 exercise PNG files.
- The web manifest keeps standalone portrait PWA behavior.
- Static host headers avoid stale service workers while allowing immutable
  caching for hashed/assets files.
- README documents development, checks, production preview, deploy, Android
  install, and local data backup.
- Production preview on a 390px-wide viewport has no horizontal overflow and
  shows Today, Program images, and Settings backup controls.
