import { useEffect, useMemo, useState } from "react";
import { ExerciseCard } from "../components/ExerciseCard";
import { useAppStore } from "../app/useAppStore";

export function ActiveWorkoutScreen() {
  const {
    activeSession,
    sets,
    mediaById,
    previousWeeksByExercise,
    saveSet,
    updateSessionNote,
    completeActiveSession,
  } = useAppStore();
  const [note, setNote] = useState(activeSession?.note ?? "");
  const setsByExercise = useMemo(() => {
    const grouped = new Map<string, typeof sets>();

    for (const set of sets) {
      if (set.sessionId !== activeSession?.id) {
        continue;
      }

      grouped.set(set.exerciseId, [...(grouped.get(set.exerciseId) ?? []), set]);
    }

    return grouped;
  }, [activeSession?.id, sets]);

  useEffect(() => {
    setNote(activeSession?.note ?? "");
  }, [activeSession?.id, activeSession?.note]);

  if (!activeSession) {
    return (
      <section className="screen">
        <h1>Нет активной тренировки</h1>
      </section>
    );
  }

  async function handleComplete() {
    if (!activeSession) {
      return;
    }

    if (note !== activeSession.note) {
      await updateSessionNote(note);
    }

    await completeActiveSession();
  }

  return (
    <section className="screen active-workout-screen">
      <div className="screen-header active-header">
        <div>
          <p className="eyebrow">Активная тренировка</p>
          <h1>Тренировка {activeSession.workoutCode}</h1>
        </div>
        <span className="session-pill">В работе</span>
      </div>

      <div className="workout-note">
        <label>
          <span>Заметка к тренировке</span>
          <textarea
            value={note}
            onBlur={() => {
              if (note !== activeSession.note) {
                void updateSessionNote(note);
              }
            }}
            onChange={(event) => setNote(event.target.value)}
            rows={3}
          />
        </label>
      </div>

      <div className="exercise-list">
        {activeSession.exerciseSnapshots.map((exercise) => (
          <ExerciseCard
            exercise={exercise}
            key={exercise.exerciseId}
            media={mediaById[exercise.mediaId]}
            sets={setsByExercise.get(exercise.exerciseId) ?? []}
            previousWeeks={previousWeeksByExercise[exercise.exerciseId] ?? []}
            onSaveSet={saveSet}
          />
        ))}
      </div>

      <div className="complete-bar">
        <button className="secondary-button full-width" type="button" onClick={() => void handleComplete()}>
          Завершить тренировку
        </button>
      </div>
    </section>
  );
}
