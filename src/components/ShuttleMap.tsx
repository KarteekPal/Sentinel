"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { ShuttleData } from "@/hooks/useShuttles";

interface Props {
  shuttles: ShuttleData[];
  stalledIds: Set<string>;
}

/* ── colour map ─────────────────────────────────────────── */
const COLOR: Record<string, string> = {
  "Blue Route": "#00e5ff",
  "Gold Route": "#ffd700",
  "Green Route": "#39ff14",
};

function hexToRgb(hex: string) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `${r},${g},${b}`;
}

/* ── Overlay marker positions projected from Leaflet map ── */
interface OverlayMarker {
  id: string;
  name: string;
  x: number;
  y: number;
  color: string;
  stalled: boolean;
  speed: number;
}

export default function ShuttleMap({ shuttles, stalledIds }: Props) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markersRef = useRef<Map<string, L.CircleMarker>>(new Map());
  const [mapReady, setMapReady] = useState(false);
  const [overlayMarkers, setOverlayMarkers] = useState<OverlayMarker[]>([]);
  const [containerSize, setContainerSize] = useState({ w: 0, h: 0 });

  /* ── init Leaflet ─────────────────────────────────────── */
  useEffect(() => {
    if (mapRef.current || !mapContainerRef.current) return;

    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const L = require("leaflet");
    require("leaflet/dist/leaflet.css");

    const map = L.map(mapContainerRef.current, {
      center: [39.7095, -75.1174],
      zoom: 15,
      zoomControl: true,
      attributionControl: false,
    });

    L.tileLayer(
      "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
      { maxZoom: 19 }
    ).addTo(map);

    mapRef.current = map;

    // Slight delay so tiles settle before we mark ready
    setTimeout(() => {
  setMapReady(true);
  try {
    map.panBy([1, 0], { animate: false });
    map.panBy([-1, 0], { animate: false });
  } catch (e) {
    // map not ready for pan yet, computeOverlays will fire on first data
  }
}, 600);

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  /* ── compute overlay positions ────────────────────────── */
  const computeOverlays = useCallback(() => {
    const map = mapRef.current;
    const container = mapContainerRef.current;
    if (!map || !container || shuttles.length === 0) return;

    const L = require("leaflet");
    const rect = container.getBoundingClientRect();
    setContainerSize({ w: rect.width, h: rect.height });

    const markers: OverlayMarker[] = shuttles.map((s) => {
      const point = map.latLngToContainerPoint(L.latLng(s.lat, s.lon));
      const color = COLOR[s.name] ?? "#00e5ff";
      return {
        id: s.id,
        name: s.name,
        x: point.x,
        y: point.y,
        color,
        stalled: stalledIds.has(s.id),
        speed: s.speed ?? 0,
      };
    });

    setOverlayMarkers(markers);
  }, [shuttles, stalledIds]);

  /* ── update markers on shuttle data change ────────────── */
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;

    const L = require("leaflet");

    shuttles.forEach((shuttle) => {
      const color = COLOR[shuttle.name] ?? "#00e5ff";
      const isStalled = stalledIds.has(shuttle.id);
      const existing = markersRef.current.get(shuttle.id);

      if (existing) {
        existing.setLatLng([shuttle.lat, shuttle.lon]);
        existing.setStyle({
          color: isStalled ? "#ff3b5c" : color,
          fillColor: isStalled ? "#ff3b5c" : color,
        });
        const el = existing.getElement() as HTMLElement | undefined;
if (el) {
  const glowColor = isStalled ? "#ff3b5c" : color;
  el.style.filter = `drop-shadow(0 0 6px ${glowColor}) drop-shadow(0 0 12px ${glowColor})`;
}
      } else {
        const marker = L.circleMarker([shuttle.lat, shuttle.lon], {
          radius: 8,
          fillColor: color,
          color: color,
          weight: 2,
          opacity: 0.9,
          fillOpacity: 0.85,
        }).addTo(map);                                    // line 137
setTimeout(() => {                                // line 138
  const el = marker.getElement() as HTMLElement | undefined;
  if (el) {
    el.style.filter = `drop-shadow(0 0 6px ${color}) drop-shadow(0 0 12px ${color})`;
  }
}, 100);

        marker.bindPopup(`
          <div style="font-family:monospace;font-size:12px;color:#e8f4f8">
            <b style="color:${color}">${shuttle.name} Shuttle</b><br/>
            Speed: ${shuttle.speed?.toFixed(1) ?? 0} mph<br/>
            Heading: ${shuttle.heading?.toFixed(0) ?? 0}°<br/>
            ${isStalled ? '<span style="color:#ff3b5c">⚠ STALLED</span>' : '<span style="color:#39ff14">● Active</span>'}
          </div>
        `);

        markersRef.current.set(shuttle.id, marker);
        setTimeout(() => {
  const el = marker.getElement();
  if (el) {
    el.style.filter = `drop-shadow(0 0 6px ${color}) drop-shadow(0 0 12px ${color})`;
    el.style.transition = "filter 0.3s ease";
  }
}, 100);
      }
    });

    // Recompute overlay positions after marker updates
    computeOverlays();
  }, [shuttles, stalledIds, mapReady, computeOverlays]);

  /* ── recompute overlays on map pan/zoom ──────────────── */
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;

    const update = () => computeOverlays();
    map.on("move", update);
    map.on("zoom", update);
    map.on("moveend", update);

    return () => {
      map.off("move", update);
      map.off("zoom", update);
      map.off("moveend", update);
    };
  }, [mapReady, computeOverlays]);

  /* ── window resize ────────────────────────────────────── */
  useEffect(() => {
    const observer = new ResizeObserver(() => computeOverlays());
    if (mapContainerRef.current) observer.observe(mapContainerRef.current);
    return () => observer.disconnect();
  }, [computeOverlays]);

  useEffect(() => {
    if (mapReady && shuttles.length > 0) {
      setTimeout(() => computeOverlays(), 100);
    }
  }, [mapReady, shuttles.length]);


  return (
    <div style={{ position: "relative", width: "100%", height: "100%" }}>
      {/* Leaflet map */}
      <div ref={mapContainerRef} style={{ width: "100%", height: "100%", borderRadius: 12 }} />

      {/* Framer Motion overlay — pulse rings + labels */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          pointerEvents: "none",
          overflow: "hidden",
          borderRadius: 12,
        }}
      >
        <AnimatePresence>
          {mapReady &&
            overlayMarkers.map((m) => (
              <MarkerOverlay key={m.id} marker={m} />
            ))}
        </AnimatePresence>
      </div>
    </div>
  );
}

