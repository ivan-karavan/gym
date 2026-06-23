import type { EntityMeta, ProgramBundle, SetLog, WorkoutCode, WorkoutSession } from "../domain/types";
import { buildExerciseSnapshots, getWorkoutByCode } from "../domain/workoutLogic";
import type { GymDatabase } from "./db";

type WithoutMeta<T extends EntityMeta> = Omit<T, keyof EntityMeta>;

export type SaveSetInput = SetLog extends infer Item
  ? Item extends EntityMeta
    ? WithoutMeta<Item>
    : never
  : never;

const settingsId = "app-settings";

let lastTimestampMs = 0;

export function nowIso(): string {
  const currentTimestampMs = Date.now();
  const nextTimestampMs = currentTimestampMs <= lastTimestampMs ? lastTimestampMs + 1 : currentTimestampMs;
  lastTimestampMs = nextTimestampMs;

  return new Date(nextTimestampMs).toISOString();
}

function makeId(prefix: string): string {
  return `${prefix}-${globalThis.crypto.randomUUID()}`;
}

function sortSets(left: SetLog, right: SetLog): number {
  if (left.setIndex !== right.setIndex) {
    return left.setIndex - right.setIndex;
  }

  return left.createdAt.localeCompare(right.createdAt);
}

function sortSessionsByStartedAt(left: WorkoutSession, right: WorkoutSession): number {
  const startedAtCompare = left.startedAt.localeCompare(right.startedAt);

  if (startedAtCompare !== 0) {
    return startedAtCompare;
  }

  return left.createdAt.localeCompare(right.createdAt);
}

function sortVersions(left: ProgramBundle["versions"][number], right: ProgramBundle["versions"][number]): number {
  const activeFromCompare = left.activeFrom.localeCompare(right.activeFrom);

  if (activeFromCompare !== 0) {
    return activeFromCompare;
  }

  return left.id.localeCompare(right.id);
}

function buildSetLog(input: SaveSetInput, existing: SetLog | undefined, updatedAt: string): SetLog {
  const base = {
    id: existing?.id ?? makeId("set"),
    createdAt: existing?.createdAt ?? updatedAt,
    updatedAt,
    schemaVersion: 1,
    sessionId: input.sessionId,
    exerciseId: input.exerciseId,
    setIndex: input.setIndex,
    effort: input.effort,
    ...(input.note !== undefined ? { note: input.note } : {}),
  } satisfies Omit<SetLog, "loggingType" | "weightKg" | "reps" | "durationSeconds">;

  if (input.loggingType === "weight_reps") {
    return {
      ...base,
      loggingType: "weight_reps",
      weightKg: input.weightKg,
      reps: input.reps,
    };
  }

  if (input.loggingType === "reps") {
    return {
      ...base,
      loggingType: "reps",
      reps: input.reps,
    };
  }

  return {
    ...base,
    loggingType: "duration",
    durationSeconds: input.durationSeconds,
  };
}

