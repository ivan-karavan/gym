# Gym Tracker MVP Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build an Android-first local PWA for logging gym workouts, reviewing weekly progress, viewing the read-only program, and backing up/restoring the full local database as JSON.

**Architecture:** Use a static React + TypeScript PWA. Keep domain logic pure and tested, keep IndexedDB behind a repository boundary, and keep UI screens focused on Today, Active Workout, History, Program, and Settings. Store program snapshots in completed workout data so future program changes do not rewrite old history.

**Tech Stack:** Vite, React, TypeScript, Dexie for IndexedDB, Zod for backup validation, Vitest, React Testing Library, vite-plugin-pwa, lucide-react.

---

## File Structure

- `package.json`: npm scripts and dependencies.
- `index.html`: Vite HTML entry.
- `tsconfig.json`: TypeScript configuration.
- `vite.config.ts`: Vite, Vitest, and PWA configuration.
- `src/main.tsx`: React bootstrap.
- `src/App.tsx`: app shell and screen routing.
- `src/styles.css`: global mobile-first styles.
- `src/test/setup.ts`: Vitest DOM setup.
- `src/domain/types.ts`: stable domain types.
- `src/domain/workoutLogic.ts`: pure workout, history, and progress logic.
- `src/domain/workoutLogic.test.ts`: pure domain tests.
- `src/data/initialProgram.ts`: structured version of `training_program.md`.
- `src/data/initialProgram.test.ts`: seed program integrity tests.
- `src/storage/db.ts`: Dexie schema.
- `src/storage/repository.ts`: repository API wrapping IndexedDB.
- `src/storage/repository.test.ts`: repository integration tests with fake IndexedDB.
- `src/storage/backup.ts`: JSON export/restore validation helpers.
- `src/storage/backup.test.ts`: backup validation tests.
- `src/app/AppProvider.tsx`: React state provider around the repository.
- `src/app/useAppStore.ts`: app state hook and actions.
- `src/components/BottomNav.tsx`: simple screen navigation.
- `src/components/ExerciseCard.tsx`: exercise display and set list.
- `src/components/SetEditor.tsx`: set input controls for all logging types.
- `src/components/EffortToggle.tsx`: easy/normal/hard segmented control.
- `src/components/WeekPicker.tsx`: week navigation.
- `src/screens/TodayScreen.tsx`: default Today screen.
- `src/screens/ActiveWorkoutScreen.tsx`: active workout logger.
- `src/screens/HistoryScreen.tsx`: weekly history and exercise progress.
- `src/screens/ProgramScreen.tsx`: read-only program and exercise details.
- `src/screens/SettingsScreen.tsx`: JSON backup and restore.
- `public/exercises/*.png`: offline exercise illustrations.

## Task 1: Scaffold the React PWA Project

**Files:**
- Create: `package.json`
- Create: `index.html`
- Create: `tsconfig.json`
- Create: `vite.config.ts`
- Create: `vitest.config.ts`
- Create: `src/main.tsx`
- Create: `src/App.tsx`
- Create: `src/styles.css`
- Create: `src/test/setup.ts`
- Create: `public/pwa-192x192.png`
- Create: `public/pwa-512x512.png`
- Create: `.gitignore`

- [ ] **Step 1: Create package manifest**

Create `package.json`:

```json
{
  "name": "gym-tracker",
  "private": true,
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "dev": "vite --host 0.0.0.0",
    "build": "tsc --noEmit && vite build",
    "preview": "vite preview --host 0.0.0.0",
    "test": "vitest run --passWithNoTests",
    "test:watch": "vitest"
  },
  "dependencies": {
    "dexie": "^4.0.11",
    "lucide-react": "^0.468.0",
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "zod": "^3.24.1"
  },
  "devDependencies": {
    "@testing-library/jest-dom": "^6.6.3",
    "@testing-library/react": "^16.1.0",
    "@testing-library/user-event": "^14.5.2",
    "@types/react": "^18.3.18",
    "@types/react-dom": "^18.3.5",
    "@vite-pwa/assets-generator": "^0.2.6",
    "@vitejs/plugin-react": "^4.3.4",
    "fake-indexeddb": "^6.0.0",
    "jsdom": "^25.0.1",
    "typescript": "^5.7.2",
    "vite": "^6.0.5",
    "vite-plugin-pwa": "^0.21.1",
    "vitest": "^2.1.8"
  }
}
```

- [ ] **Step 2: Install dependencies**

Run:

```bash
npm install
```

Expected: `package-lock.json` is created and npm exits with code 0.

- [ ] **Step 3: Create Vite and TypeScript config**

Create `tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["DOM", "DOM.Iterable", "ES2020"],
    "allowJs": false,
    "skipLibCheck": true,
    "esModuleInterop": true,
    "allowSyntheticDefaultImports": true,
    "strict": true,
    "exactOptionalPropertyTypes": true,
    "forceConsistentCasingInFileNames": true,
    "module": "ESNext",
    "moduleResolution": "Node",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx"
  },
  "include": ["src", "vite.config.ts", "vitest.config.ts"]
}
```

Create `vite.config.ts`:

```ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["exercises/*.png"],
      manifest: {
        name: "Gym Tracker",
        short_name: "Gym",
        description: "Local-first workout tracker",
        theme_color: "#1f6f68",
        background_color: "#f7f5ef",
        display: "standalone",
        orientation: "portrait",
        start_url: ".",
        icons: [
          { src: "pwa-192x192.png", sizes: "192x192", type: "image/png" },
          { src: "pwa-512x512.png", sizes: "512x512", type: "image/png" }
        ]
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,ico,png,svg,webmanifest}"]
      }
    })
  ]
});
```

Create `vitest.config.ts`:

```ts
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "jsdom",
    setupFiles: ["src/test/setup.ts"],
    globals: true
  }
});
```

- [ ] **Step 4: Create app entry files**

Create `index.html`:

```html
<!doctype html>
<html lang="ru">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta name="theme-color" content="#1f6f68" />
    <title>Gym Tracker</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

Create `src/main.tsx`:

```tsx
import React from "react";
import ReactDOM from "react-dom/client";
import { App } from "./App";
import "./styles.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
```

Create `src/App.tsx`:

```tsx
export function App() {
  return (
    <main className="app-shell">
      <section className="screen">
        <p className="eyebrow">Gym Tracker</p>
        <h1>Сегодня</h1>
        <p>Каркас приложения готов к подключению программы и журнала.</p>
      </section>
    </main>
  );
}
```

Create `src/test/setup.ts`:

```ts
import "@testing-library/jest-dom/vitest";
```

- [ ] **Step 5: Add mobile-first base styles and git ignore**

Create `src/styles.css`:

```css
:root {
  color: #1d2428;
  background: #f7f5ef;
  font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  font-size: 16px;
  line-height: 1.5;
}

* {
  box-sizing: border-box;
}

body {
  margin: 0;
  min-width: 320px;
  min-height: 100vh;
  background: #f7f5ef;
}

button,
input,
textarea,
select {
  font: inherit;
}

button {
  min-height: 44px;
}

.app-shell {
  min-height: 100vh;
  padding: 16px;
}

.screen {
  width: min(100%, 760px);
  margin: 0 auto;
}

.eyebrow {
  margin: 0 0 4px;
  color: #4f6f6a;
  font-size: 0.78rem;
  font-weight: 700;
  letter-spacing: 0;
  text-transform: uppercase;
}

h1,
h2,
h3,
p {
  margin-top: 0;
}
```

Create `.gitignore`:

```gitignore
node_modules/
dist/
.env
.DS_Store
.serena/
.superpowers/
```

- [ ] **Step 6: Verify scaffold**

Create temporary PWA icon PNGs at `public/pwa-192x192.png` and `public/pwa-512x512.png`. Task 8 can replace them with final generated artwork, but the scaffold must not ship a manifest that points at missing icon files.

Run:

```bash
npm run build
npm run test
```

Expected: both commands pass. `npm run test` reports no test files or exits successfully after Vitest starts.

- [ ] **Step 7: Commit scaffold**

```bash
git add .gitignore package.json package-lock.json index.html tsconfig.json vite.config.ts vitest.config.ts src public/pwa-192x192.png public/pwa-512x512.png
git commit -m "feat: scaffold gym tracker pwa"
```

## Task 2: Add Domain Types and Seed Program

**Files:**
- Create: `src/domain/types.ts`
- Create: `src/data/initialProgram.ts`
- Create: `src/data/initialProgram.test.ts`

- [ ] **Step 1: Write seed program integrity tests**

Create `src/data/initialProgram.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { initialProgram } from "./initialProgram";

