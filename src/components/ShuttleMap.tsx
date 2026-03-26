"use client";

import { useEffect, useRef } from "react";
import { ShuttleData } from "@/hooks/useShuttles";

interface Props {
  shuttles: ShuttleData[];
}

export default function ShuttleMap({ shuttles }: Props) {
  const mapRef = useRef<any>(null);
  const markersRef = useRef<Map<string, any>>(new Map());
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (mapRef.current || !containerRef.current) return;

    const L = require("leaflet");

    const map = L.map(containerRef.current, {
      center: [39.7107, -75.1263],
      zoom: 15,
      zoomControl: true,
    });

    L.tileLayer(
      "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
      {
        attribution: "©OpenStreetMap ©CartoDB",
        maxZoom: 19,
      }
    ).addTo(map);

    mapRef.current = map;
  }, []);

  useEffect(() => {
    if (!mapRef.current) return;
    const L = require("leaflet");
    const map = mapRef.current;

    const activeIds = new Set(shuttles.map((s) => s.id));

    // Remove markers for shuttles that are gone
    for (const [id, marker] of markersRef.current.entries()) {
      if (!activeIds.has(id)) {
        marker.remove();
        markersRef.current.delete(id);
      }
    }

    shuttles.forEach((shuttle) => {
      const color = shuttle.color ?? "#00e5ff";
      const icon = L.divIcon({
        className: "",
        html: `
          <div style="
            width: 14px;
            height: 14px;
            background: ${color};
            border-radius: 50%;
            border: 2px solid rgba(255,255,255,0.8);
            box-shadow: 0 0 10px ${color}, 0 0 20px ${color}44;
          "></div>
        `,
        iconSize: [14, 14],
        iconAnchor: [7, 7],
      });

      const existing = markersRef.current.get(shuttle.id);
      if (existing) {
        existing.setLatLng([shuttle.lat, shuttle.lon]);
        existing.setIcon(icon);
      } else {
        const marker = L.marker([shuttle.lat, shuttle.lon], { icon })
          .bindPopup(
            `<b>${shuttle.name}</b><br/>Route: ${shuttle.route}<br/>${shuttle.speed?.toFixed(1) ?? 0} mph`
          )
          .addTo(map);
        markersRef.current.set(shuttle.id, marker);
      }
    });
  }, [shuttles]);

  return (
    <div
      ref={containerRef}
      style={{ position: "absolute", inset: 0, background: "#0a0a0f" }}
    />
  );
}