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

  it("rejects duplicate primary ids in store arrays", async () => {
    const payload = await createBackupPayload();
    const [program] = payload.programs;

    expect(() =>
      parseBackup({
        ...payload,
        programs: [program, { ...program }],
      }),
    ).toThrow(/Invalid backup/);
  });

  it("rejects duplicate logical set slots with different primary ids", async () => {
    const payload = await createBackupPayload();
    const [set] = payload.sets;

    expect(() =>
      parseBackup({
        ...payload,
        sets: [
          set,
          {
            ...set,
            id: `${set.id}-duplicate`,
          },
        ],
      }),
    ).toThrow(/Invalid backup/);
  });

  it("rejects missing settings row and wrong settings id", async () => {
    const payload = await createBackupPayload();
    const [settings] = payload.settings;

    expect(() =>
      parseBackup({
        ...payload,
        settings: [],
      }),
    ).toThrow(/Invalid backup/);

    expect(() =>
      parseBackup({
        ...payload,
        settings: [{ ...settings, id: "wrong-settings" }],
      }),
    ).toThrow(/Invalid backup/);
  });

  it("rejects settings when activeProgramId does not exist", async () => {
    const payload = await createBackupPayload();
    const [settings] = payload.settings;

    expect(() =>
      parseBackup({
        ...payload,
        settings: [{ ...settings, activeProgramId: "missing-program" }],
      }),
    ).toThrow(/Invalid backup/);
  });

  it("rejects current program version when it references a missing workout", async () => {
    const payload = await createBackupPayload();
    const [currentVersion] = payload.programVersions;

    expect(() =>
      parseBackup({
        ...payload,
        programVersions: [{ ...currentVersion, workoutIds: ["missing-workout"] }],
      }),
    ).toThrow(/Invalid backup/);
  });

  it("rejects sessions with invalid startedAt timestamps", async () => {
    const payload = await createBackupPayload();
    const [session] = payload.sessions;

    expect(() =>
      parseBackup({
        ...payload,
        sessions: [{ ...session, startedAt: "not-a-date" }],
      }),
    ).toThrow(/Invalid backup/);
  });

  it("rejects non-canonical UTC timestamps", async () => {
    const payload = await createBackupPayload();

    for (const exportedAt of ["1", "2026-02-31T00:00:00.000Z", "06/23/2026"]) {
      expect(() =>
        parseBackup({
          ...payload,
          exportedAt,
        }),
      ).toThrow(/Invalid backup/);
    }
  });

  it("rejects non-active program versions with missing program or workout references", async () => {
    const payload = await createBackupPayload();
    const [currentVersion] = payload.programVersions;
    const retiredVersion = {
      ...currentVersion,
      id: "program-version-retired",
    };

    expect(() =>
      parseBackup({
        ...payload,
        programVersions: [
          currentVersion,
          {
            ...retiredVersion,
            programId: "missing-program",
          },
        ],
      }),
    ).toThrow(/Invalid backup/);

    expect(() =>
      parseBackup({
        ...payload,
        programVersions: [
          currentVersion,
          {
            ...retiredVersion,
            workoutIds: ["missing-workout"],
          },
        ],
      }),
    ).toThrow(/Invalid backup/);
  });

  it("rejects current program versions that belong to another program", async () => {
    const payload = await createBackupPayload();
    const [program] = payload.programs;
    const [currentVersion] = payload.programVersions;
    const otherProgram = {
      ...program,
      id: "program-other",
      currentVersionId: currentVersion.id,
    };

    expect(() =>
      parseBackup({
        ...payload,
        programs: [program, otherProgram],
        programVersions: [
          {
            ...currentVersion,
            programId: otherProgram.id,
          },
        ],
      }),
    ).toThrow(/Invalid backup/);
  });

  it("rejects sessions whose workout template is outside their program version", async () => {
    const payload = await createBackupPayload();
    const [currentVersion] = payload.programVersions;

    expect(() =>
      parseBackup({
        ...payload,
        programVersions: [
          {
            ...currentVersion,
            workoutIds: currentVersion.workoutIds.filter((workoutId) => workoutId !== "workout-a"),
          },
        ],
      }),
    ).toThrow(/Invalid backup/);
  });

  it("rejects sessions whose workout code mismatches the referenced workout", async () => {
    const payload = await createBackupPayload();
    const [session] = payload.sessions;

    expect(() =>
      parseBackup({
        ...payload,
        sessions: [
          {
            ...session,
            workoutCode: "B",
          },
        ],
      }),
    ).toThrow(/Invalid backup/);
  });

  it("rejects sets for exercises absent from their session snapshot", async () => {
    const payload = await createBackupPayload();
    const [set] = payload.sets;

    expect(() =>
      parseBackup({
        ...payload,
        sets: [
          {
            ...set,
            exerciseId: "ex-deadlift",
          },
        ],
      }),
    ).toThrow(/Invalid backup/);
  });

  it("rejects sets whose logging type mismatches the session snapshot", async () => {
    const payload = await createBackupPayload();
    const [set] = payload.sets;
    const { weightKg: _weightKg, ...setWithoutWeight } = set;

    expect(() =>
      parseBackup({
        ...payload,
        sets: [
          {
            ...setWithoutWeight,
            loggingType: "reps",
            reps: 8,
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

  it("does not clear existing data when restore payload is invalid", async () => {
    const target = await createInitializedRepository("-invalid-restore-target");
    const existingProgram = await target.repo.loadCurrentProgram();
    const invalidPayload = await createBackupPayload();
    const [program] = invalidPayload.programs;

    await expect(
      restoreBackup(target.db, {
        ...invalidPayload,
        programs: [program, { ...program }],
      }),
    ).rejects.toThrow(/Invalid backup/);

    await expect(target.repo.loadCurrentProgram()).resolves.toEqual(existingProgram);
  });
});
