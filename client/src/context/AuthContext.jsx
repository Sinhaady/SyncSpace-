/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { getMeAPI, loginAPI, logoutAPI, registerAPI } from "../api/apis";

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    const loadUser = async () => {
      try {
        const res = await getMeAPI();
        if (active) setUser(res.data.user);
      } catch {
        if (active) setUser(null);
      } finally {
        if (active) setLoading(false);
      }
    };

    loadUser();

    return () => {
      active = false;
    };
  }, []);

  const register = async (payload) => {
    const res = await registerAPI(payload);
    setUser(res.data.user);
    return res;
  };

  const login = async (payload) => {
    const res = await loginAPI(payload);
    setUser(res.data.user);
    return res;
  };

  const logout = async () => {
    await logoutAPI();
    setUser(null);
  };

  const value = useMemo(
    () => ({ user, loading, register, login, logout, setUser }),
    [user, loading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
