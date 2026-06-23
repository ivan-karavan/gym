import { describe, expect, it } from "vitest";
import { initialProgram } from "./initialProgram";

describe("initialProgram", () => {
  it("contains workouts A, B, and C in order", () => {
    expect(initialProgram.workouts.map((workout) => workout.code)).toEqual(["A", "B", "C"]);
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

    for (const workoutId of initialProgram.version.workoutIds) {
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
