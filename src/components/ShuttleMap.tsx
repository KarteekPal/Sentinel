"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { ShuttleData } from "@/hooks/useShuttles";

interface Props {
  shuttles: ShuttleData[];
  stalledIds: Set<string>;
  onEtaUpdate?: (etas: Record<string, number>) => void;
}

/* ── colour map ─────────────────────────────────────────── */
const COLOR: Record<string, string> = {
  "Blue Route": "#00e5ff",
  "Gold Route": "#ffd700",
  "Green Route": "#39ff14",
};

/* ── Route waypoints (mirrors mockData.ts) ──────────────── */
const ROUTES: Record<string, { waypoints: [number, number][]; stops: { name: string; lat: number; lon: number }[] }> = {
  "Blue Route": {
    waypoints: [
      [39.7107, -75.1263], [39.7115, -75.1255], [39.7122, -75.1240],
      [39.7130, -75.1228], [39.7125, -75.1215], [39.7118, -75.1220],
      [39.7110, -75.1235], [39.7098, -75.1248], [39.7090, -75.1260],
      [39.7095, -75.1272], [39.7105, -75.1275], [39.7107, -75.1263],
    ],
    stops: [
      { name: "Rowan Hall", lat: 39.7107, lon: -75.1263 },
      { name: "Engineering Hall", lat: 39.7130, lon: -75.1228 },
      { name: "Bozorth Hall", lat: 39.7090, lon: -75.1260 },
    ],
  },
  "Gold Route": {
    waypoints: [
      [39.7095, -75.1280], [39.7085, -75.1268], [39.7078, -75.1255],
      [39.7082, -75.1240], [39.7092, -75.1232], [39.7102, -75.1238],
      [39.7112, -75.1250], [39.7108, -75.1265], [39.7098, -75.1275],
      [39.7095, -75.1280],
    ],
    stops: [
      { name: "Rowan Pond", lat: 39.7095, lon: -75.1280 },
      { name: "Student Center", lat: 39.7092, lon: -75.1232 },
      { name: "Library", lat: 39.7112, lon: -75.1250 },
    ],
  },
  "Green Route": {
    waypoints: [
      [39.7120, -75.1290], [39.7128, -75.1278], [39.7135, -75.1265],
      [39.7140, -75.1250], [39.7135, -75.1235], [39.7125, -75.1230],
      [39.7115, -75.1242], [39.7110, -75.1258], [39.7115, -75.1275],
      [39.7120, -75.1290],
    ],
    stops: [
      { name: "Mullica Hill Rd", lat: 39.7120, lon: -75.1290 },
      { name: "Science Hall", lat: 39.7140, lon: -75.1250 },
      { name: "Recreation Center", lat: 39.7110, lon: -75.1258 },
    ],
  },
};

/* ── haversine distance (meters) ────────────────────────── */
function haversine(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/* ── find nearest stop and compute ETA (minutes) ────────── */
function computeEta(shuttle: ShuttleData): { stopName: string; etaMin: number } {
  const route = ROUTES[shuttle.name];
  if (!route) return { stopName: "Unknown", etaMin: 0 };

  let nearest = route.stops[0];
  let minDist = Infinity;
  for (const stop of route.stops) {
    const d = haversine(shuttle.lat, shuttle.lon, stop.lat, stop.lon);
    if (d < minDist) { minDist = d; nearest = stop; }
  }

  const speedMs = ((shuttle.speed ?? 15) * 1609.34) / 3600; // mph → m/s
  const etaSec = speedMs > 0 ? minDist / speedMs : 0;
  return { stopName: nearest.name, etaMin: Math.ceil(etaSec / 60) };
}

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
  etaMin: number;
  stopName: string;
}

