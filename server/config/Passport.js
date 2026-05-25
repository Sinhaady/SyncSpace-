import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import { Strategy as JwtStrategy, ExtractJwt } from "passport-jwt";

import User from "../models/User.js";

// ─────────────────────────────────────────────────────────────────────────────
// Helper: Extract JWT from httpOnly cookie
// ─────────────────────────────────────────────────────────────────────────────
const cookieExtractor = (req) => {
  if (req?.cookies?.syncspace_token) {
    return req.cookies.syncspace_token;
  }

  return null;
};

// ─────────────────────────────────────────────────────────────────────────────
// 1. LOCAL STRATEGY
// ─────────────────────────────────────────────────────────────────────────────
passport.use(
  new LocalStrategy(
    {
      usernameField: "email",
      passwordField: "password",
    },

    async (email, password, done) => {
      try {
        // explicitly fetch password

         console.log(email);
          console.log(password);
          
        const user = await User.findOne({ email }).select("+password");
            console.log("Entered:", password);
            console.log("Stored:", user.password);
        // user not found
        if (!user) {
          return done(null, false, {
            message: "Invalid email or password",
          });
        }

        // google account trying password login
        if (user.authProvider === "google" && !user.password) {
          return done(null, false, {
            message:
              "This account uses Google Sign-In. Please continue with Google.",
          });
        }

        // compare password
        const isMatch = await user.matchPassword(password);
          console.log("Match:", isMatch);
        if (!isMatch) {
          return done(null, false, {
            message: "Invalid email or password",
          });
        }

        // remove password before attaching user
        user.password = undefined;

        return done(null, user);
      } catch (error) {
        console.error("Local Strategy Error:", error);

        return done(error, false);
      }
    }
  )
);

// ─────────────────────────────────────────────────────────────────────────────
// 2. GOOGLE STRATEGY
// ─────────────────────────────────────────────────────────────────────────────
if (
  process.env.GOOGLE_CLIENT_ID &&
  process.env.GOOGLE_CLIENT_SECRET &&
  process.env.GOOGLE_CALLBACK_URL
) {
  passport.use(
    new GoogleStrategy(
      {
        clientID: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL: process.env.GOOGLE_CALLBACK_URL,
      },

      async (accessToken, refreshToken, profile, done) => {
        try {
          const email = profile.emails?.[0]?.value;

          const avatar = profile.photos?.[0]?.value || "";

          const googleId = profile.id;

          const displayName = profile.displayName;

         

          // already linked google account
          let user = await User.findOne({ googleId });

          if (user) {
            return done(null, user);
          }

          // existing local account
          const existingUser = await User.findOne({ email });

          if (existingUser) {
            existingUser.googleId = googleId;

            if (!existingUser.avatar) {
              existingUser.avatar = avatar;
            }

            await existingUser.save();

            return done(null, existingUser);
          }

          // create username
          let username = displayName
            .replace(/\s+/g, "")
            .toLowerCase();

          const usernameExists = await User.findOne({ username });

          if (usernameExists) {
            username += Math.floor(Math.random() * 10000);
          }

          // create user
          user = await User.create({
            username,
            email,
            avatar,
            googleId,
            authProvider: "google",
          });

          return done(null, user);
        } catch (error) {
          console.error("Google Strategy Error:", error);

          return done(error, false);
        }
      }
    )
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. JWT STRATEGY
// ─────────────────────────────────────────────────────────────────────────────
passport.use(
  new JwtStrategy(
    {
      jwtFromRequest: ExtractJwt.fromExtractors([cookieExtractor]),

      secretOrKey: process.env.JWT_SECRET,
    },

    async (jwtPayload, done) => {
      try {
        const user = await User.findById(jwtPayload.id);

        if (!user) {
          return done(null, false, {
            message: "User no longer exists",
          });
        }

        return done(null, user);
      } catch (error) {
        console.error("JWT Strategy Error:", error);

        return done(error, false);
      }
    }
  )
);

export default passport;