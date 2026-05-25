import mongoose from "mongoose";

const reactionSchema = new mongoose.Schema(
  {
    emoji: {
      type: String,
      required: true, // e.g. "👍", "❤️", "😂"
    },
    //users who reacted with this emoji
    users: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
  },
  { _id: false },
);

const messageSchema = new mongoose.Schema(
  {
    content: {
      type: String,
      maxlength: [2000, "Message cannot exceed 2000 characters"],
      // not required because a message can be attachment-only
    },
    // file or image attachment (Cloudinary URL)
    fileUrl: {
      type: String,
      default: "",
    },
    fileType: {
      type: String,
      enum: ["image", "pdf", "other", ""],
      default: "",
    },
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    room: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Room",
      required: true,
    },
    workspace: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Workspace",
      required: true,
    },

    // ── Threading ─────────────────────────────────────────────────────────────
    // if this is null → it's a top-level message
    // if this has a value → it's a reply in a thread
    parentMessage: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Message",
      default: null,
    },
    // count of replies (denormalised for performance — avoids extra queries)
    replyCount: {
      type: Number,
      default: 0,
    },

    // ── Reactions ─────────────────────────────────────────────────────────────
    reactions: [reactionSchema],

    // ── Edit history ──────────────────────────────────────────────────────────
    isEdited: {
      type: Boolean,
      default: false,
    },
    // ── Soft delete ───────────────────────────────────────────────────────────
    // deleted messages show "This message was deleted" in UI
    isDeleted: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true },
);

// ─── Index for fast room message queries + full-text search ──────────────────
messageSchema.index({ room: 1, createdAt: -1 }); // paginate messages in a room
messageSchema.index({ content: "text" }); // MongoDB full-text search

// ─── Helper: add or remove a reaction atomically ─────────────────────────────
messageSchema.methods.toggleReaction = function (emoji, userId) {
  const reaction = this.reactions.find((r) => r.emoji === emoji);

  if (!reaction) {
    // first time this emoji is used on this message
    this.reactions.push({ emoji, users: [userId] });
  } else {
    const alreadyReacted = reaction.users
      .map((u) => u.toString())
      .includes(userId.toString());

    if (alreadyReacted) {
      // remove the user's reaction
      reaction.users = reaction.users.filter(
        (u) => u.toString() !== userId.toString(),
      );
      // clean up empty reaction entries
      if (reaction.users.length === 0) {
        this.reactions = this.reactions.filter((r) => r.emoji !== emoji);
      }
    } else {
      // add user to existing emoji
      reaction.users.push(userId);
    }
  }
};

const Message = mongoose.model("Message", messageSchema);
export default Message;
