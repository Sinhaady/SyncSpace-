import mongoose from "mongoose";
import crypto from "crypto";
import { ROLES } from "./Workspace.js";

const inviteSchema = new mongoose.Schema(
  {
    // unique invite code e.g. "syncspace.io/invite/aB3xK9"
    code: {
      type: String,
      unique: true,
      default: () => crypto.randomBytes(5).toString("hex"), // 10-char code
    },

    workspace: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Workspace",
      required: true,
    },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    // role assigned to users who join via this link
    assignedRole: {
      type: String,
      enum: Object.values(ROLES),
      default: ROLES.MEMBER, // most invites bring people in as members
    },

    // null = never expires
    expiresAt: {
      type: Date,
      default: () => new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
    },

    // -1 = unlimited uses
    maxUses: {
      type: Number,
      default: -1,
    },

    uses: {
      type: Number,
      default: 0,
    },

    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

// ─── Helper: check if invite is still valid ───────────────────────────────────
inviteSchema.methods.isValid = function () {
  if (!this.isActive) return false;
  if (this.expiresAt && new Date() > this.expiresAt) return false;
  if (this.maxUses !== -1 && this.uses >= this.maxUses) return false;
  return true;
};

// ─── Auto-deactivate expired invites (TTL index) ─────────────────────────────
inviteSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

const Invite = mongoose.model("Invite", inviteSchema);
export default Invite;
