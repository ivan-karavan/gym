import type { MediaAsset, SetLog, WorkoutExerciseSnapshot } from "../domain/types";
import type { PreviousWeekHint, SaveSetPayload } from "../app/useAppStore";
import { SetEditor } from "./SetEditor";

interface ExerciseCardProps {
  exercise: WorkoutExerciseSnapshot;
  media: MediaAsset | undefined;
  sets: SetLog[];
  previousWeeks: PreviousWeekHint[];
  onSaveSet: (payload: SaveSetPayload) => Promise<void>;
}

export function ExerciseCard({ exercise, media, sets, previousWeeks, onSaveSet }: ExerciseCardProps) {
  const nextSetIndex = getNextSetIndex(sets);

  return (
    <article className="exercise-card" aria-label={exercise.exerciseName}>
      <div className="exercise-media">
        {media ? (
          <img src={`/${media.localPath}`} alt={media.alt} />
        ) : (
          <div className="exercise-image-fallback" role="img" aria-label={exercise.exerciseName}>
            {exercise.exerciseName.slice(0, 1)}
          </div>
        )}
      </div>

      <div className="exercise-body">
        <div className="exercise-title-row">
          <div>
            <p className="eyebrow">#{exercise.order}</p>
            <h2>{exercise.exerciseName}</h2>
          </div>
          <span className="target-pill">{exercise.target}</span>
        </div>

        <p className="exercise-description">{exercise.description}</p>

        <section className="previous-section" aria-label={`Подсказки для ${exercise.exerciseName}`}>
          <h3>Прошлые 2 недели</h3>
          <div className="previous-grid">
            {previousWeeks.map((week) => (
              <div className="previous-line" key={week.label}>
                <span>{week.label}</span>
                <strong>{week.summary}</strong>
              </div>
            ))}
          </div>
        </section>

        <section className="sets-section" aria-label={`Подходы для ${exercise.exerciseName}`}>
          <h3>Сегодня</h3>
          {sets.length > 0 ? (
            <ol className="set-list">
              {sets.map((set) => (
                <li key={set.id}>
                  <span>{set.setIndex}</span>
                  <div className="set-summary">
                    <strong>{formatSet(set)}</strong>
                    {set.note?.trim() ? <p className="set-note">{set.note}</p> : null}
                  </div>
                  <em>{formatEffort(set.effort)}</em>
                </li>
              ))}
            </ol>
          ) : (
            <p className="muted-text">Подходов пока нет</p>
          )}
        </section>

        <SetEditor exercise={exercise} nextSetIndex={nextSetIndex} onSave={onSaveSet} />
      </div>
    </article>
  );
}

function getNextSetIndex(sets: SetLog[]): number {
  const lastIndex = sets.reduce((maxIndex, set) => Math.max(maxIndex, set.setIndex), 0);

  return lastIndex + 1;
}

function formatSet(set: SetLog): string {
  if (set.loggingType === "weight_reps") {
    return `${formatNumber(set.weightKg)} кг x ${set.reps}`;
  }

  if (set.loggingType === "reps") {
    return `${set.reps} повторов`;
  }

  return `${set.durationSeconds} секунд`;
}

function formatNumber(value: number): string {
  return Number.isInteger(value) ? String(value) : String(value);
}

function formatEffort(effort: SetLog["effort"]): string {
  if (effort === "easy") {
    return "легко";
  }

  if (effort === "hard") {
    return "тяжело";
  }

  return "нормально";
}
