// server/poller.ts
import { Server } from "socket.io";
import { initMockState, tickMockShuttles, ShuttleState } from "./mockData";
import { analyzeStall } from "./gemini";

const PASSIO_URL =
  "https://passiogo.com/mapGetData.php?systemId=1068&getBuses=1&format=json";
const POLL_INTERVAL = 5000;
const STALL_THRESHOLD_MS = 2 * 60 * 1000;
const STALL_COORD_DELTA = 0.00005;

const FORCE_MOCK = process.env.USE_MOCK_DATA === "true";

interface PassioVehicle {
  id: string;
  name?: string;
  routeName?: string;
  latitude?: string;
  longitude?: string;
  lat?: string;
  lon?: string;
  calculatedCourse?: string;
  speed?: string;
}

interface ShuttleData {
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

interface StallRecord {
  lat: number;
  lon: number;
  since: number;
  alerted: boolean;
}

const stallTracker = new Map<string, StallRecord>();

let mockStates = initMockState();
let mockTick = 0;
let usingMock = FORCE_MOCK;

function parseLiveData(raw: unknown): ShuttleData[] {
  try {
    const data = raw as { buses?: PassioVehicle[]; vehicle?: PassioVehicle[] };
    const vehicles = data?.buses ?? data?.vehicle ?? [];
    if (!Array.isArray(vehicles) || vehicles.length === 0) return [];

    return vehicles
      .map((v: PassioVehicle) => {
        const lat = parseFloat(v.latitude ?? v.lat ?? "");
        const lon = parseFloat(v.longitude ?? v.lon ?? "");
        if (isNaN(lat) || isNaN(lon)) return null;
        return {
          id: v.id,
          name: v.name ?? `Shuttle ${v.id}`,
          route: v.routeName ?? "Unknown",
          lat,
          lon,
          speed: parseFloat(v.speed ?? "0"),
          heading: parseFloat(v.calculatedCourse ?? "0"),
          isMock: false,
        } as ShuttleData;
      })
      .filter(Boolean) as ShuttleData[];
  } catch {
    return [];
  }
}

function getMockData(): ShuttleData[] {
  mockTick++;
  mockStates = tickMockShuttles(mockStates, mockTick);
  return mockStates.map((s) => ({
    id: s.id,
    name: s.name,
    route: s.route,
    lat: s.lat,
    lon: s.lon,
    color: s.color,
    speed: 15,
    heading: 0,
    isMock: true,
  }));
}

async function checkStalls(shuttles: ShuttleData[], io: Server): Promise<void> {
  const now = Date.now();

  for (const shuttle of shuttles) {
    const prev = stallTracker.get(shuttle.id);

    if (!prev) {
      stallTracker.set(shuttle.id, {
        lat: shuttle.lat,
        lon: shuttle.lon,
        since: now,
        alerted: false,
      });
      continue;
    }

    const moved =
      Math.abs(shuttle.lat - prev.lat) > STALL_COORD_DELTA ||
      Math.abs(shuttle.lon - prev.lon) > STALL_COORD_DELTA;

    if (moved) {
      stallTracker.set(shuttle.id, {
        lat: shuttle.lat,
        lon: shuttle.lon,
        since: now,
        alerted: false,
      });
    } else {
      const stalledMs = now - prev.since;
      if (stalledMs > STALL_THRESHOLD_MS && !prev.alerted) {
        const stallDurationMin = Math.round(stalledMs / 60000);

        console.log(`[STALL] ${shuttle.name} stalled ${stallDurationMin}min — calling Gemini...`);

        const stallData = {
          shuttleId: shuttle.id,
          name: shuttle.name,
          route: shuttle.route,
          lat: shuttle.lat,
          lon: shuttle.lon,
          stallDurationMs: stalledMs,
          stallDurationMin,
          timestamp: new Date().toISOString(),
          aiAlert: null as any,
        };

        // Emit stall immediately, AI alert comes after
        io.emit("shuttle:stall", stallData);
        stallTracker.set(shuttle.id, { ...prev, alerted: true });

        const delay = Math.random() * 5000;
        setTimeout(() => {
          analyzeStall({
            name: shuttle.name,
            route: shuttle.route,
            lat: shuttle.lat,
            lon: shuttle.lon,
            stallDurationMin,
          }).then((aiAlert) => {
            console.log(`[Gemini] Alert for ${shuttle.name}:`, aiAlert.likelyCause);
            io.emit("shuttle:stall:ai", {
              shuttleId: shuttle.id,
              aiAlert,
              timestamp: new Date().toISOString(),
            });
          }).catch((err) => {
            console.error("[Gemini] Error:", err);
          });
        }, delay);
// Call Gemini async, emit enriched event when ready
        
      }
    }
  }

  const activeIds = new Set(shuttles.map((s) => s.id));
  for (const id of stallTracker.keys()) {
    if (!activeIds.has(id)) stallTracker.delete(id);
  }
}

export function startPoller(io: Server): void {
  console.log(
    `[Poller] Starting — mode: ${FORCE_MOCK ? "MOCK (forced)" : "LIVE with mock fallback"}`
  );

  const poll = async () => {
    let shuttles: ShuttleData[] = [];

    if (!FORCE_MOCK) {
      try {
        const res = await fetch(PASSIO_URL, { signal: AbortSignal.timeout(4000) });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const raw = await res.json();
        shuttles = parseLiveData(raw);

        if (shuttles.length > 0) {
          if (usingMock) {
            console.log("[Poller] Live API restored — switching to live data");
            usingMock = false;
          }
        } else {
          throw new Error("Empty response");
        }
      } catch (err) {
        if (!usingMock) {
          console.warn(`[Poller] Live API failed (${err}) — falling back to mock`);
          usingMock = true;
        }
        shuttles = getMockData();
      }
    } else {
      shuttles = getMockData();
    }

    io.emit("shuttle:update", shuttles);
    io.emit("shuttle:meta", {
      count: shuttles.length,
      isMock: usingMock || FORCE_MOCK,
      timestamp: Date.now(),
    });

    await checkStalls(shuttles, io);
  };

  poll();
  setInterval(poll, POLL_INTERVAL);
}