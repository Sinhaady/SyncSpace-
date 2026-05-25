import axiosInstance from "./axiosInstance";

export const getMessagesAPI = (roomId, workspaceId, cursor = null, limit = 30) =>
  axiosInstance.get(`/messages/${roomId}`, {
    params: { workspaceId, cursor, limit },
  });

export const editMessageAPI = (messageId, content) =>
  axiosInstance.patch(`/messages/${messageId}`, { content });

export const deleteMessageAPI = (messageId, workspaceId) =>
  axiosInstance.delete(`/messages/${messageId}`, {
    params: { workspaceId },
  });

export const getThreadRepliesAPI = (roomId, messageId, workspaceId) =>
  axiosInstance.get(`/messages/${roomId}/threads/${messageId}`, {
    params: { workspaceId },
  });

export const searchMessagesAPI = (workspaceId, query, roomId = null) =>
  axiosInstance.get(`/messages/${workspaceId}/search`, {
    params: { q: query, roomId },
  });