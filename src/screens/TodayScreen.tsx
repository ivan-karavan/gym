import { useEffect, useMemo, useState } from "react";
import { useAppStore } from "../app/useAppStore";
import type { Exercise, WorkoutCode, WorkoutTemplate } from "../domain/types";

const seedWorkoutSummaries: Record<string, string> = {
  "workout-a": "Присед, жим лежа, горизонтальная тяга, румынская тяга, планка",
  "workout-b": "Становая, вертикальный жим, подтягивания, ноги, задняя дельта",
  "workout-c": "Легкий присед, наклонный жим, верхняя тяга, задняя поверхность, плечи и пресс",
};

export function TodayScreen() {
  const { activeSession, programBundle, suggestedWorkout, startWorkout } = useAppStore();
  const workoutOptions = useMemo(() => programBundle?.workouts ?? [], [programBundle?.workouts]);
  const exerciseNamesById = useMemo(() => buildExerciseNameMap(programBundle?.exercises ?? []), [programBundle?.exercises]);
  const fallbackWorkout = workoutOptions[0]?.code ?? "A";
  const [selectedWorkout, setSelectedWorkout] = useState<WorkoutCode>(suggestedWorkout ?? fallbackWorkout);
  const [starting, setStarting] = useState(false);
  const selectedTemplate = workoutOptions.find((workout) => workout.code === selectedWorkout);
  const startDisabled = starting || activeSession !== null;

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
          {workoutOptions.map((workout) => {
            const summary = getWorkoutSummary(workout, exerciseNamesById);

            return (
              <button
                className={workout.code === selectedWorkout ? "code-button selected" : "code-button"}
                type="button"
                aria-label={`Выбрать тренировку ${workout.code}`}
                aria-pressed={workout.code === selectedWorkout}
                key={workout.id}
                onClick={() => setSelectedWorkout(workout.code)}
              >
                <span className="code-button-code">{workout.code}</span>
                <span className="code-button-summary">{summary}</span>
              </button>
            );
          })}
        </div>

        <button
          className="primary-button full-width"
          type="button"
          disabled={startDisabled}
          onClick={() => void handleStartWorkout()}
        >
          {starting ? "Начинаю..." : `Начать тренировку ${selectedWorkout}`}
        </button>
      </div>
    </section>
  );

  async function handleStartWorkout() {
    if (startDisabled) {
      return;
    }

    setStarting(true);

    try {
      await startWorkout(selectedWorkout);
    } finally {
      setStarting(false);
    }
  }
}

function buildExerciseNameMap(exercises: Exercise[]): Map<string, string> {
  return new Map(exercises.map((exercise) => [exercise.id, exercise.name]));
}

function getWorkoutSummary(workout: WorkoutTemplate, exerciseNamesById: Map<string, string>): string {
  if (workout.summary?.trim()) {
    return workout.summary;
  }

  const seedSummary = seedWorkoutSummaries[workout.id];
  if (seedSummary) {
    return seedSummary;
  }

  return workout.exercises
    .map((exercise) => exerciseNamesById.get(exercise.exerciseId))
    .filter((name): name is string => Boolean(name))
    .join(", ");
}
