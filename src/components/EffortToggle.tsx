import type { Effort } from "../domain/types";

interface EffortToggleProps {
  value: Effort;
  onChange: (value: Effort) => void;
}

const options: Array<{ value: Effort; label: string }> = [
  { value: "easy", label: "Легко" },
  { value: "normal", label: "Нормально" },
  { value: "hard", label: "Тяжело" },
];

export function EffortToggle({ value, onChange }: EffortToggleProps) {
  return (
    <div className="effort-toggle" role="group" aria-label="Ощущение подхода">
      {options.map((option) => (
        <button
          className={option.value === value ? "segment-button selected" : "segment-button"}
          type="button"
          aria-pressed={option.value === value}
          key={option.value}
          onClick={() => onChange(option.value)}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
