import { CalendarCheck, History, ClipboardList, Settings as SettingsIcon, type LucideIcon } from "lucide-react";

export type AppScreen = "today" | "history" | "program" | "settings";

interface NavItem {
  screen: AppScreen;
  label: string;
  Icon: LucideIcon;
}

interface BottomNavProps {
  activeScreen: AppScreen;
  onScreenChange: (screen: AppScreen) => void;
}

const navItems: NavItem[] = [
  { screen: "today", label: "Сегодня", Icon: CalendarCheck },
  { screen: "history", label: "История", Icon: History },
  { screen: "program", label: "План", Icon: ClipboardList },
  { screen: "settings", label: "Настройки", Icon: SettingsIcon },
];

export function BottomNav({ activeScreen, onScreenChange }: BottomNavProps) {
  return (
    <nav className="bottom-nav" aria-label="Основная навигация">
      {navItems.map(({ screen, label, Icon }) => (
        <button
          className={screen === activeScreen ? "bottom-nav-button active" : "bottom-nav-button"}
          type="button"
          aria-current={screen === activeScreen ? "page" : undefined}
          key={screen}
          onClick={() => onScreenChange(screen)}
        >
          <Icon aria-hidden="true" size={21} strokeWidth={2.4} />
          <span>{label}</span>
        </button>
      ))}
    </nav>
  );
}
