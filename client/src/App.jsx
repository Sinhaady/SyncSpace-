import { Component } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { useAuth } from "./context/AuthContext";
import AppLayout from "./component/layout/AppLayout";
import AuthPage from "./pages/AuthPage";
import CreateWorkspacePage from "./pages/CreateWorkspacePage";
import DashboardPage from "./pages/DashboardPage";
import InvitePage from "./pages/InvitePage";
import NotFoundPage from "./pages/NotFoundPage";

class ErrorBoundary extends Component {
  state = { error: null };

  static getDerivedStateFromError(error) {
    return { error };
  }

  render() {
    if (this.state.error) {
      return (
        <main className="flex min-h-screen items-center justify-center bg-gray-950 px-6 text-white">
          <div className="max-w-lg rounded-lg border border-red-900/60 bg-red-950/30 p-6">
            <p className="text-sm font-semibold uppercase tracking-wide text-red-300">
              SyncSpace render error
            </p>
            <h1 className="mt-2 text-2xl font-semibold">
              The app could not render this screen.
            </h1>
            <pre className="mt-4 max-h-48 overflow-auto whitespace-pre-wrap rounded-md bg-black/30 p-3 text-xs text-red-100">
              {this.state.error.message}
            </pre>
          </div>
        </main>
      );
    }

    return this.props.children;
  }
}

const LoadingScreen = () => (
  <div className="flex h-screen items-center justify-center bg-gray-900">
    <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-500 border-t-transparent" />
  </div>
);

const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) return <LoadingScreen />;

  return user ? children : <Navigate to="/login" replace />;
};

const PublicRoute = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) return <LoadingScreen />;

  return !user ? children : <Navigate to="/dashboard" replace />;
};

const App = () => {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <Routes>
          <Route
            path="/login"
            element={
              <PublicRoute>
                <AuthPage />
              </PublicRoute>
            }
          />

          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <DashboardPage />
              </ProtectedRoute>
            }
          />

          <Route
            path="/workspace/:workspaceId"
            element={
              <ProtectedRoute>
                <AppLayout />
              </ProtectedRoute>
            }
          />

          <Route
            path="/workspaces/new"
            element={
              <ProtectedRoute>
                <CreateWorkspacePage />
              </ProtectedRoute>
            }
          />

          <Route
            path="/invite/:code"
            element={
              <ProtectedRoute>
                <InvitePage />
              </ProtectedRoute>
            }
          />

          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </BrowserRouter>
    </ErrorBoundary>
  );
};

export default App;