describe("initialProgram", () => {
  it("contains workouts A, B, and C in order", () => {
    expect(initialProgram.workouts.map((workout) => workout.code)).toEqual(["A", "B", "C"]);
    expect(initialProgram.workouts.map((workout) => workout.id)).toEqual(["workout-a", "workout-b", "workout-c"]);
  });

  it("uses exact workout exercise ids and targets from the plan", () => {
    expect(
      Object.fromEntries(
        initialProgram.workouts.map((workout) => [
          workout.code,
          workout.exercises.map((exercise) => ({
            exerciseId: exercise.exerciseId,
            target: exercise.target
          }))
        ])
      )
    ).toEqual({
      A: [
        { exerciseId: "ex-barbell-squat", target: "3 x 6-8" },
        { exerciseId: "ex-bench-press", target: "3 x 6-8" },
        { exerciseId: "ex-horizontal-row", target: "3 x 8-10" },
        { exerciseId: "ex-romanian-deadlift", target: "2-3 x 8-10" },
        { exerciseId: "ex-plank", target: "3 x 30-60 секунд" }
      ],
      B: [
        { exerciseId: "ex-deadlift", target: "3 x 4-6" },
        { exerciseId: "ex-overhead-press", target: "3 x 6-8" },
        { exerciseId: "ex-pull-up", target: "3 подхода не до отказа" },
        { exerciseId: "ex-leg-press-lunge", target: "3 x 8-10" },
        { exerciseId: "ex-face-pull", target: "2-3 x 12-15" }
      ],
      C: [
        { exerciseId: "ex-front-squat-light", target: "3 x 8" },
        { exerciseId: "ex-incline-dumbbell-press", target: "3 x 8-10" },
        { exerciseId: "ex-lat-pulldown", target: "3 x 8-10" },
        { exerciseId: "ex-hyperextension-leg-curl", target: "2-3 x 10-12" },
        { exerciseId: "ex-lateral-raise-abs", target: "2-3 x 12-15" }
      ]
    });
  });

  it("uses stable unique exercise ids", () => {
    const ids = initialProgram.exercises.map((exercise) => exercise.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids.every((id) => id.startsWith("ex-"))).toBe(true);
  });

  it("uses globally unique persisted ids", () => {
    const persistedIds = [
      initialProgram.program.id,
      ...initialProgram.versions.map((version) => version.id),
      ...initialProgram.workouts.map((workout) => workout.id),
      ...initialProgram.exercises.map((exercise) => exercise.id),
      ...initialProgram.media.map((media) => media.id)
    ];

    expect(new Set(persistedIds).size).toBe(persistedIds.length);
  });

  it("uses stable program ids and the current entity schema version", () => {
    const entities = [
      initialProgram.program,
      ...initialProgram.versions,
      ...initialProgram.workouts,
      ...initialProgram.exercises,
      ...initialProgram.media
    ];

    expect(initialProgram.program.id).toBe("program-full-body-2026-06");
    expect(initialProgram.currentVersion.id).toBe("program-version-full-body-2026-06-23");
    expect(entities.every((entity) => entity.schemaVersion === 1)).toBe(true);
  });

  it("has offline media for every exercise", () => {
    for (const exercise of initialProgram.exercises) {
      expect(exercise.mediaId).toMatch(/^media-/);
      const media = initialProgram.media.find((item) => item.id === exercise.mediaId);
      expect(media?.localPath).toMatch(/^exercises\/.+\.png$/);
    }
  });

  it("keeps program references valid", () => {
    const workoutIds = new Set(initialProgram.workouts.map((workout) => workout.id));
    const exerciseIds = new Set(initialProgram.exercises.map((exercise) => exercise.id));
    const mediaIds = new Set(initialProgram.media.map((media) => media.id));
    const referencedExerciseIds = new Set(
      initialProgram.workouts.flatMap((workout) => workout.exercises.map((exercise) => exercise.exerciseId))
    );
    const referencedMediaIds = new Set(initialProgram.exercises.map((exercise) => exercise.mediaId));

    expect(initialProgram.program.currentVersionId).toBe(initialProgram.currentVersion.id);
    expect(initialProgram.currentVersion.programId).toBe(initialProgram.program.id);
    expect(initialProgram.versions.map((version) => version.id)).toEqual([initialProgram.currentVersion.id]);
    expect(initialProgram.currentVersion.workoutIds).toEqual(initialProgram.workouts.map((workout) => workout.id));
    expect(referencedExerciseIds).toEqual(exerciseIds);
    expect(referencedMediaIds).toEqual(mediaIds);

    for (const workoutId of initialProgram.currentVersion.workoutIds) {
      expect(workoutIds.has(workoutId)).toBe(true);
    }

    for (const workout of initialProgram.workouts) {
      const orders = workout.exercises.map((exercise) => exercise.order).sort((left, right) => left - right);
      expect(orders).toEqual(Array.from({ length: workout.exercises.length }, (_, index) => index + 1));

      for (const exercise of workout.exercises) {
        expect(exerciseIds.has(exercise.exerciseId)).toBe(true);
      }
    }

    for (const exercise of initialProgram.exercises) {
      expect(mediaIds.has(exercise.mediaId)).toBe(true);
    }
  });
});
```

- [ ] **Step 2: Run seed test to verify it fails**

Run:

```bash
npm run test -- src/data/initialProgram.test.ts
```

Expected: FAIL because `src/data/initialProgram.ts` does not exist.

- [ ] **Step 3: Create domain types**

Create `src/domain/types.ts`:

```ts
export type WorkoutCode = "A" | "B" | "C";
export type LoggingType = "weight_reps" | "reps" | "duration";
export type Effort = "easy" | "normal" | "hard";
export type SessionStatus = "active" | "completed";
export type SchemaVersion = 1;

export interface EntityMeta {
  id: string;
  createdAt: string;
  updatedAt: string;
  schemaVersion: SchemaVersion;
}

export interface MediaAsset extends EntityMeta {
  localPath: string;
  alt: string;
  attribution?: string;
}

export interface Exercise extends EntityMeta {
  name: string;
  loggingType: LoggingType;
  description: string;
  cues: string[];
  mediaId: string;
  referenceUrl?: string;
}

export interface WorkoutExerciseTemplate {
  exerciseId: string;
  order: number;
  target: string;
}

export interface WorkoutTemplate extends EntityMeta {
  code: WorkoutCode;
  name: string;
  exercises: WorkoutExerciseTemplate[];
}

export interface ProgramVersion extends EntityMeta {
  programId: string;
  versionName: string;
  activeFrom: string;
  workoutIds: string[];
}

export interface Program extends EntityMeta {
  name: string;
  currentVersionId: string;
}

export interface ProgramBundle {
  program: Program;
  versions: ProgramVersion[];
  currentVersion: ProgramVersion;
  workouts: WorkoutTemplate[];
  exercises: Exercise[];
  media: MediaAsset[];
}

export interface WorkoutExerciseSnapshot {
  exerciseId: string;
  exerciseName: string;
  loggingType: LoggingType;
  target: string;
  workoutCode: WorkoutCode;
  order: number;
  description: string;
  mediaId: string;
  referenceUrl?: string;
}

export interface SetLogBase extends EntityMeta {
  sessionId: string;
  exerciseId: string;
  setIndex: number;
  effort: Effort;
  note?: string;
}

export type WeightRepsSetLog = SetLogBase & {
  loggingType: "weight_reps";
  weightKg: number;
  reps: number;
  durationSeconds?: never;
};

export type RepsSetLog = SetLogBase & {
  loggingType: "reps";
  reps: number;
  weightKg?: never;
  durationSeconds?: never;
};

export type DurationSetLog = SetLogBase & {
  loggingType: "duration";
  durationSeconds: number;
  weightKg?: never;
  reps?: never;
};

export type SetLog = WeightRepsSetLog | RepsSetLog | DurationSetLog;

export interface WorkoutSession extends EntityMeta {
  programVersionId: string;
  workoutTemplateId: string;
  workoutCode: WorkoutCode;
  status: SessionStatus;
  startedAt: string;
  completedAt?: string;
  note: string;
  exerciseSnapshots: WorkoutExerciseSnapshot[];
}

export interface AppSettings extends EntityMeta {
  activeProgramId: string;
}
```

- [ ] **Step 4: Create structured seed data**

Create `src/data/initialProgram.ts`:

```ts
import type { Exercise, MediaAsset, Program, ProgramBundle, ProgramVersion, WorkoutTemplate } from "../domain/types";

const now = "2026-06-23T00:00:00.000Z";

const meta = (id: string) => ({
  id,
  createdAt: now,
  updatedAt: now,
  schemaVersion: 1
});

export const media: MediaAsset[] = [
  { ...meta("media-barbell-squat"), localPath: "exercises/barbell-squat.png", alt: "Barbell back squat technique illustration" },
  { ...meta("media-bench-press"), localPath: "exercises/bench-press.png", alt: "Bench press technique illustration" },
  { ...meta("media-horizontal-row"), localPath: "exercises/horizontal-row.png", alt: "Horizontal row technique illustration" },
  { ...meta("media-romanian-deadlift"), localPath: "exercises/romanian-deadlift.png", alt: "Romanian deadlift technique illustration" },
  { ...meta("media-plank"), localPath: "exercises/plank.png", alt: "Plank technique illustration" },
  { ...meta("media-deadlift"), localPath: "exercises/deadlift.png", alt: "Deadlift technique illustration" },
  { ...meta("media-overhead-press"), localPath: "exercises/overhead-press.png", alt: "Overhead press technique illustration" },
  { ...meta("media-pull-up"), localPath: "exercises/pull-up.png", alt: "Pull-up technique illustration" },
  { ...meta("media-leg-press-lunge"), localPath: "exercises/leg-press-lunge.png", alt: "Leg press or lunge technique illustration" },
  { ...meta("media-face-pull"), localPath: "exercises/face-pull.png", alt: "Face pull technique illustration" },
  { ...meta("media-front-squat"), localPath: "exercises/front-squat.png", alt: "Front squat technique illustration" },
  { ...meta("media-incline-dumbbell-press"), localPath: "exercises/incline-dumbbell-press.png", alt: "Incline dumbbell press technique illustration" },
  { ...meta("media-lat-pulldown"), localPath: "exercises/lat-pulldown.png", alt: "Lat pulldown technique illustration" },
  { ...meta("media-hyperextension-leg-curl"), localPath: "exercises/hyperextension-leg-curl.png", alt: "Hyperextension or leg curl technique illustration" },
  { ...meta("media-lateral-raise-abs"), localPath: "exercises/lateral-raise-abs.png", alt: "Lateral raise and abs technique illustration" }
];