export function createRepository(db: GymDatabase) {
  async function initialize(bundle: ProgramBundle): Promise<void> {
    const existingSettings = await db.settings.get(settingsId);

    if (existingSettings) {
      return;
    }

    const timestamp = nowIso();

    await db.transaction(
      "rw",
      [db.programs, db.programVersions, db.workouts, db.exercises, db.media, db.settings],
      async () => {
        await db.programs.bulkPut([bundle.program]);
        await db.programVersions.bulkPut(bundle.versions);
        await db.workouts.bulkPut(bundle.workouts);
        await db.exercises.bulkPut(bundle.exercises);
        await db.media.bulkPut(bundle.media);
        await db.settings.put({
          id: settingsId,
          activeProgramId: bundle.program.id,
          createdAt: timestamp,
          updatedAt: timestamp,
          schemaVersion: 1,
        });
      },
    );
  }

  async function loadCurrentProgram(): Promise<ProgramBundle> {
    const settings = await db.settings.get(settingsId);

    if (!settings) {
      throw new Error("Gym repository is not initialized");
    }

    const program = await db.programs.get(settings.activeProgramId);

    if (!program) {
      throw new Error(`Program ${settings.activeProgramId} is missing`);
    }

    const currentVersion = await db.programVersions.get(program.currentVersionId);

    if (!currentVersion) {
      throw new Error(`Program version ${program.currentVersionId} is missing for program ${program.id}`);
    }

    const versions = (await db.programVersions.where("programId").equals(program.id).toArray()).sort(sortVersions);
    const workouts = (await db.workouts.bulkGet(currentVersion.workoutIds)).map((workout, index) => {
      const workoutId = currentVersion.workoutIds[index];

      if (!workout) {
        throw new Error(`Workout ${workoutId} is missing from current program version ${currentVersion.id}`);
      }

      return workout;
    });

    return {
      program,
      versions,
      currentVersion,
      workouts,
      exercises: await db.exercises.toArray(),
      media: await db.media.toArray(),
    };
  }

  async function startWorkout(code: WorkoutCode, startedAt = nowIso()): Promise<WorkoutSession> {
    const bundle = await loadCurrentProgram();
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
      exerciseSnapshots: buildExerciseSnapshots(bundle, workout),
    };

    await db.sessions.put(session);

    return session;
  }

  async function saveSet(input: SaveSetInput): Promise<SetLog> {
    const existing = await db.sets
      .where("[sessionId+exerciseId+setIndex]")
      .equals([input.sessionId, input.exerciseId, input.setIndex])
      .first();
    const set = buildSetLog(input, existing, nowIso());

    await db.sets.put(set);

    return set;
  }

  async function loadSetsForSession(sessionId: string): Promise<SetLog[]> {
    return (await db.sets.where("sessionId").equals(sessionId).toArray()).sort(sortSets);
  }

  async function loadAllSets(): Promise<SetLog[]> {
    return (await db.sets.toArray()).sort((left, right) => {
      const sessionCompare = left.sessionId.localeCompare(right.sessionId);

      if (sessionCompare !== 0) {
        return sessionCompare;
      }

      const exerciseCompare = left.exerciseId.localeCompare(right.exerciseId);

      if (exerciseCompare !== 0) {
        return exerciseCompare;
      }

      return sortSets(left, right);
    });
  }

  async function loadSessions(): Promise<WorkoutSession[]> {
    return (await db.sessions.toArray()).sort(sortSessionsByStartedAt);
  }

  async function loadActiveSession(): Promise<WorkoutSession | undefined> {
    const activeSessions = (await db.sessions.where("status").equals("active").toArray()).sort((left, right) =>
      sortSessionsByStartedAt(right, left),
    );

    return activeSessions[0];
  }

  async function updateSessionNote(sessionId: string, note: string): Promise<WorkoutSession> {
    const session = await db.sessions.get(sessionId);

    if (!session) {
      throw new Error(`Session ${sessionId} is missing`);
    }

    const updatedSession: WorkoutSession = {
      ...session,
      note,
      updatedAt: nowIso(),
    };

    await db.sessions.put(updatedSession);

    return updatedSession;
  }

  async function completeSession(sessionId: string, completedAt = nowIso()): Promise<WorkoutSession> {
    const session = await db.sessions.get(sessionId);

    if (!session) {
      throw new Error(`Session ${sessionId} is missing`);
    }

    const updatedSession: WorkoutSession = {
      ...session,
      status: "completed",
      completedAt,
      updatedAt: completedAt,
    };

    await db.sessions.put(updatedSession);

    return updatedSession;
  }

  return {
    initialize,
    loadCurrentProgram,
    startWorkout,
    saveSet,
    loadSetsForSession,
    loadAllSets,
    loadSessions,
    loadActiveSession,
    updateSessionNote,
    completeSession,
  };
}
