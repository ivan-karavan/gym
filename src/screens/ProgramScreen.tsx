import { useMemo } from "react";
import { useAppStore } from "../app/useAppStore";
import type { Exercise, MediaAsset, ProgramBundle, WorkoutTemplate } from "../domain/types";

export function ProgramScreen() {
  const { mediaById, programBundle } = useAppStore();
  const exercisesById = useMemo(
    () => new Map((programBundle?.exercises ?? []).map((exercise) => [exercise.id, exercise])),
    [programBundle?.exercises],
  );
  const workouts = useMemo(() => getCurrentWorkouts(programBundle), [programBundle]);

  return (
    <section className="screen program-screen">
      <div className="screen-header">
        <p className="eyebrow">Программа</p>
        <h1>{programBundle?.program.name ?? "Тренировки A/B/C"}</h1>
        <p className="screen-lead">План без редактирования: цели, техника и подсказки по каждому упражнению.</p>
      </div>

      <div className="program-workouts">
        {workouts.map((workout) => (
          <article className="program-workout" key={workout.id}>
            <div className="program-workout-header">
              <span className="code-badge">{workout.code}</span>
              <div>
                <p className="eyebrow">Тренировка</p>
                <h2>{workout.name}</h2>
              </div>
            </div>

            <div className="program-exercise-list">
              {workout.exercises
                .slice()
                .sort((left, right) => left.order - right.order)
                .map((templateExercise) => {
                  const exercise = exercisesById.get(templateExercise.exerciseId);

                  return exercise ? (
                    <ProgramExercise
                      exercise={exercise}
                      key={templateExercise.exerciseId}
                      media={mediaById[exercise.mediaId]}
                      order={templateExercise.order}
                      target={templateExercise.target}
                    />
                  ) : null;
                })}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

interface ProgramExerciseProps {
  exercise: Exercise;
  media: MediaAsset | undefined;
  order: number;
  target: string;
}

function ProgramExercise({ exercise, media, order, target }: ProgramExerciseProps) {
  return (
    <article className="program-exercise" aria-label={exercise.name}>
      <div className="program-exercise-media">
        {media ? (
          <img src={`/${media.localPath}`} alt={media.alt} />
        ) : (
          <div className="exercise-image-fallback" role="img" aria-label={exercise.name}>
            {exercise.name.slice(0, 1)}
          </div>
        )}
      </div>

      <div className="program-exercise-body">
        <div className="exercise-title-row">
          <div>
            <p className="eyebrow">#{order}</p>
            <h3>{exercise.name}</h3>
          </div>
          <span className="target-pill">{target}</span>
        </div>

        <p className="exercise-description">{exercise.description}</p>

        <ul className="cue-list">
          {exercise.cues.map((cue) => (
            <li key={cue}>{cue}</li>
          ))}
        </ul>
      </div>
    </article>
  );
}

function getCurrentWorkouts(programBundle: ProgramBundle | null): WorkoutTemplate[] {
  if (!programBundle) {
    return [];
  }

  const workoutsById = new Map(programBundle.workouts.map((workout) => [workout.id, workout]));

  return programBundle.currentVersion.workoutIds.flatMap((workoutId) => {
    const workout = workoutsById.get(workoutId);

    return workout ? [workout] : [];
  });
}
