import { useEffect, useMemo, useState } from "react";
import { useAppStore } from "../app/useAppStore";
import type { WorkoutCode } from "../domain/types";

export function TodayScreen() {
  const { programBundle, suggestedWorkout, startWorkout } = useAppStore();
  const workoutOptions = useMemo(() => programBundle?.workouts ?? [], [programBundle?.workouts]);
  const fallbackWorkout = workoutOptions[0]?.code ?? "A";
  const [selectedWorkout, setSelectedWorkout] = useState<WorkoutCode>(suggestedWorkout ?? fallbackWorkout);
  const selectedTemplate = workoutOptions.find((workout) => workout.code === selectedWorkout);

  useEffect(() => {
    if (suggestedWorkout) {
      setSelectedWorkout(suggestedWorkout);
    }
  }, [suggestedWorkout]);

  return (
    <section className="screen today-screen">
      <div className="screen-header">
        <p className="eyebrow">Gym Tracker</p>
        <h1>Сегодня</h1>
        <p className="screen-lead">
          Следующая по плану: {suggestedWorkout ? `Тренировка ${suggestedWorkout}` : "загрузка программы"}
        </p>
      </div>

      <div className="today-workout">
        <div>
          <h2>{selectedTemplate?.name ?? `Тренировка ${selectedWorkout}`}</h2>
          <p className="muted-text">
            Выбери тренировку вручную, если цикл сегодня нужно сдвинуть. После старта откроется быстрый журнал подходов.
          </p>
        </div>

        <div className="workout-picker" role="group" aria-label="Выбор тренировки">
          {workoutOptions.map((workout) => (
            <button
              className={workout.code === selectedWorkout ? "code-button selected" : "code-button"}
              type="button"
              aria-pressed={workout.code === selectedWorkout}
              key={workout.id}
              onClick={() => setSelectedWorkout(workout.code)}
            >
              {workout.code}
            </button>
          ))}
        </div>

        <button className="primary-button full-width" type="button" onClick={() => void startWorkout(selectedWorkout)}>
          Начать тренировку {selectedWorkout}
        </button>
      </div>
    </section>
  );
}
