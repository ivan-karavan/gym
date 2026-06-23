import Dexie, { type Table } from "dexie";
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
      sessions: "id, status, startedAt, programVersionId, [status+startedAt], [programVersionId+startedAt]",
      sets: "id, sessionId, exerciseId, [sessionId+exerciseId], [sessionId+exerciseId+setIndex]",
      settings: "id, activeProgramId",
    });
  }
}

export function createGymDatabase(name?: string): GymDatabase {
  return new GymDatabase(name);
}
