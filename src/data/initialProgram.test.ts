import { describe, expect, it } from "vitest";
import { initialProgram } from "./initialProgram";

describe("initialProgram", () => {
  it("contains workouts A, B, and C in order", () => {
    expect(initialProgram.workouts.map((workout) => workout.code)).toEqual(["A", "B", "C"]);
  });

  it("uses exact workout exercise ids and targets from the plan", () => {
    expect(
      Object.fromEntries(
        initialProgram.workouts.map((workout) => [
          workout.code,
          workout.exercises.map((exercise) => ({
            exerciseId: exercise.exerciseId,
            target: exercise.target,
          })),
        ]),
      ),
    ).toEqual({
      A: [
        { exerciseId: "ex-barbell-squat", target: "3 x 6-8" },
        { exerciseId: "ex-bench-press", target: "3 x 6-8" },
        { exerciseId: "ex-horizontal-row", target: "3 x 8-10" },
        { exerciseId: "ex-romanian-deadlift", target: "2-3 x 8-10" },
        { exerciseId: "ex-plank", target: "3 x 30-60 sec" },
      ],
      B: [
        { exerciseId: "ex-deadlift", target: "3 x 4-6" },
        { exerciseId: "ex-overhead-press", target: "3 x 6-8" },
        { exerciseId: "ex-pull-up", target: "3 sets, not to failure" },
        { exerciseId: "ex-leg-press-lunge", target: "3 x 8-10" },
        { exerciseId: "ex-face-pull", target: "2-3 x 12-15" },
      ],
      C: [
        { exerciseId: "ex-front-squat-light", target: "3 x 8" },
        { exerciseId: "ex-incline-dumbbell-press", target: "3 x 8-10" },
        { exerciseId: "ex-lat-pulldown", target: "3 x 8-10" },
        { exerciseId: "ex-hyperextension-leg-curl", target: "2-3 x 10-12" },
        { exerciseId: "ex-lateral-raise-abs", target: "2-3 x 12-15" },
      ],
    });
  });

  it("uses stable unique exercise ids", () => {
    const ids = initialProgram.exercises.map((exercise) => exercise.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids.every((id) => id.startsWith("ex-"))).toBe(true);
  });

  it("has offline media for every exercise", () => {
    for (const exercise of initialProgram.exercises) {
      expect(exercise.mediaId).toMatch(/^media-/);
      const media = initialProgram.media.find((item) => item.id === exercise.mediaId);
      expect(media?.localPath).toMatch(/^exercises\/.+\.png$/);
    }
  });

  it("links the active version to existing workouts", () => {
    const workoutIds = new Set(initialProgram.workouts.map((workout) => workout.id));

    expect(initialProgram.program.currentVersionId).toBe(initialProgram.currentVersion.id);
    expect(initialProgram.currentVersion.programId).toBe(initialProgram.program.id);
    expect(initialProgram.versions.map((version) => version.id)).toEqual([initialProgram.currentVersion.id]);
    expect(initialProgram.currentVersion.workoutIds).toEqual(initialProgram.workouts.map((workout) => workout.id));

    for (const workoutId of initialProgram.currentVersion.workoutIds) {
      expect(workoutIds.has(workoutId)).toBe(true);
    }
  });

  it("uses existing exercise ids in workout templates", () => {
    const exerciseIds = new Set(initialProgram.exercises.map((exercise) => exercise.id));

    for (const workout of initialProgram.workouts) {
      for (const exercise of workout.exercises) {
        expect(exerciseIds.has(exercise.exerciseId)).toBe(true);
      }
    }
  });

  it("uses existing media ids in exercises", () => {
    const mediaIds = new Set(initialProgram.media.map((media) => media.id));

    for (const exercise of initialProgram.exercises) {
      expect(mediaIds.has(exercise.mediaId)).toBe(true);
    }
  });

  it("uses contiguous exercise order values in each workout", () => {
    for (const workout of initialProgram.workouts) {
      expect(workout.exercises.map((exercise) => exercise.order)).toEqual(
        Array.from({ length: workout.exercises.length }, (_, index) => index + 1),
      );
    }
  });
});
