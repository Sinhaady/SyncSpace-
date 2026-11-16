import Message from "../models/Message.js";
import Room from "../models/Room.js";

// ─── registerMessageEvents ────────────────────────────────────────────────────
// Handles all real-time message events for TEXT rooms only
// Audio/video rooms skip these events — LiveKit handles their media
// ─────────────────────────────────────────────────────────────────────────────
export const registerMessageEvents = (io, socket) => {

  // ── message:send ─────────────────────────────────────────────────────────
  // Payload: { roomId, workspaceId, content, fileUrl?, fileType?, parentMessageId? }
  socket.on("message:send", async (data) => {
    try {
      const { roomId, workspaceId, content, fileUrl, fileType, parentMessageId } = data;
      if (socket.currentWorkspaceId !== workspaceId || typeof content !== "string" && content != null ||
          (content && content.length > 2000)) {
        return socket.emit("error", { message: "Invalid message" });
      }

      // guard: only text rooms support messaging
      if (socket.currentRoomType !== "text") {
        return socket.emit("error", {
          message: "Messages are only supported in text rooms",
        });
      }

      // guard: must be in the room they are sending to
      if (socket.currentRoomId !== roomId) {
        return socket.emit("error", { message: "Join the room before sending messages" });
      }

      // guard: guests cannot send messages
      if (socket.userRole === "guest") {
        return socket.emit("error", {
          message: "Guests cannot send messages",
        });
      }

      // must have content or a file
      if (!content?.trim() && !fileUrl) {
        return socket.emit("error", { message: "Message cannot be empty" });
      }

      if (parentMessageId) {
        const parent = await Message.findOne({ _id: parentMessageId, room: roomId, workspace: workspaceId, parentMessage: null, isDeleted: false });
        if (!parent) return socket.emit("error", { message: "Thread not found" });
      }

      // create and save message
      const message = await Message.create({
        content: content?.trim() || "",
        fileUrl: fileUrl || "",
        fileType: fileType || "",
        author: socket.user.id,
        room: roomId,
        workspace: workspaceId,
        parentMessage: parentMessageId || null,
      });

      // if this is a thread reply, increment parent's reply count
      if (parentMessageId) {
        await Message.findByIdAndUpdate(parentMessageId, {
          $inc: { replyCount: 1 },
        });
      }

      await message.populate("author", "username avatar status");

      // broadcast to everyone in the room including sender
      io.to(`room:${roomId}`).emit("message:new", message);

      // if thread reply, also notify the thread panel subscribers
      if (parentMessageId) {
        io.to(`room:${roomId}`).emit("thread:replyAdded", {
          parentMessageId,
          reply: message,
        });
      }

    } catch (error) {
      console.error("message:send error:", error.message);
      socket.emit("error", { message: "Failed to send message" });
    }
  });

  // ── message:edit ─────────────────────────────────────────────────────────
  // Payload: { messageId, content, roomId }
  socket.on("message:edit", async (data) => {
    try {
      const { messageId, content, roomId } = data;
      if (socket.currentRoomId !== roomId) return socket.emit("error", { message: "Join the room first" });

      if (typeof content !== "string" || !content.trim() || content.length > 2000) {
        return socket.emit("error", { message: "Message content cannot be empty" });
      }

      // text rooms only
      if (socket.currentRoomType !== "text") return;

      const message = await Message.findById(messageId);

      if (!message || message.room.toString() !== roomId) {
        return socket.emit("error", { message: "Message not found" });
      }

      // only author can edit
      if (message.author.toString() !== socket.user.id) {
        return socket.emit("error", { message: "You can only edit your own messages" });
      }

      if (message.isDeleted) {
        return socket.emit("error", { message: "Cannot edit a deleted message" });
      }

      message.content = content.trim();
      message.isEdited = true;
      await message.save();
      await message.populate("author", "username avatar status");

      // broadcast updated message to entire room
      io.to(`room:${roomId}`).emit("message:edited", message);

    } catch (error) {
      console.error("message:edit error:", error.message);
      socket.emit("error", { message: "Failed to edit message" });
    }
  });

  // ── message:delete ───────────────────────────────────────────────────────
  // Payload: { messageId, roomId }
  socket.on("message:delete", async (data) => {
    try {
      const { messageId, roomId } = data;
      if (socket.currentRoomId !== roomId) return socket.emit("error", { message: "Join the room first" });

      // text rooms only
      if (socket.currentRoomType !== "text") return;

      const message = await Message.findById(messageId);

      if (!message || message.room.toString() !== roomId) {
        return socket.emit("error", { message: "Message not found" });
      }

      const isAuthor = message.author.toString() === socket.user.id;
      const isAdminOrAbove = ["owner", "admin"].includes(socket.userRole);

      if (!isAuthor && !isAdminOrAbove) {
        return socket.emit("error", {
          message: "You can only delete your own messages",
        });
      }

      // soft delete
      message.isDeleted = true;
      message.content = "";
      message.fileUrl = "";
      await message.save();

      // broadcast deletion to room — UI shows "This message was deleted"
      io.to(`room:${roomId}`).emit("message:deleted", { messageId });

    } catch (error) {
      console.error("message:delete error:", error.message);
      socket.emit("error", { message: "Failed to delete message" });
    }
  });

  // ── typing:start ─────────────────────────────────────────────────────────
  // Payload: { roomId }
  socket.on("typing:start", ({ roomId }) => {
    if (socket.currentRoomType !== "text" || socket.currentRoomId !== roomId) return;

    // broadcast to others in room (not the sender)
    socket.to(`room:${roomId}`).emit("typing:update", {
      userId: socket.user.id,
      username: socket.user.username,
      isTyping: true,
    });
  });

  // ── typing:stop ──────────────────────────────────────────────────────────
  // Payload: { roomId }
  socket.on("typing:stop", ({ roomId }) => {
    if (socket.currentRoomType !== "text" || socket.currentRoomId !== roomId) return;

    socket.to(`room:${roomId}`).emit("typing:update", {
      userId: socket.user.id,
      username: socket.user.username,
      isTyping: false,
    });
  });
};
