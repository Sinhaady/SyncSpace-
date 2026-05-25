// ─── formatTime.js ────────────────────────────────────────────────────────────

export const formatTime = (date) => {
  const d = new Date(date);
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
};

export const formatDate = (date) => {
  const d = new Date(date);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  if (d.toDateString() === today.toDateString()) return "Today";
  if (d.toDateString() === yesterday.toDateString()) return "Yesterday";
  return d.toLocaleDateString([], { month: "long", day: "numeric", year: "numeric" });
};

export const formatMessageTime = (date) => {
  return new Date(date).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
};

// ─── permissions.js ───────────────────────────────────────────────────────────

import { ROLE_HIERARCHY } from "./constants";

export const hasPermission = (userRole, requiredRole) => {
  if (!userRole || !requiredRole) return false;
  return ROLE_HIERARCHY[userRole] >= ROLE_HIERARCHY[requiredRole];
};

export const isAdminOrAbove = (role) => hasPermission(role, "admin");
export const isOwner        = (role) => role === "owner";
export const canSendMessage = (role) => hasPermission(role, "member");