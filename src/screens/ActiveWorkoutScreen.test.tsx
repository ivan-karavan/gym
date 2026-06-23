import { render, screen, waitFor, within } from "@testing-library/react";
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

function createSession(code: WorkoutCode, overrides: Partial<WorkoutSession> = {}): WorkoutSession {
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
    ...overrides,
  };
}

function buildStoreValue(store: Partial<AppStoreValue>): AppStoreValue {
  const activeSession = store.activeSession ?? createSession("A");

  return {
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
}

function renderWithStore(store: Partial<AppStoreValue>, children: ReactNode) {
  return render(<AppStoreContext.Provider value={buildStoreValue(store)}>{children}</AppStoreContext.Provider>);
}

describe("ActiveWorkoutScreen", () => {
  it("saves decimal weight, reps and effort for a weight/reps exercise", async () => {
    const user = userEvent.setup();
    const saveSet = vi.fn().mockResolvedValue(undefined);

    renderWithStore({ saveSet }, <ActiveWorkoutScreen />);

    const card = screen.getByRole("article", { name: "Присед со штангой" });
    const weightInput = within(card).getByLabelText("Вес, кг");
    expect(weightInput).toHaveAttribute("type", "text");
    expect(weightInput).toHaveAttribute("inputmode", "decimal");

    await user.type(weightInput, "47,5");
    await user.type(within(card).getByLabelText("Повторы"), "8");
    await user.click(within(card).getByRole("button", { name: "Тяжело" }));
    await user.click(within(card).getByRole("button", { name: "Сохранить подход" }));

    expect(saveSet).toHaveBeenCalledWith({
      exerciseId: "ex-barbell-squat",
      setIndex: 1,
      loggingType: "weight_reps",
      weightKg: 47.5,
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

  it("keeps the local note draft when a reload updates the same active session", async () => {
    const user = userEvent.setup();
    const updateSessionNote = vi.fn().mockResolvedValue(undefined);
    const activeSession = createSession("A", { note: "old note" });
    const view = renderWithStore({ activeSession, updateSessionNote }, <ActiveWorkoutScreen />);

    const noteField = screen.getByLabelText("Заметка к тренировке");
    await user.clear(noteField);
    await user.type(noteField, "new note");
    await user.tab();

    expect(updateSessionNote).toHaveBeenCalledWith("new note");

    const reloadedSession = {
      ...activeSession,
      note: "old note from async reload",
      updatedAt: "2026-06-23T10:05:00.000+03:00",
    };

    view.rerender(
      <AppStoreContext.Provider value={buildStoreValue({ activeSession: reloadedSession, updateSessionNote })}>
        <ActiveWorkoutScreen />
      </AppStoreContext.Provider>,
    );

    expect(screen.getByLabelText("Заметка к тренировке")).toHaveValue("new note");
  });

  it("disables complete while completion is pending", async () => {
    const user = userEvent.setup();
    const completeDeferred = createDeferred<void>();
    const completeActiveSession = vi.fn().mockReturnValue(completeDeferred.promise);

    renderWithStore({ completeActiveSession }, <ActiveWorkoutScreen />);

    await user.click(screen.getByRole("button", { name: "Завершить тренировку" }));

    expect(completeActiveSession).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("button", { name: "Завершаю..." })).toBeDisabled();

    await user.click(screen.getByRole("button", { name: "Завершаю..." }));
    expect(completeActiveSession).toHaveBeenCalledTimes(1);

    completeDeferred.resolve();

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Завершить тренировку" })).not.toBeDisabled();
    });
  });
});

function createDeferred<T>() {
  let resolve: (value: T | PromiseLike<T>) => void = () => undefined;
  let reject: (reason?: unknown) => void = () => undefined;
  const promise = new Promise<T>((promiseResolve, promiseReject) => {
    resolve = promiseResolve;
    reject = promiseReject;
  });

  return { promise, resolve, reject };
}
