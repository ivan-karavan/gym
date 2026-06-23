export type WorkoutCode = "A" | "B" | "C";
export type LoggingType = "weight_reps" | "reps" | "duration";
export type Effort = "easy" | "normal" | "hard";
export type SessionStatus = "active" | "completed";

export interface EntityMeta {
  id: string;
  createdAt: string;
  updatedAt: string;
  schemaVersion: number;
}

export interface MediaAsset {
  id: string;
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
  version: ProgramVersion;
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

export interface SetLog extends EntityMeta {
  sessionId: string;
  exerciseId: string;
  setIndex: number;
  weightKg?: number;
  reps?: number;
  durationSeconds?: number;
  effort: Effort;
  note: string;
}

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
