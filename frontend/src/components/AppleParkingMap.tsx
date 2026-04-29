import { useEffect, useMemo, useState } from "react";
import { Navigation, Sparkles } from "lucide-react";
import { useNavigate } from "react-router-dom";
import {
  CircleMarker,
  MapContainer,
  Popup,
  TileLayer,
  useMap,
} from "react-leaflet";
import "leaflet/dist/leaflet.css";
import type { DashboardLot } from "../types";

interface Props {
  lots: DashboardLot[];
}

function markerColor(color: DashboardLot["color"]) {
  if (color === "green") return "#12b76a";
  if (color === "yellow") return "#f59e0b";
  return "#e11d48";
}

function availabilityLabel(color: DashboardLot["color"]) {
  if (color === "green") return "High availability";
  if (color === "yellow") return "Moderate pressure";
  return "Nearly full";
}

function confidenceCopy(level: DashboardLot["confidence_level"]) {
  if (level === "high") return "Model confidence is strong for this lot right now.";
  if (level === "medium") return "Prediction is stable, with moderate signal certainty.";
  return "Prediction is directional, with lighter signal strength.";
}

function formatDistance(miles: number) {
  if (miles < 0.1) return `${Math.round(miles * 5280)} ft away`;
  return `${miles.toFixed(1)} mi away`;
}

function haversineMiles(a: DashboardLot, b: DashboardLot) {
  if (a.latitude == null || a.longitude == null || b.latitude == null || b.longitude == null) {
    return Number.POSITIVE_INFINITY;
  }

  const toRadians = (value: number) => (value * Math.PI) / 180;
  const earthRadiusMiles = 3958.8;
  const dLat = toRadians((b.latitude as number) - (a.latitude as number));
  const dLon = toRadians((b.longitude as number) - (a.longitude as number));
  const lat1 = toRadians(a.latitude as number);
  const lat2 = toRadians(b.latitude as number);

  const arc =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;

  return 2 * earthRadiusMiles * Math.asin(Math.sqrt(arc));
}

function MapViewport({
  lots,
  selectedLotId,
}: {
  lots: DashboardLot[];
  selectedLotId: number;
}) {
  const map = useMap();

  useEffect(() => {
    const selectedLot = lots.find((lot) => lot.lot_id === selectedLotId);
    if (!selectedLot || selectedLot.latitude == null || selectedLot.longitude == null) return;

    const withCoords = lots.filter(
      (lot) => lot.latitude != null && lot.longitude != null
    );

    if (withCoords.length <= 1) {
      map.setView([selectedLot.latitude, selectedLot.longitude], 17, { animate: true });
      return;
    }

    const bounds = withCoords.map((lot) => [lot.latitude as number, lot.longitude as number]) as [
      number,
      number,
    ][];
    map.fitBounds(bounds, {
      padding: [36, 36],
      maxZoom: 17,
    });
  }, [lots, map, selectedLotId]);

  return null;
}

function scoreTextColor(score: number) {
  if (score >= 0.65) return "#059669";
  if (score >= 0.35) return "#d97706";
  return "#e11d48";
}

function scoreBg(score: number) {
  if (score >= 0.65) return "#ecfdf5";
  if (score >= 0.35) return "#fffbeb";
  return "#fff1f2";
}

