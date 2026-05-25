import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { createRoomAPI, createWorkspaceAPI } from "../api/apis";

const CreateWorkspacePage = () => {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [icon, setIcon] = useState("");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (event) => {
    event.preventDefault();

    const workspaceName = name.trim();
    const workspaceIcon = icon.trim();

    if (!workspaceName) {
      setError("Workspace name is required.");
      return;
    }

    try {
      setCreating(true);
      setError("");

      const res = await createWorkspaceAPI({
        name: workspaceName,
        icon: workspaceIcon,
      });

      const workspace = res.data.workspace;

      const defaultChannels = [
        {
          name: "general",
          type: "text",
          topic: "Start the conversation here.",
        },
        {
          name: "voice-lounge",
          type: "audio",
          topic: "Drop in for quick voice conversations.",
        },
        {
          name: "team-meeting",
          type: "video",
          topic: "Use this room for video calls.",
        },
      ];

      await Promise.allSettled(
        defaultChannels.map((channel) =>
          createRoomAPI(workspace._id, channel),
        ),
      );

      navigate(`/workspace/${workspace._id}`, { replace: true });
    } catch (err) {
      setError(
        err.response?.data?.message || "Unable to create workspace right now.",
      );
    } finally {
      setCreating(false);
    }
  };

  return (
    <main className="min-h-screen bg-gray-950 px-6 py-10 text-white">
      <div className="mx-auto max-w-3xl">
        <Link
          to="/dashboard"
          className="text-sm font-medium text-gray-400 hover:text-white"
        >
          Back to dashboard
        </Link>

        <section className="mt-8 grid gap-8 md:grid-cols-[1fr_360px]">
          <div>
            <p className="text-sm font-medium text-indigo-300">SyncSpace</p>
            <h1 className="mt-2 text-4xl font-semibold tracking-tight">
              Create a workspace
            </h1>
            <p className="mt-4 max-w-xl text-gray-400">
              Workspaces keep channels, members, roles, messages, calls, and
              invites grouped around one team or project.
            </p>
          </div>

          <form
            onSubmit={handleSubmit}
            className="rounded-lg border border-gray-800 bg-gray-900 p-5"
          >
            <label className="block text-sm font-medium text-gray-200">
              Workspace name
              <input
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Design Team"
                className="mt-2 w-full rounded-md border border-gray-700 bg-gray-950 px-3 py-2.5 text-sm outline-none placeholder:text-gray-600 focus:border-indigo-500"
                maxLength={50}
              />
            </label>

            <label className="mt-4 block text-sm font-medium text-gray-200">
              Icon
              <input
                value={icon}
                onChange={(event) => setIcon(event.target.value)}
                placeholder="D"
                className="mt-2 w-full rounded-md border border-gray-700 bg-gray-950 px-3 py-2.5 text-sm outline-none placeholder:text-gray-600 focus:border-indigo-500"
                maxLength={8}
              />
            </label>

            {error && (
              <p className="mt-4 rounded-md border border-red-900/70 bg-red-950/40 px-3 py-2 text-sm text-red-200">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={creating}
              className="mt-5 w-full rounded-md bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-500 disabled:cursor-not-allowed disabled:bg-gray-800 disabled:text-gray-500"
            >
              {creating ? "Creating..." : "Create workspace"}
            </button>
          </form>
        </section>
      </div>
    </main>
  );
};

export default CreateWorkspacePage;
