import axiosInstance from "./axiosInstance";

export const createWorkspaceAPI = (data) =>
  axiosInstance.post("/workspaces", data);

export const getMyWorkspacesAPI = () =>
  axiosInstance.get("/workspaces");

export const getWorkspaceByIdAPI = (workspaceId) =>
  axiosInstance.get(`/workspaces/${workspaceId}`);

export const updateWorkspaceAPI = (workspaceId, data) =>
  axiosInstance.patch(`/workspaces/${workspaceId}`, data);

export const deleteWorkspaceAPI = (workspaceId) =>
  axiosInstance.delete(`/workspaces/${workspaceId}`);

export const changeMemberRoleAPI = (workspaceId, userId, role) =>
  axiosInstance.patch(`/workspaces/${workspaceId}/members/${userId}/role`, { role });

export const kickMemberAPI = (workspaceId, userId) =>
  axiosInstance.delete(`/workspaces/${workspaceId}/members/${userId}`);

export const leaveWorkspaceAPI = (workspaceId) =>
  axiosInstance.delete(`/workspaces/${workspaceId}/leave`);