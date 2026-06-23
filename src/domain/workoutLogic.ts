import type {
  LoggingType,
  ProgramBundle,
  SetLog,
  WorkoutCode,
  WorkoutExerciseSnapshot,
  WorkoutSession,
  WorkoutTemplate,
} from "./types";

export interface SessionWeekGroup {
  weekStart: string;
  sessions: WorkoutSession[];
}

export interface PreviousExerciseSets {
  weekStart: string;
  sessionId: string;
  sessionStartedAt: string;
  sets: SetLog[];
}

const workoutCycle: WorkoutCode[] = ["A", "B", "C"];

export function getWorkoutByCode(bundle: ProgramBundle, code: WorkoutCode): WorkoutTemplate {
  const currentWorkoutIds = new Set(bundle.currentVersion.workoutIds);
  const workout = bundle.workouts.find((item) => item.code === code && currentWorkoutIds.has(item.id));

  if (!workout) {
    throw new Error(`Workout ${code} is missing from current program version ${bundle.currentVersion.id}`);
  }

  return workout;
}

export function buildExerciseSnapshots(
  bundle: ProgramBundle,
  workout: WorkoutTemplate,
): WorkoutExerciseSnapshot[] {
  return [...workout.exercises]
    .sort((left, right) => left.order - right.order)
    .map((templateExercise) => {
      const exercise = bundle.exercises.find((item) => item.id === templateExercise.exerciseId);

      if (!exercise) {
        throw new Error(`Exercise ${templateExercise.exerciseId} is missing for workout ${workout.code}`);
      }

      const snapshot: WorkoutExerciseSnapshot = {
        exerciseId: exercise.id,
        exerciseName: exercise.name,
        loggingType: exercise.loggingType,
        target: templateExercise.target,
        workoutCode: workout.code,
        order: templateExercise.order,
        description: exercise.description,
        mediaId: exercise.mediaId,
      };

      if (exercise.referenceUrl !== undefined) {
        snapshot.referenceUrl = exercise.referenceUrl;
      }

      return snapshot;
    });
}

export function suggestNextWorkoutCode(sessions: WorkoutSession[]): WorkoutCode {
  const latestCompleted = sessions
    .filter((session) => session.status === "completed")
    .sort((left, right) => compareStartedAtDesc(left.startedAt, right.startedAt))[0];

  if (!latestCompleted) {
    return "A";
  }

  const index = workoutCycle.indexOf(latestCompleted.workoutCode);
  return workoutCycle[(index + 1) % workoutCycle.length];
}

export function getWeekStart(date: Date | string): string {
  const localDate = toDate(date);
  const day = localDate.getDay();
  const daysFromMonday = day === 0 ? 6 : day - 1;
  const monday = new Date(localDate.getFullYear(), localDate.getMonth(), localDate.getDate());
  monday.setDate(monday.getDate() - daysFromMonday);

  return formatLocalDate(monday);
}

export function groupSessionsByWeek(sessions: WorkoutSession[]): SessionWeekGroup[] {
  const groups = new Map<string, WorkoutSession[]>();

  for (const session of sessions) {
    if (session.status !== "completed") {
      continue;
    }

    const weekStart = getWeekStart(session.startedAt);
    groups.set(weekStart, [...(groups.get(weekStart) ?? []), session]);
  }

  return [...groups.entries()]
    .sort(([leftWeek], [rightWeek]) => rightWeek.localeCompare(leftWeek))
    .map(([weekStart, weekSessions]) => ({
      weekStart,
      sessions: [...weekSessions].sort((left, right) => compareStartedAtAsc(left.startedAt, right.startedAt)),
    }));
}

export function getPreviousExerciseSets(
  exerciseId: string,
  currentStartedAt: string,
  sessions: WorkoutSession[],
  sets: SetLog[],
  limitWeeks = 2,
): PreviousExerciseSets[] {
  if (limitWeeks <= 0) {
    return [];
  }

  const currentStartedAtMs = toDate(currentStartedAt).getTime();
  const currentWeekStart = getWeekStart(currentStartedAt);
  const previousWeekStarts = new Set(
    Array.from({ length: limitWeeks }, (_, index) => addDays(currentWeekStart, -7 * (index + 1))),
  );
  const matchingSetsBySession = groupSetsBySession(sets.filter((set) => set.exerciseId === exerciseId));

  return sessions
    .filter((session) => session.status === "completed")
    .filter((session) => toDate(session.startedAt).getTime() < currentStartedAtMs)
    .map((session) => ({
      session,
      weekStart: getWeekStart(session.startedAt),
      sets: matchingSetsBySession.get(session.id) ?? [],
    }))
    .filter((entry) => previousWeekStarts.has(entry.weekStart) && entry.sets.length > 0)
    .sort((left, right) => {
      const weekCompare = right.weekStart.localeCompare(left.weekStart);

      if (weekCompare !== 0) {
        return weekCompare;
      }

      return compareStartedAtDesc(left.session.startedAt, right.session.startedAt);
    })
    .map((entry) => ({
      weekStart: entry.weekStart,
      sessionId: entry.session.id,
      sessionStartedAt: entry.session.startedAt,
      sets: entry.sets,
    }));
}

export function summarizeExerciseWeek(loggingType: LoggingType, sets: SetLog[]): string {
  if (sets.length === 0) {
    return "-";
  }

  const summary = sets
    .map((set) => summarizeSet(loggingType, set))
    .filter((value): value is string => value !== undefined)
    .join(", ");

  return summary === "" ? "-" : summary;
}

function summarizeSet(loggingType: LoggingType, set: SetLog): string | undefined {
  if (loggingType === "weight_reps" && set.loggingType === "weight_reps") {
    return `${formatNumber(set.weightKg)} x ${formatNumber(set.reps)}`;
  }

  if (loggingType === "reps" && set.loggingType === "reps") {
    return formatNumber(set.reps);
  }

  if (loggingType === "duration" && set.loggingType === "duration") {
    return `${formatNumber(set.durationSeconds)}с`;
  }

  return undefined;
}

function groupSetsBySession(sets: SetLog[]): Map<string, SetLog[]> {
  const grouped = new Map<string, SetLog[]>();

  for (const set of sets) {
    grouped.set(set.sessionId, [...(grouped.get(set.sessionId) ?? []), set]);
  }

  for (const [sessionId, sessionSets] of grouped) {
    grouped.set(
      sessionId,
      [...sessionSets].sort((left, right) => {
        if (left.setIndex !== right.setIndex) {
          return left.setIndex - right.setIndex;
        }

        return left.createdAt.localeCompare(right.createdAt);
      }),
    );
  }

  return grouped;
}

function compareStartedAtAsc(left: string, right: string): number {
  return toDate(left).getTime() - toDate(right).getTime();
}

function compareStartedAtDesc(left: string, right: string): number {
  return toDate(right).getTime() - toDate(left).getTime();
}

function toDate(date: Date | string): Date {
  if (date instanceof Date) {
    return new Date(date.getTime());
  }

  const parsed = new Date(date);

  if (Number.isNaN(parsed.getTime())) {
    throw new Error(`Invalid date: ${date}`);
  }

  return parsed;
}

function addDays(dateString: string, days: number): string {
  const [year, month, day] = dateString.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  date.setDate(date.getDate() + days);

  return formatLocalDate(date);
}

function formatLocalDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function formatNumber(value: number): string {
  return Number.isInteger(value) ? value.toString() : String(value);
}
