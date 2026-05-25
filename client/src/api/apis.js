import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "/api",
  withCredentials: true,
});

export const registerAPI = (payload) => api.post("/auth/register", payload);
export const loginAPI = (payload) => api.post("/auth/login", payload);
export const logoutAPI = () => api.post("/auth/logout");
export const getMeAPI = () => api.get("/auth/me");
export const joinViaInviteAPI = (code) => api.get(`/invite/join/${code}`);

export const getWorkspacesAPI = () => api.get("/workspaces");
export const createWorkspaceAPI = (payload) => api.post("/workspaces", payload);
export const getWorkspaceByIdAPI = (workspaceId) =>
  api.get(`/workspaces/${workspaceId}`);

export const createRoomAPI = (workspaceId, payload) =>
  api.post(`/workspaces/${workspaceId}/rooms`, payload);
export const getRoomsAPI = (workspaceId) =>
  api.get(`/workspaces/${workspaceId}/rooms`);

export const getMessagesAPI = (
  roomId,
  workspaceId,
  cursor = null,
  limit = 30,
) =>
  api.get(`/messages/${roomId}`, {
    params: { workspaceId, cursor, limit },
  });
export const editMessageAPI = (messageId, content) =>
  api.patch(`/messages/${messageId}`, { content });
export const deleteMessageAPI = (messageId, workspaceId) =>
  api.delete(`/messages/${messageId}`, {
    params: { workspaceId },
  });

export const getLiveKitTokenAPI = (payload) =>
  api.post("/livekit/token", payload);

export const createInviteAPI = (workspaceId, payload) =>
  api.post(`/invite/workspaces/${workspaceId}/invite`, payload);
export const getWorkspaceInvitesAPI = (workspaceId) =>
  api.get(`/invite/workspaces/${workspaceId}/invite`);
export const revokeInviteAPI = (workspaceId, inviteId) =>
  api.delete(`/invite/workspaces/${workspaceId}/${inviteId}`);

export default api;
