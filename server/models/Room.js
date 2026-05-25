import mongoose from "mongoose";
import { ROLES } from "./Workspace.js";

const roomSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Room name is required"],
      trim: true,
      minlength: [2, "Room name must be at least 2 characters"],
      maxlength: [50, "Room name cannot exceed 50 characters"],
    },

    // text  → regular chat room
    // audio → voice channel
    // video → video conference room
    type: {
      type: String,
      enum: ["text", "audio", "video"],
      default: "text",
    },

    workspace: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Workspace",
      required: true,
    },

    // RBAC: only these roles can access this room
    // default → all roles can access
    // e.g. ["owner", "admin"] makes it an admin-only room
    allowedRoles: {
      type: [String],
      enum: Object.values(ROLES),
      default: [ROLES.OWNER, ROLES.ADMIN, ROLES.MEMBER, ROLES.GUEST],
    },

    // optional topic shown below the room name
    topic: {
      type: String,
      default: "",
      maxlength: [120, "Topic cannot exceed 120 characters"],
    },

    // soft-delete: archived rooms are hidden but messages preserved
    isArchived: {
      type: Boolean,
      default: false,
    },

    // position in the sidebar list
    position: {
      type: Number,
      default: 0,
    },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  { timestamps: true },
);

// ─── Helper: check if a given role can access this room ──────────────────────
roomSchema.methods.isAccessibleByRole = function (role) {
  return this.allowedRoles.includes(role);
};

const Room = mongoose.model("Room", roomSchema);
export default Room;
