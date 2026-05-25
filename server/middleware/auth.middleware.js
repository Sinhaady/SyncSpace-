import passport from "passport";

// ─── verifyToken ──────────────────────────────────────────────────────────────
// Replaces the manual jwt.verify approach
// Now delegates to passport-jwt strategy defined in config/passport.js
// Reads JWT from httpOnly cookie → verifies → attaches req.user
//
// Usage: router.get("/me", verifyToken, getMe)
// ─────────────────────────────────────────────────────────────────────────────
export const verifyToken = (req, res, next) => {
  passport.authenticate(
    "jwt",
    { session: false }, // we use JWT not sessions
    (err, user, info) => {
      if (err) {
        return res.status(500).json({ success: false, message: "Server error" });
      }

      if (!user) {
        // info.message comes from the JWT strategy
        const message =
          info?.name === "TokenExpiredError"
            ? "Token has expired — please log in again"
            : info?.message || "Not authorised — please log in";

        return res.status(401).json({ success: false, message });
      }

      // attach clean user object to request
      req.user = {
        id: user._id.toString(),
        username: user.username,
        email: user.email,
        avatar: user.avatar,
        status: user.status,
        authProvider: user.authProvider,
      };

      next();
    }
  )(req, res, next);
};