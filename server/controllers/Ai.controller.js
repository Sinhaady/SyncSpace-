import { GoogleGenerativeAI } from "@google/generative-ai";
import Message from "../models/Message.js";
import Room from "../models/Room.js";
import Workspace from "../models/Workspace.js";

// initialise Gemini client
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// ─── @route  POST /api/ai/summarise ──────────────────────────────────────────
// ─── @access Private — member or above
// ─── @desc   Summarise the last N messages in a room using Gemini
//             This is the standout AI feature of SyncSpace
export const summariseRoom = async (req, res) => {
  try {
    const { roomId, workspaceId, messageCount = 50 } = req.body;

    if (!roomId || !workspaceId) {
      return res.status(400).json({
        success: false,
        message: "roomId and workspaceId are required",
      });
    }

    // ── RBAC: verify access ────────────────────────────────────────────────
    const workspace = await Workspace.findById(workspaceId);
    const userRole = workspace?.getMemberRole(req.user.id);

    if (!userRole) {
      return res.status(403).json({
        success: false,
        message: "You are not a member of this workspace",
      });
    }

    const room = await Room.findOne({ _id: roomId, workspace: workspaceId });

    if (!room) {
      return res.status(404).json({
        success: false,
        message: "Room not found",
      });
    }

    if (!room.isAccessibleByRole(userRole)) {
      return res.status(403).json({
        success: false,
        message: "You do not have access to this room",
      });
    }

    // text rooms only — no point summarising voice/video rooms
    if (room.type !== "text") {
      return res.status(400).json({
        success: false,
        message: "Summarisation is only available for text rooms",
      });
    }

    // ── Fetch last N messages ──────────────────────────────────────────────
    const messages = await Message.find({
      room: roomId,
      isDeleted: false,
      parentMessage: null, // top-level messages only
    })
      .populate("author", "username")
      .sort({ createdAt: -1 })
      .limit(Math.min(Number(messageCount), 100)); // cap at 100

    if (messages.length === 0) {
      return res.status(400).json({
        success: false,
        message: "No messages to summarise in this room",
      });
    }

    if (messages.length < 3) {
      return res.status(400).json({
        success: false,
        message: "Not enough messages to summarise (minimum 3)",
      });
    }

    // reverse to get chronological order for the prompt
    const chronological = messages.reverse();

    // ── Format messages for Gemini ─────────────────────────────────────────
    const conversation = chronological
      .map((m) => `${m.author.username}: ${m.content}`)
      .join("\n");

    // ── Build the prompt ───────────────────────────────────────────────────
    const prompt = `
You are SyncAI, the intelligent assistant built into SyncSpace — a team collaboration platform.

A user has requested a summary of the recent conversation in the "${room.name}" channel.

Here is the conversation (${messages.length} messages):

${conversation}

Please provide:
1. **TL;DR** — One sentence summary (max 20 words)
2. **Key Points** — 3 to 5 bullet points of the main topics discussed
3. **Action Items** — Any tasks, decisions or follow-ups mentioned (if none, say "No action items identified")
4. **Participants** — List of people who were active in this conversation

Keep the summary professional, concise and helpful. Do not make up information not present in the conversation.
    `.trim();

    // ── Call Gemini API ────────────────────────────────────────────────────
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const result = await model.generateContent(prompt);
    const summary = result.response.text();

    res.status(200).json({
      success: true,
      summary,
      roomName: room.name,
      messageCount: messages.length,
      generatedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error("summariseRoom error:", error.message);

    // handle Gemini quota errors gracefully
    if (error.message?.includes("429") || error.message?.includes("quota")) {
      return res.status(429).json({
        success: false,
        message: "AI service is busy. Please try again in a moment.",
      });
    }

    res.status(500).json({ success: false, message: "Server error" });
  }
};

// ─── @route  POST /api/ai/summarise-thread ───────────────────────────────────
// ─── @access Private — member or above
// ─── @desc   Summarise a specific message thread
export const summariseThread = async (req, res) => {
  try {
    const { messageId, workspaceId } = req.body;

    if (!messageId || !workspaceId) {
      return res.status(400).json({
        success: false,
        message: "messageId and workspaceId are required",
      });
    }

    // verify workspace membership
    const workspace = await Workspace.findById(workspaceId);
    const userRole = workspace?.getMemberRole(req.user.id);

    if (!userRole) {
      return res.status(403).json({
        success: false,
        message: "You are not a member of this workspace",
      });
    }

    // get parent message and all replies
    const parentMessage = await Message.findById(messageId)
      .populate("author", "username");

    if (!parentMessage) {
      return res.status(404).json({
        success: false,
        message: "Message not found",
      });
    }

    const replies = await Message.find({
      parentMessage: messageId,
      isDeleted: false,
    })
      .populate("author", "username")
      .sort({ createdAt: 1 });

    if (replies.length === 0) {
      return res.status(400).json({
        success: false,
        message: "This thread has no replies to summarise",
      });
    }

    // format thread for Gemini
    const threadContent = [
      `${parentMessage.author.username}: ${parentMessage.content}`,
      ...replies.map((r) => `${r.author.username}: ${r.content}`),
    ].join("\n");

    const prompt = `
You are SyncAI, the intelligent assistant built into SyncSpace.

Summarise this message thread concisely:

${threadContent}

Provide:
1. **Summary** — 2 to 3 sentences covering what was discussed
2. **Conclusion** — What was decided or resolved (if anything)
3. **Action Items** — Any follow-ups mentioned

Be brief and professional.
    `.trim();

    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    const result = await model.generateContent(prompt);
    const summary = result.response.text();

    res.status(200).json({
      success: true,
      summary,
      replyCount: replies.length,
      generatedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error("summariseThread error:", error.message);

    if (error.message?.includes("429") || error.message?.includes("quota")) {
      return res.status(429).json({
        success: false,
        message: "AI service is busy. Please try again in a moment.",
      });
    }

    res.status(500).json({ success: false, message: "Server error" });
  }
};
