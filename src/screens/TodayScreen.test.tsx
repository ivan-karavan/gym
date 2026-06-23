import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import { AppStoreContext, type AppStoreValue } from "../app/useAppStore";
import { initialProgram } from "../data/initialProgram";
import type { MediaAsset, ProgramBundle } from "../domain/types";
import { TodayScreen } from "./TodayScreen";

const mediaById = Object.fromEntries(initialProgram.media.map((media) => [media.id, media])) as Record<
  string,
  MediaAsset
>;

function renderWithStore(store: Partial<AppStoreValue>, children: ReactNode) {
  const value: AppStoreValue = {
    loading: false,
    error: null,
    programBundle: initialProgram,
    sessions: [],
    sets: [],
    activeSession: null,
    suggestedWorkout: "A",
    mediaById,
    previousWeeksByExercise: {},
    startWorkout: vi.fn().mockResolvedValue(undefined),
    saveSet: vi.fn().mockResolvedValue(undefined),
    updateSessionNote: vi.fn().mockResolvedValue(undefined),
    completeActiveSession: vi.fn().mockResolvedValue(undefined),
    exportJsonBackup: vi.fn().mockResolvedValue({
      schemaVersion: 1,
      exportedAt: "2026-06-23T10:00:00.000Z",
      appVersion: "0.1.0",
      programs: [],
      programVersions: [],
      workouts: [],
      exercises: [],
      media: [],
      sessions: [],
      sets: [],
      settings: [],
    }),
    restoreJsonBackup: vi.fn().mockResolvedValue(undefined),
    reload: vi.fn().mockResolvedValue(undefined),
    ...store,
  };

  return render(<AppStoreContext.Provider value={value}>{children}</AppStoreContext.Provider>);
}

describe("TodayScreen", () => {
  it("shows the suggested workout and starts the manually selected workout", async () => {
    const user = userEvent.setup();
    const startWorkout = vi.fn().mockResolvedValue(undefined);

    renderWithStore({ startWorkout, suggestedWorkout: "A" }, <TodayScreen />);

    expect(screen.getByRole("heading", { name: "Сегодня" })).toBeInTheDocument();
    expect(screen.getByText("Следующая по плану: Тренировка A")).toBeInTheDocument();

    expect(screen.getByText("Присед, жим лежа, горизонтальная тяга, румынская тяга, планка")).toBeInTheDocument();
    expect(screen.getByText("Становая, вертикальный жим, подтягивания, ноги, задняя дельта")).toBeInTheDocument();
    expect(screen.getByText("Легкий присед, наклонный жим, верхняя тяга, задняя поверхность, плечи и пресс")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Выбрать тренировку B" }));
    await user.click(screen.getByRole("button", { name: "Начать тренировку B" }));

    expect(startWorkout).toHaveBeenCalledWith("B");
  });

  it("uses concise summaries for older persisted seed workouts without summary fields", () => {
    const bundleWithoutSummaries: ProgramBundle = {
      ...initialProgram,
      workouts: initialProgram.workouts.map(({ summary: _summary, ...workout }) => workout),
    };

    renderWithStore({ programBundle: bundleWithoutSummaries, suggestedWorkout: "A" }, <TodayScreen />);

    expect(screen.getByText("Присед, жим лежа, горизонтальная тяга, румынская тяга, планка")).toBeInTheDocument();
    expect(
      screen.queryByText(
        "Присед со штангой, Жим лежа, Тяга горизонтального блока или штанги в наклоне, Румынская тяга, Планка",
      ),
    ).not.toBeInTheDocument();
  });

  it("disables start while the first workout start is pending", async () => {
    const user = userEvent.setup();
    const startDeferred = createDeferred<void>();
    const startWorkout = vi.fn().mockReturnValue(startDeferred.promise);

    renderWithStore({ startWorkout, suggestedWorkout: "A" }, <TodayScreen />);

    await user.dblClick(screen.getByRole("button", { name: "Начать тренировку A" }));

    expect(startWorkout).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("button", { name: "Начинаю..." })).toBeDisabled();

    startDeferred.resolve();

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Начать тренировку A" })).not.toBeDisabled();
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
