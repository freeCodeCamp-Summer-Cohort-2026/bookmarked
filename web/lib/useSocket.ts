"use client";
import { useEffect, useState } from "react";
import { io, Socket } from "socket.io-client";
import { AuthState } from "./types";

export function useSocket(auth: AuthState | null) {
  const [socket, setSocket] = useState<Socket | null>(null);
  useEffect(() => {
    if (!auth?.token) return;

    const s = io(`http://localhost:${process.env.PORT || 4100}`, {
      auth: { token: auth.token },
    });

    setSocket(s);

    return () => {
      s.disconnect();
      setSocket(null);
    };
  }, [auth?.token]);
  return socket;
}