export const exercises: Exercise[] = [
  {
    ...meta("ex-barbell-squat"),
    name: "Присед со штангой",
    loggingType: "weight_reps",
    description: "Держи корпус напряженным, колени направляй по линии стоп, глубину выбирай без потери контроля.",
    cues: ["Стопы устойчиво", "Корпус жесткий", "Не работай в отказ"],
    mediaId: "media-barbell-squat"
  },
  {
    ...meta("ex-bench-press"),
    name: "Жим лежа",
    loggingType: "weight_reps",
    description: "Своди лопатки, контролируй опускание, жми без отбива от груди.",
    cues: ["Лопатки сведены", "Запястья над локтями", "Пауза без расслабления"],
    mediaId: "media-bench-press"
  },
  {
    ...meta("ex-horizontal-row"),
    name: "Тяга горизонтального блока или штанги в наклоне",
    loggingType: "weight_reps",
    description: "Начинай движение спиной, тяни локти назад, не дергай корпусом.",
    cues: ["Плечи вниз", "Локти назад", "Контроль в нижней точке"],
    mediaId: "media-horizontal-row"
  },
  {
    ...meta("ex-romanian-deadlift"),
    name: "Румынская тяга",
    loggingType: "weight_reps",
    description: "Отводи таз назад, сохраняй нейтральную спину, чувствуй растяжение задней поверхности бедра.",
    cues: ["Таз назад", "Спина нейтральна", "Штанга рядом с ногами"],
    mediaId: "media-romanian-deadlift"
  },
  {
    ...meta("ex-plank"),
    name: "Планка",
    loggingType: "duration",
    description: "Держи прямую линию от плеч до пяток, не проваливай поясницу.",
    cues: ["Ребра вниз", "Ягодицы напряжены", "Дыши ровно"],
    mediaId: "media-plank"
  },
  {
    ...meta("ex-deadlift"),
    name: "Становая тяга классическая или трап-гриф",
    loggingType: "weight_reps",
    description: "Начинай с устойчивой позиции, держи гриф близко, поднимай вес без рывка.",
    cues: ["Гриф близко", "Широчайшие включены", "Приоритет техники"],
    mediaId: "media-deadlift"
  },
  {
    ...meta("ex-overhead-press"),
    name: "Жим гантелей сидя или армейский жим",
    loggingType: "weight_reps",
    description: "Жми вверх по контролируемой траектории, не переразгибай поясницу.",
    cues: ["Корпус жесткий", "Локти под весом", "Без прогиба"],
    mediaId: "media-overhead-press"
  },
  {
    ...meta("ex-pull-up"),
    name: "Подтягивания",
    loggingType: "reps",
    description: "Начинай с активных лопаток, подтягивайся без раскачки и не доходи до отказа.",
    cues: ["Лопатки вниз", "Без рывка", "Оставь запас"],
    mediaId: "media-pull-up"
  },
  {
    ...meta("ex-leg-press-lunge"),
    name: "Жим ногами или выпады",
    loggingType: "weight_reps",
    description: "Выбери безопасный вариант для зала, контролируй колено и амплитуду.",
    cues: ["Колено по линии стопы", "Контроль глубины", "Без отбива"],
    mediaId: "media-leg-press-lunge"
  },
  {
    ...meta("ex-face-pull"),
    name: "Face pull или разведения на заднюю дельту",
    loggingType: "weight_reps",
    description: "Работай задней дельтой и верхом спины, не превращай движение в тягу корпусом.",
    cues: ["Плечи не зажимай", "Легкий вес", "Чистая техника"],
    mediaId: "media-face-pull"
  },
  {
    ...meta("ex-front-squat-light"),
    name: "Фронтальный присед или обычный присед полегче",
    loggingType: "weight_reps",
    description: "Держи корпус вертикальнее, чем в обычном приседе, и выбирай вес с запасом.",
    cues: ["Локти высоко", "Корпус высокий", "Легче, чем день A"],
    mediaId: "media-front-squat"
  },
  {
    ...meta("ex-incline-dumbbell-press"),
    name: "Жим гантелей на наклонной скамье",
    loggingType: "weight_reps",
    description: "Контролируй гантели внизу, жми симметрично и не заваливай плечи вперед.",
    cues: ["Лопатки стабильны", "Контроль внизу", "Ровный темп"],
    mediaId: "media-incline-dumbbell-press"
  },
  {
    ...meta("ex-lat-pulldown"),
    name: "Тяга верхнего блока или подтягивания",
    loggingType: "weight_reps",
    description: "Тяни локти вниз, не дергай рукоять корпусом и держи плечи под контролем.",
    cues: ["Плечи вниз", "Локти к ребрам", "Без раскачки"],
    mediaId: "media-lat-pulldown"
  },
  {
    ...meta("ex-hyperextension-leg-curl"),
    name: "Гиперэкстензия или сгибание ног",
    loggingType: "weight_reps",
    description: "Работай задней цепью без резких движений и без переразгибания поясницы.",
    cues: ["Нейтральная спина", "Спокойный темп", "Контроль амплитуды"],
    mediaId: "media-hyperextension-leg-curl"
  },
  {
    ...meta("ex-lateral-raise-abs"),
    name: "Подъемы гантелей в стороны и пресс",
    loggingType: "weight_reps",
    description: "Используй умеренный вес, поднимай без рывка и держи пресс под контролем.",
    cues: ["Легкий вес", "Локти мягкие", "Без инерции"],
    mediaId: "media-lateral-raise-abs"
  }
];

export const workouts: WorkoutTemplate[] = [
  {
    ...meta("workout-a"),
    code: "A",
    name: "Тренировка A",
    exercises: [
      { exerciseId: "ex-barbell-squat", order: 1, target: "3 x 6-8" },
      { exerciseId: "ex-bench-press", order: 2, target: "3 x 6-8" },
      { exerciseId: "ex-horizontal-row", order: 3, target: "3 x 8-10" },
      { exerciseId: "ex-romanian-deadlift", order: 4, target: "2-3 x 8-10" },
      { exerciseId: "ex-plank", order: 5, target: "3 x 30-60 секунд" }
    ]
  },
  {
    ...meta("workout-b"),
    code: "B",
    name: "Тренировка B",
    exercises: [
      { exerciseId: "ex-deadlift", order: 1, target: "3 x 4-6" },
      { exerciseId: "ex-overhead-press", order: 2, target: "3 x 6-8" },
      { exerciseId: "ex-pull-up", order: 3, target: "3 подхода не до отказа" },
      { exerciseId: "ex-leg-press-lunge", order: 4, target: "3 x 8-10" },
      { exerciseId: "ex-face-pull", order: 5, target: "2-3 x 12-15" }
    ]
  },
  {
    ...meta("workout-c"),
    code: "C",
    name: "Тренировка C",
    exercises: [
      { exerciseId: "ex-front-squat-light", order: 1, target: "3 x 8" },
      { exerciseId: "ex-incline-dumbbell-press", order: 2, target: "3 x 8-10" },
      { exerciseId: "ex-lat-pulldown", order: 3, target: "3 x 8-10" },
      { exerciseId: "ex-hyperextension-leg-curl", order: 4, target: "2-3 x 10-12" },
      { exerciseId: "ex-lateral-raise-abs", order: 5, target: "2-3 x 12-15" }
    ]
  }
];

export const program: Program = {
  ...meta("program-full-body-2026-06"),
  name: "Full-body 6-8 weeks",
  currentVersionId: "program-version-full-body-2026-06-23"
};

export const version: ProgramVersion = {
  ...meta("program-version-full-body-2026-06-23"),
  programId: program.id,
  versionName: "Initial full-body A/B/C",
  activeFrom: now,
  workoutIds: workouts.map((workout) => workout.id)
};

export const initialProgram: ProgramBundle = {
  program,
  versions: [version],
  currentVersion: version,
  workouts,
  exercises,
  media
};
```

- [ ] **Step 5: Verify seed tests pass**

Run:

```bash
npm run test -- src/data/initialProgram.test.ts
```

Expected: PASS.

- [ ] **Step 6: Commit domain seed**

```bash
git add src/domain/types.ts src/data/initialProgram.ts src/data/initialProgram.test.ts
git commit -m "feat: add initial training program data"
```

## Task 3: Implement Pure Workout Logic

**Files:**
- Create: `src/domain/workoutLogic.ts`
- Create: `src/domain/workoutLogic.test.ts`

- [ ] **Step 1: Write failing workout logic tests**

Create `src/domain/workoutLogic.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import type { SetLog, WorkoutSession } from "./types";
import {
  buildExerciseSnapshots,
  getPreviousExerciseSets,
  getWeekStart,
  getWorkoutByCode,
  groupSessionsByWeek,
  summarizeExerciseWeek,
  suggestNextWorkoutCode
} from "./workoutLogic";
import { initialProgram } from "../data/initialProgram";

