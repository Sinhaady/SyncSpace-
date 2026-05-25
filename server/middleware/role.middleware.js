import Workspace from "../models/Workspace.js";
import { ROLE_HIERARCHY } from "../models/Workspace.js";

// ─── verifyRole ───────────────────────────────────────────────────────────────
// Factory function — call it with the minimum role required for a route
// Always use AFTER verifyToken so req.user is available
//
// Usage examples:
//   router.delete("/:id", verifyToken, verifyRole("admin"), deleteWorkspace)
//   router.post("/rooms", verifyToken, verifyRole("member"), createRoom)
//   router.patch("/kick", verifyToken, verifyRole("admin"), kickMember)
// ─────────────────────────────────────────────────────────────────────────────

export const verifyRole = (requiredRole) => {
  return async (req, res, next) => {
    try {
      // workspaceId must be in params or body
      const workspaceId = req.params.workspaceId || req.body.workspaceId;

      if (!workspaceId) {
        return res.status(400).json({
          success: false,
          message: "Workspace ID is required for role verification",
        });
      }

      // Fetch workspace with members
      const workspace = await Workspace.findById(workspaceId);

      if (!workspace) {
        return res.status(404).json({
          success: false,
          message: "Workspace not found",
        });
      }

      // Get role of the current user in this workspace
      const userRole = workspace.getMemberRole(req.user.id);

      if (!userRole) {
        return res.status(403).json({
          success: false,
          message: "You are not a member of this workspace",
        });
      }

      // Compare role hierarchy levels
      const userLevel = ROLE_HIERARCHY[userRole];
      const requiredLevel = ROLE_HIERARCHY[requiredRole];

      if (userLevel < requiredLevel) {
        return res.status(403).json({
          success: false,
          message: `Access denied — requires '${requiredRole}' or above. Your role: '${userRole}'`,
        });
      }

      // Attach role to request for use in controllers
      req.userRole = userRole;
      req.workspace = workspace;

      next();
    } catch (error) {
      console.error("verifyRole error:", error.message);
      res.status(500).json({ success: false, message: "Server error" });
    }
  };
};

// ─── verifyOwner ──────────────────────────────────────────────────────────────
// Special check — only the workspace OWNER can perform certain actions
// e.g. delete workspace, transfer ownership
// ─────────────────────────────────────────────────────────────────────────────

export const verifyOwner = async (req, res, next) => {
  try {
    const workspaceId = req.params.workspaceId || req.body.workspaceId;

    const workspace = await Workspace.findById(workspaceId);

    if (!workspace) {
      return res.status(404).json({
        success: false,
        message: "Workspace not found",
      });
    }

    if (workspace.owner.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: "Only the workspace owner can perform this action",
      });
    }

    req.workspace = workspace;
    next();
  } catch (error) {
    console.error("verifyOwner error:", error.message);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// ─── verifySelfOrAdmin ────────────────────────────────────────────────────────
// Allows a user to modify their own data OR an admin/owner to modify anyone's
// e.g. update nickname, update avatar
// ─────────────────────────────────────────────────────────────────────────────

export const verifySelfOrAdmin = async (req, res, next) => {
  try {
    const targetUserId = req.params.userId || req.body.userId;
    const workspaceId = req.params.workspaceId || req.body.workspaceId;

    // Allow if acting on own account
    if (req.user.id === targetUserId) return next();

    // Otherwise check for admin or above in the workspace
    const workspace = await Workspace.findById(workspaceId);

    if (!workspace) {
      return res.status(404).json({ success: false, message: "Workspace not found" });
    }

    const userRole = workspace.getMemberRole(req.user.id);
    const userLevel = ROLE_HIERARCHY[userRole] || 0;

    if (userLevel < ROLE_HIERARCHY["admin"]) {
      return res.status(403).json({
        success: false,
        message: "You can only modify your own data unless you are an admin",
      });
    }

    req.userRole = userRole;
    req.workspace = workspace;
    next();
  } catch (error) {
    console.error("verifySelfOrAdmin error:", error.message);
    res.status(500).json({ success: false, message: "Server error" });
  }
};
