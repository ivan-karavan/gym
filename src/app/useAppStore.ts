import { createContext, useContext } from "react";
import type { MediaAsset, ProgramBundle, SetLog, WorkoutCode, WorkoutSession } from "../domain/types";
import type { SaveSetInput } from "../storage/repository";

type WithoutSessionId<T> = T extends { sessionId: string } ? Omit<T, "sessionId"> : never;

export type SaveSetPayload = WithoutSessionId<SaveSetInput>;

export interface PreviousWeekHint {
  label: string;
  weekStart: string;
  summary: string;
}

export interface AppStoreValue {
  loading: boolean;
  error: string | null;
  programBundle: ProgramBundle | null;
  sessions: WorkoutSession[];
  sets: SetLog[];
  activeSession: WorkoutSession | null;
  suggestedWorkout: WorkoutCode | null;
  mediaById: Record<string, MediaAsset>;
  previousWeeksByExercise: Record<string, PreviousWeekHint[]>;
  startWorkout: (code: WorkoutCode) => Promise<void>;
  saveSet: (payload: SaveSetPayload) => Promise<void>;
  updateSessionNote: (note: string) => Promise<void>;
  completeActiveSession: () => Promise<void>;
  reload: () => Promise<void>;
}

export const AppStoreContext = createContext<AppStoreValue | null>(null);

export function useAppStore(): AppStoreValue {
  const value = useContext(AppStoreContext);

  if (!value) {
    throw new Error("useAppStore must be used inside AppProvider");
  }

  return value;
}
