import axiosInstance from "./axiosInstance";

export const createRoomAPI = (workspaceId, data) =>
  axiosInstance.post(`/workspaces/${workspaceId}/rooms`, data);

export const getRoomsAPI = (workspaceId) =>
  axiosInstance.get(`/workspaces/${workspaceId}/rooms`);

export const getRoomByIdAPI = (workspaceId, roomId) =>
  axiosInstance.get(`/workspaces/${workspaceId}/rooms/${roomId}`);

export const updateRoomAPI = (workspaceId, roomId, data) =>
  axiosInstance.patch(`/workspaces/${workspaceId}/rooms/${roomId}`, data);

export const deleteRoomAPI = (workspaceId, roomId) =>
  axiosInstance.delete(`/workspaces/${workspaceId}/rooms/${roomId}`);

export const archiveRoomAPI = (workspaceId, roomId) =>
  axiosInstance.patch(`/workspaces/${workspaceId}/rooms/${roomId}/archive`);

export const reorderRoomsAPI = (workspaceId, rooms) =>
  axiosInstance.patch(`/workspaces/${workspaceId}/rooms/reorder`, { rooms });