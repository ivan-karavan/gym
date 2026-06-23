import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import { AppStoreContext, type AppStoreValue } from "../app/useAppStore";
import { initialProgram } from "../data/initialProgram";
import type { MediaAsset } from "../domain/types";
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

    await user.click(screen.getByRole("button", { name: "B" }));
    await user.click(screen.getByRole("button", { name: "Начать тренировку B" }));

    expect(startWorkout).toHaveBeenCalledWith("B");
  });
});
