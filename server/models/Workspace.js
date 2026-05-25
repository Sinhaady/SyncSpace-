import mongoose from "mongoose";

// ─── Role definitions ────────────────────────────────────────────────────────
// OWNER  → full control, created the workspace, cannot be removed or demoted
// ADMIN  → manage rooms, kick members, change roles (except owner)
// MEMBER → read + send messages, join rooms
// GUEST  → read-only access, cannot send messages
// ─────────────────────────────────────────────────────────────────────────────

export const ROLES = {
  OWNER: "owner",
  ADMIN: "admin",
  MEMBER: "member",
  GUEST: "guest",
};

export const ROLE_HIERARCHY = {
  owner: 4,
  admin: 3,
  member: 2,
  guest: 1,
};

const memberSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId, // This field stores a MongoDB ObjectId used for reference purposes
      ref: "User",
      required: true,
    },
    role: {
      type: String,
      enum: Object.values(ROLES),
      default: ROLES.MEMBER,
    },
    joinedAt: {
      type: Date,
      default: Date.now,
    },
    // nickname inside this workspace (like Discord nicknames)
    nickname: {
      type: String,
      default: "",
      maxlength: [32, "Nickname cannot exceed 32 characters"],
    },
  },
  { _id: false }, // no separate _id for sub-documents
);

const workspaceSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Workspace name is required"],
      trim: true,
      minlength: [2, "Name must be at least 2 characters"],
      maxlength: [50, "Name cannot exceed 50 characters"],
    },

    icon: {
      type: String,
      default: "",
    },
    owner: {
      type: mongoose.Schema.Types.ObjectId,            // stores which user own the workspace
      ref: "User",
      required: true,
    },
    // all members including the owner
    members: [memberSchema],

    // invite links belong to this workspace
    invites: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Invite",
      },
    ],
  },
  { timestamps: true },
);

// ─── Helper: get a member's role inside a workspace ──────────────────────────
workspaceSchema.methods.getMemberRole = function (userId) {
  const member = this.members.find(
    (m) => m.user.toString() === userId.toString(),
  );
  return member ? member.role : null;
};

// ─── Helper: check if a user has at least the required role ──────────────────
workspaceSchema.methods.hasPermission = function (userId, requiredRole) {
  const role = this.getMemberRole(userId);
  if (!role) return false;
  return ROLE_HIERARCHY[role] >= ROLE_HIERARCHY[requiredRole];
};

const Workspace = mongoose.model("Workspace", workspaceSchema);
export default Workspace;
