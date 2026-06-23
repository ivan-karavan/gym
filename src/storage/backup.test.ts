import "fake-indexeddb/auto";
import Dexie from "dexie";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { initialProgram } from "../data/initialProgram";
import { createGymDatabase, type GymDatabase } from "./db";
import { exportBackup, parseBackup, restoreBackup, type BackupPayload } from "./backup";
import { createRepository } from "./repository";

const databaseName = "gym-tracker-backup-test";
const openDatabases: GymDatabase[] = [];
let databaseCounter = 0;

describe("backup", () => {
  beforeEach(async () => {
    databaseCounter += 1;
    await Dexie.delete(databaseName);
  });

  afterEach(() => {
    for (const db of openDatabases.splice(0)) {
      db.close();
    }
  });

  const createTestDatabase = (suffix = "") => {
    const db = createGymDatabase(`${databaseName}-${databaseCounter}${suffix}`);
    openDatabases.push(db);

    return db;
  };

  const createInitializedRepository = async (suffix = "") => {
    const db = createTestDatabase(suffix);
    const repo = createRepository(db);

    await repo.initialize(initialProgram);

    return { db, repo };
  };

  const createBackupPayload = async (): Promise<BackupPayload> => {
    const { db, repo } = await createInitializedRepository("-payload");
    const session = await repo.startWorkout("A", "2026-06-23T10:00:00.000Z");

    await repo.saveSet({
      sessionId: session.id,
      exerciseId: "ex-bench-press",
      setIndex: 1,
      effort: "normal",
      loggingType: "weight_reps",
      weightKg: 42.5,
      reps: 8,
    });

    return exportBackup(db, "test-version");
  };

  it("exports all stores after repository writes and preserves decimal weight", async () => {
    const { db, repo } = await createInitializedRepository();
    const session = await repo.startWorkout("A", "2026-06-23T10:00:00.000Z");

    await repo.saveSet({
      sessionId: session.id,
      exerciseId: "ex-bench-press",
      setIndex: 1,
      effort: "normal",
      loggingType: "weight_reps",
      weightKg: 45.25,
      reps: 7,
    });

    const payload = await exportBackup(db, "0.1.1");

    expect(payload).toMatchObject({
      schemaVersion: 1,
      appVersion: "0.1.1",
    });
    expect(Date.parse(payload.exportedAt)).not.toBeNaN();
    expect(payload.programs.map((program) => program.id)).toEqual(["program-full-body-2026-06"]);
    expect(payload.programVersions.map((version) => version.id)).toEqual(["program-version-full-body-2026-06-23"]);
    expect(payload.workouts.map((workout) => workout.id)).toEqual(["workout-a", "workout-b", "workout-c"]);
    expect(payload.exercises).toHaveLength(initialProgram.exercises.length);
    expect(payload.media).toHaveLength(initialProgram.media.length);
    expect(payload.sessions.map((item) => item.id)).toEqual([session.id]);
    expect(payload.settings.map((item) => item.activeProgramId)).toEqual(["program-full-body-2026-06"]);
    expect(payload.sets).toEqual([
      expect.objectContaining({
        loggingType: "weight_reps",
        weightKg: 45.25,
        reps: 7,
      }),
    ]);
  });

  it("rejects unsupported backup schema versions", async () => {
    const payload = await createBackupPayload();

    expect(() => parseBackup({ ...payload, schemaVersion: 999 })).toThrow(/Invalid backup/);
  });

  it("rejects reps set logs with impossible weight fields", async () => {
    const payload = await createBackupPayload();
    const [set] = payload.sets;

    expect(() =>
      parseBackup({
        ...payload,
        sets: [
          {
            ...set,
            loggingType: "reps",
            weightKg: 42.5,
            reps: 8,
          },
        ],
      }),
    ).toThrow(/Invalid backup/);
  });

  it("rejects reps set logs when reps are missing", async () => {
    const payload = await createBackupPayload();
    const [set] = payload.sets;
    const { reps: _reps, weightKg: _weightKg, ...invalidSet } = set;

    expect(() =>
      parseBackup({
        ...payload,
        sets: [
          {
            ...invalidSet,
            loggingType: "reps",
          },
        ],
      }),
    ).toThrow(/Invalid backup/);
  });

  it("restores a valid payload and replaces existing repository data", async () => {
    const source = await createInitializedRepository("-source");
    const sourceSession = await source.repo.startWorkout("B", "2026-06-23T10:00:00.000Z");
    const sourceSet = await source.repo.saveSet({
      sessionId: sourceSession.id,
      exerciseId: "ex-pull-up",
      setIndex: 1,
      effort: "easy",
      loggingType: "reps",
      reps: 6,
    });
    const payload = parseBackup(await exportBackup(source.db, "restore-test"));

    const target = await createInitializedRepository("-target");
    const oldSession = await target.repo.startWorkout("C", "2026-06-24T10:00:00.000Z");
    await target.repo.saveSet({
      sessionId: oldSession.id,
      exerciseId: "ex-plank",
      setIndex: 1,
      effort: "normal",
      loggingType: "duration",
      durationSeconds: 45,
    });

    await restoreBackup(target.db, payload);

    const restoredProgram = await target.repo.loadCurrentProgram();
    const restoredSessions = await target.repo.loadSessions();
    const restoredSets = await target.repo.loadAllSets();

    expect(restoredProgram.program.id).toBe("program-full-body-2026-06");
    expect(restoredSessions).toEqual([sourceSession]);
    expect(restoredSets).toEqual([sourceSet]);
    expect(restoredSessions).not.toEqual([oldSession]);
  });
});
