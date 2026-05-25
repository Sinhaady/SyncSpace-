import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { joinViaInviteAPI } from "../api/apis";

const InvitePage = () => {
  const { code } = useParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState("loading");
  const [message, setMessage] = useState("");

  useEffect(() => {
    const join = async () => {
      try {
        const res = await joinViaInviteAPI(code);
        setStatus("success");
        setMessage(res.data.message);
        setTimeout(() => navigate("/dashboard"), 2000);
      } catch (err) {
        if (err.response?.status === 400 && err.response?.data?.workspaceId) {
          setStatus("already");
          setTimeout(() => navigate("/dashboard"), 2000);
        } else {
          setStatus("error");
          setMessage(
            err.response?.data?.message || "Invalid or expired invite link"
          );
        }
      }
    };

    join();
  }, [code, navigate]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-900 p-6">
      <div className="w-full max-w-md rounded-2xl border border-gray-700 bg-gray-800 p-10 text-center shadow-2xl">
        <div className="mb-8 flex items-center justify-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-500">
            <svg
              className="h-5 w-5 text-white"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13 10V3L4 14h7v7l9-11h-7z"
              />
            </svg>
          </div>
          <span className="text-2xl font-bold text-white">SyncSpace</span>
        </div>

        {status === "loading" && (
          <>
            <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-4 border-indigo-500 border-t-transparent" />
            <p className="text-lg text-gray-300">Joining workspace...</p>
          </>
        )}

        {status === "success" && (
          <>
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-500/20">
              <svg
                className="h-8 w-8 text-green-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>
            <h2 className="mb-2 text-xl font-bold text-white">You're in!</h2>
            <p className="text-gray-400">{message}</p>
            <p className="mt-3 text-sm text-gray-500">
              Redirecting to dashboard...
            </p>
          </>
        )}

        {status === "already" && (
          <>
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-indigo-500/20">
              <svg
                className="h-8 w-8 text-indigo-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
            <h2 className="mb-2 text-xl font-bold text-white">
              Already a member
            </h2>
            <p className="text-gray-400">
              You're already in this workspace.
            </p>
            <p className="mt-3 text-sm text-gray-500">Redirecting...</p>
          </>
        )}

        {status === "error" && (
          <>
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-500/20">
              <svg
                className="h-8 w-8 text-red-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </div>
            <h2 className="mb-2 text-xl font-bold text-white">
              Invalid Invite
            </h2>
            <p className="mb-6 text-gray-400">{message}</p>
            <button
              type="button"
              onClick={() => navigate("/dashboard")}
              className="rounded-lg bg-indigo-600 px-6 py-2.5 font-semibold text-white hover:bg-indigo-700"
            >
              Go to Dashboard
            </button>
          </>
        )}
      </div>
    </div>
  );
};

export default InvitePage;
