import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AppStoreContext, type AppStoreValue } from "../app/useAppStore";
import { initialProgram } from "../data/initialProgram";
import type { WorkoutSession } from "../domain/types";
import type { BackupPayload } from "../storage/backup";
import { HistoryScreen } from "./HistoryScreen";

const backupPayload = {
  schemaVersion: 1,
  exportedAt: "2026-06-23T10:00:00.000Z",
  appVersion: "0.1.0",
  programs: [initialProgram.program],
  programVersions: initialProgram.versions,
  workouts: initialProgram.workouts,
  exercises: initialProgram.exercises,
  media: initialProgram.media,
  sessions: [],
  sets: [],
  settings: [
    {
      id: "app-settings",
      createdAt: "2026-06-23T10:00:00.000Z",
      updatedAt: "2026-06-23T10:00:00.000Z",
      schemaVersion: 1,
      activeProgramId: initialProgram.program.id,
    },
  ],
} satisfies BackupPayload;

function buildStoreValue(store: Partial<AppStoreValue>): AppStoreValue {
  return {
    loading: false,
    error: null,
    programBundle: initialProgram,
    sessions: [],
    sets: [],
    activeSession: null,
    suggestedWorkout: "A",
    mediaById: {},
    previousWeeksByExercise: {},
    startWorkout: vi.fn().mockResolvedValue(undefined),
    saveSet: vi.fn().mockResolvedValue(undefined),
    updateSessionNote: vi.fn().mockResolvedValue(undefined),
    completeActiveSession: vi.fn().mockResolvedValue(undefined),
    exportJsonBackup: vi.fn().mockResolvedValue(backupPayload),
    restoreJsonBackup: vi.fn().mockResolvedValue(undefined),
    reload: vi.fn().mockResolvedValue(undefined),
    ...store,
  };
}

function renderWithStore(store: Partial<AppStoreValue>, children: ReactNode) {
  return render(<AppStoreContext.Provider value={buildStoreValue(store)}>{children}</AppStoreContext.Provider>);
}

describe("HistoryScreen", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("groups canonical UTC sessions by the local phone week", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-06-23T09:00:00.000Z"));

    const session = {
      id: "session-local-monday",
      createdAt: "2026-06-21T21:30:00.000Z",
      updatedAt: "2026-06-21T22:15:00.000Z",
      schemaVersion: 1,
      programVersionId: initialProgram.currentVersion.id,
      workoutTemplateId: "workout-a",
      workoutCode: "A",
      status: "completed",
      startedAt: "2026-06-21T21:30:00.000Z",
      completedAt: "2026-06-21T22:15:00.000Z",
      note: "",
      exerciseSnapshots: [
        {
          exerciseId: "ex-barbell-squat",
          exerciseName: "Присед со штангой",
          loggingType: "weight_reps",
          target: "3 x 6-8",
          workoutCode: "A",
          order: 1,
          description: "Базовое упражнение для ног и корпуса.",
          mediaId: "media-barbell-squat",
        },
      ],
    } satisfies WorkoutSession;

    renderWithStore({ sessions: [session] }, <HistoryScreen />);

    expect(screen.getByText("Тренировка A")).toBeInTheDocument();
    expect(screen.queryByText("На этой неделе завершенных тренировок нет")).not.toBeInTheDocument();
  });
});
