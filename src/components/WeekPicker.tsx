import { ChevronLeft, ChevronRight, RotateCcw } from "lucide-react";
import { getWeekStart } from "../domain/workoutLogic";

interface WeekPickerProps {
  weekStart: string;
  onWeekChange: (weekStart: string) => void;
}

export function WeekPicker({ weekStart, onWeekChange }: WeekPickerProps) {
  const currentWeekStart = getWeekStart(new Date());
  const isCurrentWeek = weekStart === currentWeekStart;

  return (
    <div className="week-picker" aria-label="Выбор недели">
      <button
        className="icon-button"
        type="button"
        aria-label="Предыдущая неделя"
        onClick={() => onWeekChange(addDays(weekStart, -7))}
      >
        <ChevronLeft aria-hidden="true" size={22} />
      </button>

      <div className="week-picker-label">
        <span>Неделя</span>
        <strong>{formatWeekRange(weekStart)}</strong>
      </div>

      <button
        className="icon-button"
        type="button"
        aria-label="Следующая неделя"
        onClick={() => onWeekChange(addDays(weekStart, 7))}
      >
        <ChevronRight aria-hidden="true" size={22} />
      </button>

      <button
        className="current-week-button"
        type="button"
        disabled={isCurrentWeek}
        onClick={() => onWeekChange(currentWeekStart)}
      >
        <RotateCcw aria-hidden="true" size={18} />
        <span>Текущая</span>
      </button>
    </div>
  );
}

function formatWeekRange(weekStart: string): string {
  const start = parseLocalDate(weekStart);
  const end = parseLocalDate(addDays(weekStart, 6));
  const formatter = new Intl.DateTimeFormat("ru-RU", {
    day: "numeric",
    month: "short",
  });

  return `${formatter.format(start)} - ${formatter.format(end)}`;
}

function addDays(dateValue: string, days: number): string {
  const date = parseLocalDate(dateValue);
  date.setDate(date.getDate() + days);

  return formatLocalDate(date);
}

function parseLocalDate(dateValue: string): Date {
  const [year, month, day] = dateValue.split("-").map(Number);

  return new Date(year, month - 1, day);
}

function formatLocalDate(date: Date): string {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-");
}
