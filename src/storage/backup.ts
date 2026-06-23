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

function isParseableDateString(value: string): boolean {
  return Number.isFinite(Date.parse(value));
}

const timestampSchema = z.string().refine(isParseableDateString, "Invalid date string");

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

function findById<T extends { id: string }>(items: readonly T[], id: string): T | undefined {
  return items.find((item) => item.id === id);
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

function validateReference(issues: string[], path: string, id: string, ids: ReadonlySet<string>): void {
  if (!ids.has(id)) {
    issues.push(`${path}: unknown id "${id}"`);
  }
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
    ...collectDuplicateIds("settings", payload.settings),
  ];

  const programIds = idSet(payload.programs);
  const programVersionIds = idSet(payload.programVersions);
  const workoutIds = idSet(payload.workouts);
  const exerciseIds = idSet(payload.exercises);
  const mediaIds = idSet(payload.media);
  const sessionIds = idSet(payload.sessions);

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

  const activeProgram = settings ? findById(payload.programs, settings.activeProgramId) : undefined;
  const currentVersion = activeProgram
    ? findById(payload.programVersions, activeProgram.currentVersionId)
    : undefined;

  if (activeProgram && !currentVersion) {
    issues.push(`programs.${activeProgram.id}.currentVersionId: unknown id "${activeProgram.currentVersionId}"`);
  }

  if (activeProgram && currentVersion && currentVersion.programId !== activeProgram.id) {
    issues.push(
      `programVersions.${currentVersion.id}.programId: expected "${activeProgram.id}", got "${currentVersion.programId}"`,
    );
  }

  if (currentVersion) {
    currentVersion.workoutIds.forEach((workoutId, index) => {
      validateReference(issues, `programVersions.${currentVersion.id}.workoutIds.${index}`, workoutId, workoutIds);
    });
  }

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
    });
  });

  payload.sets.forEach((set) => {
    validateReference(issues, `sets.${set.id}.sessionId`, set.sessionId, sessionIds);
    validateReference(issues, `sets.${set.id}.exerciseId`, set.exerciseId, exerciseIds);
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
