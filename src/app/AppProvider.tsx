import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { initialProgram } from "../data/initialProgram";
import type { MediaAsset, SetLog, WorkoutExerciseSnapshot, WorkoutSession } from "../domain/types";
import {
  getPreviousExerciseSets,
  getWeekStart,
  suggestNextWorkoutCode,
  summarizeExerciseWeek,
} from "../domain/workoutLogic";
import { exportBackup, parseBackup, restoreBackup } from "../storage/backup";
import { createGymDatabase, type GymDatabase } from "../storage/db";
import { createRepository, type SaveSetInput } from "../storage/repository";
import {
  AppStoreContext,
  type AppStoreValue,
  type PreviousWeekHint,
  type SaveSetPayload,
} from "./useAppStore";

type Repository = ReturnType<typeof createRepository>;

interface AppProviderProps {
  children: ReactNode;
  databaseName?: string;
  closeOnUnmount?: boolean;
}

type AppStoreState = Pick<
  AppStoreValue,
  | "loading"
  | "error"
  | "programBundle"
  | "sessions"
  | "sets"
  | "activeSession"
  | "suggestedWorkout"
  | "mediaById"
  | "previousWeeksByExercise"
>;

const emptyState: AppStoreState = {
  loading: true,
  error: null,
  programBundle: null,
  sessions: [],
  sets: [],
  activeSession: null,
  suggestedWorkout: null,
  mediaById: {},
  previousWeeksByExercise: {},
};

const previousWeekLabels = ["Прошлая неделя", "2 недели назад"] as const;

export function AppProvider({ children, databaseName, closeOnUnmount = false }: AppProviderProps) {
  const dbRef = useRef<GymDatabase | null>(null);
  const repoRef = useRef<Repository | null>(null);
  const startWorkoutInFlightRef = useRef<Promise<void> | null>(null);
  const completeInFlightRef = useRef<Promise<void> | null>(null);
  const [storeState, setStoreState] = useState<AppStoreState>(emptyState);

  if (!dbRef.current || !repoRef.current) {
    const db = createGymDatabase(databaseName);
    dbRef.current = db;
    repoRef.current = createRepository(db);
  }

  const reload = useCallback(async () => {
    const repo = getRepository(repoRef);

    setStoreState((current) => ({
      ...current,
      loading: current.programBundle === null,
      error: null,
    }));

    try {
      await repo.initialize(initialProgram);

      const programBundle = await repo.loadCurrentProgram();
      const [sessions, sets, activeSession] = await Promise.all([
        repo.loadSessions(),
        repo.loadAllSets(),
        repo.loadActiveSession(),
      ]);
      const suggestedWorkout = suggestNextWorkoutCode(programBundle, sessions);
      const mediaById = indexMedia(programBundle.media);
      const previousWeeksByExercise =
        activeSession === undefined
          ? {}
          : buildPreviousWeeksByExercise(activeSession, sessions, sets);

      setStoreState({
        loading: false,
        error: null,
        programBundle,
        sessions,
        sets,
        activeSession: activeSession ?? null,
        suggestedWorkout,
        mediaById,
        previousWeeksByExercise,
      });
    } catch (error) {
      setStoreState((current) => ({
        ...current,
        loading: false,
        error: error instanceof Error ? error.message : "Не удалось загрузить данные тренировки",
      }));
    }
  }, []);

  useEffect(() => {
    void reload();

    return () => {
      if (closeOnUnmount) {
        dbRef.current?.close();
      }
    };
  }, [closeOnUnmount, reload]);

  const startWorkout = useCallback<AppStoreValue["startWorkout"]>(
    async (code) => {
      if (storeState.activeSession) {
        return;
      }

      if (startWorkoutInFlightRef.current) {
        return startWorkoutInFlightRef.current;
      }

      const repo = getRepository(repoRef);
      const startPromise = (async () => {
        const existingActiveSession = await repo.loadActiveSession();

        if (!existingActiveSession) {
          await repo.startWorkout(code);
        }

        await reload();
      })();

      startWorkoutInFlightRef.current = startPromise;

      try {
        await startPromise;
      } finally {
        if (startWorkoutInFlightRef.current === startPromise) {
          startWorkoutInFlightRef.current = null;
        }
      }
    },
    [reload, storeState.activeSession],
  );

  const saveSet = useCallback<AppStoreValue["saveSet"]>(
    async (payload) => {
      const repo = getRepository(repoRef);
      const sessionId = storeState.activeSession?.id;

      if (!sessionId) {
        throw new Error("Нет активной тренировки для сохранения подхода");
      }

      await repo.saveSet(addSessionId(payload, sessionId));
      await reload();
    },
    [reload, storeState.activeSession?.id],
  );

  const updateSessionNote = useCallback<AppStoreValue["updateSessionNote"]>(
    async (note) => {
      const repo = getRepository(repoRef);
      const sessionId = storeState.activeSession?.id;

      if (!sessionId) {
        return;
      }

      await repo.updateSessionNote(sessionId, note);
      await reload();
    },
    [reload, storeState.activeSession?.id],
  );

  const completeActiveSession = useCallback<AppStoreValue["completeActiveSession"]>(
    async () => {
      const sessionId = storeState.activeSession?.id;

      if (!sessionId) {
        return;
      }

      if (completeInFlightRef.current) {
        return completeInFlightRef.current;
      }

      const repo = getRepository(repoRef);
      const completePromise = (async () => {
        await repo.completeSession(sessionId);
        await reload();
      })();

      completeInFlightRef.current = completePromise;

      try {
        await completePromise;
      } finally {
        if (completeInFlightRef.current === completePromise) {
          completeInFlightRef.current = null;
        }
      }
    },
    [reload, storeState.activeSession?.id],
  );

  const exportJsonBackup = useCallback<AppStoreValue["exportJsonBackup"]>(async () => {
    const db = getDatabase(dbRef);

    return exportBackup(db);
  }, []);

  const restoreJsonBackup = useCallback<AppStoreValue["restoreJsonBackup"]>(
    async (value) => {
      const db = getDatabase(dbRef);
      const payload = parseBackup(value);

      await restoreBackup(db, payload);
      await reload();
    },
    [reload],
  );

  const value = useMemo<AppStoreValue>(
    () => ({
      ...storeState,
      startWorkout,
      saveSet,
      updateSessionNote,
      completeActiveSession,
      exportJsonBackup,
      restoreJsonBackup,
      reload,
    }),
    [
      completeActiveSession,
      exportJsonBackup,
      reload,
      restoreJsonBackup,
      saveSet,
      startWorkout,
      storeState,
      updateSessionNote,
    ],
  );

  return <AppStoreContext.Provider value={value}>{children}</AppStoreContext.Provider>;
}

