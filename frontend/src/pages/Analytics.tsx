import { useEffect, useMemo, useState } from "react";
import { BarChart3, Clock3, Gauge, MapPinned, TrendingUp } from "lucide-react";
import {
  CircleMarker,
  MapContainer,
  Popup,
  TileLayer,
  useMap,
} from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { useDashboard } from "../hooks/useDashboard";
import type { DashboardLot } from "../types";

function formatPercent(score: number) {
  return `${Math.round(score * 100)}%`;
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

function AnalyticsMapViewport({
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

    map.setView([selectedLot.latitude, selectedLot.longitude], 16, { animate: true });
  }, [lots, map, selectedLotId]);

  return null;
}

export default function Analytics() {
  const { data: lots = [], isLoading, isError, refetch } = useDashboard();
  const [selectedLotId, setSelectedLotId] = useState<number | null>(null);

  const sortedLots = [...lots].sort((a, b) => b.prob_score - a.prob_score);
  const topLot = sortedLots[0];
  const constrainedLot = [...lots].sort((a, b) => a.prob_score - b.prob_score)[0];
  const mappableLots = useMemo(
    () => lots.filter((lot) => lot.latitude != null && lot.longitude != null),
    [lots]
  );
  const averageScore = lots.length
    ? Math.round((lots.reduce((sum, lot) => sum + lot.prob_score, 0) / lots.length) * 100)
    : 0;
  const highConfidenceCount = lots.filter((lot) => lot.confidence_level === "high").length;

  useEffect(() => {
    if (sortedLots.length === 0) {
      setSelectedLotId(null);
      return;
    }

    setSelectedLotId((current) =>
      sortedLots.some((lot) => lot.lot_id === current) ? current : sortedLots[0].lot_id
    );
  }, [sortedLots]);

  const selectedLot = sortedLots.find((lot) => lot.lot_id === selectedLotId) ?? sortedLots[0] ?? null;

  const summaryCards = [
    {
      label: "Network Average",
      value: `${averageScore}%`,
      note: "Across the current visible lot set",
      icon: Gauge,
    },
    {
      label: "High Confidence",
      value: `${highConfidenceCount}`,
      note: "Lots with stronger prediction certainty",
      icon: Clock3,
    },
    {
      label: "Best Current Option",
      value: topLot?.lot_name ?? "Unavailable",
      note: topLot ? formatPercent(topLot.prob_score) : "No live data",
      icon: TrendingUp,
    },
  ];

  return (
    <main className="page-shell">
      <section className="hero-panel">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="eyebrow">Analytics</p>
            <h1 className="mt-4 text-4xl font-semibold tracking-tight text-slate-950">
              A quieter view of parking pressure across campus.
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600 sm:text-base">
              This summary turns the raw dashboard feed into a compact operational view:
              network availability, model confidence, and the lots experiencing the most strain.
            </p>
          </div>
          <button onClick={() => refetch()} className="button-secondary self-start lg:self-auto">
            Refresh analytics
          </button>
        </div>
      </section>

      {isLoading && <p className="empty-state">Loading analytics…</p>}

      {isError && (
        <div className="surface-card border-rose-200/80 bg-rose-50/80 text-sm text-rose-700">
          Analytics could not be loaded right now.
        </div>
      )}

      {!isLoading && !isError && (
        <>
          <section className="grid gap-4 md:grid-cols-3">
            {summaryCards.map((card) => {
              const Icon = card.icon;
              return (
                <article key={card.label} className="surface-card">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-slate-500">{card.label}</p>
                    <span className="rounded-2xl bg-[var(--surface-raised)] p-2 text-[var(--accent-strong)]">
                      <Icon className="h-4 w-4" />
                    </span>
                  </div>
                  <p className="mt-6 text-3xl font-semibold tracking-tight text-slate-950">
                    {card.value}
                  </p>
                  <p className="mt-2 text-sm text-slate-500">{card.note}</p>
                </article>
              );
            })}
          </section>

          <section className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
            <article className="surface-card">
              <div className="flex items-center gap-3">
                <span className="rounded-2xl bg-[var(--surface-raised)] p-2 text-[var(--accent-strong)]">
                  <BarChart3 className="h-4 w-4" />
                </span>
                <div>
                  <h2 className="section-title">Current Lot Ranking</h2>
                  <p className="section-copy">Sorted by predicted availability right now.</p>
                </div>
              </div>

              <div className="mt-6 space-y-3">
                {sortedLots.slice(0, 6).map((lot, index) => (
                  <button
                    key={lot.lot_id}
                    type="button"
                    onClick={() => setSelectedLotId(lot.lot_id)}
                    className={`metric-row w-full text-left transition ${
                      lot.lot_id === selectedLot?.lot_id
                        ? "border-[#0f2f63] bg-[#0f2f63] text-white"
                        : ""
                    }`}
                  >
                    <div className="flex items-center gap-4">
                      <span className="rank-chip">{index + 1}</span>
                      <div>
                        <p className={`font-medium ${lot.lot_id === selectedLot?.lot_id ? "text-white" : "text-slate-900"}`}>
                          {lot.lot_name}
                        </p>
                        <p
                          className={`text-sm capitalize ${
                            lot.lot_id === selectedLot?.lot_id ? "text-slate-200" : "text-slate-500"
                          }`}
                        >
                          {lot.lot_type} lot
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={`font-semibold ${lot.lot_id === selectedLot?.lot_id ? "text-white" : "text-slate-950"}`}>
                        {formatPercent(lot.prob_score)}
                      </p>
                      <p
                        className={`text-xs uppercase tracking-[0.18em] ${
                          lot.lot_id === selectedLot?.lot_id ? "text-slate-300" : "text-slate-400"
                        }`}
                      >
                        {lot.confidence_level}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            </article>

            <article className="surface-card">
              <p className="eyebrow">Attention</p>
              <h2 className="mt-4 text-2xl font-semibold tracking-tight text-slate-950">
                Tightest lot right now
              </h2>
              {constrainedLot ? (
                <>
                  <p className="mt-3 text-lg font-medium text-slate-900">
                    {constrainedLot.lot_name}
                  </p>
                  <p className="mt-2 text-sm leading-6 text-slate-600">
                    Availability is currently predicted at{" "}
                    <span className="font-semibold text-slate-950">
                      {formatPercent(constrainedLot.prob_score)}
                    </span>
                    , making this the most constrained parking option in the latest feed.
                  </p>
                  <div className="mt-8 rounded-[28px] bg-[var(--surface-raised)] p-5">
                    <p className="text-xs uppercase tracking-[0.2em] text-slate-400">
                      Confidence level
                    </p>
                    <p className="mt-3 text-3xl font-semibold capitalize tracking-tight text-slate-950">
                      {constrainedLot.confidence_level}
                    </p>
                  </div>
                </>
              ) : (
                <p className="mt-4 text-sm text-slate-500">No live dashboard data is available yet.</p>
              )}
            </article>
          </section>

          <section className="presentation-shell overflow-hidden">
            <div className="presentation-band h-2 w-full" />
            <div className="grid gap-6 px-6 py-6 xl:grid-cols-[0.8fr_1.2fr] lg:px-8 lg:py-8">
              <div className="rounded-[28px] border border-[#dbe5f0] bg-white/92 p-5">
                <div className="flex items-center gap-3">
                  <span className="rounded-2xl bg-[var(--surface-raised)] p-2 text-[var(--accent-strong)]">
                    <MapPinned className="h-4 w-4" />
                  </span>
                  <div>
                    <p className="eyebrow">Lot Location</p>
                    <h2 className="section-title">Selected analytics lot</h2>
                  </div>
                </div>

                {selectedLot ? (
                  <>
                    <p className="mt-5 text-3xl font-semibold tracking-tight text-[var(--accent-deep)]">
                      {selectedLot.lot_name}
                    </p>
                    <p className="mt-3 text-sm leading-6 text-slate-600">
                      Clicking a lot in the ranking now moves the map to that lot so analytics can
                      stay spatial instead of only numerical.
                    </p>
                    <div className="mt-5 grid gap-3 sm:grid-cols-2">
                      <div className="rounded-[22px] border border-[#e5ebf2] bg-white px-4 py-4">
                        <p className="text-[11px] uppercase tracking-[0.22em] text-slate-400">Availability</p>
                        <p className="mt-2 text-2xl font-semibold text-[var(--accent-deep)]">
                          {formatPercent(selectedLot.prob_score)}
                        </p>
                      </div>
                      <div className="rounded-[22px] border border-[#e5ebf2] bg-white px-4 py-4">
                        <p className="text-[11px] uppercase tracking-[0.22em] text-slate-400">Status</p>
                        <p className="mt-2 text-lg font-semibold text-[var(--accent-deep)]">
                          {availabilityLabel(selectedLot.color)}
                        </p>
                      </div>
                    </div>
                    <div className="mt-5 rounded-[24px] border border-[#0f2f63] bg-[#0f2f63] px-5 py-4 text-white">
                      <p className="text-[11px] uppercase tracking-[0.22em] text-[#d3dded]">
                        Confidence
                      </p>
                      <p className="mt-2 text-2xl font-semibold capitalize">
                        {selectedLot.confidence_level}
                      </p>
                    </div>
                  </>
                ) : (
                  <p className="mt-5 text-sm text-slate-500">No live lot is selected yet.</p>
                )}
              </div>

              <div className="relative overflow-hidden rounded-[32px] border border-[#dbe5f0] bg-slate-200 shadow-[0_32px_80px_-48px_rgba(15,47,99,0.45)]">
                {selectedLot && selectedLot.latitude != null && selectedLot.longitude != null ? (
                  <MapContainer
                    center={[selectedLot.latitude, selectedLot.longitude]}
                    zoom={16}
                    scrollWheelZoom
                    className="h-[520px] w-full"
                  >
                    <TileLayer
                      attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                      url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    />
                    <AnalyticsMapViewport lots={mappableLots} selectedLotId={selectedLot.lot_id} />
                    {mappableLots.map((lot) => (
                      <CircleMarker
                        key={lot.lot_id}
                        center={[lot.latitude as number, lot.longitude as number]}
                        pathOptions={{
                          color: lot.lot_id === selectedLot.lot_id ? "#0f2f63" : "#ffffff",
                          weight: lot.lot_id === selectedLot.lot_id ? 3 : 2,
                          fillColor: markerColor(lot.color),
                          fillOpacity: 0.95,
                        }}
                        radius={lot.lot_id === selectedLot.lot_id ? 12 : 9}
                        eventHandlers={{ click: () => setSelectedLotId(lot.lot_id) }}
                      >
                        <Popup>
                          <div className="min-w-[160px]">
                            <p className="text-sm font-semibold text-slate-900">{lot.lot_name}</p>
                            <p className="mt-1 text-xs uppercase tracking-[0.18em] text-slate-500">
                              {lot.lot_type}
                            </p>
                            <p className="mt-2 text-sm text-slate-700">
                              {availabilityLabel(lot.color)} · {formatPercent(lot.prob_score)}
                            </p>
                          </div>
                        </Popup>
                      </CircleMarker>
                    ))}
                  </MapContainer>
                ) : (
                  <div className="flex h-[520px] items-center justify-center bg-[linear-gradient(160deg,_#f7f5ef_0%,_#fdfcf9_45%,_#eef4fb_100%)] px-8 text-center text-sm text-slate-500">
                    The selected lot does not have map coordinates yet.
                  </div>
                )}

                <div className="pointer-events-none absolute left-5 top-5 rounded-full bg-white/88 px-4 py-2 text-xs font-medium tracking-[0.18em] text-slate-500 backdrop-blur">
                  ANALYTICS MAP
                </div>
              </div>
            </div>
          </section>
        </>
      )}
    </main>
  );
}
