import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AppStoreContext, type AppStoreValue } from "../app/useAppStore";
import { initialProgram } from "../data/initialProgram";
import type { BackupPayload } from "../storage/backup";
import { SettingsScreen } from "./SettingsScreen";

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

describe("SettingsScreen", () => {
  beforeEach(() => {
    vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => undefined);
    vi.stubGlobal("URL", {
      createObjectURL: vi.fn(() => "blob:gym-backup"),
      revokeObjectURL: vi.fn(),
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("exports a JSON backup through the store action", async () => {
    const user = userEvent.setup();
    const exportJsonBackup = vi.fn().mockResolvedValue(backupPayload);

    renderWithStore({ exportJsonBackup }, <SettingsScreen />);

    await user.click(screen.getByRole("button", { name: "Скачать JSON backup" }));

    expect(exportJsonBackup).toHaveBeenCalledTimes(1);
  });

  it("requires confirmation before restoring and replacing local data", async () => {
    const user = userEvent.setup();
    const restoreJsonBackup = vi.fn().mockResolvedValue(undefined);
    const file = new File([JSON.stringify(backupPayload)], "gym-backup.json", {
      type: "application/json",
    });

    renderWithStore({ restoreJsonBackup }, <SettingsScreen />);

    await user.upload(screen.getByLabelText("Восстановить JSON backup"), file);

    expect(await screen.findByText("Текущая локальная база будет заменена.")).toBeInTheDocument();
    expect(restoreJsonBackup).not.toHaveBeenCalled();

    await user.click(screen.getByRole("button", { name: "Подтвердить замену" }));

    await waitFor(() => {
      expect(restoreJsonBackup).toHaveBeenCalledWith(backupPayload);
    });
  });

  it.each([
    ["null", null],
    ["random object", { ok: true }],
  ])("rejects %s JSON before showing destructive confirmation", async (_caseName, value) => {
    const user = userEvent.setup();
    const restoreJsonBackup = vi.fn().mockResolvedValue(undefined);
    const file = new File([JSON.stringify(value)], "invalid-backup.json", {
      type: "application/json",
    });

    renderWithStore({ restoreJsonBackup }, <SettingsScreen />);

    const input = screen.getByLabelText("Восстановить JSON backup") as HTMLInputElement;

    await user.upload(input, file);

    expect(await screen.findByText(/Не удалось прочитать JSON backup: Invalid backup/)).toBeInTheDocument();
    expect(screen.queryByText("Текущая локальная база будет заменена.")).not.toBeInTheDocument();
    expect(restoreJsonBackup).not.toHaveBeenCalled();

    await waitFor(() => {
      expect(input.value).toBe("");
    });
  });
});
