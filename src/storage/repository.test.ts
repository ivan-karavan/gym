import "fake-indexeddb/auto";
import Dexie from "dexie";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { initialProgram } from "../data/initialProgram";
import type { ProgramBundle } from "../domain/types";
import { createGymDatabase, type GymDatabase } from "./db";
import { createRepository } from "./repository";

const databaseName = "gym-tracker-repository-test";
const openDatabases: GymDatabase[] = [];

const cloneBundle = (): ProgramBundle => ({
  program: { ...initialProgram.program },
  versions: initialProgram.versions.map((version) => ({ ...version, workoutIds: [...version.workoutIds] })),
  currentVersion: { ...initialProgram.currentVersion, workoutIds: [...initialProgram.currentVersion.workoutIds] },
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

describe("repository", () => {
  beforeEach(async () => {
    await Dexie.delete(databaseName);
  });

  afterEach(() => {
    for (const db of openDatabases.splice(0)) {
      db.close();
    }

    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  const createTestDatabase = () => {
    const db = createGymDatabase(databaseName);
    openDatabases.push(db);

    return db;
  };

  const createTestRepository = () => createRepository(createTestDatabase());

  it("initializes and loads the current program with stable ids and A/B/C workout order", async () => {
    const repo = createTestRepository();

    await repo.initialize(initialProgram);

    const bundle = await repo.loadCurrentProgram();

    expect(bundle.program.id).toBe("program-full-body-2026-06");
    expect(bundle.currentVersion.id).toBe("program-version-full-body-2026-06-23");
    expect(bundle.versions.map((version) => version.id)).toEqual(["program-version-full-body-2026-06-23"]);
    expect(bundle.workouts.map((workout) => workout.code)).toEqual(["A", "B", "C"]);
  });

  it("keeps local sessions and sets when initialization runs more than once", async () => {
    const repo = createTestRepository();
    await repo.initialize(initialProgram);

    const session = await repo.startWorkout("A", "2026-06-23T10:00:00.000Z");
    const set = await repo.saveSet({
      sessionId: session.id,
      exerciseId: "ex-bench-press",
      setIndex: 1,
      effort: "normal",
      note: "local set",
      loggingType: "weight_reps",
      weightKg: 42.5,
      reps: 8,
    });

    await repo.initialize(initialProgram);

    expect(await repo.loadSessions()).toEqual([session]);
    expect(await repo.loadAllSets()).toEqual([set]);
  });

  it("starts a workout with exercise snapshots that preserve old exercise names", async () => {
    const repo = createTestRepository();
    const bundle = cloneBundle();
    await repo.initialize(bundle);

    const session = await repo.startWorkout("A", "2026-06-23T10:00:00.000Z");
    bundle.exercises[0].name = "Future squat name";
    await repo.initialize(bundle);

    expect(session.exerciseSnapshots[0]?.exerciseName).toBe("Присед со штангой");
    expect((await repo.loadSessions())[0]?.exerciseSnapshots[0]?.exerciseName).toBe("Присед со штангой");
  });

  it("saves decimal weights and replaces the same session exercise set index without changing id or createdAt", async () => {
    const repo = createTestRepository();
    await repo.initialize(initialProgram);
    const session = await repo.startWorkout("A", "2026-06-23T10:00:00.000Z");

    const first = await repo.saveSet({
      sessionId: session.id,
      exerciseId: "ex-bench-press",
      setIndex: 1,
      effort: "normal",
      loggingType: "weight_reps",
      weightKg: 42.5,
      reps: 8,
    });
    const second = await repo.saveSet({
      sessionId: session.id,
      exerciseId: "ex-bench-press",
      setIndex: 1,
      effort: "hard",
      note: "add weight next time",
      loggingType: "weight_reps",
      weightKg: 45.25,
      reps: 7,
    });

    expect(second.id).toBe(first.id);
    expect(second.createdAt).toBe(first.createdAt);
    expect(second.updatedAt).not.toBe(first.updatedAt);
    expect(second.weightKg).toBe(45.25);
    expect(second.reps).toBe(7);
    expect(await repo.loadSetsForSession(session.id)).toEqual([second]);
  });

  it("uses a deterministic set id so concurrent saves for one slot store one set", async () => {
    const repo = createTestRepository();
    await repo.initialize(initialProgram);
    const session = await repo.startWorkout("A", "2026-06-23T10:00:00.000Z");

    const [first, second] = await Promise.all([
      repo.saveSet({
        sessionId: session.id,
        exerciseId: "ex-bench-press",
        setIndex: 1,
        effort: "normal",
        loggingType: "weight_reps",
        weightKg: 42.5,
        reps: 8,
      }),
      repo.saveSet({
        sessionId: session.id,
        exerciseId: "ex-bench-press",
        setIndex: 1,
        effort: "hard",
        note: "parallel write",
        loggingType: "weight_reps",
        weightKg: 45,
        reps: 6,
      }),
    ]);

    const deterministicId = `set:${encodeURIComponent(session.id)}:${encodeURIComponent("ex-bench-press")}:1`;
    const sets = await repo.loadSetsForSession(session.id);

    expect(first.id).toBe(deterministicId);
    expect(second.id).toBe(deterministicId);
    expect(sets).toHaveLength(1);
    expect(sets[0]?.id).toBe(deterministicId);
  });

  it("roundtrips reps-only and duration set shapes without impossible fields", async () => {
    const repo = createTestRepository();
    await repo.initialize(initialProgram);
    const session = await repo.startWorkout("B", "2026-06-23T10:00:00.000Z");

    const repsSet = await repo.saveSet({
      sessionId: session.id,
      exerciseId: "ex-pull-up",
      setIndex: 1,
      effort: "easy",
      loggingType: "reps",
      reps: 6,
    });
    const durationSet = await repo.saveSet({
      sessionId: session.id,
      exerciseId: "ex-plank",
      setIndex: 2,
      effort: "normal",
      loggingType: "duration",
      durationSeconds: 45,
    });

    const sets = await repo.loadSetsForSession(session.id);

    expect(repsSet).not.toHaveProperty("weightKg");
    expect(repsSet).not.toHaveProperty("durationSeconds");
    expect(durationSet).not.toHaveProperty("weightKg");
    expect(durationSet).not.toHaveProperty("reps");
    expect(sets).toEqual([repsSet, durationSet]);
  });

  it("completes active sessions and hides them from loadActiveSession", async () => {
    const repo = createTestRepository();
    await repo.initialize(initialProgram);
    const session = await repo.startWorkout("C", "2026-06-23T10:00:00.000Z");

    expect((await repo.loadActiveSession())?.id).toBe(session.id);

    await repo.completeSession(session.id, "2026-06-23T11:00:00.000Z");

    expect(await repo.loadActiveSession()).toBeUndefined();
    expect(await repo.loadSessions()).toMatchObject([
      {
        id: session.id,
        status: "completed",
        completedAt: "2026-06-23T11:00:00.000Z",
      },
    ]);
  });

  it("keeps overlapping note and completion updates from clobbering each other", async () => {
    const db = createTestDatabase();
    const repo = createRepository(db);
    await repo.initialize(initialProgram);
    const session = await repo.startWorkout("C", "2026-06-23T10:00:00.000Z");
    const originalGet = db.sessions.get.bind(db.sessions);
    let staleReadsRemaining = 2;

    vi.spyOn(db.sessions, "get").mockImplementation((async (key: string) => {
      if (key === session.id && staleReadsRemaining > 0) {
        staleReadsRemaining -= 1;

        return {
          ...session,
          exerciseSnapshots: session.exerciseSnapshots.map((snapshot) => ({ ...snapshot })),
        };
      }

      return originalGet(key);
    }) as typeof db.sessions.get);

    await Promise.all([
      repo.updateSessionNote(session.id, "keep this note"),
      repo.completeSession(session.id, "2026-06-23T11:00:00.000Z"),
    ]);

    expect(await repo.loadSessions()).toMatchObject([
      {
        id: session.id,
        status: "completed",
        completedAt: "2026-06-23T11:00:00.000Z",
        note: "keep this note",
      },
    ]);
  });

  it("generates ids with getRandomValues when randomUUID is unavailable", async () => {
    vi.stubGlobal("crypto", {
      getRandomValues: (values: Uint8Array) => values.fill(0),
    });

    const repo = createTestRepository();
    await repo.initialize(initialProgram);

    const session = await repo.startWorkout("A", "2026-06-23T10:00:00.000Z");

    expect(session.id).toBe("session-00000000-0000-4000-8000-000000000000");
  });

  it("throws when the current version references a missing workout", async () => {
    const repo = createTestRepository();
    const bundle = cloneBundle();
    bundle.currentVersion.workoutIds = ["workout-a", "missing-workout", "workout-c"];
    bundle.versions = [bundle.currentVersion];

    await repo.initialize(bundle);

    await expect(repo.loadCurrentProgram()).rejects.toThrow(
      "Workout missing-workout is missing from current program version program-version-full-body-2026-06-23",
    );
  });
});
