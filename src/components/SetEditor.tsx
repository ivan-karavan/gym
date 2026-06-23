import { useMemo, useState } from "react";
import type { Effort, WorkoutExerciseSnapshot } from "../domain/types";
import type { SaveSetPayload } from "../app/useAppStore";
import { EffortToggle } from "./EffortToggle";

interface SetEditorProps {
  exercise: WorkoutExerciseSnapshot;
  nextSetIndex: number;
  onSave: (payload: SaveSetPayload) => Promise<void>;
}

export function SetEditor({ exercise, nextSetIndex, onSave }: SetEditorProps) {
  const [weightKg, setWeightKg] = useState("");
  const [reps, setReps] = useState("");
  const [durationSeconds, setDurationSeconds] = useState("");
  const [effort, setEffort] = useState<Effort>("normal");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);

  const parsed = useMemo(
    () => ({
      weightKg: parseDecimal(weightKg),
      reps: parsePositiveInteger(reps),
      durationSeconds: parsePositiveInteger(durationSeconds),
    }),
    [durationSeconds, reps, weightKg],
  );
  const canSave =
    exercise.loggingType === "weight_reps"
      ? parsed.weightKg !== null && parsed.reps !== null
      : exercise.loggingType === "reps"
        ? parsed.reps !== null
        : parsed.durationSeconds !== null;

  async function handleSave() {
    if (!canSave || saving) {
      return;
    }

    const trimmedNote = note.trim();
    const base = {
      exerciseId: exercise.exerciseId,
      setIndex: nextSetIndex,
      effort,
      ...(trimmedNote === "" ? {} : { note: trimmedNote }),
    };
    const payload = buildPayload(exercise.loggingType, base, parsed);

    if (!payload) {
      return;
    }

    setSaving(true);

    try {
      await onSave(payload);
      setNote("");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="set-editor">
      <div className="set-editor-heading">
        <h3>Подход {nextSetIndex}</h3>
      </div>

      <div className="set-input-grid">
        {exercise.loggingType === "weight_reps" ? (
          <>
            <label>
              <span>Вес, кг</span>
              <input
                value={weightKg}
                onChange={(event) => setWeightKg(event.target.value)}
                inputMode="decimal"
                type="number"
                min="0"
                step="0.5"
              />
            </label>
            <label>
              <span>Повторы</span>
              <input
                value={reps}
                onChange={(event) => setReps(event.target.value)}
                inputMode="numeric"
                type="number"
                min="1"
                step="1"
              />
            </label>
          </>
        ) : null}

        {exercise.loggingType === "reps" ? (
          <label>
            <span>Повторы</span>
            <input
              value={reps}
              onChange={(event) => setReps(event.target.value)}
              inputMode="numeric"
              type="number"
              min="1"
              step="1"
            />
          </label>
        ) : null}

        {exercise.loggingType === "duration" ? (
          <label>
            <span>Секунды</span>
            <input
              value={durationSeconds}
              onChange={(event) => setDurationSeconds(event.target.value)}
              inputMode="numeric"
              type="number"
              min="1"
              step="1"
            />
          </label>
        ) : null}
      </div>

      <EffortToggle value={effort} onChange={setEffort} />

      <label className="set-note-field">
        <span>Заметка к подходу</span>
        <textarea value={note} onChange={(event) => setNote(event.target.value)} rows={2} />
      </label>

      <button className="primary-button full-width" type="button" disabled={!canSave || saving} onClick={handleSave}>
        {saving ? "Сохраняю..." : "Сохранить подход"}
      </button>
    </div>
  );
}

type BaseSetPayload = Pick<SaveSetPayload, "exerciseId" | "setIndex" | "effort" | "note">;

function buildPayload(
  loggingType: WorkoutExerciseSnapshot["loggingType"],
  base: BaseSetPayload,
  parsed: {
    weightKg: number | null;
    reps: number | null;
    durationSeconds: number | null;
  },
): SaveSetPayload | null {
  if (loggingType === "weight_reps") {
    if (parsed.weightKg === null || parsed.reps === null) {
      return null;
    }

    return {
      ...base,
      loggingType: "weight_reps",
      weightKg: parsed.weightKg,
      reps: parsed.reps,
    };
  }

  if (loggingType === "reps") {
    if (parsed.reps === null) {
      return null;
    }

    return {
      ...base,
      loggingType: "reps",
      reps: parsed.reps,
    };
  }

  if (parsed.durationSeconds === null) {
    return null;
  }

  return {
    ...base,
    loggingType: "duration",
    durationSeconds: parsed.durationSeconds,
  };
}

function parseDecimal(value: string): number | null {
  if (value.trim() === "") {
    return null;
  }

  const numberValue = Number(value.replace(",", "."));

  return Number.isFinite(numberValue) && numberValue >= 0 ? numberValue : null;
}

function parsePositiveInteger(value: string): number | null {
  if (value.trim() === "") {
    return null;
  }

  const numberValue = Number(value);

  return Number.isInteger(numberValue) && numberValue > 0 ? numberValue : null;
}
