import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  BarChart3,
  CalendarDays,
  ChevronRight,
  Clock3,
  Gauge,
  MapPinned,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import {
  CircleMarker,
  MapContainer,
  Popup,
  TileLayer,
  useMap,
} from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { useDashboard, useEvents } from "../hooks/useDashboard";
import type { CampusEvent, DashboardLot } from "../types";

function formatPercent(score: number) {
  return `${Math.round(score * 100)}%`;
}

function markerColor(color: DashboardLot["color"]) {
  if (color === "green") return "#12b76a";
  if (color === "yellow") return "#f59e0b";
  return "#e11d48";
}

function scoreColor(score: number) {
  if (score >= 0.65) return "text-emerald-600";
  if (score >= 0.35) return "text-amber-600";
  return "text-rose-600";
}

function barBg(score: number) {
  if (score >= 0.65) return "bg-emerald-500";
  if (score >= 0.35) return "bg-amber-500";
  return "bg-rose-500";
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
    const lot = lots.find((l) => l.lot_id === selectedLotId);
    if (!lot || lot.latitude == null || lot.longitude == null) return;
    map.setView([lot.latitude, lot.longitude], 16, { animate: true });
  }, [lots, map, selectedLotId]);
  return null;
}

function EventCard({ event }: { event: CampusEvent }) {
  const att = event.expected_attendance ?? 0;
  const isHigh = att >= 2000;
  const isMed = att >= 700;
  const start = new Date(event.event_start);
  const end = new Date(event.event_end);
  const now = new Date();
  const isActive = start <= now && end >= now;

  return (
    <div
      className={`rounded-[20px] border px-4 py-4 ${
        isHigh
          ? "border-rose-200 bg-rose-50/80"
          : isMed
            ? "border-amber-200 bg-amber-50/80"
            : "border-[#e5ebf2] bg-white/80"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-slate-900">{event.title}</p>
          <p className="mt-1 truncate text-xs text-slate-500">{event.location}</p>
        </div>
        {isActive && (
          <span className="flex-shrink-0 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.15em] text-emerald-700">
            Live
          </span>
        )}
      </div>
      <div className="mt-3 flex items-center justify-between gap-2">
        <span className="text-xs text-slate-400">
          {start.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
          {" – "}
          {end.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
        </span>
        <span
          className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.15em] ${
            isHigh
              ? "bg-rose-100 text-rose-700"
              : isMed
                ? "bg-amber-100 text-amber-700"
                : "bg-slate-100 text-slate-600"
          }`}
        >
          {isHigh ? "High impact" : isMed ? "Med impact" : "Low impact"}
        </span>
      </div>
    </div>
  );
}

