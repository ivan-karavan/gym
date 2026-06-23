import { describe, expect, it } from "vitest";
import { initialProgram } from "../data/initialProgram";
import type { ProgramBundle, SetLog, WorkoutCode, WorkoutSession } from "./types";
import {
  buildExerciseSnapshots,
  getPreviousExerciseSets,
  getWeekStart,
  getWorkoutByCode,
  groupSessionsByWeek,
  suggestNextWorkoutCode,
  summarizeExerciseWeek,
} from "./workoutLogic";

const baseTimestamp = "2026-06-23T10:00:00.000+03:00";

const cloneBundle = (): ProgramBundle => ({
  program: { ...initialProgram.program },
  versions: initialProgram.versions.map((version) => ({ ...version })),
  currentVersion: { ...initialProgram.currentVersion },
  workouts: initialProgram.workouts.map((workout) => ({
    ...workout,
    exercises: workout.exercises.map((exercise) => ({ ...exercise })),
  })),
  exercises: initialProgram.exercises.map((exercise) => ({
    ...exercise,
    cues: [...exercise.cues],
  })),
  media: initialProgram.media.map((media) => ({ ...media })),
});

const session = (
  id: string,
  workoutCode: WorkoutCode,
  startedAt: string,
  status: WorkoutSession["status"] = "completed",
): WorkoutSession => {
  const workoutSession: WorkoutSession = {
    id,
    createdAt: startedAt,
    updatedAt: startedAt,
    schemaVersion: 1,
    programVersionId: initialProgram.currentVersion.id,
    workoutTemplateId: `workout-${workoutCode.toLowerCase()}`,
    workoutCode,
    status,
    startedAt,
    note: "",
    exerciseSnapshots: [],
  };

  if (status === "completed") {
    workoutSession.completedAt = startedAt;
  }

  return workoutSession;
};

const weightRepsSet = (
  id: string,
  sessionId: string,
  exerciseId: string,
  setIndex: number,
  weightKg: number,
  reps: number,
): SetLog => ({
  id,
  createdAt: baseTimestamp,
  updatedAt: baseTimestamp,
  schemaVersion: 1,
  sessionId,
  exerciseId,
  setIndex,
  effort: "hard",
  note: "felt fine",
  loggingType: "weight_reps",
  weightKg,
  reps,
});

const repsSet = (id: string, sessionId: string, exerciseId: string, setIndex: number, reps: number): SetLog => ({
  id,
  createdAt: baseTimestamp,
  updatedAt: baseTimestamp,
  schemaVersion: 1,
  sessionId,
  exerciseId,
  setIndex,
  effort: "easy",
  note: "ignore this",
  loggingType: "reps",
  reps,
});

const durationSet = (
  id: string,
  sessionId: string,
  exerciseId: string,
  setIndex: number,
  durationSeconds: number,
): SetLog => ({
  id,
  createdAt: baseTimestamp,
  updatedAt: baseTimestamp,
  schemaVersion: 1,
  sessionId,
  exerciseId,
  setIndex,
  effort: "normal",
  note: "ignore this too",
  loggingType: "duration",
  durationSeconds,
});

describe("getWorkoutByCode", () => {
  it("returns workout templates by workout code", () => {
    expect(getWorkoutByCode(initialProgram, "A").id).toBe("workout-a");
    expect(getWorkoutByCode(initialProgram, "B").id).toBe("workout-b");
    expect(getWorkoutByCode(initialProgram, "C").id).toBe("workout-c");
  });

  it("throws a clear error when the current program version has no workout with the code", () => {
    const bundle = cloneBundle();
    bundle.workouts = bundle.workouts.filter((workout) => workout.code !== "C");

    expect(() => getWorkoutByCode(bundle, "C")).toThrow("Workout C is missing from current program version");
  });
});