const session = (id: string, workoutCode: "A" | "B" | "C", startedAt: string): WorkoutSession => ({
  id,
  createdAt: startedAt,
  updatedAt: startedAt,
  schemaVersion: 1,
  programVersionId: initialProgram.currentVersion.id,
  workoutTemplateId: `workout-${workoutCode.toLowerCase()}`,
  workoutCode,
  status: "completed",
  startedAt,
  completedAt: startedAt,
  note: "",
  exerciseSnapshots: []
});

const set = (id: string, sessionId: string, exerciseId: string, setIndex: number, startedAt: string, weightKg: number, reps: number): SetLog => ({
  id,
  sessionId,
  exerciseId,
  setIndex,
  loggingType: "weight_reps",
  weightKg,
  reps,
  effort: "normal",
  note: "",
  createdAt: startedAt,
  updatedAt: startedAt,
  schemaVersion: 1
});

describe("suggestNextWorkoutCode", () => {
  it("starts with A when there are no completed sessions", () => {
    expect(suggestNextWorkoutCode(initialProgram, [])).toBe("A");
  });

  it("cycles from latest completed workout", () => {
    expect(suggestNextWorkoutCode(initialProgram, [session("s1", "A", "2026-06-17T10:00:00.000Z")])).toBe("B");
    expect(suggestNextWorkoutCode(initialProgram, [session("s1", "C", "2026-06-17T10:00:00.000Z")])).toBe("A");
  });
});

describe("buildExerciseSnapshots", () => {
  it("stores exercise data as it exists at workout start", () => {
    const workout = initialProgram.workouts.find((item) => item.code === "A")!;
    const snapshots = buildExerciseSnapshots(initialProgram, workout);
    expect(snapshots[0]).toMatchObject({
      exerciseId: "ex-barbell-squat",
      exerciseName: "Присед со штангой",
      target: "3 x 6-8",
      workoutCode: "A",
      order: 1
    });
  });
});

describe("week helpers", () => {
  it("uses Monday as week start", () => {
    expect(getWeekStart("2026-06-23T12:00:00.000Z")).toBe("2026-06-22");
  });

  it("returns previous two weeks for an exercise", () => {
    const sessions = [
      session("s1", "A", "2026-06-10T10:00:00.000Z"),
      session("s2", "A", "2026-06-17T10:00:00.000Z"),
      session("s3", "A", "2026-06-24T10:00:00.000Z")
    ];
    const sets = [
      set("set1", "s1", "ex-bench-press", 1, "2026-06-10T10:00:00.000Z", 42.5, 8),
      set("set2", "s2", "ex-bench-press", 1, "2026-06-17T10:00:00.000Z", 45, 8),
      set("set3", "s3", "ex-bench-press", 1, "2026-06-24T10:00:00.000Z", 47.5, 6)
    ];

    const results = getPreviousExerciseSets("ex-bench-press", "2026-06-24T11:00:00.000Z", sessions, sets);
    expect(results.map((result) => result.weekStart)).toEqual(["2026-06-15", "2026-06-08"]);
    expect(results[0].sets[0].weightKg).toBe(45);
  });

  it("aggregates multiple completed sessions from the same previous week into one weekly hint", () => {
    const sessions = [
      session("s1", "A", "2026-06-16T10:00:00.000Z"),
      session("s2", "A", "2026-06-18T10:00:00.000Z")
    ];
    const sets = [
      set("set1", "s1", "ex-bench-press", 1, "2026-06-16T10:00:00.000Z", 42.5, 8),
      set("set2", "s2", "ex-bench-press", 1, "2026-06-18T10:00:00.000Z", 45, 7)
    ];

    const results = getPreviousExerciseSets("ex-bench-press", "2026-06-24T11:00:00.000Z", sessions, sets);
    expect(results).toHaveLength(1);
    expect(summarizeExerciseWeek("weight_reps", results[0].sets)).toBe("42.5 x 8, 45 x 7");
  });

  it("summarizes each weekly set without mixing effort into the compact hint", () => {
    const summary = summarizeExerciseWeek("weight_reps", [
      set("set1", "s1", "ex-bench-press", 1, "2026-06-17T10:00:00.000Z", 42.5, 8),
      set("set2", "s1", "ex-bench-press", 2, "2026-06-17T10:05:00.000Z", 45, 7)
    ]);
    expect(summary).toEqual("42.5 x 8, 45 x 7");
  });
});
```

- [ ] **Step 2: Run tests to verify failure**

Run:

```bash
npm run test -- src/domain/workoutLogic.test.ts
```

Expected: FAIL because `workoutLogic.ts` does not exist.

- [ ] **Step 3: Implement pure logic**

Create `src/domain/workoutLogic.ts`:

```ts
import type {
  Effort,
  LoggingType,
  ProgramBundle,
  SetLog,
  WorkoutCode,
  WorkoutExerciseSnapshot,
  WorkoutSession,
  WorkoutTemplate
} from "./types";

const workoutOrder: WorkoutCode[] = ["A", "B", "C"];
const effortLabel: Record<Effort, string> = {
  easy: "легко",
  normal: "норм",
  hard: "тяжело"
};

export interface WeeklyExerciseResult {
  weekStart: string;
  sets: SetLog[];
}

export function suggestNextWorkoutCode(sessions: WorkoutSession[]): WorkoutCode {
  const completed = sessions
    .filter((session) => session.status === "completed")
    .sort((left, right) => right.startedAt.localeCompare(left.startedAt));

  if (completed.length === 0) {
    return "A";
  }

  const latestIndex = workoutOrder.indexOf(completed[0].workoutCode);
  return workoutOrder[(latestIndex + 1) % workoutOrder.length];
}

export function getWorkoutByCode(bundle: ProgramBundle, code: WorkoutCode): WorkoutTemplate {
  const currentWorkoutIds = new Set(bundle.currentVersion.workoutIds);
  const workout = bundle.workouts.find((item) => item.code === code && currentWorkoutIds.has(item.id));
  if (!workout) {
    throw new Error(`Workout ${code} is missing from current program version ${bundle.currentVersion.id}`);
  }
  return workout;
}

export function buildExerciseSnapshots(bundle: ProgramBundle, workout: WorkoutTemplate): WorkoutExerciseSnapshot[] {
  return workout.exercises.map((entry) => {
    const exercise = bundle.exercises.find((item) => item.id === entry.exerciseId);
    if (!exercise) {
      throw new Error(`Missing exercise ${entry.exerciseId}`);
    }

    return {
      exerciseId: exercise.id,
      exerciseName: exercise.name,
      loggingType: exercise.loggingType,
      target: entry.target,
      workoutCode: workout.code,
      order: entry.order,
      description: exercise.description,
      mediaId: exercise.mediaId,
      referenceUrl: exercise.referenceUrl
    };
  });
}

export function getWeekStart(isoDate: string): string {
  const date = new Date(isoDate);
  const utcDay = date.getUTCDay();
  const offset = utcDay === 0 ? -6 : 1 - utcDay;
  const monday = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  monday.setUTCDate(monday.getUTCDate() + offset);
  return monday.toISOString().slice(0, 10);
}

