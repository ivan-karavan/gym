# Gym Tracker MVP Design

## Context

The project starts from `training_program.md`: a 6-8 week, three-days-per-week full-body program with workouts A, B, and C. The user wants a personal Android-first training tracker for use in the gym after each set.

The MVP is a local-first Progressive Web App. It does not need accounts, a backend, or synchronization now, but the data model must be ready for future sync and program changes.

## Goals

- Let the user quickly log set results on an Android phone during a workout.
- Show the current training program with exercise descriptions and offline media.
- Show useful historical context while logging, especially the previous two weeks for the current exercise.
- Let the user review previous weeks without scrolling through a long archive to reach the current week.
- Keep all personal data local to the phone browser for MVP.
- Support full database backup and restore through a versioned JSON file.
- Preserve old workout results even if the training program changes later.

## Non-Goals

- No user accounts or remote sync in the MVP.
- No backend in the MVP.
- No program editor in the MVP.
- No structured out-of-plan exercise logging in the MVP.
- No merge/import conflict handling in the MVP.
- No CSV, Markdown, or analytics export in the MVP.

## Product Shape

The app is an Android-first PWA that can be hosted publicly as static files, for example through GitHub Pages. The application code, program metadata, exercise descriptions, and exercise images can be public. Personal workout data remains in the local browser database on the user's phone.

The primary experience is `Today-first`: opening the app should immediately show the next suggested workout and a clear start action. The app suggests the next workout by cycling `A -> B -> C` from the latest completed workout, but the user can manually choose A, B, or C before starting. Navigation keeps Today as the default destination, with secondary access to History, Program, and Settings.

The visual style should be utilitarian but not dry: large controls, strong readability, compact information density, and calm visual hierarchy. The workout logging flow matters more than decorative dashboards.

## Core Screens

### Today

The default screen. It shows:

- suggested next workout;
- manual A/B/C selector before starting;
- start/resume workout action;
- current week summary in a compact form;
- access to History, Program, and Settings without making those sections compete with the primary start/resume action.

### Active Workout

The main in-gym screen. It shows exercises in program order. Each exercise section includes:

- exercise name;
- target sets and reps or duration;
- logging controls for the exercise type;
- previous two weeks of results for the same stable exercise id;
- short technique description;
- offline image;
- optional link for further technique reference;
- optional per-set note.

The workout also has one general workout note field. This is where the user can record substitutions, gym constraints, fatigue, or any out-of-plan work. The MVP intentionally avoids structured out-of-plan exercise entries.

### History

History uses week or calendar navigation rather than an endless list. The user can move to previous weeks and inspect completed workouts for that week. The current week must remain easy to access and must not require scrolling past old weeks.

The MVP progress view includes:

- completed workouts per week;
- history for selected exercises;
- for `weight_reps`, the best logged weight for a selected exercise in each week, with its reps and effort;
- for `reps`, the best repetition count for a selected exercise in each week;
- for `duration`, the best duration for a selected exercise in each week.

### Program

The Program screen is read-only in the MVP. It shows workouts A, B, and C with exercise order, target ranges, exercise descriptions, offline images, and optional external reference links.

### Settings

Settings includes:

- export full local database to versioned JSON;
- restore from versioned JSON;
- destructive restore confirmation;
- basic storage/app version information.

## Logging Model

Exercises define their logging type:

- `weight_reps`: weight plus repetitions, used for barbell, dumbbell, and machine movements.
- `reps`: repetitions only, used for bodyweight movements without added weight.
- `duration`: time only, used for holds such as plank.

For `weight_reps` sets, the app records:

- decimal weight in kilograms;
- repetitions;
- effort: `easy`, `normal`, or `hard`;
- optional note.

The default effort value is `normal`. Weight input must support decimal values such as `42.5`. The Android UI should use numeric input with decimal support and can add fast adjustment buttons such as `-2.5`, `+2.5`, `-5`, and `+5`.

## Program Versioning

The MVP does not include a program editor, but the app must assume that the program can change later.

Program data is versioned. Exercises have stable ids. Workout logs reference stable exercise ids when possible, but each completed workout also stores a snapshot of the exercise as it existed at the time of logging:

- exercise id;
- exercise name;
- logging type;
- target sets and reps or duration;
- workout code and order;
- technique description;
- media id;
- optional reference link.

This prevents old workout history from appearing as if it belonged to a changed or replaced exercise.

## Data Architecture

The MVP uses IndexedDB for local persistence. The application should isolate persistence behind a repository/storage boundary so UI code does not depend directly on IndexedDB APIs. This keeps the project ready for future synchronization.

All durable entities should include:

- stable `id`;
- `createdAt`;
- `updatedAt`;
- `schemaVersion` where relevant.

The initial data model includes:

- `Program`
- `ProgramVersion`
- `WorkoutTemplate`
- `Exercise`
- `MediaAsset`
- `WorkoutSession`
- `WorkoutExerciseSnapshot`
- `SetLog`
- `AppSettings`

The repository layer should expose operations around product use cases, such as:

- load current program;
- suggest next workout;
- start workout session;
- add/update/delete set log;
- update workout note;
- complete workout session;
- load history by week;
- load previous two weeks for an exercise;
- export database;
- restore database.

## Offline Behavior

The app must work offline after installation. The PWA should cache:

- application shell;
- current program data;
- exercise descriptions;
- core exercise images;
- fonts/icons if locally bundled.

External technique links can exist, but they are optional references and must not be required for in-gym use.

## Backup and Restore

The backup format is a single versioned JSON file containing the full local database. It must include:

- backup schema version;
- export timestamp;
- app version if available;
- programs and program versions;
- workouts and set logs;
- settings.

Restore behavior in the MVP is full replacement only:

1. The user selects a JSON file.
2. The app validates that it is a supported backup.
3. The app explains that current local data will be replaced.
4. The user confirms.
5. The app replaces the local database.

The MVP does not merge imported data with existing data.

## Technology Direction

Use a static frontend app suitable for PWA deployment. A reasonable implementation choice is a small TypeScript app with a modern build tool and IndexedDB helper library, but the final implementation plan should verify the current repository state before choosing the exact stack.

The app should be deployable as static assets. A later sync implementation could add a backend or hosted database without changing the main UI flows.

Do not add OpenSpec to the MVP implementation unless a later planning step explicitly decides that the project needs a second, formal proposal/spec/task system. For this MVP, the Superpowers design and implementation plan are enough.

## Acceptance Criteria

- On Android, opening the app shows the Today screen and a suggested next workout.
- The user can manually choose A, B, or C before starting.
- The user can log sets quickly for all exercise logging types.
- Weight input supports decimal kilograms.
- Each set can store effort as easy, normal, or hard.
- Each workout can store a general note.
- Exercise descriptions and images are available offline.
- The current exercise shows the previous two weeks of results when available.
- The user can navigate to previous weeks without using a long scrolling archive.
- Backup exports the full database to a versioned JSON file.
- Restore validates a JSON backup and replaces the current database only after confirmation.
- Old completed workouts remain understandable after future program changes because snapshots are stored.
