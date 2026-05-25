import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import GoogleButton from "./GoogleButton";

const inputClass =
  "w-full rounded-lg border border-gray-700 bg-gray-800 px-4 py-2.5 text-white placeholder-gray-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500";
const labelClass = "mb-1.5 block text-sm font-medium text-gray-300";

const RegisterForm = ({ onSwitch }) => {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    username: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setFormData((previous) => ({ ...previous, [e.target.name]: e.target.value }));
    setError("");
  };

  const validate = () => {
    if (!formData.username || !formData.email || !formData.password) {
      return "Please fill in all fields";
    }
    if (formData.username.length < 3) {
      return "Username must be at least 3 characters";
    }
    if (formData.password.length < 6) {
      return "Password must be at least 6 characters";
    }
    if (formData.password !== formData.confirmPassword) {
      return "Passwords do not match";
    }
    return null;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }

    try {
      setLoading(true);
      await register({
        username: formData.username,
        email: formData.email,
        password: formData.password,
      });
      navigate("/dashboard");
    } catch (err) {
      setError(err.response?.data?.message || "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full space-y-5">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-white">Create an account</h2>
        <p className="mt-1 text-sm text-gray-400">
          Start collaborating with your team
        </p>
      </div>

      <GoogleButton label="Sign up with Google" />

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
          <label className={labelClass}>Username</label>
          <input
            type="text"
            name="username"
            value={formData.username}
            onChange={handleChange}
            placeholder="yourname"
            className={inputClass}
          />
        </div>

        <div>
          <label className={labelClass}>Email</label>
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
          <label className={labelClass}>Password</label>
          <input
            type="password"
            name="password"
            value={formData.password}
            onChange={handleChange}
            placeholder="Password"
            className={inputClass}
          />
        </div>

        <div>
          <label className={labelClass}>Confirm Password</label>
          <input
            type="password"
            name="confirmPassword"
            value={formData.confirmPassword}
            onChange={handleChange}
            placeholder="Confirm password"
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
              Creating account...
            </>
          ) : (
            "Create Account"
          )}
        </button>
      </form>

      <p className="text-center text-sm text-gray-400">
        Already have an account?{" "}
        <button
          type="button"
          onClick={onSwitch}
          className="font-medium text-indigo-400 hover:text-indigo-300"
        >
          Sign in
        </button>
      </p>
    </div>
  );
};

export default RegisterForm;
