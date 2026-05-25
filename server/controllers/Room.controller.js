import Room from "../models/Room.js";
import Workspace from "../models/Workspace.js";
import { ROLES } from "../models/Workspace.js";

// ─── @route  POST /api/workspaces/:workspaceId/rooms ─────────────────────────
// ─── @access Private — admin or above
// ─── @desc   Create a new room inside a workspace
export const createRoom = async (req, res) => {
  try {
    const { name, type, topic, allowedRoles } = req.body;
    const { workspaceId } = req.params;

    if (!name) {
      return res.status(400).json({
        success: false,
        message: "Room name is required",
      });
    }

    // valid room types
    const validTypes = ["text", "audio", "video"];
    if (type && !validTypes.includes(type)) {
      return res.status(400).json({
        success: false,
        message: `Invalid room type. Must be one of: ${validTypes.join(", ")}`,
      });
    }

    // count existing rooms to set position
    const roomCount = await Room.countDocuments({ workspace: workspaceId });

    const room = await Room.create({
      name: name.toLowerCase().replace(/\s+/g, "-"), // discord-style slugging
      type: type || "text",
      workspace: workspaceId,
      topic: topic || "",
      allowedRoles: allowedRoles || Object.values(ROLES),
      position: roomCount,
      createdBy: req.user.id,
    });

    await room.populate("createdBy", "username avatar");

    res.status(201).json({ success: true, room });
  } catch (error) {
    console.error("createRoom error:", error.message);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// ─── @route  GET /api/workspaces/:workspaceId/rooms ──────────────────────────
// ─── @access Private — any member
// ─── @desc   Get all rooms in a workspace the user has access to
export const getRooms = async (req, res) => {
  try {
    const { workspaceId } = req.params;

    // get user's role in this workspace
    const workspace = await Workspace.findById(workspaceId);

    if (!workspace) {
      return res.status(404).json({
        success: false,
        message: "Workspace not found",
      });
    }

    const userRole = workspace.getMemberRole(req.user.id);

    if (!userRole) {
      return res.status(403).json({
        success: false,
        message: "You are not a member of this workspace",
      });
    }

    // only return rooms where the user's role is in allowedRoles
    const rooms = await Room.find({
      workspace: workspaceId,
      isArchived: false,
      allowedRoles: userRole,
    })
      .populate("createdBy", "username avatar")
      .sort({ position: 1 });

    res.status(200).json({ success: true, rooms });
  } catch (error) {
    console.error("getRooms error:", error.message);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// ─── @route  GET /api/workspaces/:workspaceId/rooms/:roomId ──────────────────
// ─── @access Private — member with access to this room
// ─── @desc   Get a single room by ID
export const getRoomById = async (req, res) => {
  try {
    const { workspaceId, roomId } = req.params;

    const workspace = await Workspace.findById(workspaceId);
    const userRole = workspace?.getMemberRole(req.user.id);

    if (!userRole) {
      return res.status(403).json({
        success: false,
        message: "You are not a member of this workspace",
      });
    }

    const room = await Room.findOne({
      _id: roomId,
      workspace: workspaceId,
    }).populate("createdBy", "username avatar");

    if (!room) {
      return res.status(404).json({
        success: false,
        message: "Room not found",
      });
    }

    // check if the user's role has access to this room
    if (!room.isAccessibleByRole(userRole)) {
      return res.status(403).json({
        success: false,
        message: "You do not have access to this room",
      });
    }

    res.status(200).json({ success: true, room });
  } catch (error) {
    console.error("getRoomById error:", error.message);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// ─── @route  PATCH /api/workspaces/:workspaceId/rooms/:roomId ────────────────
// ─── @access Private — admin or above
// ─── @desc   Update room name, topic or allowedRoles
export const updateRoom = async (req, res) => {
  try {
    const { roomId } = req.params;
    const { name, topic, allowedRoles, position } = req.body;

    const room = await Room.findById(roomId);

    if (!room) {
      return res.status(404).json({
        success: false,
        message: "Room not found",
      });
    }

    if (name) room.name = name.toLowerCase().replace(/\s+/g, "-");
    if (topic !== undefined) room.topic = topic;
    if (allowedRoles) room.allowedRoles = allowedRoles;
    if (position !== undefined) room.position = position;

    await room.save();
    await room.populate("createdBy", "username avatar");

    res.status(200).json({ success: true, room });
  } catch (error) {
    console.error("updateRoom error:", error.message);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// ─── @route  PATCH /api/workspaces/:workspaceId/rooms/:roomId/archive ────────
// ─── @access Private — admin or above
// ─── @desc   Archive a room (soft delete — messages preserved)
export const archiveRoom = async (req, res) => {
  try {
    const { roomId } = req.params;

    const room = await Room.findByIdAndUpdate(
      roomId,
      { isArchived: true },
      { new: true }
    );

    if (!room) {
      return res.status(404).json({
        success: false,
        message: "Room not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Room archived successfully",
      room,
    });
  } catch (error) {
    console.error("archiveRoom error:", error.message);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// ─── @route  DELETE /api/workspaces/:workspaceId/rooms/:roomId ───────────────
// ─── @access Private — admin or above
// ─── @desc   Permanently delete a room
export const deleteRoom = async (req, res) => {
  try {
    const { roomId } = req.params;

    const room = await Room.findByIdAndDelete(roomId);

    if (!room) {
      return res.status(404).json({
        success: false,
        message: "Room not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Room deleted successfully",
    });
  } catch (error) {
    console.error("deleteRoom error:", error.message);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// ─── @route  PATCH /api/workspaces/:workspaceId/rooms/reorder ────────────────
// ─── @access Private — admin or above
// ─── @desc   Reorder rooms in the sidebar (drag and drop)
export const reorderRooms = async (req, res) => {
  try {
    const { rooms } = req.body;
    // rooms = [{ id: "roomId", position: 0 }, { id: "roomId2", position: 1 }]

    if (!Array.isArray(rooms)) {
      return res.status(400).json({
        success: false,
        message: "rooms must be an array of { id, position }",
      });
    }

    // bulk update positions
    const updates = rooms.map(({ id, position }) =>
      Room.findByIdAndUpdate(id, { position })
    );

    await Promise.all(updates);

    res.status(200).json({
      success: true,
      message: "Rooms reordered successfully",
    });
  } catch (error) {
    console.error("reorderRooms error:", error.message);
    res.status(500).json({ success: false, message: "Server error" });
  }
};
