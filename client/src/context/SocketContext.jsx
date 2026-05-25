/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { io } from "socket.io-client";
import { useAuth } from "./AuthContext";

const SocketContext = createContext(null);

const socketUrl =
  import.meta.env.VITE_SOCKET_URL ||
  import.meta.env.VITE_API_URL?.replace(/\/api$/, "") ||
  "http://localhost:5000";

export const SocketProvider = ({ children }) => {
  const { user } = useAuth();
  const [socket, setSocket] = useState(null);

  useEffect(() => {
    if (!user) {
      return undefined;
    }

    const nextSocket = io(socketUrl, {
      autoConnect: false,
      withCredentials: true,
    });

    nextSocket.on("connect", () => setSocket(nextSocket));
    nextSocket.on("disconnect", () => setSocket(null));
    nextSocket.connect();

    return () => {
      nextSocket.disconnect();
    };
  }, [user]);

  const value = useMemo(() => ({ socket }), [socket]);

  return (
    <SocketContext.Provider value={value}>{children}</SocketContext.Provider>
  );
};

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error("useSocket must be used within a SocketProvider");
  }
  return context;
};