export default function ShuttleMap({ shuttles, stalledIds, onEtaUpdate }: Props) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markersRef = useRef<Map<string, L.CircleMarker>>(new Map());
  const routeLinesRef = useRef<Map<string, L.Polyline>>(new Map());
  const stopMarkersRef = useRef<L.CircleMarker[]>([]);
  const routesDrawnRef = useRef(false);
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
      } catch (e) {}

      /* ── draw route polylines + stops ─────────────────── */
      if (!routesDrawnRef.current) {
        routesDrawnRef.current = true;
        Object.entries(ROUTES).forEach(([routeName, route]) => {
          const color = COLOR[routeName] ?? "#00e5ff";

          L.polyline(route.waypoints, {
            color,
            weight: 2,
            opacity: 0.35,
            dashArray: "6 8",
          }).addTo(map);

          route.stops.forEach((stop) => {
  try {
    const stopMarker = L.circleMarker([stop.lat, stop.lon], {
      radius: 5,
      fillColor: "#0a0a0f",
      color,
      weight: 2,
      opacity: 0.9,
      fillOpacity: 1,
    }).addTo(map);
    stopMarker.bindPopup(`
      <div style="font-family:monospace;font-size:11px;color:#e8f4f8">
        <b style="color:${color}">🚏 ${stop.name}</b><br/>
        <span style="color:#888">${routeName}</span>
      </div>
    `);
    stopMarkersRef.current.push(stopMarker);
  } catch (e) {
    console.warn("Stop marker failed:", e);
  }
});
        });
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
      const { etaMin, stopName } = computeEta(s);
      return {
        id: s.id,
        name: s.name,
        x: point.x,
        y: point.y,
        color,
        stalled: stalledIds.has(s.id),
        speed: s.speed ?? 0,
        etaMin,
        stopName,
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
        const { stopName, etaMin } = computeEta(shuttle);
        const marker = L.circleMarker([shuttle.lat, shuttle.lon], {
          radius: 9,
          fillColor: color,
          color: color,
          weight: 3,
          opacity: 1,
          fillOpacity: 0.9,
        }).addTo(map);

        marker.bindPopup(`
          <div style="font-family:monospace;font-size:12px;color:#e8f4f8">
            <b style="color:${color}">${shuttle.name}</b><br/>
            Speed: ${shuttle.speed?.toFixed(1) ?? 0} mph<br/>
            Next stop: <b style="color:${color}">${stopName}</b><br/>
            ETA: <b style="color:#39ff14">~${etaMin} min</b><br/>
            ${isStalled ? '<span style="color:#ff3b5c">⚠ STALLED</span>' : '<span style="color:#39ff14">● Active</span>'}
          </div>
        `);

        markersRef.current.set(shuttle.id, marker);
        setTimeout(() => {
          const el = marker.getElement() as HTMLElement | undefined;
          if (el) {
            el.style.filter = `drop-shadow(0 0 6px ${color}) drop-shadow(0 0 12px ${color})`;
          }
        }, 100);
      }
    });

    // Recompute overlay positions after marker updates
    computeOverlays();

    // Compute ETAs and pipe up to parent
    if (onEtaUpdate) {
      const etas: Record<string, number> = {};
      shuttles.forEach((s) => {
        const { etaMin } = computeEta(s);
        etas[s.id] = etaMin;
      });
      onEtaUpdate(etas);
    }
  }, [shuttles, stalledIds, mapReady, computeOverlays, onEtaUpdate]);

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
  const { x, y, color, stalled, name, speed, etaMin, stopName } = marker;
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
          top: stalled ? -48 : -42,
          left: "50%",
          transform: "translateX(-50%)",
          whiteSpace: "nowrap",
          background: "rgba(10,10,15,0.88)",
          border: `1px solid ${stalled ? "#ff3b5c" : color}`,
          borderRadius: 5,
          padding: "3px 8px",
          fontSize: 10,
          fontFamily: "var(--font-mono)",
          color: stalled ? "#ff3b5c" : color,
          letterSpacing: "0.06em",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 1,
        }}
      >
        <span style={{ fontWeight: 700 }}>
          {stalled ? `⚠ ${name}` : name}
        </span>
        {!stalled && (
          <span style={{ fontSize: 9, color: "rgba(232,244,248,0.6)" }}>
            {stopName} · ~{etaMin}min
          </span>
        )}
      </motion.div>
    </motion.div>
  );
}