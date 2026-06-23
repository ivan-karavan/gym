import type { Table } from "dexie";
import { z } from "zod";
import type {
  AppSettings,
  Exercise,
  MediaAsset,
  Program,
  ProgramVersion,
  SetLog,
  WorkoutSession,
  WorkoutTemplate,
} from "../domain/types";
import type { GymDatabase } from "./db";

export type BackupPayload = {
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
};

const schemaVersionSchema = z.literal(1);
const workoutCodeSchema = z.enum(["A", "B", "C"]);
const loggingTypeSchema = z.enum(["weight_reps", "reps", "duration"]);
const effortSchema = z.enum(["easy", "normal", "hard"]);
const sessionStatusSchema = z.enum(["active", "completed"]);
const canonicalUtcTimestampPattern = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;

function isCanonicalUtcTimestamp(value: string): boolean {
  if (!canonicalUtcTimestampPattern.test(value)) {
    return false;
  }

  const date = new Date(value);

  return Number.isFinite(date.getTime()) && date.toISOString() === value;
}

const timestampSchema = z.string().refine(isCanonicalUtcTimestamp, "Invalid timestamp");

const entityMetaSchema = z.object({
  id: z.string(),
  createdAt: timestampSchema,
  updatedAt: timestampSchema,
  schemaVersion: schemaVersionSchema,
});

const mediaAssetSchema = entityMetaSchema
  .extend({
    localPath: z.string(),
    alt: z.string(),
    attribution: z.string().optional(),
  })
  .strict();

const exerciseSchema = entityMetaSchema
  .extend({
    name: z.string(),
    loggingType: loggingTypeSchema,
    description: z.string(),
    cues: z.array(z.string()),
    mediaId: z.string(),
    referenceUrl: z.string().optional(),
  })
  .strict();

const workoutExerciseTemplateSchema = z
  .object({
    exerciseId: z.string(),
    order: z.number(),
    target: z.string(),
  })
  .strict();

const workoutTemplateSchema = entityMetaSchema
  .extend({
    code: workoutCodeSchema,
    name: z.string(),
    exercises: z.array(workoutExerciseTemplateSchema),
  })
  .strict();

const programVersionSchema = entityMetaSchema
  .extend({
    programId: z.string(),
    versionName: z.string(),
    activeFrom: timestampSchema,
    workoutIds: z.array(z.string()),
  })
  .strict();

const programSchema = entityMetaSchema
  .extend({
    name: z.string(),
    currentVersionId: z.string(),
  })
  .strict();

const workoutExerciseSnapshotSchema = z
  .object({
    exerciseId: z.string(),
    exerciseName: z.string(),
    loggingType: loggingTypeSchema,
    target: z.string(),
    workoutCode: workoutCodeSchema,
    order: z.number(),
    description: z.string(),
    mediaId: z.string(),
    referenceUrl: z.string().optional(),
  })
  .strict();

const setLogBaseSchema = entityMetaSchema.extend({
  sessionId: z.string(),
  exerciseId: z.string(),
  setIndex: z.number(),
  effort: effortSchema,
  note: z.string().optional(),
});

const weightRepsSetLogSchema = setLogBaseSchema
  .extend({
    loggingType: z.literal("weight_reps"),
    weightKg: z.number(),
    reps: z.number(),
  })
  .strict();

const repsSetLogSchema = setLogBaseSchema
  .extend({
    loggingType: z.literal("reps"),
    reps: z.number(),
  })
  .strict();

const durationSetLogSchema = setLogBaseSchema
  .extend({
    loggingType: z.literal("duration"),
    durationSeconds: z.number(),
  })
  .strict();

const setLogSchema = z.discriminatedUnion("loggingType", [
  weightRepsSetLogSchema,
  repsSetLogSchema,
  durationSetLogSchema,
]);

const workoutSessionSchema = entityMetaSchema
  .extend({
    programVersionId: z.string(),
    workoutTemplateId: z.string(),
    workoutCode: workoutCodeSchema,
    status: sessionStatusSchema,
    startedAt: timestampSchema,
    completedAt: timestampSchema.optional(),
    note: z.string(),
    exerciseSnapshots: z.array(workoutExerciseSnapshotSchema),
  })
  .strict();

