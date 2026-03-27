"use client";

import { useEffect, useState, useRef } from "react";
import dynamic from "next/dynamic";
import { motion, AnimatePresence } from "framer-motion";
import { Toaster } from "sonner";
import { useShuttles } from "@/hooks/useShuttles";
import {
  MapSkeleton,
  FleetSidebarSkeleton,
  StatCardSkeleton,
} from "@/components/SkeletonLoader";

/* lazy-load the map (Leaflet is client-only) */
const ShuttleMap = dynamic(() => import("@/components/ShuttleMap"), {
  ssr: false,
  loading: () => <MapSkeleton />,
});

/* ── colour map ─────────────────────────────────────────── */
const COLOR: Record<string, string> = {
  "Blue Route": "#00e5ff",
  "Gold Route": "#ffd700",
  "Green Route": "#39ff14",
};

/* ── animation variants ─────────────────────────────────── */
const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.08, duration: 0.45, ease: [0.22, 1, 0.36, 1] },
  }),
};

const scaleIn = {
  hidden: { opacity: 0, scale: 0.88 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] },
  },
};

/* ── StatCard ────────────────────────────────────────────── */
function StatCard({
  label,
  value,
  accent = "#00e5ff",
  flash = false,
  index = 0,
}: {
  label: string;
  value: string | number;
  accent?: string;
  flash?: boolean;
  index?: number;
}) {
  return (
    <motion.div
      custom={index}
      variants={fadeUp}
      initial="hidden"
      animate="visible"
      className={`glass-card stat-card-shimmer${flash ? " alert-flash" : ""}`}
      style={{
        padding: "14px 18px",
        borderColor: `rgba(${accent === "#00e5ff" ? "0,229,255" : accent === "#ffd700" ? "255,215,0" : "57,255,20"},0.12)`,
      }}
    >
      <div
        style={{
          fontSize: 9,
          letterSpacing: "0.18em",
          color: "var(--text-muted)",
          marginBottom: 6,
          textTransform: "uppercase",
        }}
      >
        {label}
      </div>
      <motion.div
        key={String(value)}
        initial={{ opacity: 0.4, y: 4 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        style={{
          fontSize: 22,
          fontWeight: 700,
          color: accent,
          fontFamily: "var(--font-mono)",
          lineHeight: 1.1,
        }}
      >
        {value}
      </motion.div>
    </motion.div>
  );
}

/* ── FleetCard ───────────────────────────────────────────── */
function FleetCard({
  shuttle,
  isStalled,
  index,
  eta,
}: {
  shuttle: any;
  isStalled: boolean;
  index: number;
  eta?: number;
}) {
  const color = COLOR[shuttle.name] ?? "#00e5ff";

  return (
    <motion.div
      custom={index}
      variants={fadeUp}
      initial="hidden"
      animate="visible"
      className="glass-card"
      style={{
        padding: "14px 16px",
        borderColor: isStalled
          ? "rgba(255,59,92,0.25)"
          : `rgba(0,229,255,0.1)`,
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Left accent bar */}
      <div
        style={{
          position: "absolute",
          left: 0,
          top: 0,
          bottom: 0,
          width: 3,
          background: isStalled ? "#ff3b5c" : color,
          borderRadius: "12px 0 0 12px",
        }}
      />

      <div style={{ paddingLeft: 10 }}>
        {/* Header row */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 10,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <motion.div
              style={{
                width: 10,
                height: 10,
                borderRadius: "50%",
                background: isStalled ? "#ff3b5c" : color,
                boxShadow: `0 0 8px ${isStalled ? "#ff3b5c" : color}`,
              }}
              animate={
                isStalled
                  ? { scale: [1, 1.5, 1], opacity: [1, 0.5, 1] }
                  : { scale: [1, 1.2, 1] }
              }
              transition={{ duration: isStalled ? 0.8 : 2, repeat: Infinity }}
            />
            <span
              style={{
                fontSize: 13,
                fontWeight: 700,
                color: isStalled ? "#ff3b5c" : color,
                letterSpacing: "0.05em",
              }}
            >
              {shuttle.name}
            </span>
          </div>

          <span
            style={{
              fontSize: 9,
              letterSpacing: "0.12em",
              padding: "2px 8px",
              borderRadius: 4,
              border: `1px solid ${isStalled ? "rgba(255,59,92,0.4)" : "rgba(0,229,255,0.2)"}`,
              color: isStalled ? "#ff3b5c" : "var(--text-muted)",
              background: isStalled
                ? "rgba(255,59,92,0.08)"
                : "transparent",
            }}
          >
            {isStalled ? "STALLED" : "ACTIVE"}
          </span>
        </div>

        {/* Metrics grid */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 8,
          }}
        >
          {[
            { label: "SPEED", value: `${(shuttle.speed ?? 0).toFixed(1)} mph` },
            { label: "ETA", value: eta !== undefined ? `~${eta} min` : "—" },
            { label: "LAT", value: shuttle.lat?.toFixed(4) ?? "—" },
            { label: "LNG", value: shuttle.lon?.toFixed(4) ?? "—" },
          ].map((m) => (
            <div
              key={m.label}
              style={{
                background: "rgba(0,0,0,0.3)",
                borderRadius: 6,
                padding: "6px 10px",
              }}
            >
              <div
                style={{
                  fontSize: 8,
                  color: "var(--text-muted)",
                  letterSpacing: "0.14em",
                  marginBottom: 3,
                }}
              >
                {m.label}
              </div>
              <div
                style={{
                  fontSize: 12,
                  color: "var(--text-primary)",
                  fontFamily: "var(--font-mono)",
                }}
              >
                {m.value}
              </div>
            </div>
          ))}
        </div>
      </div>
    </motion.div>
  );
}

/* ── StallEvent card ─────────────────────────────────────── */
function StallEventCard({ event, index }: { event: any; index: number }) {
  const age = Date.now() - event.timestamp;
  const mins = Math.floor(age / 60000);
  const isNew = age < 15000;

  return (
    <motion.div
      custom={index}
      variants={fadeUp}
      initial="hidden"
      animate="visible"
      className={`glass-card${isNew ? " alert-flash" : ""}`}
      style={{
        padding: "12px 14px",
        borderColor: "rgba(255,59,92,0.2)",
        fontSize: 11,
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          marginBottom: 6,
        }}
      >
        <span style={{ color: "#ff3b5c", fontWeight: 700, letterSpacing: "0.06em" }}>
          ⚠ {event.name}
        </span>
        <span style={{ color: "var(--text-muted)", fontSize: 10 }}>
          {mins < 1 ? "just now" : `${mins}m ago`}
        </span>
      </div>
      {event.aiAlert ? (
        <>
          <div style={{ color: "var(--text-muted)", fontSize: 10, marginBottom: 4 }}>
            {event.aiAlert.summary}
          </div>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            <span
              style={{
                fontSize: 9,
                padding: "2px 7px",
                borderRadius: 4,
                background: "rgba(255,59,92,0.1)",
                border: "1px solid rgba(255,59,92,0.25)",
                color: "#ff3b5c",
                letterSpacing: "0.08em",
              }}
            >
              {event.aiAlert.severity?.toUpperCase()}
            </span>
            <span
              style={{
                fontSize: 9,
                padding: "2px 7px",
                borderRadius: 4,
                background: "rgba(0,229,255,0.06)",
                border: "1px solid rgba(0,229,255,0.18)",
                color: "var(--cyan)",
                letterSpacing: "0.08em",
              }}
            >
              {event.aiAlert.likelyCause}
            </span>
          </div>
          {event.aiAlert.recommendation && (
            <div
              style={{
                marginTop: 6,
                padding: "6px 8px",
                background: "rgba(0,229,255,0.04)",
                borderRadius: 5,
                fontSize: 10,
                color: "rgba(0,229,255,0.7)",
                borderLeft: "2px solid rgba(0,229,255,0.25)",
              }}
            >
              {event.aiAlert.recommendation}
            </div>
          )}
        </>
      ) : (
        <div style={{ color: "var(--text-muted)", fontSize: 10, display: "flex", alignItems: "center", gap: 6 }}>
          <motion.div
            style={{ width: 6, height: 6, borderRadius: "50%", background: "#00e5ff" }}
            animate={{ opacity: [1, 0.2, 1] }}
            transition={{ duration: 1, repeat: Infinity }}
          />
          AI analysis in progress…
        </div>
      )}
    </motion.div>
  );
}

/* ════════════════════════════════════════════════════════ */
/*  PAGE                                                    */
/* ════════════════════════════════════════════════════════ */
export default function CommandCenter() {
  const {
    shuttles,
    stalls: stallEvents,
    isConnected: connected,
    lastUpdate: lastUpdated,
    isMock: simMode,
  } = useShuttles();
  const [hydrated, setHydrated] = useState(false);
  const [shuttleEtas, setShuttleEtas] = useState<Record<string, number>>({});
  const stalledIds = new Set(stallEvents.map((e) => e.shuttleId));

  useEffect(() => {
    // small delay so skeletons flash briefly even on fast loads
    const t = setTimeout(() => setHydrated(true), 800);
    return () => clearTimeout(t);
  }, []);

  const avgSpeed =
    shuttles.length > 0
      ? (
          shuttles.reduce((s, sh) => s + (sh.speed ?? 0), 0) / shuttles.length
        ).toFixed(1)
      : "—";

  const uptimeLabel = connected ? "NOMINAL" : "DEGRADED";

  return (
    <>
      <div className="scanlines" />
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            background: "rgba(13,13,20,0.95)",
            border: "1px solid rgba(0,229,255,0.2)",
            color: "#e8f4f8",
            fontFamily: "var(--font-mono)",
            fontSize: 12,
          },
        }}
      />

      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          background: "var(--bg-base)",
          padding: "0 0 16px",
        }}
      >
        {/* ─── HEADER ─────────────────────────────────────── */}
        <motion.header
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          style={{
            background: "rgba(13,13,20,0.85)",
            backdropFilter: "blur(20px)",
            borderBottom: "1px solid var(--border-dim)",
            padding: "14px 24px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            position: "sticky",
            top: 0,
            zIndex: 100,
          }}
        >
          {/* Brand */}
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <motion.div
              animate={{ rotate: [0, 360] }}
              transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
              style={{
                width: 32,
                height: 32,
                borderRadius: "50%",
                border: "2px solid var(--cyan)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: "0 0 12px var(--cyan-glow)",
              }}
            >
              <div
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: "50%",
                  background: "var(--cyan)",
                }}
              />
            </motion.div>

            <div>
              <div
                style={{
                  fontSize: 15,
                  fontWeight: 800,
                  letterSpacing: "0.22em",
                  color: "var(--cyan)",
                  textShadow: "0 0 16px rgba(0,229,255,0.5)",
                }}
              >
                SENTINEL
              </div>
              <div
                style={{
                  fontSize: 9,
                  color: "var(--text-muted)",
                  letterSpacing: "0.16em",
                }}
              >
                ROWAN TRANSIT INTELLIGENCE
              </div>
            </div>
          </div>

          {/* Badges */}
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            {simMode && (
              <motion.span
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                style={{
                  fontSize: 9,
                  letterSpacing: "0.15em",
                  padding: "3px 10px",
                  borderRadius: 4,
                  border: "1px solid rgba(255,215,0,0.35)",
                  background: "rgba(255,215,0,0.06)",
                  color: "#ffd700",
                }}
              >
                SIMULATION
              </motion.span>
            )}

            <motion.div
              className={connected ? "border-glow-active" : ""}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                padding: "4px 12px",
                borderRadius: 5,
                border: "1px solid",
                borderColor: connected
                  ? "rgba(57,255,20,0.3)"
                  : "rgba(255,59,92,0.3)",
                background: connected
                  ? "rgba(57,255,20,0.06)"
                  : "rgba(255,59,92,0.06)",
                fontSize: 10,
                letterSpacing: "0.12em",
                color: connected ? "#39ff14" : "#ff3b5c",
              }}
            >
              <motion.div
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: "50%",
                  background: connected ? "#39ff14" : "#ff3b5c",
                }}
                animate={{ opacity: connected ? [1, 0.4, 1] : 1 }}
                transition={{ duration: 1.5, repeat: Infinity }}
              />
              {connected ? "LIVE" : "OFFLINE"}
            </motion.div>

            {lastUpdated && (
              <span
                style={{
                  fontSize: 9,
                  color: "var(--text-muted)",
                  letterSpacing: "0.08em",
                }}
              >
                {new Date(lastUpdated).toLocaleTimeString()}
              </span>
            )}
          </div>
        </motion.header>

        {/* ─── STAT BAR ───────────────────────────────────── */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(4, 1fr)",
            gap: 10,
            padding: "14px 24px 0",
          }}
        >
          {hydrated ? (
            <>
              <StatCard label="Shuttles Active" value={shuttles.length} index={0} />
              <StatCard
                label="Stall Alerts"
                value={stallEvents.length}
                accent="#ff3b5c"
                flash={stallEvents.length > 0}
                index={1}
              />
              <StatCard label="Avg Speed" value={`${avgSpeed} mph`} index={2} />
              <StatCard
                label="System Status"
                value={uptimeLabel}
                accent={connected ? "#39ff14" : "#ff3b5c"}
                index={3}
              />
            </>
          ) : (
            [...Array(4)].map((_, i) => <StatCardSkeleton key={i} />)
          )}
        </div>

        {/* ─── BENTO GRID ─────────────────────────────────── */}
        <div
          style={{
            flex: 1,
            display: "grid",
            gridTemplateColumns: "1fr 300px",
            gridTemplateRows: "1fr auto",
            gap: 12,
            padding: "12px 24px 0",
            minHeight: 0,
          }}
        >
          {/* MAP — spans 2 rows on left */}
          <motion.div
            variants={scaleIn}
            initial="hidden"
            animate="visible"
            className="glass-card"
            style={{
              gridColumn: 1,
              gridRow: "1 / 3",
              minHeight: 480,
              overflow: "hidden",
              position: "relative",
            }}
          >
            {/* Map corner label */}
            <div
              style={{
                position: "absolute",
                top: 12,
                left: 12,
                zIndex: 500,
                fontSize: 9,
                letterSpacing: "0.15em",
                color: "rgba(0,229,255,0.6)",
                background: "rgba(10,10,15,0.7)",
                padding: "3px 8px",
                borderRadius: 4,
                border: "1px solid rgba(0,229,255,0.15)",
                pointerEvents: "none",
              }}
            >
              LIVE MAP · ROWAN UNIVERSITY
            </div>
            <ShuttleMap shuttles={shuttles} stalledIds={stalledIds} />
          </motion.div>

          {/* FLEET SIDEBAR — top right */}
          <div
            style={{
              gridColumn: 2,
              gridRow: 1,
              display: "flex",
              flexDirection: "column",
              gap: 10,
              overflowY: "auto",
              maxHeight: 520,
            }}
          >
            <div
              style={{
                fontSize: 9,
                letterSpacing: "0.18em",
                color: "var(--text-muted)",
                paddingBottom: 4,
                borderBottom: "1px solid var(--border-dim)",
              }}
            >
              ACTIVE FLEET
            </div>

            <AnimatePresence mode="wait">
              {!hydrated ? (
                <FleetSidebarSkeleton key="skel" />
              ) : (
                <motion.div
                  key="fleet"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  style={{ display: "flex", flexDirection: "column", gap: 10 }}
                >
                  {shuttles.map((s, i) => (
                    <FleetCard
                      key={s.id}
                      shuttle={s}
                      isStalled={stalledIds.has(s.id)}
                      index={i}
                      eta={shuttleEtas[s.id]}
                    />
                  ))}
                  {shuttles.length === 0 && (
                    <div
                      style={{
                        textAlign: "center",
                        color: "var(--text-muted)",
                        fontSize: 11,
                        padding: "32px 0",
                      }}
                    >
                      No shuttles detected
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* STALL EVENTS PANEL — bottom right */}
          <div
            style={{
              gridColumn: 2,
              gridRow: 2,
              display: "flex",
              flexDirection: "column",
              gap: 10,
              overflowY: "auto",
              maxHeight: 280,
            }}
          >
            <div
              style={{
                fontSize: 9,
                letterSpacing: "0.18em",
                color: "var(--text-muted)",
                paddingBottom: 4,
                borderBottom: "1px solid var(--border-dim)",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <span>STALL EVENTS</span>
              {stallEvents.length > 0 && (
                <motion.span
                  animate={{ opacity: [1, 0.3, 1] }}
                  transition={{ duration: 1.2, repeat: Infinity }}
                  style={{
                    fontSize: 8,
                    color: "#ff3b5c",
                    letterSpacing: "0.12em",
                  }}
                >
                  ● ALERT
                </motion.span>
              )}
            </div>

            <AnimatePresence>
              {stallEvents.length === 0 ? (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  style={{
                    textAlign: "center",
                    color: "var(--text-muted)",
                    fontSize: 11,
                    padding: "20px 0",
                  }}
                >
                  All clear · No stall events
                </motion.div>
              ) : (
                stallEvents.map((e, i) => (
                  <StallEventCard key={e.shuttleId + e.timestamp} event={e} index={i} />
                ))
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </>
  );
}