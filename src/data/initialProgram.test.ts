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
      expect(media?.localPath).toMatch(/^\/exercises\/.+\.png$/);
    }
  });
});
