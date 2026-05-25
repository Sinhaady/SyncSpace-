import Workspace from "../models/Workspace.js";
import User from "../models/User.js";
import { ROLES } from "../models/Workspace.js";

// ─── @route  POST /api/workspaces ────────────────────────────────────────────
// ─── @access Private
// ─── @desc   Create a new workspace — creator becomes OWNER
export const createWorkspace = async (req, res) => {
  try {
    const { name } = req.body;

    if (!name) {
      return res.status(400).json({
        success: false,
        message: "Workspace name is required",
      });
    }

    // Create workspace with creator as owner
    const workspace = await Workspace.create({
      name,
      icon: req.body.icon || "",
      owner: req.user.id,
      members: [
        {
          user: req.user.id,
          role: ROLES.OWNER,
          joinedAt: new Date(),
        },
      ],
    });

    // Add workspace to user's workspace list
    await User.findByIdAndUpdate(req.user.id, {
      $push: { workspaces: workspace._id },
    });

    await workspace.populate("members.user", "username avatar status");

    res.status(201).json({ success: true, workspace });
  } catch (error) {
    console.error("createWorkspace error:", error.message);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// ─── @route  GET /api/workspaces ─────────────────────────────────────────────
// ─── @access Private
// ─── @desc   Get all workspaces the logged-in user is a member of
export const getMyWorkspaces = async (req, res) => {
  try {
    const workspaces = await Workspace.find({
      "members.user": req.user.id,
    })
      .populate("owner", "username avatar")
      .populate("members.user", "username avatar status")
      .sort({ createdAt: -1 });

    res.status(200).json({ success: true, workspaces });
  } catch (error) {
    console.error("getMyWorkspaces error:", error.message);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// ─── @route  GET /api/workspaces/:workspaceId ────────────────────────────────
// ─── @access Private — any member
// ─── @desc   Get a single workspace by ID with all members and rooms
export const getWorkspaceById = async (req, res) => {
  try {
    const workspace = await Workspace.findById(req.params.workspaceId)
      .populate("owner", "username avatar")
      .populate("members.user", "username avatar status");

    if (!workspace) {
      return res.status(404).json({
        success: false,
        message: "Workspace not found",
      });
    }

    // ensure requester is a member
    const isMember = workspace.members.some(
      (m) => m.user._id.toString() === req.user.id
    );

    if (!isMember) {
      return res.status(403).json({
        success: false,
        message: "You are not a member of this workspace",
      });
    }

    res.status(200).json({ success: true, workspace });
  } catch (error) {
    console.error("getWorkspaceById error:", error.message);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// ─── @route  PATCH /api/workspaces/:workspaceId ──────────────────────────────
// ─── @access Private — admin or above
// ─── @desc   Update workspace name or icon
export const updateWorkspace = async (req, res) => {
  try {
    const { name, icon } = req.body;

    // req.workspace is attached by verifyRole middleware
    const workspace = req.workspace;

    if (name) workspace.name = name;
    if (icon) workspace.icon = icon;

    await workspace.save();
    await workspace.populate("members.user", "username avatar status");

    res.status(200).json({ success: true, workspace });
  } catch (error) {
    console.error("updateWorkspace error:", error.message);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// ─── @route  DELETE /api/workspaces/:workspaceId ─────────────────────────────
// ─── @access Private — owner only
// ─── @desc   Permanently delete a workspace and remove it from all members
export const deleteWorkspace = async (req, res) => {
  try {
    const workspace = req.workspace; // attached by verifyOwner

    // Remove workspace reference from all members
    const memberIds = workspace.members.map((m) => m.user);
    await User.updateMany(
      { _id: { $in: memberIds } },
      { $pull: { workspaces: workspace._id } }
    );

    await workspace.deleteOne();

    res.status(200).json({
      success: true,
      message: "Workspace deleted successfully",
    });
  } catch (error) {
    console.error("deleteWorkspace error:", error.message);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// ─── @route  PATCH /api/workspaces/:workspaceId/members/:userId/role ─────────
// ─── @access Private — admin or above
// ─── @desc   Change a member's role inside a workspace
export const changeMemberRole = async (req, res) => {
  try {
    const { userId } = req.params;
    const { role } = req.body;
    const workspace = req.workspace;

    if (!Object.values(ROLES).includes(role)) {
      return res.status(400).json({
        success: false,
        message: `Invalid role. Must be one of: ${Object.values(ROLES).join(", ")}`,
      });
    }

    // cannot change the owner's role
    if (workspace.owner.toString() === userId) {
      return res.status(403).json({
        success: false,
        message: "Cannot change the workspace owner's role",
      });
    }

    // cannot assign owner role to someone else through this route
    if (role === ROLES.OWNER) {
      return res.status(403).json({
        success: false,
        message: "Use the transfer ownership route to assign owner role",
      });
    }

    const member = workspace.members.find(
      (m) => m.user.toString() === userId
    );

    if (!member) {
      return res.status(404).json({
        success: false,
        message: "Member not found in this workspace",
      });
    }

    member.role = role;
    await workspace.save();
    await workspace.populate("members.user", "username avatar status");

    res.status(200).json({ success: true, workspace });
  } catch (error) {
    console.error("changeMemberRole error:", error.message);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// ─── @route  DELETE /api/workspaces/:workspaceId/members/:userId ─────────────
// ─── @access Private — admin or above
// ─── @desc   Kick a member from a workspace
export const kickMember = async (req, res) => {
  try {
    const { userId } = req.params;
    const workspace = req.workspace;

    // cannot kick yourself
    if (userId === req.user.id) {
      return res.status(400).json({
        success: false,
        message: "You cannot kick yourself — use leave workspace instead",
      });
    }

    // cannot kick the owner
    if (workspace.owner.toString() === userId) {
      return res.status(403).json({
        success: false,
        message: "Cannot kick the workspace owner",
      });
    }

    const memberExists = workspace.members.some(
      (m) => m.user.toString() === userId
    );

    if (!memberExists) {
      return res.status(404).json({
        success: false,
        message: "Member not found in this workspace",
      });
    }

    // remove from workspace members array
    workspace.members = workspace.members.filter(
      (m) => m.user.toString() !== userId
    );
    await workspace.save();

    // remove workspace from user's list
    await User.findByIdAndUpdate(userId, {
      $pull: { workspaces: workspace._id },
    });

    res.status(200).json({
      success: true,
      message: "Member kicked successfully",
    });
  } catch (error) {
    console.error("kickMember error:", error.message);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// ─── @route  DELETE /api/workspaces/:workspaceId/leave ───────────────────────
// ─── @access Private — any member
// ─── @desc   Leave a workspace voluntarily
export const leaveWorkspace = async (req, res) => {
  try {
    const workspace = await Workspace.findById(req.params.workspaceId);

    if (!workspace) {
      return res.status(404).json({
        success: false,
        message: "Workspace not found",
      });
    }

    // owner cannot leave — must delete or transfer ownership first
    if (workspace.owner.toString() === req.user.id) {
      return res.status(403).json({
        success: false,
        message:
          "Owner cannot leave. Transfer ownership or delete the workspace instead.",
      });
    }

    workspace.members = workspace.members.filter(
      (m) => m.user.toString() !== req.user.id
    );
    await workspace.save();

    await User.findByIdAndUpdate(req.user.id, {
      $pull: { workspaces: workspace._id },
    });

    res.status(200).json({
      success: true,
      message: "Left workspace successfully",
    });
  } catch (error) {
    console.error("leaveWorkspace error:", error.message);
    res.status(500).json({ success: false, message: "Server error" });
  }
};