function addDays(dateString: string, days: number): string {
  const date = new Date(`${dateString}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

export function getPreviousExerciseSets(
  exerciseId: string,
  currentDate: string,
  sessions: WorkoutSession[],
  sets: SetLog[],
  limitWeeks = 2
): WeeklyExerciseResult[] {
  const currentWeek = getWeekStart(currentDate);
  const wantedWeeks = [addDays(currentWeek, -14), addDays(currentWeek, -7)];

  return wantedWeeks.map((weekStart) => {
    const sessionIds = new Set(
      sessions
        .filter((session) => session.status === "completed" && getWeekStart(session.startedAt) === weekStart)
        .map((session) => session.id)
    );

    return {
      weekStart,
      sets: sets
        .filter((set) => set.exerciseId === exerciseId && sessionIds.has(set.sessionId))
        .sort((left, right) => left.setIndex - right.setIndex)
    };
  });
}

export function summarizeExerciseWeek(loggingType: LoggingType, sets: SetLog[]): string {
  if (sets.length === 0) {
    return "-";
  }

  if (loggingType === "duration") {
    const best = sets.reduce((current, candidate) =>
      (candidate.durationSeconds ?? 0) > (current.durationSeconds ?? 0) ? candidate : current
    );
    return sets.map((set) => `${set.durationSeconds ?? 0}с`).join(", ");
  }

  if (loggingType === "reps") {
    const best = sets.reduce((current, candidate) =>
      (candidate.reps ?? 0) > (current.reps ?? 0) ? candidate : current
    );
    return sets.map((set) => `${set.reps ?? 0}`).join(", ");
  }

  const best = sets.reduce((current, candidate) =>
    (candidate.weightKg ?? 0) > (current.weightKg ?? 0) ? candidate : current
  );
  return sets.map((set) => `${set.weightKg ?? 0} x ${set.reps ?? 0}`).join(", ");
}
```

- [ ] **Step 4: Verify logic tests pass**

Run:

```bash
npm run test -- src/domain/workoutLogic.test.ts src/data/initialProgram.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit pure logic**

```bash
git add src/domain/workoutLogic.ts src/domain/workoutLogic.test.ts
git commit -m "feat: add workout domain logic"
```

## Task 4: Add IndexedDB Repository

**Files:**
- Create: `src/storage/db.ts`
- Create: `src/storage/repository.ts`
- Create: `src/storage/repository.test.ts`

- [ ] **Step 1: Write repository integration tests**

Create `src/storage/repository.test.ts`:

```ts
import "fake-indexeddb/auto";
import Dexie from "dexie";
import { beforeEach, describe, expect, it } from "vitest";
import { createGymDatabase } from "./db";
import { createRepository } from "./repository";
import { initialProgram } from "../data/initialProgram";

describe("repository", () => {
  beforeEach(async () => {
    await Dexie.delete("gym-tracker-test");
  });

  it("initializes the current program", async () => {
    const db = createGymDatabase("gym-tracker-test");
    const repo = createRepository(db);
    await repo.initialize(initialProgram);

    const program = await repo.loadCurrentProgram();
    expect(program.program.id).toBe("program-full-body-2026-06");
    expect(program.workouts).toHaveLength(3);
  });

  it("starts a workout with exercise snapshots", async () => {
    const db = createGymDatabase("gym-tracker-test");
    const repo = createRepository(db);
    await repo.initialize(initialProgram);

    const session = await repo.startWorkout("A", "2026-06-23T10:00:00.000Z");
    expect(session.workoutCode).toBe("A");
    expect(session.exerciseSnapshots[0].exerciseName).toBe("Присед со штангой");
  });

  it("saves a set log and keeps decimal weight", async () => {
    const db = createGymDatabase("gym-tracker-test");
    const repo = createRepository(db);
    await repo.initialize(initialProgram);
    const session = await repo.startWorkout("A", "2026-06-23T10:00:00.000Z");

    await repo.saveSet({
      sessionId: session.id,
      exerciseId: "ex-bench-press",
      setIndex: 1,
      loggingType: "weight_reps",
      weightKg: 42.5,
      reps: 8,
      effort: "normal",
      note: ""
    });

    const sets = await repo.loadSetsForSession(session.id);
    expect(sets[0].weightKg).toBe(42.5);
  });
});
```

- [ ] **Step 2: Run repository tests to verify failure**

Run:

```bash
npm run test -- src/storage/repository.test.ts
```

Expected: FAIL because storage files do not exist.

- [ ] **Step 3: Implement Dexie database**

Create `src/storage/db.ts`:

```ts
import Dexie, { type Table } from "dexie";
import type { AppSettings, Exercise, MediaAsset, Program, ProgramVersion, SetLog, WorkoutSession, WorkoutTemplate } from "../domain/types";

export class GymDatabase extends Dexie {
  programs!: Table<Program, string>;
  programVersions!: Table<ProgramVersion, string>;
  workouts!: Table<WorkoutTemplate, string>;
  exercises!: Table<Exercise, string>;
  media!: Table<MediaAsset, string>;
  sessions!: Table<WorkoutSession, string>;
  sets!: Table<SetLog, string>;
  settings!: Table<AppSettings, string>;

  constructor(name = "gym-tracker") {
    super(name);
    this.version(1).stores({
      programs: "id, currentVersionId",
      programVersions: "id, programId",
      workouts: "id, code",
      exercises: "id, loggingType",
      media: "id",
      sessions: "id, workoutCode, status, startedAt, completedAt, programVersionId",
      sets: "id, sessionId, exerciseId, setIndex, [sessionId+exerciseId+setIndex]",
      settings: "id, activeProgramId"
    });
  }
}

export function createGymDatabase(name?: string) {
  return new GymDatabase(name);
}
```

- [ ] **Step 4: Implement repository**

Create `src/storage/repository.ts`:

```ts
import type { ProgramBundle, SetLog, WorkoutCode, WorkoutSession } from "../domain/types";
import { buildExerciseSnapshots, getWorkoutByCode } from "../domain/workoutLogic";
import type { GymDatabase } from "./db";

export type SaveSetInput = Omit<SetLog, "id" | "createdAt" | "updatedAt" | "schemaVersion">;

const settingsId = "app-settings";

function makeId(prefix: string) {
  return `${prefix}-${crypto.randomUUID()}`;
}

function makeLogicalSetId(sessionId: string, exerciseId: string, setIndex: number) {
  return `set-${encodeURIComponent(sessionId)}-${encodeURIComponent(exerciseId)}-${setIndex}`;
}

function nowIso() {
  return new Date().toISOString();
}

export function createRepository(db: GymDatabase) {
  return {
    async initialize(bundle: ProgramBundle) {
      const existing = await db.settings.get(settingsId);
      if (existing) {
        return;
      }

      await db.transaction("rw", db.programs, db.programVersions, db.workouts, db.exercises, db.media, db.settings, async () => {
        await db.programs.bulkPut([bundle.program]);
        await db.programVersions.bulkPut(bundle.versions);
        await db.workouts.bulkPut(bundle.workouts);
        await db.exercises.bulkPut(bundle.exercises);
        await db.media.bulkPut(bundle.media);
        await db.settings.put({
          id: settingsId,
          activeProgramId: bundle.program.id,
          createdAt: nowIso(),
          updatedAt: nowIso(),
          schemaVersion: 1
        });
      });
    },

    async loadCurrentProgram(): Promise<ProgramBundle> {
      const settings = await db.settings.get(settingsId);
      if (!settings) {
        throw new Error("App is not initialized");
      }

      const program = await db.programs.get(settings.activeProgramId);
      if (!program) {
        throw new Error(`Missing program ${settings.activeProgramId}`);
      }

      const version = await db.programVersions.get(program.currentVersionId);
      if (!version) {
        throw new Error(`Missing program version ${program.currentVersionId}`);
      }

      const workouts = await db.workouts.bulkGet(version.workoutIds);
      const versions = await db.programVersions.where("programId").equals(program.id).toArray();
      const exercises = await db.exercises.toArray();
      const media = await db.media.toArray();
      const orderedWorkouts = workouts.map((workout, index) => {
        if (!workout) {
          throw new Error(`Missing workout ${version.workoutIds[index]}`);
        }
        return workout;
      });

      return {
        program,
        versions,
        currentVersion: version,
        workouts: orderedWorkouts,
        exercises,
        media
      };
    },

    async startWorkout(code: WorkoutCode, startedAt = nowIso()): Promise<WorkoutSession> {
      const bundle = await this.loadCurrentProgram();
      const workout = getWorkoutByCode(bundle, code);

      const session: WorkoutSession = {
        id: makeId("session"),
        createdAt: startedAt,
        updatedAt: startedAt,
        schemaVersion: 1,
        programVersionId: bundle.currentVersion.id,
        workoutTemplateId: workout.id,
        workoutCode: code,
        status: "active",
        startedAt,
        note: "",
        exerciseSnapshots: buildExerciseSnapshots(bundle, workout)
      };

      await db.sessions.put(session);
      return session;
    },

    async saveSet(input: SaveSetInput): Promise<SetLog> {
      const timestamp = nowIso();
      const id = makeLogicalSetId(input.sessionId, input.exerciseId, input.setIndex);
      const existing = await db.sets.get(id);

      const set: SetLog = {
        id,
        createdAt: existing?.createdAt ?? timestamp,
        updatedAt: timestamp,
        schemaVersion: 1,
        ...input
      };

      await db.sets.put(set);
      return set;
    },

    async loadSetsForSession(sessionId: string): Promise<SetLog[]> {
      return db.sets.where("sessionId").equals(sessionId).sortBy("setIndex");
    },

    async loadSessions(): Promise<WorkoutSession[]> {
      return db.sessions.orderBy("startedAt").toArray();
    },

    async loadAllSets(): Promise<SetLog[]> {
      return db.sets.toArray();
    },

    async updateWorkoutNote(sessionId: string, note: string): Promise<void> {
      await db.sessions.update(sessionId, { note, updatedAt: nowIso() });
    },

    async completeWorkout(sessionId: string, completedAt = nowIso()): Promise<void> {
      await db.sessions.update(sessionId, { status: "completed", completedAt, updatedAt: nowIso() });
    }
  };
}
```

- [ ] **Step 5: Verify repository tests pass**

Run:

```bash
npm run test -- src/storage/repository.test.ts src/domain/workoutLogic.test.ts
```

Expected: PASS.

- [ ] **Step 6: Commit repository**

```bash
git add src/storage/db.ts src/storage/repository.ts src/storage/repository.test.ts
git commit -m "feat: add local workout repository"
```

## Task 5: Add JSON Backup and Restore Validation

**Files:**
- Create: `src/storage/backup.ts`
- Create: `src/storage/backup.test.ts`
- Use: `src/storage/db.ts`

- [ ] **Step 1: Write backup tests**

Create `src/storage/backup.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import "fake-indexeddb/auto";
import Dexie from "dexie";
import { exportBackup, parseBackup, restoreBackup } from "./backup";
import { createGymDatabase } from "./db";
import { createRepository } from "./repository";
import { initialProgram } from "../data/initialProgram";

describe("backup", () => {
  it("exports a versioned full database backup", async () => {
    const db = createGymDatabase("gym-tracker-backup-test");
    const repo = createRepository(db);
    await repo.initialize(initialProgram);
    const session = await repo.startWorkout("A", "2026-06-23T10:00:00.000Z");
    await repo.saveSet({
      sessionId: session.id,
      exerciseId: "ex-bench-press",
      setIndex: 1,
      loggingType: "weight_reps",
      weightKg: 42.5,
      reps: 8,
      effort: "normal"
    });

    const backup = await exportBackup(db);

    expect(backup.schemaVersion).toBe(1);
    expect(backup.programs[0].id).toBe("program-full-body-2026-06");
    expect(backup.sets[0].weightKg).toBe(42.5);
    expect(backup.exportedAt).toMatch(/T/);
  });

  it("rejects unsupported backup data", () => {
    expect(() => parseBackup({ schemaVersion: 999 })).toThrow("Unsupported backup format");
  });

  it("rejects impossible set shapes", () => {
    expect(() =>
      parseBackup({
        schemaVersion: 1,
        exportedAt: "2026-06-23T00:00:00.000Z",
        appVersion: "0.1.0",
        programs: [],
        programVersions: [],
        workouts: [],
        exercises: [],
        media: [],
        sessions: [],
        settings: [],
        sets: [{ id: "set-1", createdAt: "x", updatedAt: "x", schemaVersion: 1, sessionId: "s", exerciseId: "e", setIndex: 1, effort: "normal", loggingType: "reps", reps: 8, weightKg: 42.5 }]
      })
    ).toThrow("Unsupported backup format");
  });
});
```

- [ ] **Step 2: Run backup tests to verify failure**

Run:

```bash
npm run test -- src/storage/backup.test.ts
```

Expected: FAIL because `backup.ts` does not exist.

- [ ] **Step 3: Implement backup helpers**

Create `src/storage/backup.ts`:

```ts
import { z } from "zod";
import type { AppSettings, Exercise, MediaAsset, Program, ProgramVersion, SetLog, WorkoutSession, WorkoutTemplate } from "../domain/types";

const entityMetaSchema = z.object({
  id: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
  schemaVersion: z.literal(1)
});

const weightRepsSetSchema = entityMetaSchema.extend({
  sessionId: z.string(),
  exerciseId: z.string(),
  setIndex: z.number(),
  effort: z.enum(["easy", "normal", "hard"]),
  note: z.string().optional(),
  loggingType: z.literal("weight_reps"),
  weightKg: z.number(),
  reps: z.number()
}).strict();

const repsSetSchema = entityMetaSchema.extend({
  sessionId: z.string(),
  exerciseId: z.string(),
  setIndex: z.number(),
  effort: z.enum(["easy", "normal", "hard"]),
  note: z.string().optional(),
  loggingType: z.literal("reps"),
  reps: z.number()
}).strict();

const durationSetSchema = entityMetaSchema.extend({
  sessionId: z.string(),
  exerciseId: z.string(),
  setIndex: z.number(),
  effort: z.enum(["easy", "normal", "hard"]),
  note: z.string().optional(),
  loggingType: z.literal("duration"),
  durationSeconds: z.number()
}).strict();

const backupSchema = z.object({
  schemaVersion: z.literal(1),
  exportedAt: z.string(),
  appVersion: z.string(),
  programs: z.array(entityMetaSchema.passthrough()),
  programVersions: z.array(entityMetaSchema.passthrough()),
  workouts: z.array(entityMetaSchema.passthrough()),
  exercises: z.array(entityMetaSchema.passthrough()),
  media: z.array(z.object({ id: z.string(), localPath: z.string(), alt: z.string(), attribution: z.string().optional() })),
  sessions: z.array(entityMetaSchema.passthrough()),
  sets: z.array(z.discriminatedUnion("loggingType", [weightRepsSetSchema, repsSetSchema, durationSetSchema])),
  settings: z.array(entityMetaSchema.passthrough())
});

export interface BackupPayload {
  schemaVersion: 1;
  exportedAt: string;
  appVersion: string;
  programs: Program[];
  programVersions: ProgramVersion[];
  workouts: WorkoutTemplate[];
  exercises: Exercise[];
  media: MediaAsset[];
  sessions: WorkoutSession[];
  sets: SetLog[];
  settings: AppSettings[];
}

export type BackupTables = Omit<BackupPayload, "schemaVersion" | "exportedAt" | "appVersion">;

export async function exportBackup(db: GymDatabase, appVersion = "0.1.0"): Promise<BackupPayload> {
  return {
    schemaVersion: 1,
    exportedAt: new Date().toISOString(),
    appVersion,
    programs: await db.programs.toArray(),
    programVersions: await db.programVersions.toArray(),
    workouts: await db.workouts.toArray(),
    exercises: await db.exercises.toArray(),
    media: await db.media.toArray(),
    sessions: await db.sessions.toArray(),
    sets: await db.sets.toArray(),
    settings: await db.settings.toArray()
  };
}

export function parseBackup(value: unknown): BackupPayload {
  const result = backupSchema.safeParse(value);
  if (!result.success) {
    throw new Error("Unsupported backup format");
  }
  return validateBackupGraph(result.data as BackupPayload);
}

function validateBackupGraph(payload: BackupPayload): BackupPayload {
  // Reject before restoreBackup clears any local tables:
  // duplicate ids, invalid timestamps, missing or non-unique app-settings,
  // broken settings -> program -> currentVersion -> workouts references,
  // broken workout -> exercises -> media references, and broken session/set refs.
  return payload;
}

export async function restoreBackup(db: GymDatabase, payload: BackupPayload): Promise<void> {
  await db.transaction("rw", [db.programs, db.programVersions, db.workouts, db.exercises, db.media, db.sessions, db.sets, db.settings], async () => {
    await Promise.all([db.programs.clear(), db.programVersions.clear(), db.workouts.clear(), db.exercises.clear(), db.media.clear(), db.sessions.clear(), db.sets.clear(), db.settings.clear()]);
    await Promise.all([db.programs.bulkPut(payload.programs), db.programVersions.bulkPut(payload.programVersions), db.workouts.bulkPut(payload.workouts), db.exercises.bulkPut(payload.exercises), db.media.bulkPut(payload.media), db.sessions.bulkPut(payload.sessions), db.sets.bulkPut(payload.sets), db.settings.bulkPut(payload.settings)]);
  });
}
```

```ts
async exportTables() {
  return {
    programs: await db.programs.toArray(),
    programVersions: await db.programVersions.toArray(),
    workouts: await db.workouts.toArray(),
    exercises: await db.exercises.toArray(),
    media: await db.media.toArray(),
    sessions: await db.sessions.toArray(),
    sets: await db.sets.toArray(),
    settings: await db.settings.toArray()
  };
},

async replaceAllTables(tables: import("./backup").BackupTables): Promise<void> {
  await db.transaction(
    "rw",
    db.programs,
    db.programVersions,
    db.workouts,
    db.exercises,
    db.media,
    db.sessions,
    db.sets,
    db.settings,
    async () => {
      await Promise.all([
        db.programs.clear(),
        db.programVersions.clear(),
        db.workouts.clear(),
        db.exercises.clear(),
        db.media.clear(),
        db.sessions.clear(),
        db.sets.clear(),
        db.settings.clear()
      ]);

      await db.programs.bulkPut(tables.programs);
      await db.programVersions.bulkPut(tables.programVersions);
      await db.workouts.bulkPut(tables.workouts);
      await db.exercises.bulkPut(tables.exercises);
      await db.media.bulkPut(tables.media);
      await db.sessions.bulkPut(tables.sessions);
      await db.sets.bulkPut(tables.sets);
      await db.settings.bulkPut(tables.settings);
    }
  );
}
```

- [ ] **Step 5: Verify backup tests pass**

Run:

```bash
npm run test -- src/storage/backup.test.ts src/storage/repository.test.ts
```

Expected: PASS.

- [ ] **Step 6: Commit backup core**

```bash
git add src/storage/backup.ts src/storage/backup.test.ts src/storage/repository.ts
git commit -m "feat: add json backup validation"
```

## Task 6: Build App State, Today Screen, and Active Workout Screen

**Files:**
- Create: `src/app/AppProvider.tsx`
- Create: `src/app/useAppStore.ts`
- Create: `src/components/EffortToggle.tsx`
- Create: `src/components/SetEditor.tsx`
- Create: `src/components/ExerciseCard.tsx`
- Create: `src/screens/TodayScreen.tsx`
- Create: `src/screens/ActiveWorkoutScreen.tsx`
- Modify: `src/App.tsx`
- Modify: `src/styles.css`
- Create: `src/screens/TodayScreen.test.tsx`
- Create: `src/screens/ActiveWorkoutScreen.test.tsx`

- [ ] **Step 1: Write Today screen behavior test**

Create `src/screens/TodayScreen.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { TodayScreen } from "./TodayScreen";

describe("TodayScreen", () => {
  it("shows suggested workout and allows manual selection", async () => {
    const onStart = vi.fn();
    render(<TodayScreen suggestedWorkout="A" onStart={onStart} />);

    expect(screen.getByRole("heading", { name: "Сегодня" })).toBeInTheDocument();
    expect(screen.getByText("Тренировка A")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Выбрать B" }));
    await userEvent.click(screen.getByRole("button", { name: "Начать тренировку" }));

    expect(onStart).toHaveBeenCalledWith("B");
  });
});
```

- [ ] **Step 2: Write Active Workout set logging test**

Create `src/screens/ActiveWorkoutScreen.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { ActiveWorkoutScreen } from "./ActiveWorkoutScreen";
import type { WorkoutSession } from "../domain/types";

const session: WorkoutSession = {
  id: "session-1",
  createdAt: "2026-06-23T10:00:00.000Z",
  updatedAt: "2026-06-23T10:00:00.000Z",
  schemaVersion: 1,
  programVersionId: "version-1",
  workoutTemplateId: "workout-a",
  workoutCode: "A",
  status: "active",
  startedAt: "2026-06-23T10:00:00.000Z",
  note: "",
  exerciseSnapshots: [
    {
      exerciseId: "ex-bench-press",
      exerciseName: "Жим лежа",
      loggingType: "weight_reps",
      target: "3 x 6-8",
      workoutCode: "A",
      order: 1,
      description: "Своди лопатки и контролируй опускание.",
      mediaId: "media-bench-press"
    }
  ]
};

describe("ActiveWorkoutScreen", () => {
  it("records decimal weight, reps, and effort", async () => {
    const onSaveSet = vi.fn();
    render(
      <ActiveWorkoutScreen
        session={session}
        sets={[]}
        previousWeeks={{ "ex-bench-press": ["42.5 x 8", "45 x 7"] }}
        mediaById={{ "media-bench-press": "exercises/bench-press.png" }}
        onSaveSet={onSaveSet}
        onNoteChange={vi.fn()}
        onComplete={vi.fn()}
      />
    );

    await userEvent.type(screen.getByLabelText("Вес, кг"), "47.5");
    await userEvent.type(screen.getByLabelText("Повторы"), "6");
    await userEvent.click(screen.getByRole("button", { name: "тяжело" }));
    await userEvent.click(screen.getByRole("button", { name: "Сохранить подход" }));

    expect(onSaveSet).toHaveBeenCalledWith({
      exerciseId: "ex-bench-press",
      setIndex: 1,
      loggingType: "weight_reps",
      weightKg: 47.5,
      reps: 6,
      effort: "hard",
      note: ""
    });
  });
});
```

- [ ] **Step 3: Run UI tests to verify failure**

Run:

```bash
npm run test -- src/screens/TodayScreen.test.tsx src/screens/ActiveWorkoutScreen.test.tsx
```

Expected: FAIL because the screens do not exist.

- [ ] **Step 4: Implement EffortToggle and SetEditor**

Create `src/components/EffortToggle.tsx`:

```tsx
import type { Effort } from "../domain/types";

const labels: Record<Effort, string> = {
  easy: "легко",
  normal: "норм",
  hard: "тяжело"
};

export function EffortToggle({ value, onChange }: { value: Effort; onChange: (value: Effort) => void }) {
  return (
    <div className="segmented" aria-label="Оценка подхода">
      {(["easy", "normal", "hard"] as Effort[]).map((effort) => (
        <button
          key={effort}
          type="button"
          className={value === effort ? "is-selected" : ""}
          onClick={() => onChange(effort)}
        >
          {labels[effort]}
        </button>
      ))}
    </div>
  );
}
```

Create `src/components/SetEditor.tsx`:

```tsx
import { useState } from "react";
import type { Effort, LoggingType } from "../domain/types";
import { EffortToggle } from "./EffortToggle";

export interface SetEditorSave {
  exerciseId: string;
  setIndex: number;
  loggingType: LoggingType;
  weightKg?: number;
  reps?: number;
  durationSeconds?: number;
  effort: Effort;
  note?: string;
}

interface SetEditorProps {
  exerciseId: string;
  loggingType: LoggingType;
  setIndex: number;
  onSave: (payload: SetEditorSave) => void;
}

export function SetEditor({ exerciseId, loggingType, setIndex, onSave }: SetEditorProps) {
  const [weightKg, setWeightKg] = useState("");
  const [reps, setReps] = useState("");
  const [durationSeconds, setDurationSeconds] = useState("");
  const [effort, setEffort] = useState<Effort>("normal");
  const [note, setNote] = useState("");

  const save = () => {
    onSave({
      exerciseId,
      setIndex,
      loggingType,
      ...(loggingType === "weight_reps"
        ? { loggingType, weightKg: Number(weightKg), reps: Number(reps) }
        : loggingType === "reps"
          ? { loggingType, reps: Number(reps) }
          : { loggingType, durationSeconds: Number(durationSeconds) }),
      effort,
      ...(note ? { note } : {})
    } as SetEditorSave);
    setReps("");
    setDurationSeconds("");
    setNote("");
  };

  return (
    <div className="set-editor">
      {loggingType === "weight_reps" && (
        <div className="set-grid">
          <label>
            Вес, кг
            <input value={weightKg} onChange={(event) => setWeightKg(event.target.value)} inputMode="decimal" />
          </label>
          <label>
            Повторы
            <input value={reps} onChange={(event) => setReps(event.target.value)} inputMode="numeric" />
          </label>
        </div>
      )}

      {loggingType === "reps" && (
        <label>
          Повторы
          <input value={reps} onChange={(event) => setReps(event.target.value)} inputMode="numeric" />
        </label>
      )}

      {loggingType === "duration" && (
        <label>
          Секунды
          <input value={durationSeconds} onChange={(event) => setDurationSeconds(event.target.value)} inputMode="numeric" />
        </label>
      )}

      <EffortToggle value={effort} onChange={setEffort} />

      <label>
        Заметка к подходу
        <textarea value={note} onChange={(event) => setNote(event.target.value)} rows={2} />
      </label>

      <button type="button" className="primary-button" onClick={save}>
        Сохранить подход
      </button>
    </div>
  );
}
```

- [ ] **Step 5: Implement Today and Active Workout screens**

Create `src/screens/TodayScreen.tsx`:

```tsx
import { useState } from "react";
import type { WorkoutCode } from "../domain/types";

interface TodayScreenProps {
  suggestedWorkout: WorkoutCode;
  onStart: (code: WorkoutCode) => void;
}

export function TodayScreen({ suggestedWorkout, onStart }: TodayScreenProps) {
  const [selectedWorkout, setSelectedWorkout] = useState<WorkoutCode>(suggestedWorkout);

  return (
    <section className="screen">
      <p className="eyebrow">Следующая по циклу</p>
      <h1>Сегодня</h1>
      <div className="today-card">
        <h2>Тренировка {selectedWorkout}</h2>
        <div className="segmented" aria-label="Выбор тренировки">
          {(["A", "B", "C"] as WorkoutCode[]).map((code) => (
            <button
              key={code}
              type="button"
              className={selectedWorkout === code ? "is-selected" : ""}
              onClick={() => setSelectedWorkout(code)}
            >
              Выбрать {code}
            </button>
          ))}
        </div>
        <button type="button" className="primary-button" onClick={() => onStart(selectedWorkout)}>
          Начать тренировку
        </button>
      </div>
    </section>
  );
}
```

Create `src/screens/ActiveWorkoutScreen.tsx`:

```tsx
import type { SetLog, WorkoutSession } from "../domain/types";
import { SetEditor, type SetEditorSave } from "../components/SetEditor";

interface ActiveWorkoutScreenProps {
  session: WorkoutSession;
  sets: SetLog[];
  previousWeeks: Record<string, string[]>;
  mediaById: Record<string, string>;
  onSaveSet: (payload: SetEditorSave) => void;
  onNoteChange: (note: string) => void;
  onComplete: () => void;
}

export function ActiveWorkoutScreen({
  session,
  sets,
  previousWeeks,
  mediaById,
  onSaveSet,
  onNoteChange,
  onComplete
}: ActiveWorkoutScreenProps) {
  return (
    <section className="screen active-workout">
      <p className="eyebrow">Тренировка {session.workoutCode}</p>
      <h1>Подходы</h1>

      {session.exerciseSnapshots.map((exercise) => {
        const exerciseSets = sets.filter((set) => set.exerciseId === exercise.exerciseId);
        const nextSetIndex = exerciseSets.length + 1;

        return (
          <article className="exercise-card" key={exercise.exerciseId}>
            <img src={mediaById[exercise.mediaId]} alt="" className="exercise-image" />
            <h2>{exercise.exerciseName}</h2>
            <p className="target">{exercise.target}</p>
            <p>{exercise.description}</p>

            <div className="previous-results">
              <strong>Последние 2 недели</strong>
              {(previousWeeks[exercise.exerciseId] ?? ["-", "-"]).map((line, index) => (
                <p key={`${exercise.exerciseId}-${index}`}>{line}</p>
              ))}
            </div>

            {exerciseSets.length > 0 && (
              <ol className="set-list">
                {exerciseSets.map((set) => (
                  <li key={set.id}>
                    {set.loggingType === "weight_reps" ? `${set.weightKg} кг · ${set.reps} повт. · ` : ""}
                    {set.loggingType === "reps" ? `${set.reps} повт. · ` : ""}
                    {set.loggingType === "duration" ? `${set.durationSeconds} сек · ` : ""}
                    {set.effort}
                  </li>
                ))}
              </ol>
            )}

            <SetEditor
              exerciseId={exercise.exerciseId}
              loggingType={exercise.loggingType}
              setIndex={nextSetIndex}
              onSave={onSaveSet}
            />
          </article>
        );
      })}

      <label>
        Заметка к тренировке
        <textarea value={session.note} onChange={(event) => onNoteChange(event.target.value)} rows={4} />
      </label>

      <button type="button" className="primary-button" onClick={onComplete}>
        Завершить тренировку
      </button>
    </section>
  );
}
```

- [ ] **Step 6: Wire app provider and screen routing**

Create `src/app/useAppStore.ts` and `src/app/AppProvider.tsx` to initialize the repository, load the current program, suggest the next workout, start sessions, save sets, update workout notes, and complete sessions.

Modify `src/App.tsx` to render the provider and use a simple local route state:

```tsx
type Screen = "today" | "active" | "history" | "program" | "settings";
```

The default screen is `today`.

- [ ] **Step 7: Add production mobile styles**

Extend `src/styles.css` with:

- `.primary-button` for large start/save actions;
- `.segmented` with stable equal-width buttons;
- `.exercise-card` with compact spacing and an image area;
- `.set-grid` with fixed columns for weight/reps controls;
- `.bottom-nav` with four icon buttons and labels;
- responsive max width `760px`.

Buttons must keep at least `44px` height for Android touch use.

- [ ] **Step 8: Verify UI tests and build**

Run:

```bash
npm run test -- src/screens/TodayScreen.test.tsx src/screens/ActiveWorkoutScreen.test.tsx
npm run build
```

Expected: PASS.

- [ ] **Step 9: Commit Today and workout UI**

```bash
git add src
git commit -m "feat: add today and workout logging screens"
```

## Task 7: Add History, Program, and Settings Screens

**Files:**
- Create: `src/components/BottomNav.tsx`
- Create: `src/components/WeekPicker.tsx`
- Create: `src/screens/HistoryScreen.tsx`
- Create: `src/screens/ProgramScreen.tsx`
- Create: `src/screens/SettingsScreen.tsx`
- Create: `src/screens/SettingsScreen.test.tsx`
- Modify: `src/App.tsx`
- Modify: `src/styles.css`

- [ ] **Step 1: Write Settings backup/restore UI test**

Create `src/screens/SettingsScreen.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { SettingsScreen } from "./SettingsScreen";

describe("SettingsScreen", () => {
  it("requires confirmation before replacing local data", async () => {
    const onExport = vi.fn();
    const onRestore = vi.fn();
    render(<SettingsScreen onExport={onExport} onRestore={onRestore} />);

    await userEvent.click(screen.getByRole("button", { name: "Восстановить из JSON" }));
    expect(screen.getByText("Текущая локальная база будет заменена.")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Подтвердить замену" }));
    expect(onRestore).toHaveBeenCalledTimes(1);
  });
});
```

- [ ] **Step 2: Run Settings test to verify failure**

Run:

```bash
npm run test -- src/screens/SettingsScreen.test.tsx
```

Expected: FAIL because `SettingsScreen.tsx` does not exist.

- [ ] **Step 3: Implement BottomNav and WeekPicker**

Create `src/components/BottomNav.tsx` with four buttons:

- `Сегодня`
- `История`
- `Программа`
- `Настройки`

Use lucide-react icons: `Dumbbell`, `CalendarDays`, `BookOpen`, `Settings`.

Create `src/components/WeekPicker.tsx` with props:

```ts
interface WeekPickerProps {
  weekStart: string;
  onPreviousWeek: () => void;
  onNextWeek: () => void;
  onCurrentWeek: () => void;
}
```

It must show previous and next buttons plus a current-week button. This avoids a long scrolling archive.

- [ ] **Step 4: Implement History screen**

Create `src/screens/HistoryScreen.tsx` with:

- `WeekPicker`;
- completed workouts for the selected week;
- exercise progress list using `summarizeExerciseWeek`;
- empty state `За эту неделю тренировок пока нет`.

Keep data passed as props from the app store. Do not query IndexedDB directly from the screen.

- [ ] **Step 5: Implement Program screen**

Create `src/screens/ProgramScreen.tsx` with:

- read-only workout sections A/B/C;
- exercise name, target, description, cues, and image;
- no edit controls.

- [ ] **Step 6: Implement Settings screen**

Create `src/screens/SettingsScreen.tsx` with:

- export button `Скачать JSON backup`;
- restore button `Восстановить из JSON`;
- file input accepting `.json` and `application/json`;
- confirmation panel text `Текущая локальная база будет заменена.`;
- confirmation button `Подтвердить замену`.

Wire `onExport` to generate a blob and download a file named `gym-tracker-backup-YYYY-MM-DD.json`.

- [ ] **Step 7: Wire screens into App**

Modify `src/App.tsx` so `BottomNav` switches between Today, History, Program, and Settings. Active Workout can remain a modal-like full screen entered from Today.

- [ ] **Step 8: Verify screen tests and build**

Run:

```bash
npm run test -- src/screens/SettingsScreen.test.tsx src/screens/TodayScreen.test.tsx src/screens/ActiveWorkoutScreen.test.tsx
npm run build
```

Expected: PASS.

- [ ] **Step 9: Commit secondary screens**

```bash
git add src
git commit -m "feat: add history program and settings screens"
```

## Task 8: Add Offline Exercise Images and PWA Assets

**Files:**
- Create: `public/exercises/barbell-squat.png`
- Create: `public/exercises/bench-press.png`
- Create: `public/exercises/horizontal-row.png`
- Create: `public/exercises/romanian-deadlift.png`
- Create: `public/exercises/plank.png`
- Create: `public/exercises/deadlift.png`
- Create: `public/exercises/overhead-press.png`
- Create: `public/exercises/pull-up.png`
- Create: `public/exercises/leg-press-lunge.png`
- Create: `public/exercises/face-pull.png`
- Create: `public/exercises/front-squat.png`
- Create: `public/exercises/incline-dumbbell-press.png`
- Create: `public/exercises/lat-pulldown.png`
- Create: `public/exercises/hyperextension-leg-curl.png`
- Create: `public/exercises/lateral-raise-abs.png`
- Create: `public/pwa-192x192.png`
- Create: `public/pwa-512x512.png`

- [ ] **Step 1: Generate exercise images**

Use the `imagegen` skill to create simple, neutral, copyright-safe bitmap illustrations. Use this shared style for all images:

```text
Clean instructional fitness illustration, one adult athlete, neutral gym background, teal and charcoal accents, clear exercise pose, no text, no logos, square composition, high contrast, mobile app asset
```

Generate one PNG for each exercise path listed above. Use the exercise name as the pose detail, for example:

```text
Clean instructional fitness illustration, one adult athlete performing a barbell back squat, neutral gym background, teal and charcoal accents, clear exercise pose, no text, no logos, square composition, high contrast, mobile app asset
```

- [ ] **Step 2: Generate PWA icons**

Create `public/pwa-192x192.png` and `public/pwa-512x512.png` as simple app icons with a stylized dumbbell mark, teal background, no text, no logo copying.

- [ ] **Step 3: Verify asset paths**

Run:

```bash
node -e "const fs=require('fs'); const paths=['barbell-squat','bench-press','horizontal-row','romanian-deadlift','plank','deadlift','overhead-press','pull-up','leg-press-lunge','face-pull','front-squat','incline-dumbbell-press','lat-pulldown','hyperextension-leg-curl','lateral-raise-abs']; for (const p of paths) { if (!fs.existsSync('public/exercises/'+p+'.png')) throw new Error(p); }"
```

Expected: exits with code 0.

- [ ] **Step 4: Verify PWA build includes assets**

Run:

```bash
npm run build
```

Expected: PASS and `dist/manifest.webmanifest` exists.

- [ ] **Step 5: Commit assets**

```bash
git add public vite.config.ts src/data/initialProgram.ts
git commit -m "feat: add offline pwa assets"
```

## Task 9: Final Integration and Android-Focused QA

**Files:**
- Modify: `README.md`
- Modify: `src/styles.css`
- Modify: app files only if tests or browser verification reveal issues.

- [ ] **Step 1: Create README**

Create `README.md`:

```md
# Gym Tracker

Android-first local PWA for logging workouts from the initial full-body A/B/C program.

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

Workout data is stored locally in the phone browser through IndexedDB. Use Settings -> Download JSON backup to save the full local database. Restore replaces the current local database after confirmation.
```

- [ ] **Step 2: Run full automated verification**

Run:

```bash
npm run test
npm run build
```

Expected: PASS.

- [ ] **Step 3: Start local server**

Run:

```bash
npm run dev
```

Expected: Vite prints a local URL.

- [ ] **Step 4: Browser-check mobile viewport**

Use the browser plugin against the Vite URL. Verify at a mobile viewport close to `390x844`:

- Today screen is visible without horizontal scroll.
- Start workout opens Active Workout.
- Weight input accepts `42.5`.
- Effort toggle can select `легко`, `норм`, and `тяжело`.
- Workout note can be edited.
- History screen is reachable without scrolling through old weeks.
- Program screen shows images and descriptions.
- Settings screen shows JSON export and restore confirmation.

- [ ] **Step 5: Fix any visual overlap or touch-target issues**

If browser verification shows overlap, clipped labels, tiny touch targets, or horizontal scroll, update `src/styles.css` and rerun:

```bash
npm run build
```

Expected: PASS.

- [ ] **Step 6: Stop dev server**

Stop the Vite process cleanly with Ctrl-C in the running terminal session.

- [ ] **Step 7: Commit final integration**

```bash
git add README.md src package.json package-lock.json vite.config.ts public
git commit -m "feat: finish gym tracker mvp"
```

## Final Verification Before Completion

Run:

```bash
npm run test
npm run build
git status --short
```

Expected:

- tests pass;
- build passes;
- only intentionally untracked local helper files remain, such as `.superpowers/` if visual brainstorming artifacts were kept out of git.
