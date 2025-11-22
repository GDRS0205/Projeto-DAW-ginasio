// client/src/App.tsx
import { Routes, Route, NavLink, Navigate } from "react-router-dom";
import ExercisesList from "./pages/ExercisesList";
import ExerciseForm from "./pages/ExerciseForm";
import WorkoutsList from "./pages/WorkoutsList";
import WorkoutDetails from "./pages/WorkoutDetails";
import Login from "./pages/Login";
import PrsSummary from "./pages/PrsSummary";
import ThemeToggle from "./components/ThemeToggle";
import { AuthProvider, RequireAuth, useAuth } from "./context/AuthContext";
import { ToastProvider } from "./context/ToastContext";
import Stats from "./pages/Stats";

function Layout({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, user, logout } = useAuth();

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="topbar-left">
          <span className="logo">GymTracker</span>
          {isAuthenticated && (
            <nav className="nav">
              <NavLink
                to="/workouts"
                className={({ isActive }) =>
                  isActive ? "nav-link nav-link-active" : "nav-link"
                }
              >
                Treinos
              </NavLink>
              <NavLink
                to="/exercises"
                className={({ isActive }) =>
                  isActive ? "nav-link nav-link-active" : "nav-link"
                }
              >
                Exercícios
              </NavLink>
              <NavLink
                to="/prs"
                className={({ isActive }) =>
                  isActive ? "nav-link nav-link-active" : "nav-link"
                }
              >
                PRs
              </NavLink>
              {/* NOVO: link para estatísticas */}
              <NavLink
                to="/stats"
                className={({ isActive }) =>
                  isActive ? "nav-link nav-link-active" : "nav-link"
                }
              >
                Estatísticas
              </NavLink>
            </nav>
          )}
        </div>

        <div className="topbar-right">
          <ThemeToggle />
          {isAuthenticated && user && (
            <>
              <span className="user-email">{user.email}</span>
              <button className="ghost small" onClick={logout}>
                Sair
              </button>
            </>
          )}
        </div>
      </header>

      <main className="main-content">{children}</main>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <Routes>
          {/* Login público */}
          <Route path="/login" element={<Login />} />

          {/* Rotas protegidas com layout */}
          <Route
            path="/"
            element={
              <RequireAuth>
                <Layout>
                  <WorkoutsList />
                </Layout>
              </RequireAuth>
            }
          />

          <Route
            path="/workouts"
            element={
              <RequireAuth>
                <Layout>
                  <WorkoutsList />
                </Layout>
              </RequireAuth>
            }
          />

          <Route
            path="/workouts/:id"
            element={
              <RequireAuth>
                <Layout>
                  <WorkoutDetails />
                </Layout>
              </RequireAuth>
            }
          />

          <Route
            path="/exercises"
            element={
              <RequireAuth>
                <Layout>
                  <ExercisesList />
                </Layout>
              </RequireAuth>
            }
          />

          <Route
            path="/exercises/new"
            element={
              <RequireAuth>
                <Layout>
                  <ExerciseForm />
                </Layout>
              </RequireAuth>
            }
          />

          <Route
            path="/exercises/:id/edit"
            element={
              <RequireAuth>
                <Layout>
                  <ExerciseForm />
                </Layout>
              </RequireAuth>
            }
          />

          <Route
            path="/prs"
            element={
              <RequireAuth>
                <Layout>
                  <PrsSummary />
                </Layout>
              </RequireAuth>
            }
          />

          {/* NOVO: rota para estatísticas */}
          <Route
            path="/stats"
            element={
              <RequireAuth>
                <Layout>
                  <Stats />
                </Layout>
              </RequireAuth>
            }
          />

          {/* fallback */}
          <Route path="*" element={<Navigate to="/workouts" replace />} />
        </Routes>
      </ToastProvider>
    </AuthProvider>
  );
}
