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

const entityMetaSchema = z.object({
  id: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
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
    activeFrom: z.string(),
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
    startedAt: z.string(),
    completedAt: z.string().optional(),
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
    exportedAt: z.string().datetime(),
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

  return result.data as BackupPayload;
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
