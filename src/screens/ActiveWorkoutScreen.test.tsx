import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import { AppStoreContext, type AppStoreValue, type PreviousWeekHint } from "../app/useAppStore";
import { initialProgram } from "../data/initialProgram";
import type { MediaAsset, WorkoutCode, WorkoutSession } from "../domain/types";
import { buildExerciseSnapshots, getWorkoutByCode } from "../domain/workoutLogic";
import { ActiveWorkoutScreen } from "./ActiveWorkoutScreen";

const mediaById = Object.fromEntries(initialProgram.media.map((media) => [media.id, media])) as Record<
  string,
  MediaAsset
>;

const previousHints: PreviousWeekHint[] = [
  { label: "Прошлая неделя", weekStart: "2026-06-16", summary: "-" },
  { label: "2 недели назад", weekStart: "2026-06-09", summary: "-" },
];

function createSession(code: WorkoutCode): WorkoutSession {
  const workout = getWorkoutByCode(initialProgram, code);
  const startedAt = "2026-06-23T10:00:00.000+03:00";

  return {
    id: `active-${code}`,
    createdAt: startedAt,
    updatedAt: startedAt,
    schemaVersion: 1,
    programVersionId: initialProgram.currentVersion.id,
    workoutTemplateId: workout.id,
    workoutCode: code,
    status: "active",
    startedAt,
    note: "",
    exerciseSnapshots: buildExerciseSnapshots(initialProgram, workout),
  };
}

function renderWithStore(store: Partial<AppStoreValue>, children: ReactNode) {
  const activeSession = store.activeSession ?? createSession("A");
  const value: AppStoreValue = {
    loading: false,
    error: null,
    programBundle: initialProgram,
    sessions: [activeSession],
    sets: [],
    activeSession,
    suggestedWorkout: "A",
    mediaById,
    previousWeeksByExercise: Object.fromEntries(
      activeSession.exerciseSnapshots.map((snapshot) => [snapshot.exerciseId, previousHints]),
    ),
    startWorkout: vi.fn().mockResolvedValue(undefined),
    saveSet: vi.fn().mockResolvedValue(undefined),
    updateSessionNote: vi.fn().mockResolvedValue(undefined),
    completeActiveSession: vi.fn().mockResolvedValue(undefined),
    reload: vi.fn().mockResolvedValue(undefined),
    ...store,
  };

  return render(<AppStoreContext.Provider value={value}>{children}</AppStoreContext.Provider>);
}

describe("ActiveWorkoutScreen", () => {
  it("saves decimal weight, reps and effort for a weight/reps exercise", async () => {
    const user = userEvent.setup();
    const saveSet = vi.fn().mockResolvedValue(undefined);

    renderWithStore({ saveSet }, <ActiveWorkoutScreen />);

    const card = screen.getByRole("article", { name: "Присед со штангой" });
    await user.type(within(card).getByLabelText("Вес, кг"), "42.5");
    await user.type(within(card).getByLabelText("Повторы"), "8");
    await user.click(within(card).getByRole("button", { name: "Тяжело" }));
    await user.click(within(card).getByRole("button", { name: "Сохранить подход" }));

    expect(saveSet).toHaveBeenCalledWith({
      exerciseId: "ex-barbell-squat",
      setIndex: 1,
      loggingType: "weight_reps",
      weightKg: 42.5,
      reps: 8,
      effort: "hard",
    });
  });

  it("saves duration exercise payload without impossible fields", async () => {
    const user = userEvent.setup();
    const saveSet = vi.fn().mockResolvedValue(undefined);

    renderWithStore({ saveSet }, <ActiveWorkoutScreen />);

    const card = screen.getByRole("article", { name: "Планка" });
    await user.type(within(card).getByLabelText("Секунды"), "45");
    await user.click(within(card).getByRole("button", { name: "Сохранить подход" }));

    expect(saveSet).toHaveBeenCalledWith({
      exerciseId: "ex-plank",
      setIndex: 1,
      loggingType: "duration",
      durationSeconds: 45,
      effort: "normal",
    });
    expect(saveSet.mock.calls[0]?.[0]).not.toHaveProperty("weightKg");
    expect(saveSet.mock.calls[0]?.[0]).not.toHaveProperty("reps");
  });
});
