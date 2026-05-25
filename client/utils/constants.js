// ─── constants.js ─────────────────────────────────────────────────────────────

export const ROLES = {
  OWNER:  "owner",
  ADMIN:  "admin",
  MEMBER: "member",
  GUEST:  "guest",
};

export const ROLE_HIERARCHY = {
  owner:  4,
  admin:  3,
  member: 2,
  guest:  1,
};

export const ROOM_TYPES = {
  TEXT:  "text",
  AUDIO: "audio",
  VIDEO: "video",
};

export const STATUS = {
  ONLINE:  "online",
  IDLE:    "idle",
  OFFLINE: "offline",
};

export const STATUS_COLORS = {
  online:  "bg-green-500",
  idle:    "bg-yellow-500",
  offline: "bg-gray-500",
};