const appSettingsSchema = entityMetaSchema
  .extend({
    activeProgramId: z.string(),
  })
  .strict();

const backupPayloadSchema = z
  .object({
    schemaVersion: schemaVersionSchema,
    exportedAt: timestampSchema,
    appVersion: z.string(),
    programs: z.array(programSchema),
    programVersions: z.array(programVersionSchema),
    workouts: z.array(workoutTemplateSchema),
    exercises: z.array(exerciseSchema),
    media: z.array(mediaAssetSchema),
    sessions: z.array(workoutSessionSchema),
    sets: z.array(setLogSchema),
    settings: z.array(appSettingsSchema),
  })
  .strict();

function compareById<T extends { id: string }>(left: T, right: T): number {
  return left.id.localeCompare(right.id);
}

function idSet<T extends { id: string }>(items: readonly T[]): Set<string> {
  return new Set(items.map((item) => item.id));
}

function mapById<T extends { id: string }>(items: readonly T[]): Map<string, T> {
  return new Map(items.map((item) => [item.id, item]));
}

function collectDuplicateIds<T extends { id: string }>(path: string, items: readonly T[]): string[] {
  const seen = new Set<string>();
  const duplicates = new Set<string>();

  for (const item of items) {
    if (seen.has(item.id)) {
      duplicates.add(item.id);
    }

    seen.add(item.id);
  }

  return Array.from(duplicates, (id) => `${path}: duplicate id "${id}"`);
}

function collectDuplicateSetSlots(sets: readonly SetLog[]): string[] {
  const seen = new Set<string>();
  const duplicates = new Set<string>();

  for (const set of sets) {
    const key = `${set.sessionId}\u0000${set.exerciseId}\u0000${set.setIndex}`;

    if (seen.has(key)) {
      duplicates.add(`${set.sessionId}/${set.exerciseId}/${set.setIndex}`);
    }

    seen.add(key);
  }

  return Array.from(duplicates, (key) => `sets: duplicate logical slot "${key}"`);
}

function validateReference(issues: string[], path: string, id: string, ids: ReadonlySet<string>): void {
  if (!ids.has(id)) {
    issues.push(`${path}: unknown id "${id}"`);
  }
}

function sameStringSet(left: ReadonlySet<string>, right: ReadonlySet<string>): boolean {
  if (left.size !== right.size) {
    return false;
  }

  for (const value of left) {
    if (!right.has(value)) {
      return false;
    }
  }

  return true;
}

