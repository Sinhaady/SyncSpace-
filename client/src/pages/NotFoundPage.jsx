import { Link } from "react-router-dom";

const NotFoundPage = () => (
  <div className="flex min-h-screen flex-col items-center justify-center bg-gray-900 p-6 text-center">
    <h1 className="mb-4 text-7xl font-bold text-white">404</h1>
    <p className="mb-8 text-lg text-gray-400">This page doesn't exist.</p>
    <Link
      to="/dashboard"
      className="rounded-lg bg-indigo-600 px-6 py-3 font-semibold text-white hover:bg-indigo-700"
    >
      Back to Dashboard
    </Link>
  </div>
);

export default NotFoundPage;
