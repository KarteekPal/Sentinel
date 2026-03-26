"use client";

import { motion } from "framer-motion";

/* ── individual skeleton block ─────────────────────────── */
function Skel({
  className = "",
  style = {},
}: {
  className?: string;
  style?: React.CSSProperties;
}) {
  return <div className={`skeleton ${className}`} style={style} />;
}

/* ── Map skeleton ──────────────────────────────────────── */
export function MapSkeleton() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
      style={{
        width: "100%",
        height: "100%",
        background: "rgba(13,13,20,0.9)",
        borderRadius: 12,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 16,
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Fake grid lines */}
      {[...Array(6)].map((_, i) => (
        <div
          key={`h-${i}`}
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            top: `${(i + 1) * 14}%`,
            height: 1,
            background: "rgba(0,229,255,0.04)",
          }}
        />
      ))}
      {[...Array(8)].map((_, i) => (
        <div
          key={`v-${i}`}
          style={{
            position: "absolute",
            top: 0,
            bottom: 0,
            left: `${(i + 1) * 12}%`,
            width: 1,
            background: "rgba(0,229,255,0.04)",
          }}
        />
      ))}

      {/* Fake markers */}
      {[
        { top: "30%", left: "45%", color: "#00e5ff" },
        { top: "55%", left: "60%", color: "#ffd700" },
        { top: "45%", left: "30%", color: "#39ff14" },
      ].map((m, i) => (
        <motion.div
          key={i}
          style={{
            position: "absolute",
            top: m.top,
            left: m.left,
            width: 14,
            height: 14,
            borderRadius: "50%",
            background: m.color,
            opacity: 0.4,
          }}
          animate={{ scale: [1, 1.6, 1], opacity: [0.4, 0.8, 0.4] }}
          transition={{
            duration: 1.8,
            repeat: Infinity,
            delay: i * 0.5,
            ease: "easeInOut",
          }}
        />
      ))}

      {/* Center label */}
      <motion.div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 10,
          zIndex: 2,
        }}
        animate={{ opacity: [0.5, 1, 0.5] }}
        transition={{ duration: 2, repeat: Infinity }}
      >
        <svg width="36" height="36" viewBox="0 0 36 36" fill="none">
          <circle
            cx="18"
            cy="18"
            r="16"
            stroke="#00e5ff"
            strokeWidth="1.5"
            strokeDasharray="4 4"
          />
          <circle cx="18" cy="18" r="4" fill="#00e5ff" opacity="0.6" />
        </svg>
        <span
          style={{
            fontSize: 11,
            letterSpacing: "0.2em",
            color: "rgba(0,229,255,0.5)",
            fontFamily: "var(--font-mono)",
          }}
        >
          ACQUIRING SIGNAL...
        </span>
      </motion.div>
    </motion.div>
  );
}

/* ── Sidebar skeleton ──────────────────────────────────── */
export function FleetSidebarSkeleton() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      style={{ display: "flex", flexDirection: "column", gap: 10 }}
    >
      {[...Array(3)].map((_, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: i * 0.12, duration: 0.35 }}
          style={{
            background: "rgba(13,13,20,0.7)",
            border: "1px solid rgba(0,229,255,0.08)",
            borderRadius: 10,
            padding: "14px 16px",
            display: "flex",
            flexDirection: "column",
            gap: 10,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <Skel
              className="skeleton-block"
              style={{ width: 32, height: 32, borderRadius: "50%", flexShrink: 0 }}
            />
            <div style={{ flex: 1 }}>
              <Skel className="skeleton-text" style={{ width: "60%", height: 11 }} />
              <Skel className="skeleton-text" style={{ width: "40%", height: 9, marginBottom: 0 }} />
            </div>
            <Skel
              className="skeleton-block"
              style={{ width: 48, height: 18, borderRadius: 4 }}
            />
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <Skel style={{ flex: 1, height: 28, borderRadius: 6 }} />
            <Skel style={{ flex: 1, height: 28, borderRadius: 6 }} />
          </div>
        </motion.div>
      ))}
    </motion.div>
  );
}

/* ── Stat card skeleton ────────────────────────────────── */
export function StatCardSkeleton() {
  return (
    <div
      style={{
        background: "rgba(13,13,20,0.7)",
        border: "1px solid rgba(0,229,255,0.08)",
        borderRadius: 10,
        padding: "12px 16px",
      }}
    >
      <Skel className="skeleton-text" style={{ width: "45%", height: 9, marginBottom: 10 }} />
      <Skel className="skeleton-text" style={{ width: "65%", height: 22, marginBottom: 0 }} />
    </div>
  );
}