function validateBackupSemantics(payload: BackupPayload): void {
  const issues = [
    ...collectDuplicateIds("programs", payload.programs),
    ...collectDuplicateIds("programVersions", payload.programVersions),
    ...collectDuplicateIds("workouts", payload.workouts),
    ...collectDuplicateIds("exercises", payload.exercises),
    ...collectDuplicateIds("media", payload.media),
    ...collectDuplicateIds("sessions", payload.sessions),
    ...collectDuplicateIds("sets", payload.sets),
    ...collectDuplicateSetSlots(payload.sets),
    ...collectDuplicateIds("settings", payload.settings),
  ];

  const programIds = idSet(payload.programs);
  const programVersionIds = idSet(payload.programVersions);
  const workoutIds = idSet(payload.workouts);
  const exerciseIds = idSet(payload.exercises);
  const mediaIds = idSet(payload.media);
  const sessionIds = idSet(payload.sessions);
  const programVersionsById = mapById(payload.programVersions);
  const workoutsById = mapById(payload.workouts);
  const exercisesById = mapById(payload.exercises);
  const sessionsById = mapById(payload.sessions);

  if (payload.settings.length !== 1) {
    issues.push("settings: expected exactly one row");
  }

  const [settings] = payload.settings;

  if (settings) {
    if (settings.id !== "app-settings") {
      issues.push(`settings.id: expected "app-settings", got "${settings.id}"`);
    }

    validateReference(issues, "settings.activeProgramId", settings.activeProgramId, programIds);
  }

  payload.programs.forEach((program) => {
    validateReference(issues, `programs.${program.id}.currentVersionId`, program.currentVersionId, programVersionIds);

    const currentVersion = programVersionsById.get(program.currentVersionId);

    if (currentVersion && currentVersion.programId !== program.id) {
      issues.push(
        `programs.${program.id}.currentVersionId: version "${program.currentVersionId}" belongs to program "${currentVersion.programId}"`,
      );
    }
  });

  payload.programVersions.forEach((programVersion) => {
    validateReference(issues, `programVersions.${programVersion.id}.programId`, programVersion.programId, programIds);

    programVersion.workoutIds.forEach((workoutId, index) => {
      validateReference(issues, `programVersions.${programVersion.id}.workoutIds.${index}`, workoutId, workoutIds);
    });
  });

  payload.workouts.forEach((workout) => {
    workout.exercises.forEach((exercise, index) => {
      validateReference(issues, `workouts.${workout.id}.exercises.${index}.exerciseId`, exercise.exerciseId, exerciseIds);
    });
  });

  payload.exercises.forEach((exercise) => {
    validateReference(issues, `exercises.${exercise.id}.mediaId`, exercise.mediaId, mediaIds);
  });

  payload.sessions.forEach((session) => {
    validateReference(issues, `sessions.${session.id}.programVersionId`, session.programVersionId, programVersionIds);
    validateReference(issues, `sessions.${session.id}.workoutTemplateId`, session.workoutTemplateId, workoutIds);

    const programVersion = programVersionsById.get(session.programVersionId);
    const workout = workoutsById.get(session.workoutTemplateId);

    if (programVersion && !programVersion.workoutIds.includes(session.workoutTemplateId)) {
      issues.push(
        `sessions.${session.id}.workoutTemplateId: workout "${session.workoutTemplateId}" is not part of program version "${session.programVersionId}"`,
      );
    }

    if (workout && session.workoutCode !== workout.code) {
      issues.push(`sessions.${session.id}.workoutCode: expected "${workout.code}", got "${session.workoutCode}"`);
    }

    if (workout) {
      const templateExercisesById = new Map(workout.exercises.map((exercise) => [exercise.exerciseId, exercise]));
      const templateExerciseIds = new Set(templateExercisesById.keys());
      const snapshotExerciseIds = new Set(session.exerciseSnapshots.map((snapshot) => snapshot.exerciseId));

      if (
        session.exerciseSnapshots.length !== workout.exercises.length ||
        !sameStringSet(snapshotExerciseIds, templateExerciseIds)
      ) {
        issues.push(
          `sessions.${session.id}.exerciseSnapshots: expected exercise ids "${Array.from(templateExerciseIds).join(", ")}"`,
        );
      }

      session.exerciseSnapshots.forEach((snapshot, index) => {
        const templateExercise = templateExercisesById.get(snapshot.exerciseId);

        if (!templateExercise) {
          return;
        }

        if (snapshot.workoutCode !== workout.code) {
          issues.push(
            `sessions.${session.id}.exerciseSnapshots.${index}.workoutCode: expected "${workout.code}", got "${snapshot.workoutCode}"`,
          );
        }

        if (snapshot.order !== templateExercise.order) {
          issues.push(
            `sessions.${session.id}.exerciseSnapshots.${index}.order: expected "${templateExercise.order}", got "${snapshot.order}"`,
          );
        }

        if (snapshot.target !== templateExercise.target) {
          issues.push(
            `sessions.${session.id}.exerciseSnapshots.${index}.target: expected "${templateExercise.target}", got "${snapshot.target}"`,
          );
        }
      });
    }

    session.exerciseSnapshots.forEach((snapshot, index) => {
      validateReference(
        issues,
        `sessions.${session.id}.exerciseSnapshots.${index}.exerciseId`,
        snapshot.exerciseId,
        exerciseIds,
      );
      validateReference(
        issues,
        `sessions.${session.id}.exerciseSnapshots.${index}.mediaId`,
        snapshot.mediaId,
        mediaIds,
      );

      const exercise = exercisesById.get(snapshot.exerciseId);

      if (exercise && snapshot.loggingType !== exercise.loggingType) {
        issues.push(
          `sessions.${session.id}.exerciseSnapshots.${index}.loggingType: expected "${exercise.loggingType}", got "${snapshot.loggingType}"`,
        );
      }
    });
  });

  payload.sets.forEach((set) => {
    validateReference(issues, `sets.${set.id}.sessionId`, set.sessionId, sessionIds);
    validateReference(issues, `sets.${set.id}.exerciseId`, set.exerciseId, exerciseIds);

    const session = sessionsById.get(set.sessionId);
    const exercise = exercisesById.get(set.exerciseId);
    const snapshot = session?.exerciseSnapshots.find((item) => item.exerciseId === set.exerciseId);

    if (session && !snapshot) {
      issues.push(`sets.${set.id}.exerciseId: exercise "${set.exerciseId}" is not part of session "${set.sessionId}"`);
    }

    if (snapshot && set.loggingType !== snapshot.loggingType) {
      issues.push(`sets.${set.id}.loggingType: expected "${snapshot.loggingType}", got "${set.loggingType}"`);
    }

    if (exercise && set.loggingType !== exercise.loggingType) {
      issues.push(`sets.${set.id}.loggingType: expected exercise logging type "${exercise.loggingType}", got "${set.loggingType}"`);
    }
  });

  if (issues.length > 0) {
    throw new Error(`Invalid backup: ${issues.join("; ")}`);
  }
}