function getRepository(repoRef: React.MutableRefObject<Repository | null>): Repository {
  if (!repoRef.current) {
    throw new Error("Gym repository is not ready");
  }

  return repoRef.current;
}

function getDatabase(dbRef: React.MutableRefObject<GymDatabase | null>): GymDatabase {
  if (!dbRef.current) {
    throw new Error("Gym database is not ready");
  }

  return dbRef.current;
}

function addSessionId(payload: SaveSetPayload, sessionId: string): SaveSetInput {
  const base = {
    sessionId,
    exerciseId: payload.exerciseId,
    setIndex: payload.setIndex,
    effort: payload.effort,
    ...(payload.note !== undefined ? { note: payload.note } : {}),
  };

  if (payload.loggingType === "weight_reps") {
    return {
      ...base,
      loggingType: "weight_reps",
      weightKg: payload.weightKg,
      reps: payload.reps,
    };
  }

  if (payload.loggingType === "reps") {
    return {
      ...base,
      loggingType: "reps",
      reps: payload.reps,
    };
  }

  return {
    ...base,
    loggingType: "duration",
    durationSeconds: payload.durationSeconds,
  };
}

function indexMedia(media: MediaAsset[]): Record<string, MediaAsset> {
  return Object.fromEntries(media.map((asset) => [asset.id, asset])) as Record<string, MediaAsset>;
}

function buildPreviousWeeksByExercise(
  activeSession: WorkoutSession,
  sessions: WorkoutSession[],
  sets: SetLog[],
): Record<string, PreviousWeekHint[]> {
  return Object.fromEntries(
    activeSession.exerciseSnapshots.map((snapshot) => [
      snapshot.exerciseId,
      buildPreviousWeeks(snapshot, activeSession.startedAt, sessions, sets),
    ]),
  );
}

function buildPreviousWeeks(
  snapshot: WorkoutExerciseSnapshot,
  currentStartedAt: string,
  sessions: WorkoutSession[],
  sets: SetLog[],
): PreviousWeekHint[] {
  const previousGroups = getPreviousExerciseSets(snapshot.exerciseId, currentStartedAt, sessions, sets, 2);
  const groupsByWeekStart = new Map(previousGroups.map((group) => [group.weekStart, group]));
  const currentWeekStart = getWeekStart(currentStartedAt);

  return previousWeekLabels.map((label, index) => {
    const weekStart = addDays(currentWeekStart, -7 * (index + 1));
    const group = groupsByWeekStart.get(weekStart);

    return {
      label,
      weekStart,
      summary: group ? summarizeExerciseWeek(snapshot.loggingType, group.sets) : "-",
    };
  });
}

function addDays(dateValue: string, days: number): string {
  const [yearValue, monthValue, dayValue] = dateValue.split("-").map(Number);
  const date = new Date(yearValue, monthValue - 1, dayValue);
  date.setDate(date.getDate() + days);

  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-");
}