export default function AppleParkingMap({ lots }: Props) {
  const navigate = useNavigate();
  const [selectedLotId, setSelectedLotId] = useState<number | null>(null);

  const mappedLots = useMemo(
    () => lots.filter((lot) => lot.latitude != null && lot.longitude != null),
    [lots]
  );

  const spotlightLots = useMemo(
    () =>
      [...mappedLots].sort((a, b) => {
        if (a.color !== b.color) {
          const weight = { green: 0, yellow: 1, red: 2 };
          return weight[a.color] - weight[b.color];
        }
        return b.prob_score - a.prob_score;
      }),
    [mappedLots]
  );

  useEffect(() => {
    if (spotlightLots.length === 0) {
      setSelectedLotId(null);
      return;
    }

    setSelectedLotId((current) =>
      spotlightLots.some((lot) => lot.lot_id === current) ? current : spotlightLots[0].lot_id
    );
  }, [spotlightLots]);

  const selectedLot = useMemo(
    () => spotlightLots.find((lot) => lot.lot_id === selectedLotId) ?? spotlightLots[0] ?? null,
    [selectedLotId, spotlightLots]
  );

  const nearbyLots = useMemo(() => {
    if (!selectedLot) return [];

    return spotlightLots
      .filter((lot) => lot.lot_id !== selectedLot.lot_id)
      .map((lot) => ({
        ...lot,
        distanceMiles: haversineMiles(selectedLot, lot),
      }))
      .sort((a, b) => a.distanceMiles - b.distanceMiles)
      .slice(0, 4);
  }, [selectedLot, spotlightLots]);

  if (mappedLots.length === 0 || !selectedLot) {
    return (
      <section className="presentation-shell overflow-hidden">
        <div className="presentation-band h-2 w-full" />
        <div className="px-6 py-6 lg:px-8 lg:py-7">
        <p className="eyebrow">Lot Surroundings</p>
        <h2 className="mt-3 text-2xl font-semibold tracking-tight text-[var(--accent-deep)]">
          Lot coordinates are not available yet
        </h2>
        <p className="mt-3 text-sm leading-6 text-slate-600">
          The dashboard feed needs latitude and longitude for each parking lot before a surrounding
          map can be rendered.
        </p>
        </div>
      </section>
    );
  }

  return (
    <section className="presentation-shell overflow-hidden">
      <div className="presentation-band h-2 w-full" />
      <div className="grid gap-6 px-6 py-6 xl:grid-cols-[0.85fr_1.15fr] lg:px-8 lg:py-8">
        <div className="flex flex-col gap-4">
          <div className="rounded-[30px] border border-[#dbe5f0] bg-[linear-gradient(180deg,_rgba(255,255,255,0.98),_rgba(247,246,241,0.95))] p-6 shadow-[0_24px_60px_-40px_rgba(15,47,99,0.34)]">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="eyebrow text-slate-500">Map Spotlight</p>
                <h2 className="mt-3 text-3xl font-semibold tracking-tight text-[var(--accent-deep)]">
                  {selectedLot.lot_name}
                </h2>
                <p className="mt-3 max-w-md text-sm leading-6 text-slate-600">
                  The map centers the strongest current option, then keeps adjacent alternatives in
                  view so the choice feels practical instead of abstract.
                </p>
              </div>
              <div
                className="rounded-[22px] px-4 py-3 text-right shadow-[inset_0_1px_0_rgba(255,255,255,0.6)]"
                style={{
                  background:
                    selectedLot.color === "green"
                      ? "linear-gradient(180deg, rgba(16,185,129,0.16), rgba(16,185,129,0.06))"
                      : selectedLot.color === "yellow"
                        ? "linear-gradient(180deg, rgba(245,158,11,0.16), rgba(245,158,11,0.06))"
                        : "linear-gradient(180deg, rgba(244,63,94,0.16), rgba(244,63,94,0.06))",
                }}
              >
                <p className="text-[11px] uppercase tracking-[0.22em] text-slate-500">Live score</p>
                <p className="mt-2 text-5xl font-semibold tracking-tight text-[var(--accent-deep)]">
                  {Math.round(selectedLot.prob_score * 100)}%
                </p>
              </div>
            </div>

            <div className="mt-6 grid gap-3 sm:grid-cols-3">
              <div className="rounded-[22px] border border-[#e5ebf2] bg-white px-4 py-4">
                <p className="text-[11px] uppercase tracking-[0.22em] text-slate-400">Status</p>
                <p className="mt-2 text-lg font-semibold text-[var(--accent-deep)]">
                  {availabilityLabel(selectedLot.color)}
                </p>
              </div>
              <div className="rounded-[22px] border border-[#e5ebf2] bg-white px-4 py-4">
                <p className="text-[11px] uppercase tracking-[0.22em] text-slate-400">Permit fit</p>
                <p className="mt-2 text-lg font-semibold capitalize text-[var(--accent-deep)]">
                  {selectedLot.lot_type}
                </p>
              </div>
              <div className="rounded-[22px] border border-[#e5ebf2] bg-white px-4 py-4">
                <p className="text-[11px] uppercase tracking-[0.22em] text-slate-400">Signal</p>
                <p className="mt-2 text-lg font-semibold capitalize text-[var(--accent-deep)]">
                  {selectedLot.confidence_level} confidence
                </p>
              </div>
            </div>

            <div className="mt-5 rounded-[24px] border border-[#0f2f63] bg-[#0f2f63] px-5 py-4 text-white">
              <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.22em] text-[#d3dded]">
                <Sparkles className="h-4 w-4" />
                Route read
              </div>
              <p className="mt-3 text-sm leading-6 text-slate-100">
                {confidenceCopy(selectedLot.confidence_level)}
              </p>
            </div>
          </div>

          <div className="rounded-[28px] border border-[#dbe5f0] bg-white/92 p-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="eyebrow">Nearby Options</p>
                <h3 className="mt-2 text-xl font-semibold tracking-tight text-[var(--accent-deep)]">
                  Ranked around the spotlight
                </h3>
              </div>
              <div className="rounded-full bg-[#0f2f63] px-3 py-1 text-[11px] uppercase tracking-[0.22em] text-white">
                {nearbyLots.length + 1} visible
              </div>
            </div>

            <div className="mt-4 space-y-3">
              {[selectedLot, ...nearbyLots].slice(0, 5).map((lot, index) => (
                <button
                  key={lot.lot_id}
                  type="button"
                  onClick={() => setSelectedLotId(lot.lot_id)}
                  className={`flex w-full items-center justify-between rounded-[22px] border px-4 py-4 text-left transition ${
                    lot.lot_id === selectedLot.lot_id
                      ? "border-[#0f2f63] bg-[#0f2f63] text-white"
                      : "border-[#dbe5f0] bg-[#fbfbf9] text-[var(--accent-deep)] hover:border-[#b8c8db] hover:bg-white"
                  }`}
                >
                  <div className="min-w-0">
                    <p className="text-[11px] uppercase tracking-[0.22em] opacity-60">
                      {index === 0
                        ? "Spotlight"
                        : formatDistance(
                            (lot as typeof lot & { distanceMiles?: number }).distanceMiles ?? 0
                          )}
                    </p>
                    <p className="mt-1 truncate text-base font-semibold">{lot.lot_name}</p>
                    <p className="mt-1 text-sm opacity-75">{availabilityLabel(lot.color)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-semibold tracking-tight">
                      {Math.round(lot.prob_score * 100)}%
                    </p>
                    <p className="mt-1 text-[11px] uppercase tracking-[0.18em] opacity-60 capitalize">
                      {lot.confidence_level}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="eyebrow">Campus Layout</p>
              <h3 className="mt-2 text-2xl font-semibold tracking-tight text-[var(--accent-deep)]">
                Area around {selectedLot.lot_name}
              </h3>
            </div>
            <div className="rounded-full border border-[#dbe5f0] bg-white/80 px-4 py-2 text-xs uppercase tracking-[0.2em] text-slate-500">
              OpenStreetMap live view
            </div>
          </div>

          <div className="relative overflow-hidden rounded-[32px] border border-[#dbe5f0] bg-slate-200 shadow-[0_32px_80px_-48px_rgba(15,47,99,0.45)]">
            <MapContainer
              center={[selectedLot.latitude as number, selectedLot.longitude as number]}
              zoom={16}
              scrollWheelZoom
              className="h-[560px] w-full"
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              <MapViewport lots={mappedLots} selectedLotId={selectedLot.lot_id} />
              {mappedLots.map((lot) => {
                if (lot.latitude == null || lot.longitude == null) return null;
                const isSelected = lot.lot_id === selectedLot.lot_id;

                return (
                  <CircleMarker
                    key={lot.lot_id}
                    center={[lot.latitude, lot.longitude]}
                    pathOptions={{
                      color: isSelected ? "#0f2f63" : "#ffffff",
                      weight: isSelected ? 3 : 2,
                      fillColor: markerColor(lot.color),
                      fillOpacity: 0.95,
                    }}
                    radius={isSelected ? 12 : 9}
                    eventHandlers={{
                      click: () => setSelectedLotId(lot.lot_id),
                    }}
                  >
                    <Popup minWidth={200}>
                      <div style={{ minWidth: 200, fontFamily: "-apple-system, BlinkMacSystemFont, sans-serif" }}>
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                          <span style={{ fontSize: 14, fontWeight: 600, color: "#0f172a" }}>{lot.lot_name}</span>
                          <span style={{
                            fontSize: 18,
                            fontWeight: 700,
                            color: scoreTextColor(lot.prob_score),
                            background: scoreBg(lot.prob_score),
                            borderRadius: 8,
                            padding: "2px 8px",
                          }}>
                            {Math.round(lot.prob_score * 100)}%
                          </span>
                        </div>
                        <p style={{ marginTop: 4, fontSize: 11, textTransform: "capitalize", color: "#64748b" }}>
                          {lot.lot_type} · {lot.confidence_level} confidence
                        </p>
                        {/* Availability bar */}
                        <div style={{ marginTop: 8, height: 5, background: "#f1f5f9", borderRadius: 99, overflow: "hidden" }}>
                          <div style={{
                            height: "100%",
                            width: `${Math.round(lot.prob_score * 100)}%`,
                            background: markerColor(lot.color),
                            borderRadius: 99,
                          }} />
                        </div>
                        <p style={{ marginTop: 6, fontSize: 12, color: markerColor(lot.color), fontWeight: 600 }}>
                          {availabilityLabel(lot.color)}
                        </p>
                        <button
                          onClick={() => navigate(`/lots/${lot.lot_id}`)}
                          style={{
                            marginTop: 10,
                            width: "100%",
                            padding: "7px 0",
                            background: "#0f2f63",
                            color: "#fff",
                            border: "none",
                            borderRadius: 10,
                            fontSize: 12,
                            fontWeight: 600,
                            cursor: "pointer",
                            letterSpacing: "0.02em",
                          }}
                        >
                          View Prediction Timeline →
                        </button>
                      </div>
                    </Popup>
                  </CircleMarker>
                );
              })}
            </MapContainer>

            <div className="pointer-events-none absolute left-5 top-5 rounded-full bg-white/88 px-4 py-2 text-xs font-medium tracking-[0.18em] text-slate-500 backdrop-blur">
              REAL CAMPUS MAP
            </div>

            <div className="absolute bottom-5 right-5 rounded-[24px] border border-[#dbe5f0] bg-white/92 px-4 py-3 backdrop-blur">
              <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.22em] text-slate-400">
                <Navigation className="h-3.5 w-3.5" />
                Decision cue
              </div>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                Click any lot marker to inspect its live availability around the selected area.
              </p>
            </div>

          </div>
        </div>
      </div>
    </section>
  );
}
