import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import GoogleButton from "./GoogleButton";

const inputClass =
  "w-full rounded-lg border border-gray-700 bg-gray-800 px-4 py-2.5 text-white placeholder-gray-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500";

const LoginForm = ({ onSwitch }) => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [formData, setFormData] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setFormData((previous) => ({ ...previous, [e.target.name]: e.target.value }));
    setError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.email || !formData.password) {
      setError("Please fill in all fields");
      return;
    }

    try {
      setLoading(true);
      await login(formData);
      navigate("/dashboard");
    } catch (err) {
      setError(err.response?.data?.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full space-y-5">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-white">Welcome back</h2>
        <p className="mt-1 text-sm text-gray-400">
          Sign in to your SyncSpace account
        </p>
      </div>

      <GoogleButton label="Continue with Google" />

      <div className="flex items-center gap-3">
        <div className="h-px flex-1 bg-gray-700" />
        <span className="text-xs text-gray-500">or</span>
        <div className="h-px flex-1 bg-gray-700" />
      </div>

      {error && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3">
          <p className="text-sm text-red-400">{error}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="mb-1.5 block text-sm font-medium text-gray-300">
            Email
          </label>
          <input
            type="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            placeholder="you@example.com"
            className={inputClass}
          />
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-gray-300">
            Password
          </label>
          <input
            type="password"
            name="password"
            value={formData.password}
            onChange={handleChange}
            placeholder="Password"
            className={inputClass}
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-indigo-600 py-2.5 font-semibold text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? (
            <>
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
              Signing in...
            </>
          ) : (
            "Sign In"
          )}
        </button>
      </form>

      <p className="text-center text-sm text-gray-400">
        Don't have an account?{" "}
        <button
          type="button"
          onClick={onSwitch}
          className="font-medium text-indigo-400 hover:text-indigo-300"
        >
          Create one
        </button>
      </p>
    </div>
  );
};

export default LoginForm;
