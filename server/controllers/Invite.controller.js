import Invite from "../models/Invite.js";
import Workspace from "../models/Workspace.js";
import User from "../models/User.js";
import { ROLES } from "../models/Workspace.js";

// ─── @route  POST /api/workspaces/:workspaceId/invites ───────────────────────
// ─── @access Private — admin or above
// ─── @desc   Generate an invite link for a workspace
export const createInvite = async (req, res) => {
  try {
    const { workspaceId } = req.params;
    const { assignedRole, maxUses, expiresInDays } = req.body;
    if (assignedRole && ![ROLES.MEMBER, ROLES.GUEST].includes(assignedRole)) {
      return res.status(400).json({ success: false, message: "Invalid invite role" });
    }
    if (maxUses != null && (!Number.isInteger(maxUses) || maxUses < 1)) {
      return res.status(400).json({ success: false, message: "Invalid maximum uses" });
    }
    if (expiresInDays != null && (!Number.isInteger(expiresInDays) || expiresInDays < 1 || expiresInDays > 365)) {
      return res.status(400).json({ success: false, message: "Invalid expiry" });
    }

    const workspace = await Workspace.findById(workspaceId);
    if (!workspace) {
      return res.status(404).json({
        success: false,
        message: "Workspace not found",
      });
    }

    // calculate expiry
    const expiresAt = expiresInDays
      ? new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000)
      : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // default 7 days

    const invite = await Invite.create({
      workspace: workspaceId,
      createdBy: req.user.id,
      assignedRole: assignedRole || ROLES.MEMBER,
      maxUses: maxUses ?? -1,
      expiresAt,
    });

    // add invite to workspace
    workspace.invites.push(invite._id);
    await workspace.save();

    const inviteLink = `${process.env.CLIENT_URL}/invite/${invite.code}`;

    res.status(201).json({ success: true, invite, inviteLink });
  } catch (error) {
    console.error("createInvite error:", error.message);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// ─── @route  GET /api/invite/:code ───────────────────────────────────────────
// ─── @access Private
// ─── @desc   Join a workspace via invite code
export const joinViaInvite = async (req, res) => {
  try {
    const { code } = req.params;

    const invite = await Invite.findOne({ code }).populate(
      "workspace",
      "name icon members"
    );

    if (!invite) {
      return res.status(404).json({
        success: false,
        message: "Invite not found or has expired",
      });
    }

    // check validity (expiry, maxUses, isActive)
    if (!invite.isValid()) {
      return res.status(400).json({
        success: false,
        message: "This invite link is no longer valid",
      });
    }

    const workspace = invite.workspace;

    // check if user is already a member
    const alreadyMember = workspace.members.some(
      (m) => m.user.toString() === req.user.id
    );

    if (alreadyMember) {
      return res.status(400).json({
        success: false,
        message: "You are already a member of this workspace",
        workspaceId: workspace._id,
      });
    }

    // add user to workspace with the role assigned to this invite
    workspace.members.push({
      user: req.user.id,
      role: invite.assignedRole,
      joinedAt: new Date(),
    });
    await workspace.save();

    // add workspace to user's list
    await User.findByIdAndUpdate(req.user.id, {
      $push: { workspaces: workspace._id },
    });

    // increment invite usage count
    invite.uses += 1;
    await invite.save();

    res.status(200).json({
      success: true,
      message: `Joined workspace as ${invite.assignedRole}`,
      workspace,
    });
  } catch (error) {
    console.error("joinViaInvite error:", error.message);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// ─── @route  GET /api/workspaces/:workspaceId/invites ────────────────────────
// ─── @access Private — admin or above
// ─── @desc   Get all active invites for a workspace
export const getWorkspaceInvites = async (req, res) => {
  try {
    const { workspaceId } = req.params;

    const invites = await Invite.find({
      workspace: workspaceId,
      isActive: true,
    })
      .populate("createdBy", "username avatar")
      .sort({ createdAt: -1 });

    res.status(200).json({ success: true, invites });
  } catch (error) {
    console.error("getWorkspaceInvites error:", error.message);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// ─── @route  DELETE /api/workspaces/:workspaceId/invites/:inviteId ────────────
// ─── @access Private — admin or above
// ─── @desc   Revoke (deactivate) an invite link
export const revokeInvite = async (req, res) => {
  try {
    const { inviteId, workspaceId } = req.params;

    const invite = await Invite.findOneAndUpdate(
      { _id: inviteId, workspace: workspaceId },
      { isActive: false },
      { new: true }
    );

    if (!invite) {
      return res.status(404).json({
        success: false,
        message: "Invite not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Invite revoked successfully",
    });
  } catch (error) {
    console.error("revokeInvite error:", error.message);
    res.status(500).json({ success: false, message: "Server error" });
  }
};
