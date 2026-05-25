import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getWorkspacesAPI } from "../api/apis";
import { useAuth } from "../context/AuthContext";

const DashboardPage = () => {
  const { user, logout } = useAuth();
  const [workspaces, setWorkspaces] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    const loadWorkspaces = async () => {
      try {
        const res = await getWorkspacesAPI();
        if (active) setWorkspaces(res.data.workspaces || []);
      } catch {
        if (active) setWorkspaces([]);
      } finally {
        if (active) setLoading(false);
      }
    };

    loadWorkspaces();

    return () => {
      active = false;
    };
  }, []);

  return (
    <main className="min-h-screen bg-gray-950 text-white">
      <header className="border-b border-gray-800 bg-gray-900/80">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div>
            <p className="text-sm text-gray-400">SyncSpace</p>
            <h1 className="text-2xl font-semibold">Dashboard</h1>
          </div>
          <div className="flex items-center gap-3">
            <Link
              to="/workspaces/new"
              className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500"
            >
              New workspace
            </Link>
            <button
              type="button"
              onClick={logout}
              className="rounded-lg bg-gray-800 px-4 py-2 text-sm font-medium text-gray-100 hover:bg-gray-700"
            >
              Sign out
            </button>
          </div>
        </div>
      </header>

      <section className="mx-auto max-w-6xl px-6 py-8">
        <div className="mb-8">
          <h2 className="text-xl font-semibold">
            Welcome{user?.username ? `, ${user.username}` : ""}
          </h2>
          <p className="mt-1 text-sm text-gray-400">
            Your workspaces will appear here.
          </p>
        </div>

        {loading ? (
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-500 border-t-transparent" />
        ) : workspaces.length > 0 ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {workspaces.map((workspace) => (
              <Link
                key={workspace._id}
                to={`/workspace/${workspace._id}`}
                className="rounded-lg border border-gray-800 bg-gray-900 p-5 transition hover:border-indigo-500 hover:bg-gray-800"
              >
                <h3 className="font-semibold">{workspace.name}</h3>
                <p className="mt-2 text-sm text-gray-500">
                  {workspace.members?.length || 0} members
                </p>
              </Link>
            ))}
          </div>
        ) : (
          <div className="rounded-lg border border-dashed border-gray-700 p-8 text-center">
            <h3 className="text-lg font-semibold text-white">
              Create your first workspace
            </h3>
            <p className="mx-auto mt-2 max-w-md text-sm text-gray-400">
              Workspaces hold your channels, members, messages, and calls.
            </p>
            <Link
              to="/workspaces/new"
              className="mt-5 inline-flex rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500"
            >
              Create workspace
            </Link>
          </div>
        )}
      </section>
    </main>
  );
};

export default DashboardPage;
