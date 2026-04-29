import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { CarFront, MapPinned, RefreshCw, Route, Sparkles } from "lucide-react";
import { useDashboard } from "../hooks/useDashboard";
import AppleParkingMap from "../components/AppleParkingMap";
import LotCard from "../components/LotCard";
import type { DashboardLot } from "../types";

const PERMIT_FILTERS = [
  { value: "", label: "All Lots" },
  { value: "commuter", label: "Commuter" },
  { value: "resident", label: "Resident" },
  { value: "employee", label: "Employee" },
  { value: "ramp", label: "Ramp / Pay" },
];

export default function Dashboard() {
  const navigate = useNavigate();
  const [permitType, setPermitType] = useState("");
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<"high" | "low">("high");

  const { data: lots = [], isLoading, isError, refetch, isFetching } = useDashboard(
    permitType || undefined
  );

  const filtered = lots
    .filter((l) => l.lot_name.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) =>
      sortBy === "high" ? b.prob_score - a.prob_score : a.prob_score - b.prob_score
    );

  const handleDetail = (lot: DashboardLot) => {
    navigate(`/lots/${lot.lot_id}`);
  };

  const bestLot = filtered[0];
  const cautionLot =
    [...filtered].reverse().find((lot) => lot.color === "red") ??
    (filtered.length > 0 ? filtered[filtered.length - 1] : undefined);
  const greenCount = filtered.filter((lot) => lot.color === "green").length;

  return (
    <main className="page-shell">
      <section className="presentation-shell overflow-hidden">
        <div className="presentation-band h-2 w-full" />
        <div className="grid gap-8 px-6 py-7 lg:grid-cols-[1.15fr_0.85fr] lg:px-8 lg:py-8">
          <div>
            <div className="flex items-center gap-4">
              <div className="h-12 w-3 rounded-full bg-[var(--accent-strong)]" />
              <p className="eyebrow">System Idea · The Solution</p>
            </div>
            <h1 className="presentation-headline mt-6">HuskyPark Predictor at a glance.</h1>
            <p className="mt-6 max-w-3xl text-lg leading-9 text-slate-700">
              A live dashboard of availability probability for every campus lot. Read the best
              options first, compare confidence quickly, and use the map to choose before you start
              circling.
            </p>

            <div className="mt-8 grid gap-4 sm:grid-cols-2">
              <div className="flex gap-4 rounded-[24px] bg-white/70 px-5 py-5">
                <div className="mt-1 flex h-11 w-11 items-center justify-center rounded-full bg-[#f6e3a5] text-[var(--accent-deep)]">
                  <Sparkles className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-lg font-semibold text-[var(--accent-deep)]">
                    Probability score
                  </p>
                  <p className="mt-1 text-sm leading-6 text-slate-600">
                    Blends crowd reports, weather, events, and occupancy history.
                  </p>
                </div>
              </div>

              <div className="flex gap-4 rounded-[24px] bg-white/70 px-5 py-5">
                <div className="mt-1 flex h-11 w-11 items-center justify-center rounded-full bg-[#f6e3a5] text-[var(--accent-deep)]">
                  <Route className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-lg font-semibold text-[var(--accent-deep)]">
                    Ranked for quick decisions
                  </p>
                  <p className="mt-1 text-sm leading-6 text-slate-600">
                    Best lot first, fallback options nearby, and confidence visible at a glance.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="grid gap-4 self-start">
            <div className="rounded-[28px] border border-[#dbe5f0] bg-white px-5 py-5 shadow-[0_24px_60px_-40px_rgba(15,47,99,0.28)]">
              <div className="flex items-start justify-between gap-5">
                <div>
                  <p className="text-2xl font-semibold text-[var(--accent-deep)]">
                    {bestLot?.lot_name ?? "No lots yet"}
                  </p>
                  <p className="mt-2 text-lg text-slate-500">
                    {bestLot ? "Best available right now" : "Waiting for live data"}
                  </p>
                </div>
                <p className="text-6xl font-semibold tracking-tight text-emerald-600">
                  {bestLot ? `${Math.round(bestLot.prob_score * 100)}%` : "--"}
                </p>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-[24px] border border-[#dbe5f0] bg-white/88 px-5 py-5">
                <div className="flex items-center gap-3 text-[var(--accent-deep)]">
                  <MapPinned className="h-5 w-5" />
                  <p className="text-sm font-semibold uppercase tracking-[0.2em]">Green lots</p>
                </div>
                <p className="mt-3 text-4xl font-semibold text-[var(--accent-deep)]">
                  {greenCount}
                </p>
                <p className="mt-2 text-sm text-slate-500">High-confidence openings right now.</p>
              </div>

              <div className="rounded-[24px] border border-[#dbe5f0] bg-white/88 px-5 py-5">
                <div className="flex items-center gap-3 text-[var(--accent-deep)]">
                  <CarFront className="h-5 w-5" />
                  <p className="text-sm font-semibold uppercase tracking-[0.2em]">Use caution</p>
                </div>
                <p className="mt-3 text-xl font-semibold text-[var(--accent-deep)]">
                  {cautionLot?.lot_name ?? "No lot flagged"}
                </p>
                <p className="mt-2 text-sm text-slate-500">
                  {cautionLot
                    ? `${Math.round(cautionLot.prob_score * 100)}% availability`
                    : "No low-availability lot is currently visible."}
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="hero-panel border-[#e0e6ef] bg-white/70">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="eyebrow">Live Filters</p>
            <h2 className="mt-3 text-2xl font-semibold tracking-tight text-[var(--accent-deep)]">
              Compare the lots that matter to your permit.
            </h2>
          </div>
          <button
            onClick={() => refetch()}
            disabled={isFetching}
            className="button-secondary self-start lg:self-auto"
            aria-label="Refresh dashboard"
          >
            <RefreshCw className={`h-4 w-4 ${isFetching ? "animate-spin" : ""}`} />
            {isFetching ? "Refreshing" : "Refresh"}
          </button>
        </div>

        <div className="mt-6 grid gap-3 lg:grid-cols-[1.25fr_0.85fr_0.85fr]">
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search lot name"
            className="input-field"
            aria-label="Search lots"
          />

          <select
            value={permitType}
            onChange={(e) => setPermitType(e.target.value)}
            className="input-field"
            aria-label="Filter by permit type"
          >
            {PERMIT_FILTERS.map((f) => (
              <option key={f.value} value={f.value}>
                {f.label}
              </option>
            ))}
          </select>

          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as "high" | "low")}
            className="input-field"
            aria-label="Sort order"
          >
            <option value="high">Highest availability first</option>
            <option value="low">Lowest availability first</option>
          </select>
        </div>
      </section>

      {isLoading && <p className="empty-state">Loading lots…</p>}

      {isError && (
        <div className="surface-card border-rose-200/80 bg-rose-50/80 text-sm text-rose-700">
          Failed to load dashboard data. <button onClick={() => refetch()} className="underline">Retry</button>
        </div>
      )}

      {!isLoading && !isError && (
        <>
          <AppleParkingMap lots={filtered} />
          {filtered.length === 0 ? (
            <p className="empty-state">No lots match your filters.</p>
          ) : (
            <section className="presentation-shell overflow-hidden">
              <div className="flex items-center justify-between gap-4 border-b border-[#e5ebf2] px-6 py-5 lg:px-8">
                <div>
                  <p className="eyebrow">Ranked Results</p>
                  <h2 className="mt-2 text-2xl font-semibold tracking-tight text-[var(--accent-deep)]">
                    Best lots for this moment
                  </h2>
                </div>
                <p className="rounded-full bg-[#0f2f63] px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-white">
                  {filtered.length} visible
                </p>
              </div>
              <div className="grid gap-4 px-6 py-6 sm:grid-cols-2 lg:px-8 xl:grid-cols-3">
              {filtered.map((lot) => (
                <LotCard key={lot.lot_id} lot={lot} onDetailClick={handleDetail} />
              ))}
              </div>
            </section>
          )}
        </>
      )}
    </main>
  );
}