async function readSortedById<T extends { id: string }>(table: Table<T, string>): Promise<T[]> {
  return (await table.toArray()).sort(compareById);
}

async function replaceStore<T, TKey>(table: Table<T, TKey>, items: readonly T[]): Promise<void> {
  await table.clear();

  if (items.length > 0) {
    await table.bulkPut(Array.from(items));
  }
}

export async function exportBackup(db: GymDatabase, appVersion = "0.1.0"): Promise<BackupPayload> {
  return db.transaction(
    "r",
    [db.programs, db.programVersions, db.workouts, db.exercises, db.media, db.sessions, db.sets, db.settings],
    async () => ({
      schemaVersion: 1,
      exportedAt: new Date().toISOString(),
      appVersion,
      programs: await readSortedById(db.programs),
      programVersions: await readSortedById(db.programVersions),
      workouts: await readSortedById(db.workouts),
      exercises: await readSortedById(db.exercises),
      media: await readSortedById(db.media),
      sessions: await readSortedById(db.sessions),
      sets: await readSortedById(db.sets),
      settings: await readSortedById(db.settings),
    }),
  );
}

export function parseBackup(value: unknown): BackupPayload {
  const result = backupPayloadSchema.safeParse(value);

  if (!result.success) {
    const details = result.error.issues
      .map((issue) => `${issue.path.join(".") || "payload"}: ${issue.message}`)
      .join("; ");

    throw new Error(`Invalid backup: ${details}`);
  }

  const payload = result.data as BackupPayload;

  validateBackupSemantics(payload);

  return payload;
}

export async function restoreBackup(db: GymDatabase, payload: BackupPayload): Promise<void> {
  const validPayload = parseBackup(payload);

  await db.transaction(
    "rw",
    [db.programs, db.programVersions, db.workouts, db.exercises, db.media, db.sessions, db.sets, db.settings],
    async () => {
      await replaceStore(db.programs, validPayload.programs);
      await replaceStore(db.programVersions, validPayload.programVersions);
      await replaceStore(db.workouts, validPayload.workouts);
      await replaceStore(db.exercises, validPayload.exercises);
      await replaceStore(db.media, validPayload.media);
      await replaceStore(db.sessions, validPayload.sessions);
      await replaceStore(db.sets, validPayload.sets);
      await replaceStore(db.settings, validPayload.settings);
    },
  );
}
