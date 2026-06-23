import { AppProvider } from "./app/AppProvider";
import { useAppStore } from "./app/useAppStore";
import { ActiveWorkoutScreen } from "./screens/ActiveWorkoutScreen";
import { TodayScreen } from "./screens/TodayScreen";

export function App() {
  return (
    <AppProvider>
      <main className="app-shell">
        <AppContent />
      </main>
    </AppProvider>
  );
}

function AppContent() {
  const { activeSession, error, loading, reload } = useAppStore();

  if (loading) {
    return (
      <section className="screen status-screen">
        <p className="eyebrow">Gym Tracker</p>
        <h1>Загружаю программу</h1>
      </section>
    );
  }

  if (error) {
    return (
      <section className="screen status-screen">
        <p className="eyebrow">Gym Tracker</p>
        <h1>Не получилось открыть журнал</h1>
        <p>{error}</p>
        <button className="primary-button" type="button" onClick={() => void reload()}>
          Повторить
        </button>
      </section>
    );
  }

  return activeSession ? <ActiveWorkoutScreen /> : <TodayScreen />;
}
