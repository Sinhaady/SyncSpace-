import axiosInstance from "./axiosInstance";

// ─── Invite API ───────────────────────────────────────────────────────────────
export const createInviteAPI = (workspaceId, data) =>
  axiosInstance.post(`/invite/workspaces/${workspaceId}/invites`, data);

export const getInvitesAPI = (workspaceId) =>
  axiosInstance.get(`/invite/workspaces/${workspaceId}/invites`);

export const joinViaInviteAPI = (code) =>
  axiosInstance.get(`/invite/join/${code}`);

export const revokeInviteAPI = (workspaceId, inviteId) =>
  axiosInstance.delete(`/invite/workspaces/${workspaceId}/invites/${inviteId}`);

// ─── Upload API ───────────────────────────────────────────────────────────────
export const uploadFileAPI = (file) => {
  const formData = new FormData();
  formData.append("file", file);
  return axiosInstance.post("/upload/file", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
};

export const uploadAvatarAPI = (file) => {
  const formData = new FormData();
  formData.append("avatar", file);
  return axiosInstance.post("/upload/avatar", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
};

export const uploadWorkspaceIconAPI = (workspaceId, file) => {
  const formData = new FormData();
  formData.append("icon", file);
  return axiosInstance.post(`/upload/workspace-icon/${workspaceId}`, formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
};

export const deleteFileAPI = (publicId, resourceType = "image") =>
  axiosInstance.delete("/upload/file", { data: { publicId, resourceType } });

// ─── LiveKit API ──────────────────────────────────────────────────────────────
export const getLiveKitTokenAPI = (roomId, workspaceId) =>
  axiosInstance.post("/livekit/token", { roomId, workspaceId });

// ─── AI API ───────────────────────────────────────────────────────────────────
export const summariseRoomAPI = (roomId, workspaceId, messageCount = 50) =>
  axiosInstance.post("/ai/summarise", { roomId, workspaceId, messageCount });

export const summariseThreadAPI = (messageId, workspaceId) =>
  axiosInstance.post("/ai/summarise-thread", { messageId, workspaceId });