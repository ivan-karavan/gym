import { useMemo, useState } from "react";
import { useAppStore } from "../app/useAppStore";
import { WeekPicker } from "../components/WeekPicker";
import type { SetLog, WorkoutExerciseSnapshot } from "../domain/types";
import { getWeekStart, groupSessionsByWeek, summarizeExerciseWeek } from "../domain/workoutLogic";

export function HistoryScreen() {
  const { sessions, sets } = useAppStore();
  const [selectedWeekStart, setSelectedWeekStart] = useState(() => getWeekStart(new Date()));
  const weekGroups = useMemo(() => groupSessionsByWeek(sessions), [sessions]);
  const selectedWeek = weekGroups.find((group) => group.weekStart === selectedWeekStart);
  const setsBySlot = useMemo(() => groupSetsBySessionAndExercise(sets), [sets]);

  return (
    <section className="screen history-screen">
      <div className="screen-header">
        <p className="eyebrow">Журнал</p>
        <h1>История</h1>
        <p className="screen-lead">Недели листаются кнопками, текущая неделя возвращается одним нажатием.</p>
      </div>

      <WeekPicker weekStart={selectedWeekStart} onWeekChange={setSelectedWeekStart} />

      {selectedWeek && selectedWeek.sessions.length > 0 ? (
        <div className="history-list">
          {selectedWeek.sessions.map((session) => (
            <article className="history-session" key={session.id}>
              <div className="history-session-header">
                <div>
                  <p className="eyebrow">{formatSessionDate(session.startedAt)}</p>
                  <h2>Тренировка {session.workoutCode}</h2>
                </div>
                <span className="session-pill">Готово</span>
              </div>

              <div className="history-exercise-list">
                {session.exerciseSnapshots
                  .slice()
                  .sort((left, right) => left.order - right.order)
                  .map((snapshot) => {
                    const exerciseSets = setsBySlot.get(makeSetKey(session.id, snapshot.exerciseId)) ?? [];

                    return (
                      <div className="history-exercise-row" key={snapshot.exerciseId}>
                        <div>
                          <strong>{snapshot.exerciseName}</strong>
                          <span>{snapshot.target}</span>
                        </div>
                        <p>{formatExerciseSummary(snapshot, exerciseSets)}</p>
                      </div>
                    );
                  })}
              </div>

              {session.note.trim() !== "" ? <p className="history-note">{session.note}</p> : null}
            </article>
          ))}
        </div>
      ) : (
        <div className="empty-state">
          <h2>На этой неделе завершенных тренировок нет</h2>
          <p className="muted-text">Переключись на прошлые недели или начни новую тренировку на вкладке “Сегодня”.</p>
        </div>
      )}
    </section>
  );
}

function groupSetsBySessionAndExercise(sets: SetLog[]): Map<string, SetLog[]> {
  const grouped = new Map<string, SetLog[]>();

  for (const set of sets) {
    const key = makeSetKey(set.sessionId, set.exerciseId);
    grouped.set(key, [...(grouped.get(key) ?? []), set]);
  }

  for (const [key, exerciseSets] of grouped) {
    grouped.set(
      key,
      [...exerciseSets].sort((left, right) => {
        if (left.setIndex !== right.setIndex) {
          return left.setIndex - right.setIndex;
        }

        return left.createdAt.localeCompare(right.createdAt);
      }),
    );
  }

  return grouped;
}

function makeSetKey(sessionId: string, exerciseId: string): string {
  return `${sessionId}\u0000${exerciseId}`;
}

function formatExerciseSummary(snapshot: WorkoutExerciseSnapshot, sets: SetLog[]): string {
  const summary = summarizeExerciseWeek(snapshot.loggingType, sets);

  return summary === "-" ? "Подходов нет" : summary;
}

function formatSessionDate(value: string): string {
  return new Intl.DateTimeFormat("ru-RU", {
    day: "numeric",
    month: "long",
    weekday: "short",
  }).format(new Date(value));
}
