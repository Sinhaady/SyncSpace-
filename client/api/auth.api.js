import axiosInstance from "./axiosInstance";

export const registerAPI = (data) =>
  axiosInstance.post("/auth/register", data);

export const loginAPI = (data) =>
  axiosInstance.post("/auth/login", data);

export const logoutAPI = () =>
  axiosInstance.post("/auth/logout");

export const getMeAPI = () =>
  axiosInstance.get("/auth/me");

export const updateStatusAPI = (status) =>
  axiosInstance.put("/auth/update-status", { status });