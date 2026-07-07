import { BrowserRouter, Navigate, Route, Routes, useLocation } from "react-router-dom";
import { Header } from "./components/Header";
import { ToastContainer } from "./components/Toast";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { DashboardPage } from "./pages/DashboardPage";
import { LoginPage } from "./pages/LoginPage";
import { MoviePage } from "./pages/MoviePage";
import { OnboardingPage } from "./pages/OnboardingPage";
import { RegisterPage } from "./pages/RegisterPage";
import { SearchPage } from "./pages/SearchPage";
import { ListDetailPage } from "./pages/ListDetailPage";
import { ListsPage } from "./pages/ListsPage";
import { SettingsPage } from "./pages/SettingsPage";
import { StatsPage } from "./pages/StatsPage";
import { DiaryPage } from "./pages/DiaryPage";
import { TagDetailPage } from "./pages/TagDetailPage";
import { TagsPage } from "./pages/TagsPage";
import { useKeyboardShortcuts } from "./hooks/useKeyboardShortcuts";

function AppShell() {
  const location = useLocation();
  const minimalChrome = location.pathname === "/onboarding";
  useKeyboardShortcuts();

  return (
    <>
      {!minimalChrome && <Header />}
      <main>
          <Routes>
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <DashboardPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/search"
              element={
                <ProtectedRoute>
                  <SearchPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/stats"
              element={
                <ProtectedRoute>
                  <StatsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/diary"
              element={
                <ProtectedRoute>
                  <DiaryPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/lists"
              element={
                <ProtectedRoute>
                  <ListsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/lists/:id"
              element={
                <ProtectedRoute>
                  <ListDetailPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/tags"
              element={
                <ProtectedRoute>
                  <TagsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/tags/:id"
              element={
                <ProtectedRoute>
                  <TagDetailPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/settings"
              element={
                <ProtectedRoute>
                  <SettingsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/onboarding"
              element={
                <ProtectedRoute>
                  <OnboardingPage />
                </ProtectedRoute>
              }
            />
            <Route path="/movie/:id" element={<MoviePage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
      </main>
      <ToastContainer />
    </>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <div className="ambient-bg" />
      <div className="relative z-10 min-h-screen">
        <AppShell />
      </div>
    </BrowserRouter>
  );
}