describe("buildExerciseSnapshots", () => {
  it("builds plain exercise snapshots in template order", () => {
    const workout = getWorkoutByCode(initialProgram, "A");

    expect(buildExerciseSnapshots(initialProgram, workout)).toEqual([
      {
        exerciseId: "ex-barbell-squat",
        exerciseName: "Присед со штангой",
        loggingType: "weight_reps",
        target: "3 x 6-8",
        workoutCode: "A",
        order: 1,
        description:
          "Базовое упражнение для ног и корпуса. Начинай с 2-3 разминочных подходов и держи запас 2-3 повтора.",
        mediaId: "media-barbell-squat",
      },
      {
        exerciseId: "ex-bench-press",
        exerciseName: "Жим лежа",
        loggingType: "weight_reps",
        target: "3 x 6-8",
        workoutCode: "A",
        order: 2,
        description: "Горизонтальный жим для груди, плеч и трицепсов. Работай уверенно, без отказа.",
        mediaId: "media-bench-press",
      },
      {
        exerciseId: "ex-horizontal-row",
        exerciseName: "Тяга горизонтального блока или штанги в наклоне",
        loggingType: "weight_reps",
        target: "3 x 8-10",
        workoutCode: "A",
        order: 3,
        description: "Горизонтальная тяга для спины, которая балансирует жимовые движения.",
        mediaId: "media-horizontal-row",
      },
      {
        exerciseId: "ex-romanian-deadlift",
        exerciseName: "Румынская тяга",
        loggingType: "weight_reps",
        target: "2-3 x 8-10",
        workoutCode: "A",
        order: 4,
        description: "Тяга с акцентом на заднюю поверхность бедра и технику тазового наклона.",
        mediaId: "media-romanian-deadlift",
      },
      {
        exerciseId: "ex-plank",
        exerciseName: "Планка",
        loggingType: "duration",
        target: "3 x 30-60 секунд",
        workoutCode: "A",
        order: 5,
        description:
          "Статическое упражнение для корпуса. Держи ровное положение и прекращай подход до потери формы.",
        mediaId: "media-plank",
      },
    ]);
  });

  it("preserves old names after future program changes", () => {
    const bundle = cloneBundle();
    const workout = getWorkoutByCode(bundle, "A");

    const snapshots = buildExerciseSnapshots(bundle, workout);
    bundle.exercises[0].name = "Future squat name";

    expect(snapshots[0].exerciseName).toBe("Присед со штангой");
  });

  it("copies optional reference urls into snapshots", () => {
    const bundle = cloneBundle();
    const workout = getWorkoutByCode(bundle, "A");
    bundle.exercises[0].referenceUrl = "https://example.com/squat";

    expect(buildExerciseSnapshots(bundle, workout)[0].referenceUrl).toBe("https://example.com/squat");
  });

  it("throws a clear error when a workout references a missing exercise", () => {
    const bundle = cloneBundle();
    const workout = getWorkoutByCode(bundle, "A");
    bundle.exercises = bundle.exercises.filter((exercise) => exercise.id !== "ex-bench-press");

    expect(() => buildExerciseSnapshots(bundle, workout)).toThrow("Exercise ex-bench-press is missing");
  });
});

describe("suggestNextWorkoutCode", () => {
  it("starts with A when there are no completed sessions", () => {
    expect(suggestNextWorkoutCode([])).toBe("A");
    expect(suggestNextWorkoutCode([session("active-a", "A", "2026-06-23T10:00:00.000+03:00", "active")])).toBe(
      "A",
    );
  });

  it("cycles A to B to C to A from the latest completed session", () => {
    expect(suggestNextWorkoutCode([session("completed-a", "A", "2026-06-17T10:00:00.000+03:00")])).toBe("B");
    expect(suggestNextWorkoutCode([session("completed-b", "B", "2026-06-17T10:00:00.000+03:00")])).toBe("C");
    expect(suggestNextWorkoutCode([session("completed-c", "C", "2026-06-17T10:00:00.000+03:00")])).toBe("A");
  });

  it("ignores active sessions when choosing the latest workout", () => {
    expect(
      suggestNextWorkoutCode([
        session("completed-a", "A", "2026-06-17T10:00:00.000+03:00"),
        session("active-c", "C", "2026-06-24T10:00:00.000+03:00", "active"),
      ]),
    ).toBe("B");
  });
});

describe("getWeekStart", () => {
  it("returns the local Monday date for the given week", () => {
    expect(getWeekStart(new Date("2026-06-23T12:00:00.000+03:00"))).toBe("2026-06-22");
    expect(getWeekStart(new Date("2026-06-28T12:00:00.000+03:00"))).toBe("2026-06-22");
  });
});

describe("groupSessionsByWeek", () => {
  it("groups completed sessions by week, sorts sessions ascending and weeks descending", () => {
    const sessions = [
      session("active", "A", "2026-06-24T12:00:00.000+03:00", "active"),
      session("older-late", "B", "2026-06-16T12:00:00.000+03:00"),
      session("newer-late", "C", "2026-06-23T12:00:00.000+03:00"),
      session("older-early", "A", "2026-06-15T12:00:00.000+03:00"),
      session("newer-early", "B", "2026-06-22T12:00:00.000+03:00"),
    ];

    expect(
      groupSessionsByWeek(sessions).map((group) => ({
        weekStart: group.weekStart,
        sessionIds: group.sessions.map((item) => item.id),
      })),
    ).toEqual([
      { weekStart: "2026-06-22", sessionIds: ["newer-early", "newer-late"] },
      { weekStart: "2026-06-15", sessionIds: ["older-early", "older-late"] },
    ]);
  });
});

