import { Download, Upload } from "lucide-react";
import { useRef, useState } from "react";
import { useAppStore } from "../app/useAppStore";
import type { BackupPayload } from "../storage/backup";

export function SettingsScreen() {
  const { exportJsonBackup, restoreJsonBackup } = useAppStore();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [pendingBackup, setPendingBackup] = useState<unknown>(null);
  const [pendingFileName, setPendingFileName] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  return (
    <section className="screen settings-screen">
      <div className="screen-header">
        <p className="eyebrow">Локальные данные</p>
        <h1>Настройки</h1>
        <p className="screen-lead">Backup хранит программу, завершенные тренировки и подходы в одном JSON файле.</p>
      </div>

      <div className="settings-actions">
        <button className="primary-button icon-text-button" type="button" disabled={busy} onClick={handleExport}>
          <Download aria-hidden="true" size={19} />
          <span>{busy ? "Готовлю backup..." : "Скачать JSON backup"}</span>
        </button>

        <label className="file-restore-control">
          <span className="file-restore-label">
            <Upload aria-hidden="true" size={19} />
            Restore JSON backup
          </span>
          <input
            ref={fileInputRef}
            type="file"
            accept=".json,application/json"
            onChange={(event) => void handleFileChange(event.currentTarget.files?.[0])}
          />
        </label>
      </div>

      {pendingBackup !== null ? (
        <div className="confirmation-panel" role="alert">
          <div>
            <h2>Восстановить backup?</h2>
            <p>Текущая локальная база будет заменена.</p>
            {pendingFileName ? <p className="muted-text">{pendingFileName}</p> : null}
          </div>

          <div className="confirmation-actions">
            <button className="secondary-button" type="button" disabled={busy} onClick={() => void handleRestore()}>
              {busy ? "Восстанавливаю..." : "Подтвердить замену"}
            </button>
            <button className="quiet-button" type="button" disabled={busy} onClick={clearPendingBackup}>
              Отмена
            </button>
          </div>
        </div>
      ) : null}

      {message ? <p className="status-message success">{message}</p> : null}
      {error ? <p className="status-message error">{error}</p> : null}
    </section>
  );

  async function handleExport() {
    setBusy(true);
    setError(null);
    setMessage(null);

    try {
      const payload = await exportJsonBackup();
      downloadBackup(payload);
      setMessage("Backup скачан.");
    } catch (exportError) {
      setError(formatError(exportError, "Не удалось скачать JSON backup"));
    } finally {
      setBusy(false);
    }
  }

  async function handleFileChange(file: File | undefined) {
    setError(null);
    setMessage(null);
    setPendingBackup(null);
    setPendingFileName("");

    if (!file) {
      return;
    }

    try {
      const parsed = JSON.parse(await readTextFile(file)) as unknown;
      setPendingBackup(parsed);
      setPendingFileName(file.name);
    } catch (parseError) {
      setError(formatError(parseError, "Не удалось прочитать JSON backup"));
      clearFileInput();
    }
  }

  async function handleRestore() {
    if (pendingBackup === null) {
      return;
    }

    setBusy(true);
    setError(null);
    setMessage(null);

    try {
      await restoreJsonBackup(pendingBackup);
      clearPendingBackup();
      setMessage("Backup восстановлен.");
    } catch (restoreError) {
      setError(formatError(restoreError, "Не удалось восстановить JSON backup"));
    } finally {
      setBusy(false);
    }
  }

  function clearPendingBackup() {
    setPendingBackup(null);
    setPendingFileName("");
    clearFileInput();
  }

  function clearFileInput() {
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }
}

function readTextFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => {
      resolve(typeof reader.result === "string" ? reader.result : "");
    };
    reader.onerror = () => {
      reject(reader.error ?? new Error("Unable to read file"));
    };
    reader.readAsText(file);
  });
}

function downloadBackup(payload: BackupPayload) {
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = `gym-tracker-backup-${payload.exportedAt.slice(0, 10)}.json`;
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function formatError(error: unknown, fallback: string): string {
  if (error instanceof Error) {
    return `${fallback}: ${error.message}`;
  }

  return fallback;
}
