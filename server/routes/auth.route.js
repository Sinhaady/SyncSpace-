import express from "express";
import {
  register,
  login,
  logout,
  getMe,
  updateStatus,
  googleAuth,
  googleCallback,
} from "../controllers/Auth.controller.js";
import { verifyToken } from "../middleware/auth.middleware.js";

const router = express.Router();

// ─── Local auth ───────────────────────────────────────────────────────────────
router.get("/register", (req, res) => {
  res.status(405).json({
    success: false,
    message: "Use POST /api/auth/register with username, email and password",
  });
});
router.post("/register", register);
router.get("/login", (req, res) => {
  res.status(405).json({
    success: false,
    message: "Use POST /api/auth/login with email and password",
  });
});
router.post("/login", login);

// ─── Google OAuth ─────────────────────────────────────────────────────────────
// Step 1: redirect user to Google consent screen
router.get("/google", googleAuth);

// Step 2: Google redirects back here with auth code
router.get("/google/callback", googleCallback);

// ─── Private routes ───────────────────────────────────────────────────────────
router.post("/logout",       verifyToken, logout);
router.get("/me",            verifyToken, getMe);
router.put("/update-status", verifyToken, updateStatus);

export default router;
