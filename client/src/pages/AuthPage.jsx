import { useState } from "react";
import LoginForm from "../component/auth/LoginForm";
import RegisterForm from "../component/auth/RegisterForm";

const AuthPage = () => {
  const [isLogin, setIsLogin] = useState(true);

  return (
    <div className="flex min-h-screen bg-gray-900">
      <div className="hidden flex-col items-center justify-center bg-linear-to-br from-indigo-900 via-purple-900 to-gray-900 p-12 lg:flex lg:w-1/2">
        <div className="max-w-md text-center">
          <div className="mb-8 flex items-center justify-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-500">
              <svg
                className="h-7 w-7 text-white"
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
            <span className="text-3xl font-bold text-white">SyncSpace</span>
          </div>

          <h1 className="mb-4 text-4xl font-bold leading-tight text-white">
            Real-time collaboration, reimagined
          </h1>

          <p className="mb-10 text-lg leading-relaxed text-gray-300">
            Create workspaces, organise conversations into rooms, jump on voice
            and video calls, and let AI summarise your threads instantly.
          </p>

          <div className="flex flex-wrap justify-center gap-3">
            {[
              "Real-time messaging",
              "Voice channels",
              "Video rooms",
              "AI summaries",
              "Role-based access",
              "File sharing",
            ].map((feature) => (
              <span
                key={feature}
                className="rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-sm text-white"
              >
                {feature}
              </span>
            ))}
          </div>
        </div>
      </div>

      <div className="flex w-full items-center justify-center p-6 lg:w-1/2">
        <div className="w-full max-w-md">
          <div className="mb-8 flex items-center justify-center gap-2 lg:hidden">
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

          <div className="rounded-2xl border border-gray-700/50 bg-gray-800/60 p-8 shadow-2xl">
            {isLogin ? (
              <LoginForm onSwitch={() => setIsLogin(false)} />
            ) : (
              <RegisterForm onSwitch={() => setIsLogin(true)} />
            )}
          </div>

          <p className="mt-6 text-center text-xs text-gray-600">
            By continuing you agree to SyncSpace's Terms of Service and Privacy
            Policy.
          </p>
        </div>
      </div>
    </div>
  );
};

export default AuthPage;
