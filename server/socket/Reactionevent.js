import Message from "../models/Message.js";

// ─── registerReactionEvents ───────────────────────────────────────────────────
// Handles real-time emoji reactions on messages
// Text rooms only — toggles reaction on/off per user per emoji
// ─────────────────────────────────────────────────────────────────────────────
export const registerReactionEvents = (io, socket) => {

  // ── message:react ─────────────────────────────────────────────────────────
  // Payload: { messageId, roomId, emoji }
  // If user already reacted with this emoji → removes it (toggle off)
  // If user hasn't reacted with this emoji → adds it (toggle on)
  socket.on("message:react", async (data) => {
    try {
      const { messageId, roomId, emoji } = data;
      if (socket.currentRoomId !== roomId) return socket.emit("error", { message: "Join the room first" });

      // text rooms only
      if (socket.currentRoomType !== "text") {
        return socket.emit("error", {
          message: "Reactions are only supported in text rooms",
        });
      }

      // guard: guests cannot react
      if (socket.userRole === "guest") {
        return socket.emit("error", {
          message: "Guests cannot react to messages",
        });
      }

      if (!emoji) {
        return socket.emit("error", { message: "Emoji is required" });
      }

      const message = await Message.findById(messageId);

      if (!message || message.room.toString() !== roomId) {
        return socket.emit("error", { message: "Message not found" });
      }

      if (message.isDeleted) {
        return socket.emit("error", {
          message: "Cannot react to a deleted message",
        });
      }

      // use the toggleReaction helper defined on the Message model
      // handles add / remove logic atomically
      message.toggleReaction(emoji, socket.user.id);
      await message.save();

      // broadcast updated reactions array to the entire room
      // frontend replaces the reactions for this messageId
      io.to(`room:${roomId}`).emit("message:reactionUpdated", {
        messageId,
        reactions: message.reactions,
      });

    } catch (error) {
      console.error("message:react error:", error.message);
      socket.emit("error", { message: "Failed to update reaction" });
    }
  });
};
