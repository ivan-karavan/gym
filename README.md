# Gym Tracker

Android-first local PWA for logging workouts from the initial full-body A/B/C
program.

## Development

```bash
npm install
npm run dev
```

## Checks

```bash
npm run test
npm run build
```

## Data

Workout data is stored locally in the phone browser through IndexedDB. Use
Settings -> Download JSON backup to save the full local database. Restore
replaces the current local database after confirmation.
