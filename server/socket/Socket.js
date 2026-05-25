import { Server } from "socket.io";
import jwt from "jsonwebtoken";
import cookie from "cookie";
import User from "../models/User.js";
import Room from "../models/Room.js";
import Workspace from "../models/Workspace.js";
import { registerMessageEvents } from "./Messageevent.js";
import { registerReactionEvents } from "./Reactionevent.js";
import { registerPresenceEvents } from "./Presenceevent.js";

let io;

export const initSocket = (httpServer) => {
  io = new Server(httpServer, {
    cors: {
      origin: process.env.CLIENT_URL || "http://localhost:5173",
      credentials: true,
      methods: ["GET", "POST"],
    },
  });

  // ─── JWT Auth Middleware ────────────────────────────────────────────────────
  // Runs before every socket connection
  // Reads JWT from cookie → verifies → attaches socket.user
  io.use(async (socket, next) => {
    try {
      const cookies = cookie.parse(socket.handshake.headers.cookie || "");
      const token = cookies["syncspace_token"];

      if (!token) {
        return next(new Error("Authentication error: No token provided"));
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.id).select("-password");

      if (!user) {
        return next(new Error("Authentication error: User not found"));
      }

      // attach user to socket for use in all event handlers
      socket.user = {
        id: user._id.toString(),
        username: user.username,
        avatar: user.avatar,
        status: user.status,
      };

      next();
    } catch (error) {
      if (error.name === "TokenExpiredError") {
        return next(new Error("Authentication error: Token expired"));
      }
      return next(new Error("Authentication error: Invalid token"));
    }
  });

  // ─── Connection Handler ─────────────────────────────────────────────────────
  io.on("connection", async (socket) => {
    console.log(`✅ Socket connected: ${socket.user.username} [${socket.id}]`);

    // set user status to online
    await User.findByIdAndUpdate(socket.user.id, { status: "online" });

    // ── Join workspace room ──────────────────────────────────────────────────
    // Client emits this immediately after connecting
    // Puts the socket in a workspace-level room for workspace-wide events
    socket.on("workspace:join", async ({ workspaceId }) => {
      try {
        const workspace = await Workspace.findById(workspaceId);
        const userRole = workspace?.getMemberRole(socket.user.id);

        if (!userRole) {
          return socket.emit("error", { message: "Not a member of this workspace" });
        }

        socket.join(`workspace:${workspaceId}`);
        socket.workspaceId = workspaceId;
        socket.userRole = userRole;

        console.log(`👥 ${socket.user.username} joined workspace ${workspaceId}`);
      } catch (error) {
        socket.emit("error", { message: "Failed to join workspace" });
      }
    });

    // ── Join a room (text / audio / video) ───────────────────────────────────
    socket.on("room:join", async ({ roomId, workspaceId }) => {
      try {
        const workspace = await Workspace.findById(workspaceId);
        const userRole = workspace?.getMemberRole(socket.user.id);

        if (!userRole) {
          return socket.emit("error", { message: "Not a member of this workspace" });
        }

        const room = await Room.findById(roomId);

        if (!room) {
          return socket.emit("error", { message: "Room not found" });
        }

        // RBAC: check if user's role can access this room
        if (!room.isAccessibleByRole(userRole)) {
          return socket.emit("error", { message: "You do not have access to this room" });
        }

        // leave previous room if any
        if (socket.currentRoomId) {
          socket.leave(`room:${socket.currentRoomId}`);
        }

        socket.join(`room:${roomId}`);
        socket.currentRoomId = roomId;
        socket.currentRoomType = room.type;
        socket.userRole = userRole;

        // notify others in the room that someone joined
        socket.to(`room:${roomId}`).emit("room:userJoined", {
          user: socket.user,
          roomId,
          roomType: room.type,
        });

        socket.emit("room:joined", {
          roomId,
          roomType: room.type,
          message: `Joined ${room.type} room: ${room.name}`,
        });

        console.log(`🚪 ${socket.user.username} joined ${room.type} room ${room.name}`);
      } catch (error) {
        socket.emit("error", { message: "Failed to join room" });
      }
    });

    // ── Leave a room ─────────────────────────────────────────────────────────
    socket.on("room:leave", ({ roomId }) => {
      socket.leave(`room:${roomId}`);

      socket.to(`room:${roomId}`).emit("room:userLeft", {
        user: socket.user,
        roomId,
      });

      socket.currentRoomId = null;
      socket.currentRoomType = null;

      console.log(`🚪 ${socket.user.username} left room ${roomId}`);
    });

    // ── Register event handlers based on room type ───────────────────────────
    // text rooms  → messages + reactions + typing
    // audio/video → presence only (LiveKit handles media)
    registerMessageEvents(io, socket);
    registerReactionEvents(io, socket);
    registerPresenceEvents(io, socket);

    // ── Disconnect ───────────────────────────────────────────────────────────
    socket.on("disconnect", async () => {
      console.log(`❌ Socket disconnected: ${socket.user.username}`);

      // set user status to offline
      await User.findByIdAndUpdate(socket.user.id, { status: "offline" });

      // notify workspace of presence change
      if (socket.workspaceId) {
        io.to(`workspace:${socket.workspaceId}`).emit("presence:update", {
          userId: socket.user.id,
          status: "offline",
        });
      }

      // notify room if user was in one
      if (socket.currentRoomId) {
        io.to(`room:${socket.currentRoomId}`).emit("room:userLeft", {
          user: socket.user,
          roomId: socket.currentRoomId,
        });
      }
    });
  });

  console.log("🔌 Socket.io initialised");
  return io;
};

// export io instance for use in controllers if needed
export const getIO = () => {
  if (!io) throw new Error("Socket.io not initialised");
  return io;
};