/* ── per-marker overlay with Framer Motion rings ─────────── */
function MarkerOverlay({ marker }: { marker: OverlayMarker }) {
  const { x, y, color, stalled, name, speed } = marker;
  const rgb = hexToRgb(color);

  return (
    <motion.div
      key={marker.id}
      initial={{ opacity: 0, scale: 0.4 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.4 }}
      transition={{ type: "spring", stiffness: 280, damping: 22 }}
      style={{
        position: "absolute",
        left: x,
        top: y,
        transform: "translate(-50%, -50%)",
        pointerEvents: "none",
      }}
    >
      {/* Outer pulse ring — continuous */}
      <motion.div
        style={{
          position: "absolute",
          width: stalled ? 48 : 36,
          height: stalled ? 48 : 36,
          borderRadius: "50%",
          border: `1.5px solid ${color}`,
          top: "50%",
          left: "50%",
          x: "-50%",
          y: "-50%",
        }}
        animate={{
          scale: [1, stalled ? 2.4 : 1.9],
          opacity: [0.8, 0],
        }}
        transition={{
          duration: stalled ? 1.0 : 1.6,
          repeat: Infinity,
          ease: "easeOut",
        }}
      />

      {/* Second ring — offset phase for stalled */}
      {stalled && (
        <motion.div
          style={{
            position: "absolute",
            width: 48,
            height: 48,
            borderRadius: "50%",
            border: "1.5px solid #ff3b5c",
            top: "50%",
            left: "50%",
            x: "-50%",
            y: "-50%",
          }}
          animate={{ scale: [1, 2.2], opacity: [0.6, 0] }}
          transition={{ duration: 1.0, repeat: Infinity, delay: 0.4, ease: "easeOut" }}
        />
      )}

      {/* Inner dot — hidden, Leaflet handles the actual marker */}
      <div
        style={{
          width: 6,
          height: 6,
          borderRadius: "50%",
          background: stalled ? "#ff3b5c" : color,
          boxShadow: `0 0 8px 3px rgba(${stalled ? "255,59,92" : rgb},0.5)`,
          position: "absolute",
          top: "50%",
          left: "50%",
          transform: "translate(-50%,-50%)",
          opacity: 0, // leaflet circle marker is visible; this is just glow reference
        }}
      />

      {/* Floating label */}
      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3, duration: 0.4 }}
        style={{
          position: "absolute",
          top: stalled ? -38 : -30,
          left: "50%",
          transform: "translateX(-50%)",
          whiteSpace: "nowrap",
          background: "rgba(10,10,15,0.85)",
          border: `1px solid ${stalled ? "#ff3b5c" : color}`,
          borderRadius: 5,
          padding: "2px 7px",
          fontSize: 10,
          fontFamily: "var(--font-mono)",
          color: stalled ? "#ff3b5c" : color,
          letterSpacing: "0.08em",
        }}
      >
        {stalled ? `⚠ ${name}` : `${name} · ${speed.toFixed(0)}mph`}
      </motion.div>
    </motion.div>
  );
}