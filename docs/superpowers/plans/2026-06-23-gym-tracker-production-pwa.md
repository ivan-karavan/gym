# Gym Tracker Production PWA Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Prepare the local-first Gym Tracker PWA for static production hosting and reproducible production verification.

**Architecture:** Keep the app as a static React/Vite PWA with local IndexedDB data. Add a Node smoke-check that validates built `dist/` artifacts and update static-host metadata/docs without changing workout behavior.

**Tech Stack:** Vite, React, TypeScript, vite-plugin-pwa, plain Node.js scripts.

---

## File Structure

- `scripts/smoke-production-build.mjs`: validates generated production files after `npm run build`.
- `package.json`: adds `smoke:prod` script.
- `index.html`: adds install/mobile metadata for production PWA behavior.
- `public/_headers`: static-host headers for service worker and immutable assets.
- `README.md`: documents production preview, deploy, Android install, and backup.
- `docs/superpowers/specs/2026-06-23-gym-tracker-production-pwa-design.md`: production-readiness design.

## Task 1: Add Production Smoke Check

- [ ] Create `scripts/smoke-production-build.mjs`.
- [ ] Validate required dist files: `index.html`, `manifest.webmanifest`, `sw.js`, `registerSW.js`, PWA icons.
- [ ] Validate 15 exercise PNG files exist in `dist/exercises`.
- [ ] Validate the manifest has `display: "standalone"`, `orientation: "portrait"`, `start_url: "."`, and both required icon sizes.
- [ ] Add `npm run smoke:prod` as `npm run build && node scripts/smoke-production-build.mjs`.
- [ ] Run `npm run smoke:prod` and expect `Production smoke check passed`.

## Task 2: Add Static PWA Hosting Metadata

- [ ] Add mobile/install metadata to `index.html`.
- [ ] Add `public/_headers` with no-cache service worker headers and long-lived asset caching.
- [ ] Run `npm run build`.
- [ ] Confirm `_headers` is copied into `dist/_headers`.

## Task 3: Document Production Operation

- [ ] Expand `README.md` with local development, test/build/smoke commands, production preview, static deploy, Android install, and backup guidance.
- [ ] Keep README explicit that personal data remains in local browser IndexedDB.
- [ ] Run `npm run smoke:prod` to ensure docs changes did not disturb the build.

## Task 4: Production Preview QA

- [ ] Run `npm run preview`.
- [ ] Open `http://localhost:4173/` in the in-app browser at `390x844`.
- [ ] Verify Today has no horizontal overflow.
- [ ] Verify Program shows 15 loaded exercise images.
- [ ] Verify Settings shows JSON export and restore controls.
- [ ] Verify the service worker registration exists in production preview.
- [ ] Stop the preview server.

## Task 5: Final Verification and Commit

- [ ] Run `npm test`.
- [ ] Run `npm run smoke:prod`.
- [ ] Run `git status --short`.
- [ ] Stage only production-readiness files, leaving `training_program.md` untracked.
- [ ] Commit with `chore: prepare production pwa`.
