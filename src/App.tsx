import { useState } from "react";
import { AppProvider } from "./app/AppProvider";
import { useAppStore } from "./app/useAppStore";
import { BottomNav, type AppScreen } from "./components/BottomNav";
import { ActiveWorkoutScreen } from "./screens/ActiveWorkoutScreen";
import { HistoryScreen } from "./screens/HistoryScreen";
import { ProgramScreen } from "./screens/ProgramScreen";
import { SettingsScreen } from "./screens/SettingsScreen";
import { TodayScreen } from "./screens/TodayScreen";

export function App() {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
}

function AppContent() {
  const { activeSession, error, loading, reload } = useAppStore();
  const [activeScreen, setActiveScreen] = useState<AppScreen>("today");

  if (loading) {
    return (
      <main className="app-shell">
        <section className="screen status-screen">
          <p className="eyebrow">Gym Tracker</p>
          <h1>Загружаю программу</h1>
        </section>
      </main>
    );
  }

  if (error) {
    return (
      <main className="app-shell">
        <section className="screen status-screen">
          <p className="eyebrow">Gym Tracker</p>
          <h1>Не получилось открыть журнал</h1>
          <p>{error}</p>
          <button className="primary-button" type="button" onClick={() => void reload()}>
            Повторить
          </button>
        </section>
      </main>
    );
  }

  if (activeSession) {
    return (
      <main className="app-shell">
        <ActiveWorkoutScreen />
      </main>
    );
  }

  return (
    <main className="app-shell app-shell-with-bottom-nav">
      {renderScreen(activeScreen)}
      <BottomNav activeScreen={activeScreen} onScreenChange={setActiveScreen} />
    </main>
  );
}

function renderScreen(activeScreen: AppScreen) {
  if (activeScreen === "history") {
    return <HistoryScreen />;
  }

  if (activeScreen === "program") {
    return <ProgramScreen />;
  }

  if (activeScreen === "settings") {
    return <SettingsScreen />;
  }

  return <TodayScreen />;
}