export default function Analytics() {
  const navigate = useNavigate();
  const { data: lots = [], isLoading, isError, refetch } = useDashboard();
  const { data: events = [] } = useEvents();
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
  const greenCount = lots.filter((l) => l.color === "green").length;
  const yellowCount = lots.filter((l) => l.color === "yellow").length;
  const redCount = lots.filter((l) => l.color === "red").length;

  // Upcoming events in the next 24 hours
  const now = new Date();
  const in24h = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  const upcomingEvents = events
    .filter((e) => new Date(e.event_end) > now && new Date(e.event_start) <= in24h)
    .sort((a, b) => new Date(a.event_start).getTime() - new Date(b.event_start).getTime());

  useEffect(() => {
    if (sortedLots.length === 0) { setSelectedLotId(null); return; }
    setSelectedLotId((cur) =>
      sortedLots.some((l) => l.lot_id === cur) ? cur : sortedLots[0].lot_id
    );
  }, [sortedLots]);

  const selectedLot = sortedLots.find((l) => l.lot_id === selectedLotId) ?? sortedLots[0] ?? null;

  return (
    <main className="page-shell">
      <section className="hero-panel">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="eyebrow">Analytics</p>
            <h1 className="mt-4 text-4xl font-semibold tracking-tight text-slate-950">
              Live parking pressure across campus.
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600 sm:text-base">
              Network availability, lot-by-lot comparison, model confidence, and active campus
              events — all in one view.
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
          {/* ── Summary KPIs ─────────────────────────────────────── */}
          <section className="grid gap-4 md:grid-cols-3">
            <article className="surface-card">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-slate-500">Network Average</p>
                <span className="rounded-2xl bg-[var(--surface-raised)] p-2 text-[var(--accent-strong)]">
                  <Gauge className="h-4 w-4" />
                </span>
              </div>
              <p className={`mt-6 text-4xl font-semibold tracking-tight ${scoreColor(averageScore / 100)}`}>
                {averageScore}%
              </p>
              <p className="mt-2 text-sm text-slate-500">Across all {lots.length} active lots</p>
              {/* Distribution bar */}
              <div className="mt-4 flex h-2 w-full overflow-hidden rounded-full">
                {lots.length > 0 && (
                  <>
                    <div className="bg-emerald-500 transition-all" style={{ width: `${(greenCount / lots.length) * 100}%` }} />
                    <div className="bg-amber-400 transition-all" style={{ width: `${(yellowCount / lots.length) * 100}%` }} />
                    <div className="bg-rose-500 transition-all" style={{ width: `${(redCount / lots.length) * 100}%` }} />
                  </>
                )}
              </div>
              <div className="mt-2 flex gap-3 text-xs text-slate-500">
                <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-emerald-500" />{greenCount} open</span>
                <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-amber-400" />{yellowCount} limited</span>
                <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-rose-500" />{redCount} full</span>
              </div>
            </article>

            <article className="surface-card">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-slate-500">High Confidence</p>
                <span className="rounded-2xl bg-[var(--surface-raised)] p-2 text-[var(--accent-strong)]">
                  <Clock3 className="h-4 w-4" />
                </span>
              </div>
              <p className="mt-6 text-4xl font-semibold tracking-tight text-slate-950">
                {highConfidenceCount}
              </p>
              <p className="mt-2 text-sm text-slate-500">
                {highConfidenceCount === 0
                  ? "More crowd reports improve confidence"
                  : "Lots with strong signal certainty"}
              </p>
              <div className="mt-4 text-xs text-slate-400">
                {lots.filter((l) => l.confidence_level === "medium").length} medium ·{" "}
                {lots.filter((l) => l.confidence_level === "low").length} low confidence
              </div>
            </article>

            <article className="surface-card">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-slate-500">Best Right Now</p>
                <span className="rounded-2xl bg-[var(--surface-raised)] p-2 text-[var(--accent-strong)]">
                  <TrendingUp className="h-4 w-4" />
                </span>
              </div>
              <p className="mt-6 text-2xl font-semibold tracking-tight text-slate-950 truncate">
                {topLot?.lot_name ?? "Unavailable"}
              </p>
              <p className={`mt-2 text-3xl font-semibold tracking-tight ${topLot ? scoreColor(topLot.prob_score) : "text-slate-400"}`}>
                {topLot ? formatPercent(topLot.prob_score) : "—"}
              </p>
              <p className="mt-1 text-xs capitalize text-slate-400">
                {topLot ? `${topLot.lot_type} · ${topLot.confidence_level} confidence` : ""}
              </p>
            </article>
          </section>

          {/* ── Lot Ranking + Map ────────────────────────────────── */}
          <section className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
            {/* Left: Lot ranking with bars */}
            <article className="surface-card">
              <div className="mb-6 flex items-center gap-3">
                <span className="rounded-2xl bg-[var(--surface-raised)] p-2 text-[var(--accent-strong)]">
                  <BarChart3 className="h-4 w-4" />
                </span>
                <div>
                  <h2 className="section-title">All Lots — Availability Now</h2>
                  <p className="section-copy">Click any row to spotlight it on the map.</p>
                </div>
              </div>

              <div className="space-y-2">
                {sortedLots.map((lot, index) => (
                  <button
                    key={lot.lot_id}
                    type="button"
                    onClick={() => setSelectedLotId(lot.lot_id)}
                    className={`w-full rounded-[20px] border px-4 py-3 text-left transition ${
                      lot.lot_id === selectedLot?.lot_id
                        ? "border-[#0f2f63] bg-[#0f2f63] text-white"
                        : "border-[#e5ebf2] bg-white/70 hover:border-[#c8d4e4] hover:bg-white"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span
                        className={`flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                          lot.lot_id === selectedLot?.lot_id
                            ? "bg-white/20 text-white"
                            : "bg-gradient-to-br from-[#c99712] to-[#e4bc41] text-white"
                        }`}
                      >
                        {index + 1}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <p className={`truncate text-sm font-semibold ${lot.lot_id === selectedLot?.lot_id ? "text-white" : "text-slate-900"}`}>
                            {lot.lot_name}
                          </p>
                          <span className={`flex-shrink-0 text-sm font-bold ${lot.lot_id === selectedLot?.lot_id ? "text-white" : scoreColor(lot.prob_score)}`}>
                            {formatPercent(lot.prob_score)}
                          </span>
                        </div>
                        {/* Availability bar */}
                        <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-black/10">
                          <div
                            className={`h-full rounded-full transition-all duration-500 ${
                              lot.lot_id === selectedLot?.lot_id ? "bg-white/70" : barBg(lot.prob_score)
                            }`}
                            style={{ width: formatPercent(lot.prob_score) }}
                          />
                        </div>
                        <div className={`mt-1.5 flex items-center justify-between text-[11px] uppercase tracking-[0.15em] ${lot.lot_id === selectedLot?.lot_id ? "text-white/60" : "text-slate-400"}`}>
                          <span className="capitalize">{lot.lot_type}</span>
                          <span className="capitalize">{lot.confidence_level}</span>
                        </div>
                      </div>
                      <ChevronRight className={`h-4 w-4 flex-shrink-0 ${lot.lot_id === selectedLot?.lot_id ? "text-white/60" : "text-slate-300"}`} />
                    </div>
                  </button>
                ))}
              </div>

              {/* View detail link */}
              {selectedLot && (
                <button
                  onClick={() => navigate(`/lots/${selectedLot.lot_id}`)}
                  className="mt-5 flex w-full items-center justify-center gap-2 rounded-[20px] border border-[#dbe5f0] bg-[var(--surface-raised)] py-3 text-sm font-medium text-[var(--accent-deep)] transition hover:bg-white"
                >
                  View prediction timeline for {selectedLot.lot_name}
                  <ChevronRight className="h-4 w-4" />
                </button>
              )}
            </article>

            {/* Right: Attention panel + constrained lot */}
            <div className="flex flex-col gap-4">
              {constrainedLot && (
                <article className="surface-card">
                  <div className="flex items-center gap-2 text-rose-600">
                    <TrendingDown className="h-4 w-4" />
                    <p className="eyebrow text-rose-500">Tightest Lot</p>
                  </div>
                  <p className="mt-4 text-2xl font-semibold tracking-tight text-slate-950">
                    {constrainedLot.lot_name}
                  </p>
                  <div className="mt-3 flex items-end gap-3">
                    <p className={`text-5xl font-semibold tracking-tight ${scoreColor(constrainedLot.prob_score)}`}>
                      {formatPercent(constrainedLot.prob_score)}
                    </p>
                    <p className="mb-1 text-sm text-slate-500">availability</p>
                  </div>
                  <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-slate-100">
                    <div
                      className={`h-full rounded-full transition-all duration-700 ${barBg(constrainedLot.prob_score)}`}
                      style={{ width: formatPercent(constrainedLot.prob_score) }}
                    />
                  </div>
                  <div className="mt-4 rounded-[20px] bg-[var(--surface-raised)] px-4 py-3">
                    <p className="text-[11px] uppercase tracking-[0.2em] text-slate-400">Confidence</p>
                    <p className="mt-1 text-lg font-semibold capitalize text-slate-950">
                      {constrainedLot.confidence_level}
                    </p>
                  </div>
                </article>
              )}

              {/* Campus Events today */}
              {upcomingEvents.length > 0 && (
                <article className="surface-card">
                  <div className="mb-4 flex items-center gap-3">
                    <span className="rounded-2xl bg-[var(--surface-raised)] p-2 text-[var(--accent-strong)]">
                      <CalendarDays className="h-4 w-4" />
                    </span>
                    <div>
                      <h2 className="section-title">Campus Events</h2>
                      <p className="section-copy">Next 24 hours — affects predictions.</p>
                    </div>
                  </div>
                  <div className="space-y-2">
                    {upcomingEvents.slice(0, 4).map((ev) => (
                      <EventCard key={ev.event_id} event={ev} />
                    ))}
                  </div>
                </article>
              )}
            </div>
          </section>

          {/* ── Analytics Map ────────────────────────────────────── */}
          <section className="presentation-shell overflow-hidden">
            <div className="presentation-band h-2 w-full" />
            <div className="grid gap-6 px-6 py-6 xl:grid-cols-[0.8fr_1.2fr] lg:px-8 lg:py-8">
              <div className="rounded-[28px] border border-[#dbe5f0] bg-white/92 p-5">
                <div className="flex items-center gap-3">
                  <span className="rounded-2xl bg-[var(--surface-raised)] p-2 text-[var(--accent-strong)]">
                    <MapPinned className="h-4 w-4" />
                  </span>
                  <div>
                    <p className="eyebrow">Selected Lot</p>
                    <h2 className="section-title">Lot Detail</h2>
                  </div>
                </div>

                {selectedLot ? (
                  <>
                    <p className="mt-5 text-2xl font-semibold tracking-tight text-[var(--accent-deep)]">
                      {selectedLot.lot_name}
                    </p>
                    <p className={`mt-3 text-4xl font-semibold tracking-tight ${scoreColor(selectedLot.prob_score)}`}>
                      {formatPercent(selectedLot.prob_score)}
                    </p>
                    <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-slate-100">
                      <div
                        className={`h-full rounded-full ${barBg(selectedLot.prob_score)} transition-all duration-700`}
                        style={{ width: formatPercent(selectedLot.prob_score) }}
                      />
                    </div>
                    <div className="mt-4 grid gap-3 sm:grid-cols-2">
                      <div className="rounded-[20px] border border-[#e5ebf2] bg-white px-4 py-4">
                        <p className="text-[11px] uppercase tracking-[0.22em] text-slate-400">Status</p>
                        <p className={`mt-2 text-base font-semibold ${scoreColor(selectedLot.prob_score)}`}>
                          {selectedLot.color === "green"
                            ? "High availability"
                            : selectedLot.color === "yellow"
                              ? "Moderate pressure"
                              : "Nearly full"}
                        </p>
                      </div>
                      <div className="rounded-[20px] border border-[#e5ebf2] bg-white px-4 py-4">
                        <p className="text-[11px] uppercase tracking-[0.22em] text-slate-400">Permit</p>
                        <p className="mt-2 text-base font-semibold capitalize text-[var(--accent-deep)]">
                          {selectedLot.lot_type}
                        </p>
                      </div>
                    </div>
                    <div className="mt-4 rounded-[20px] border border-[#0f2f63] bg-[#0f2f63] px-4 py-4 text-white">
                      <p className="text-[11px] uppercase tracking-[0.22em] text-[#d3dded]">Confidence</p>
                      <p className="mt-2 text-xl font-semibold capitalize">{selectedLot.confidence_level}</p>
                    </div>
                    <button
                      onClick={() => navigate(`/lots/${selectedLot.lot_id}`)}
                      className="mt-4 flex w-full items-center justify-center gap-2 rounded-[20px] bg-[var(--surface-raised)] py-3 text-sm font-medium text-[var(--accent-deep)] transition hover:bg-white border border-[#dbe5f0]"
                    >
                      Prediction timeline
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  </>
                ) : (
                  <p className="mt-5 text-sm text-slate-500">Click a lot in the ranking or map to inspect it.</p>
                )}
              </div>

              <div className="relative overflow-hidden rounded-[32px] border border-[#dbe5f0] bg-slate-200 shadow-[0_32px_80px_-48px_rgba(15,47,99,0.45)]">
                {selectedLot && selectedLot.latitude != null && selectedLot.longitude != null ? (
                  <MapContainer
                    center={[selectedLot.latitude, selectedLot.longitude]}
                    zoom={16}
                    scrollWheelZoom
                    className="h-[560px] w-full"
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
                        radius={lot.lot_id === selectedLot.lot_id ? 14 : 10}
                        eventHandlers={{ click: () => setSelectedLotId(lot.lot_id) }}
                      >
                        <Popup>
                          <div className="min-w-[180px] p-1">
                            <div className="flex items-center justify-between gap-3">
                              <p className="text-sm font-semibold text-slate-900">{lot.lot_name}</p>
                              <span className={`text-sm font-bold ${scoreColor(lot.prob_score)}`}>
                                {formatPercent(lot.prob_score)}
                              </span>
                            </div>
                            <p className="mt-1 text-xs capitalize text-slate-500">{lot.lot_type} · {lot.confidence_level} confidence</p>
                            <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                              <div
                                className={`h-full rounded-full ${barBg(lot.prob_score)}`}
                                style={{ width: formatPercent(lot.prob_score) }}
                              />
                            </div>
                            <p className={`mt-2 text-xs font-medium ${lot.color === "green" ? "text-emerald-600" : lot.color === "yellow" ? "text-amber-600" : "text-rose-600"}`}>
                              {lot.color === "green" ? "High availability" : lot.color === "yellow" ? "Moderate pressure" : "Nearly full"}
                            </p>
                          </div>
                        </Popup>
                      </CircleMarker>
                    ))}
                  </MapContainer>
                ) : (
                  <div className="flex h-[560px] items-center justify-center bg-[linear-gradient(160deg,_#f7f5ef_0%,_#fdfcf9_45%,_#eef4fb_100%)] px-8 text-center text-sm text-slate-500">
                    The selected lot does not have map coordinates yet.
                  </div>
                )}

                <div className="pointer-events-none absolute left-5 top-5 rounded-full bg-white/88 px-4 py-2 text-xs font-medium tracking-[0.18em] text-slate-500 backdrop-blur">
                  ANALYTICS MAP
                </div>
                <div className="pointer-events-none absolute bottom-5 right-5 rounded-[20px] bg-white/88 px-4 py-2 text-xs text-slate-500 backdrop-blur">
                  Click any marker to inspect that lot
                </div>
              </div>
            </div>
          </section>
        </>
      )}
    </main>
  );
}
