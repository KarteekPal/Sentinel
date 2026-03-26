"use client";

import { useEffect, useRef, useState } from "react";
import { io, Socket } from "socket.io-client";
import { toast } from "sonner";

export interface ShuttleData {
  id: string;
  name: string;
  route: string;
  lat: number;
  lon: number;
  speed?: number;
  heading?: number;
  color?: string;
  isMock?: boolean;
}

export interface GeminiAlert {
  summary: string;
  likelyCause: string;
  severity: "low" | "medium" | "high";
  recommendation: string;
}

export interface StallEvent {
  shuttleId: string;
  name: string;
  route: string;
  lat: number;
  lon: number;
  stallDurationMs: number;
  stallDurationMin: number;
  timestamp: string;
  aiAlert?: GeminiAlert;
}

export interface SystemMeta {
  count: number;
  isMock: boolean;
  timestamp: number;
}

export interface ShuttleState {
  shuttles: ShuttleData[];
  stalls: StallEvent[];
  isConnected: boolean;
  isMock: boolean;
  lastUpdate: number | null;
}

const SOCKET_URL =
  process.env.NEXT_PUBLIC_SOCKET_URL ?? "http://localhost:3001";

const SEVERITY_COLORS = {
  low: "#00e5ff",
  medium: "#ffd700",
  high: "#ff6b35",
};

export function useShuttles(): ShuttleState {
  const [shuttles, setShuttles] = useState<ShuttleData[]>([]);
  const [stalls, setStalls] = useState<StallEvent[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [isMock, setIsMock] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<number | null>(null);
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    const socket = io(SOCKET_URL, {
      transports: ["websocket"],
      reconnectionDelay: 1000,
      reconnectionAttempts: Infinity,
    });
    socketRef.current = socket;

    socket.on("connect", () => {
      setIsConnected(true);
    });

    socket.on("disconnect", () => {
      setIsConnected(false);
    });

    socket.on("shuttle:update", (data: ShuttleData[]) => {
      setShuttles(data);
      setLastUpdate(Date.now());
    });

    socket.on("shuttle:meta", (meta: SystemMeta) => {
      setIsMock(meta.isMock);
    });

    // Initial stall toast — fires immediately
    socket.on("shuttle:stall", (event: StallEvent) => {
      setStalls((prev) => [event, ...prev].slice(0, 10));
      toast.warning(`⚠️ ${event.name} stalled`, {
        description: `Route ${event.route} · ${event.stallDurationMin}min stationary · AI analysis running...`,
        duration: 6000,
        style: {
          background: "#1a1a2e",
          border: "1px solid #ff6b35",
          color: "#ffffff",
        },
      });
    });

    // AI-enriched toast — fires ~2s later when Gemini responds
    socket.on(
      "shuttle:stall:ai",
      (data: { shuttleId: string; aiAlert: GeminiAlert; timestamp: string }) => {
        const { aiAlert, shuttleId } = data;
        const color = SEVERITY_COLORS[aiAlert.severity];

        // Update stall record with AI data
        setStalls((prev) =>
          prev.map((s) =>
            s.shuttleId === shuttleId ? { ...s, aiAlert } : s
          )
        );

        toast.error(`🤖 AI Alert · ${aiAlert.severity.toUpperCase()} severity`, {
          description: `${aiAlert.likelyCause}\n\n💡 ${aiAlert.recommendation}`,
          duration: 12000,
          style: {
            background: "#0d0d1a",
            border: `1px solid ${color}`,
            color: "#ffffff",
            whiteSpace: "pre-line",
          },
        });
      }
    );

    return () => {
      socket.disconnect();
    };
  }, []);

  return { shuttles, stalls, isConnected, isMock, lastUpdate };
}