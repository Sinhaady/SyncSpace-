import jwt from "jsonwebtoken";
import passport from "passport";
import User from "../models/User.js";

// ─── Helper: sign JWT and send as httpOnly cookie ─────────────────────────────
export const sendTokenResponse = (user, statusCode, res) => {
  const token = jwt.sign(
    { id: user._id, username: user.username },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRE || "7d" }
  );

  const cookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: process.env.NODE_ENV === "production" ? "none" : "strict",
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  };

  res.cookie("syncspace_token", token, cookieOptions);
  user.password = undefined;
  res.status(statusCode).json({ success: true, user });
};

// ─── @route  POST /api/auth/register ─────────────────────────────────────────
// ─── @access Public
export const register = async (req, res) => {
  try {
    const { username, email, password } = req.body;

    if (!username || !email || !password) {
      return res.status(400).json({
        success: false,
        message: "Please provide username, email and password",
      });
    }

    const existingUser = await User.findOne({ $or: [{ email }, { username }] });

    if (existingUser) {
      const field = existingUser.email === email ? "Email" : "Username";
      return res.status(400).json({
        success: false,
        message: `${field} is already taken`,
      });
    }

    const user = await User.create({
      username,
      email,
      password,
      authProvider: "local",
    });

    sendTokenResponse(user, 201, res);
  } catch (error) {
    console.error("Register error:", error.message);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// ─── @route  POST /api/auth/login ────────────────────────────────────────────
// ─── @access Public
export const login = (req, res, next) => {
  passport.authenticate("local", { session: false }, (err, user, info) => {
    if (err) {
      return res.status(500).json({ success: false, message: "Server error" });
    }

    if (!user) {
      return res.status(401).json({
        success: false,
        message: info?.message || "Invalid credentials",
      });
    }

    // set status to online
    User.findByIdAndUpdate(user._id, { status: "online" }).exec();

    sendTokenResponse(user, 200, res);
  })(req, res, next);
};

// ─── @route  GET /api/auth/google ────────────────────────────────────────────
// ─── @access Public — redirects to Google consent screen
export const googleAuth = passport.authenticate("google", {
  scope: ["profile", "email"],
  session: false,
});

// ─── @route  GET /api/auth/google/callback ───────────────────────────────────
// ─── @access Public — Google redirects here after user grants permission
export const googleCallback = (req, res, next) => {
  passport.authenticate("google", { session: false }, (err, user) => {
    if (err || !user) {
      return res.redirect(
        `${process.env.CLIENT_URL}/login?error=google_auth_failed`
      );
    }

    const token = jwt.sign(
      { id: user._id, username: user.username },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRE || "7d" }
    );

    res.cookie("syncspace_token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "none" : "strict",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    // set status to online
    User.findByIdAndUpdate(user._id, { status: "online" }).exec();

    // redirect to frontend dashboard after successful Google login
    res.redirect(`${process.env.CLIENT_URL}/dashboard`);
  })(req, res, next);
};

// ─── @route  POST /api/auth/logout ───────────────────────────────────────────
// ─── @access Private
export const logout = async (req, res) => {
  try {
    await User.findByIdAndUpdate(req.user.id, { status: "offline" });

    res.cookie("syncspace_token", "", {
      httpOnly: true,
      expires: new Date(0),
    });

    res.status(200).json({ success: true, message: "Logged out successfully" });
  } catch (error) {
    console.error("Logout error:", error.message);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// ─── @route  GET /api/auth/me ─────────────────────────────────────────────────
// ─── @access Private
export const getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).populate(
      "workspaces",
      "name icon"
    );

    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    res.status(200).json({ success: true, user });
  } catch (error) {
    console.error("GetMe error:", error.message);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// ─── @route  PUT /api/auth/update-status ─────────────────────────────────────
// ─── @access Private
export const updateStatus = async (req, res) => {
  try {
    const { status } = req.body;

    if (!["online", "idle", "offline"].includes(status)) {
      return res.status(400).json({ success: false, message: "Invalid status" });
    }

    const user = await User.findByIdAndUpdate(
      req.user.id,
      { status },
      { new: true }
    );

    res.status(200).json({ success: true, user });
  } catch (error) {
    console.error("UpdateStatus error:", error.message);
    res.status(500).json({ success: false, message: "Server error" });
  }
};
