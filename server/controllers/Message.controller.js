import Message from "../models/Message.js";
import Room from "../models/Room.js";
import Workspace from "../models/Workspace.js";
import mongoose from "mongoose";

// ─── Helper: verify user has access to the room ───────────────────────────────
const verifyRoomAccess = async (userId, roomId, workspaceId) => {
  const workspace = await Workspace.findById(workspaceId);
  if (!workspace) return { error: "Workspace not found", status: 404 };

  const userRole = workspace.getMemberRole(userId);
  if (!userRole) return { error: "You are not a member of this workspace", status: 403 };

  const room = await Room.findOne({ _id: roomId, workspace: workspaceId });
  if (!room) return { error: "Room not found", status: 404 };

  if (!room.isAccessibleByRole(userRole)) {
    return { error: "You do not have access to this room", status: 403 };
  }

  return { userRole, room, workspace };
};

// ─── @route  GET /api/messages/:roomId ───────────────────────────────────────
// ─── @access Private — member with room access
// ─── @desc   Get messages with cursor-based pagination (infinite scroll)
export const getMessages = async (req, res) => {
  try {
    const { roomId } = req.params;
    const { workspaceId, cursor, limit = 30 } = req.query;
    const pageSize = Number(limit);
    if (!mongoose.isValidObjectId(workspaceId) || (cursor && !mongoose.isValidObjectId(cursor)) ||
        !Number.isInteger(pageSize) || pageSize < 1 || pageSize > 100) {
      return res.status(400).json({ success: false, message: "Invalid pagination or workspace parameters" });
    }

    // console.log("roomId:", roomId);
    // console.log("workspaceId:", workspaceId);
    // console.log("query:", req.query);
    // console.log("params:", req.params);



    // verify access
    const access = await verifyRoomAccess(req.user.id, roomId, workspaceId);
    if (access.error) {
      return res.status(access.status).json({ success: false, message: access.error });
    }

    // only fetch top-level messages (not thread replies)
    const query = { room: roomId, workspace: workspaceId, parentMessage: null, isDeleted: false };

    // cursor-based pagination: fetch messages older than the cursor
    if (cursor) {
      query._id = { $lt: cursor };
    }

    const messages = await Message.find(query)
      .populate("author", "username avatar status")
      .sort({ _id: -1 })
      .limit(pageSize + 1);

    // reverse so oldest is at top in the UI
    const hasMore = messages.length > pageSize;
    const page = messages.slice(0, pageSize);
    const nextCursor = hasMore ? page[page.length - 1]._id : null;
    const orderedMessages = page.reverse();

    // if we got a full page there are likely more messages

    res.status(200).json({
      success: true,
      messages: orderedMessages,
      hasMore,
      nextCursor,
    });
  } catch (error) {
    console.error("getMessages error:", error.message);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// ─── @route  PATCH /api/messages/:messageId ──────────────────────────────────
// ─── @access Private — author only
// ─── @desc   Edit a message (marks isEdited: true)
export const editMessage = async (req, res) => {
  try {
    const { messageId } = req.params;
    const { content } = req.body;

    if (!content?.trim()) {
      return res.status(400).json({
        success: false,
        message: "Message content cannot be empty",
      });
    }

    const message = await Message.findById(messageId);

    if (!message) {
      return res.status(404).json({ success: false, message: "Message not found" });
    }

    const access = await verifyRoomAccess(req.user.id, message.room, message.workspace);
    if (access.error) return res.status(access.status).json({ success: false, message: access.error });

    // only the author can edit
    if (message.author.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: "You can only edit your own messages",
      });
    }

    if (message.isDeleted) {
      return res.status(400).json({
        success: false,
        message: "Cannot edit a deleted message",
      });
    }

    message.content = content;
    message.isEdited = true;
    await message.save();

    await message.populate("author", "username avatar status");

    res.status(200).json({ success: true, message });
  } catch (error) {
    console.error("editMessage error:", error.message);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// ─── @route  DELETE /api/messages/:messageId ─────────────────────────────────
// ─── @access Private — author OR admin/owner
// ─── @desc   Soft delete a message (content replaced, not removed from DB)
export const deleteMessage = async (req, res) => {
  try {
    const { messageId } = req.params;
    const { workspaceId } = req.query;

    const message = await Message.findById(messageId);

    if (!message) {
      return res.status(404).json({ success: false, message: "Message not found" });
    }

    const access = await verifyRoomAccess(req.user.id, message.room, message.workspace);
    if (access.error) return res.status(access.status).json({ success: false, message: access.error });

    const isAuthor = message.author.toString() === req.user.id;

    // if not author, check if admin or above
    if (!isAuthor) {
      if (workspaceId && workspaceId !== message.workspace.toString()) {
        return res.status(400).json({ success: false, message: "Workspace does not match message" });
      }
      const workspace = access.workspace;
      const userRole = workspace?.getMemberRole(req.user.id);
      const adminRoles = ["owner", "admin"];

      if (!userRole || !adminRoles.includes(userRole)) {
        return res.status(403).json({
          success: false,
          message: "You can only delete your own messages",
        });
      }
    }

    // soft delete — keeps the message in DB for thread integrity
    message.isDeleted = true;
    message.content = "";
    message.fileUrl = "";
    await message.save();

    res.status(200).json({
      success: true,
      message: "Message deleted successfully",
      messageId,
    });
  } catch (error) {
    console.error("deleteMessage error:", error.message);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// ─── @route  GET /api/messages/:roomId/threads/:messageId ────────────────────
// ─── @access Private — member with room access
// ─── @desc   Get all replies to a thread (parentMessage = messageId)
export const getThreadReplies = async (req, res) => {
  try {
    const { roomId, messageId } = req.params;
    const { workspaceId } = req.query;

    // verify room access
    const access = await verifyRoomAccess(req.user.id, roomId, workspaceId);
    if (access.error) {
      return res.status(access.status).json({ success: false, message: access.error });
    }

    // verify parent message exists
    const parentMessage = await Message.findOne({ _id: messageId, room: roomId, workspace: workspaceId })
      .populate("author", "username avatar status");

    if (!parentMessage) {
      return res.status(404).json({ success: false, message: "Message not found" });
    }

    const replies = await Message.find({
      parentMessage: messageId,
      room: roomId,
      workspace: workspaceId,
      isDeleted: false,
    })
      .populate("author", "username avatar status")
      .sort({ createdAt: 1 }); // oldest first in threads

    res.status(200).json({ success: true, parentMessage, replies });
  } catch (error) {
    console.error("getThreadReplies error:", error.message);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// ─── @route  GET /api/messages/:workspaceId/search ───────────────────────────
// ─── @access Private — member or above
// ─── @desc   Full-text search across all rooms the user has access to
export const searchMessages = async (req, res) => {
  try {
    const { workspaceId } = req.params;
    const { q, roomId } = req.query;

    if (!q || q.trim().length < 2) {
      return res.status(400).json({
        success: false,
        message: "Search query must be at least 2 characters",
      });
    }

    // get user's role and accessible rooms
    const workspace = await Workspace.findById(workspaceId);
    const userRole = workspace?.getMemberRole(req.user.id);

    if (!userRole) {
      return res.status(403).json({
        success: false,
        message: "You are not a member of this workspace",
      });
    }

    // find rooms this user can access
    const accessibleRooms = await Room.find({
      workspace: workspaceId,
      allowedRoles: userRole,
      isArchived: false,
    }).select("_id");

    const accessibleRoomIds = accessibleRooms.map((r) => r._id);

    if (roomId && !accessibleRoomIds.some((id) => id.toString() === roomId)) {
      return res.status(403).json({ success: false, message: "You do not have access to this room" });
    }

    // build search query
    const searchQuery = {
      $text: { $search: q },
      workspace: workspaceId,
      room: roomId ? roomId : { $in: accessibleRoomIds },
      isDeleted: false,
    };

    const results = await Message.find(searchQuery, { score: { $meta: "textScore" } })
      .populate("author", "username avatar")
      .populate("room", "name type")
      .sort({ score: { $meta: "textScore" } })
      .limit(25);

    res.status(200).json({ success: true, results, count: results.length });
  } catch (error) {
    console.error("searchMessages error:", error.message);
    res.status(500).json({ success: false, message: "Server error" });
  }
};
