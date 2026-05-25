import { AccessToken } from "livekit-server-sdk";
import Room from "../models/Room.js";
import Workspace from "../models/Workspace.js";

// ─── @route  POST /api/livekit/token ─────────────────────────────────────────
// ─── @access Private — member with room access
// ─── @desc   Generate a LiveKit access token for a voice/video room
//             Frontend uses this token to connect to LiveKit Cloud
//             LiveKit handles all the actual WebRTC media streams
export const getLiveKitToken = async (req, res) => {
  try {
    const { roomId, workspaceId } = req.body;

    if (!roomId || !workspaceId) {
      return res.status(400).json({
        success: false,
        message: "roomId and workspaceId are required",
      });
    }

    // ── RBAC: verify user is a member and has room access ──────────────────
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

    const room = await Room.findOne({ _id: roomId, workspace: workspaceId });

    if (!room) {
      return res.status(404).json({
        success: false,
        message: "Room not found",
      });
    }

    // only audio and video rooms get LiveKit tokens
    if (room.type === "text") {
      return res.status(400).json({
        success: false,
        message: "LiveKit tokens are only for audio and video rooms",
      });
    }

    if (
      !process.env.LIVEKIT_URL ||
      !process.env.LIVEKIT_API_KEY ||
      !process.env.LIVEKIT_API_SECRET
    ) {
      return res.status(500).json({
        success: false,
        message: "LiveKit is not configured on the server",
      });
    }

    // check if user's role can access this room
    if (!room.isAccessibleByRole(userRole)) {
      return res.status(403).json({
        success: false,
        message: "You do not have access to this room",
      });
    }

    // ── Generate LiveKit token ─────────────────────────────────────────────
    const at = new AccessToken(
      process.env.LIVEKIT_API_KEY,
      process.env.LIVEKIT_API_SECRET,
      {
        // identity = unique user identifier in LiveKit
        identity: req.user.id,
        // display name shown to other participants
        name: req.user.username,
        // token valid for 4 hours
        ttl: "4h",
      }
    );

    // grant permissions for this specific room
    at.addGrant({
      // LiveKit room name — use MongoDB roomId as unique identifier
      roomJoin: true,
      room: roomId,
      // allow user to publish their camera and microphone
      canPublish: true,
      // allow user to subscribe to others' streams
      canSubscribe: true,
      // guests can only view — cannot publish
      canPublishData: userRole !== "guest",
    });

    const token = await at.toJwt();

    res.status(200).json({
      success: true,
      token,
      livekitUrl: process.env.LIVEKIT_URL,
      roomId,
      roomType: room.type,
      roomName: room.name,
    });
  } catch (error) {
    console.error("getLiveKitToken error:", error.message);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// ─── @route  DELETE /api/livekit/disconnect ───────────────────────────────────
// ─── @access Private
// ─── @desc   Remove a participant from a LiveKit room (admin only)
//             Useful for kicking someone from a voice channel
export const disconnectParticipant = async (req, res) => {
  try {
    const { roomId, userId } = req.body;
    const { workspaceId } = req.body;

    // verify requester is admin or above
    const workspace = await Workspace.findById(workspaceId);
    const userRole = workspace?.getMemberRole(req.user.id);
    const adminRoles = ["owner", "admin"];

    if (!userRole || !adminRoles.includes(userRole)) {
      return res.status(403).json({
        success: false,
        message: "Only admins can disconnect participants",
      });
    }

    // LiveKit Admin API — remove participant from room
    const { RoomServiceClient } = await import("livekit-server-sdk");

    const roomService = new RoomServiceClient(
      process.env.LIVEKIT_URL.replace("wss://", "https://"),
      process.env.LIVEKIT_API_KEY,
      process.env.LIVEKIT_API_SECRET
    );

    await roomService.removeParticipant(roomId, userId);

    res.status(200).json({
      success: true,
      message: "Participant disconnected from voice channel",
    });
  } catch (error) {
    console.error("disconnectParticipant error:", error.message);
    res.status(500).json({ success: false, message: "Server error" });
  }
};