describe("getPreviousExerciseSets", () => {
  it("returns exercise sets from the previous two weeks only, newest week first", () => {
    const sessions = [
      session("too-old", "A", "2026-06-03T10:00:00.000+03:00"),
      session("two-weeks-ago", "A", "2026-06-10T10:00:00.000+03:00"),
      session("last-week", "A", "2026-06-17T10:00:00.000+03:00"),
      session("current-week", "A", "2026-06-22T10:00:00.000+03:00"),
    ];
    const sets = [
      weightRepsSet("too-old-set", "too-old", "ex-bench-press", 1, 35, 8),
      weightRepsSet("two-weeks-set-2", "two-weeks-ago", "ex-bench-press", 2, 42.5, 7),
      weightRepsSet("last-week-set", "last-week", "ex-bench-press", 1, 45, 8),
      weightRepsSet("other-exercise", "last-week", "ex-plank", 1, 0, 1),
      weightRepsSet("two-weeks-set-1", "two-weeks-ago", "ex-bench-press", 1, 42.5, 8),
      weightRepsSet("current-week-set", "current-week", "ex-bench-press", 1, 47.5, 6),
    ];

    expect(getPreviousExerciseSets("ex-bench-press", "2026-06-24T10:00:00.000+03:00", sessions, sets)).toEqual([
      {
        weekStart: "2026-06-15",
        sessionId: "last-week",
        sessionStartedAt: "2026-06-17T10:00:00.000+03:00",
        sets: [sets[2]],
      },
      {
        weekStart: "2026-06-08",
        sessionId: "two-weeks-ago",
        sessionStartedAt: "2026-06-10T10:00:00.000+03:00",
        sets: [sets[4], sets[1]],
      },
    ]);
  });

  it("ignores active and future sessions", () => {
    const sessions = [
      session("previous-completed", "A", "2026-06-17T10:00:00.000+03:00"),
      session("previous-active", "A", "2026-06-18T10:00:00.000+03:00", "active"),
      session("future-completed", "A", "2026-06-25T10:00:00.000+03:00"),
    ];
    const sets = [
      weightRepsSet("previous-completed-set", "previous-completed", "ex-bench-press", 1, 45, 8),
      weightRepsSet("previous-active-set", "previous-active", "ex-bench-press", 1, 50, 8),
      weightRepsSet("future-completed-set", "future-completed", "ex-bench-press", 1, 55, 8),
    ];

    expect(getPreviousExerciseSets("ex-bench-press", "2026-06-24T10:00:00.000+03:00", sessions, sets)).toEqual([
      {
        weekStart: "2026-06-15",
        sessionId: "previous-completed",
        sessionStartedAt: "2026-06-17T10:00:00.000+03:00",
        sets: [sets[0]],
      },
    ]);
  });
});

describe("summarizeExerciseWeek", () => {
  it("returns a dash for an empty set list", () => {
    expect(summarizeExerciseWeek("weight_reps", [])).toBe("-");
  });

  it("summarizes weight and reps while preserving decimal weights and ignoring effort and notes", () => {
    expect(
      summarizeExerciseWeek("weight_reps", [
        weightRepsSet("set-1", "session", "ex-bench-press", 1, 42.5, 8),
        weightRepsSet("set-2", "session", "ex-bench-press", 2, 45, 7),
      ]),
    ).toBe("42.5 x 8, 45 x 7");
  });

  it("summarizes reps-only sets", () => {
    expect(
      summarizeExerciseWeek("reps", [
        repsSet("set-1", "session", "ex-pull-up", 1, 8),
        repsSet("set-2", "session", "ex-pull-up", 2, 7),
        repsSet("set-3", "session", "ex-pull-up", 3, 6),
      ]),
    ).toBe("8, 7, 6");
  });

  it("summarizes duration sets", () => {
    expect(
      summarizeExerciseWeek("duration", [
        durationSet("set-1", "session", "ex-plank", 1, 45),
        durationSet("set-2", "session", "ex-plank", 2, 60),
      ]),
    ).toBe("45с, 60с");
  });
});
