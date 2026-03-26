"use client";

import dynamic from "next/dynamic";
import { useShuttles } from "@/hooks/useShuttles";
import { Toaster } from "sonner";

const ShuttleMap = dynamic(() => import("@/components/ShuttleMap"), {
  ssr: false,
  loading: () => (
    <div
      style={{
        position: "absolute",
        inset: 0,
        background: "#0a0a0f",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: "#00e5ff",
        fontFamily: "monospace",
        fontSize: "14px",
        letterSpacing: "0.1em",
      }}
    >
      INITIALIZING MAP SYSTEMS...
    </div>
  ),
});

export default function CommandCenter() {
  const { shuttles, stalls, isConnected, isMock, lastUpdate } = useShuttles();
  const stalledCount = stalls.filter(
    (s) => Date.now() - new Date(s.timestamp).getTime() < 5 * 60 * 1000
  ).length;

  return (
    <div
      style={{
        height: "100vh",
        width: "100vw",
        background: "#0a0a0f",
        color: "#ffffff",
        fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
      }}
    >
      <Toaster position="top-right" richColors />

      {/* Header */}
      <div
        style={{
          padding: "12px 20px",
          borderBottom: "1px solid rgba(0,229,255,0.15)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          background: "rgba(0,229,255,0.03)",
          backdropFilter: "blur(10px)",
          zIndex: 100,
          flexShrink: 0,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <div
            style={{
              width: "32px",
              height: "32px",
              background: "linear-gradient(135deg, #00e5ff, #0066ff)",
              borderRadius: "8px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "16px",
            }}
          >
            ⬡
          </div>
          <div>
            <div style={{ fontSize: "16px", fontWeight: 700, letterSpacing: "0.15em" }}>
              SENTINEL
            </div>
            <div style={{ fontSize: "10px", color: "#00e5ff88", letterSpacing: "0.2em" }}>
              CAMPUS TRANSIT INTELLIGENCE
            </div>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              padding: "4px 12px",
              borderRadius: "20px",
              border: `1px solid ${isConnected ? "#00e5ff44" : "#ff000044"}`,
              background: isConnected ? "#00e5ff11" : "#ff000011",
              fontSize: "11px",
              letterSpacing: "0.15em",
            }}
          >
            <div
              style={{
                width: "6px",
                height: "6px",
                borderRadius: "50%",
                background: isConnected ? "#00e5ff" : "#ff0000",
                boxShadow: isConnected ? "0 0 8px #00e5ff" : "0 0 8px #ff0000",
                animation: isConnected ? "pulse 2s infinite" : "none",
              }}
            />
            {isConnected ? "LIVE" : "OFFLINE"}
          </div>

          {isMock && (
            <div
              style={{
                padding: "4px 10px",
                borderRadius: "20px",
                border: "1px solid #ffd70044",
                background: "#ffd70011",
                fontSize: "10px",
                color: "#ffd700",
                letterSpacing: "0.12em",
              }}
            >
              SIMULATION MODE
            </div>
          )}

          {lastUpdate && (
            <div style={{ fontSize: "10px", color: "#ffffff44", letterSpacing: "0.1em" }}>
              UPDATED {new Date(lastUpdate).toLocaleTimeString()}
            </div>
          )}
        </div>

        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: "10px", color: "#ffffff44", letterSpacing: "0.15em" }}>
            SYSTEM
          </div>
          <div style={{ fontSize: "14px", color: "#00e5ff", fontWeight: 600 }}>
            RWU-1068
          </div>
        </div>
      </div>

      {/* Stats Bar */}
      <div
        style={{
          display: "flex",
          gap: "1px",
          flexShrink: 0,
          background: "rgba(0,229,255,0.05)",
          borderBottom: "1px solid rgba(0,229,255,0.1)",
        }}
      >
        {[
          { label: "ACTIVE SHUTTLES", value: shuttles.length, accent: "#00e5ff" },
          { label: "STALLED", value: stalledCount, accent: stalledCount > 0 ? "#ff6b35" : "#00e5ff" },
          { label: "ROUTES", value: new Set(shuttles.map((s) => s.route)).size, accent: "#00e5ff" },
          { label: "SYSTEM ID", value: "1068", accent: "#00e5ff88" },
        ].map((stat) => (
          <div
            key={stat.label}
            style={{
              flex: 1,
              padding: "10px 16px",
              borderRight: "1px solid rgba(0,229,255,0.08)",
            }}
          >
            <div style={{ fontSize: "9px", color: "#ffffff44", letterSpacing: "0.2em", marginBottom: "2px" }}>
              {stat.label}
            </div>
            <div style={{ fontSize: "20px", fontWeight: 700, color: stat.accent }}>
              {stat.value}
            </div>
          </div>
        ))}
      </div>

      {/* Main */}
      <div style={{ flex: 1, display: "flex", overflow: "hidden", position: "relative" }}>
        <div style={{ flex: 1, position: "relative" }}>
          <ShuttleMap shuttles={shuttles} />
        </div>

        {/* Sidebar */}
        <div
          style={{
            width: "280px",
            borderLeft: "1px solid rgba(0,229,255,0.1)",
            background: "rgba(0,0,0,0.6)",
            backdropFilter: "blur(20px)",
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
            flexShrink: 0,
          }}
        >
          <div
            style={{
              padding: "12px 16px",
              borderBottom: "1px solid rgba(0,229,255,0.1)",
              fontSize: "10px",
              letterSpacing: "0.2em",
              color: "#00e5ff88",
            }}
          >
            ACTIVE FLEET
          </div>

          <div style={{ flex: 1, overflowY: "auto", padding: "8px" }}>
            {shuttles.length === 0 ? (
              <div
                style={{
                  padding: "24px 16px",
                  color: "#ffffff33",
                  fontSize: "12px",
                  lineHeight: 1.6,
                  textAlign: "center",
                }}
              >
                <div style={{ fontSize: "24px", marginBottom: "8px" }}>🚌</div>
                <div>No shuttles active.</div>
                <div style={{ marginTop: "4px", fontSize: "10px", color: "#ffffff22" }}>
                  Service runs 7AM–11PM
                </div>
              </div>
            ) : (
              shuttles.map((shuttle) => {
                const isStalled = stalls.some(
                  (s) =>
                    s.shuttleId === shuttle.id &&
                    Date.now() - new Date(s.timestamp).getTime() < 5 * 60 * 1000
                );
                return (
                  <div
                    key={shuttle.id}
                    style={{
                      padding: "10px 12px",
                      marginBottom: "4px",
                      borderRadius: "8px",
                      border: `1px solid ${isStalled ? "#ff6b3522" : "rgba(0,229,255,0.08)"}`,
                      background: isStalled ? "rgba(255,107,53,0.05)" : "rgba(0,229,255,0.03)",
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <div style={{ fontSize: "12px", fontWeight: 600, color: shuttle.color ?? "#00e5ff" }}>
                        {shuttle.name}
                      </div>
                      {isStalled && (
                        <span style={{ fontSize: "9px", color: "#ff6b35", letterSpacing: "0.1em" }}>
                          STALLED
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: "10px", color: "#ffffff44", marginTop: "2px" }}>
                      Route {shuttle.route}
                    </div>
                    <div style={{ fontSize: "9px", color: "#ffffff22", marginTop: "4px", fontFamily: "monospace" }}>
                      {shuttle.lat.toFixed(5)}, {shuttle.lon.toFixed(5)}
                    </div>
                    {shuttle.speed !== undefined && (
                      <div style={{ fontSize: "9px", color: "#ffffff33", marginTop: "2px" }}>
                        {Math.round(shuttle.speed)} mph
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>

          {stalls.length > 0 && (
            <>
              <div
                style={{
                  padding: "10px 16px",
                  borderTop: "1px solid rgba(255,107,53,0.2)",
                  borderBottom: "1px solid rgba(255,107,53,0.1)",
                  fontSize: "10px",
                  letterSpacing: "0.2em",
                  color: "#ff6b3588",
                }}
              >
                STALL EVENTS
              </div>
              <div style={{ padding: "8px", maxHeight: "160px", overflowY: "auto" }}>
                {stalls.slice(0, 3).map((s, i) => (
                  <div
                    key={i}
                    style={{
                      padding: "8px 10px",
                      marginBottom: "4px",
                      borderRadius: "6px",
                      background: "rgba(255,107,53,0.05)",
                      border: "1px solid rgba(255,107,53,0.15)",
                      fontSize: "10px",
                    }}
                  >
                    <div style={{ color: "#ff6b35", fontWeight: 600 }}>{s.name}</div>
                    <div style={{ color: "#ffffff44", marginTop: "2px" }}>
                      {s.stallDurationMin}min · {new Date(s.timestamp).toLocaleTimeString()}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      <style jsx global>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
      `}</style>
    </div>
  );
}