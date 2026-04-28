import { BarChart3, Clock3, Gauge, TrendingUp } from "lucide-react";
import { useDashboard } from "../hooks/useDashboard";

function formatPercent(score: number) {
  return `${Math.round(score * 100)}%`;
}

export default function Analytics() {
  const { data: lots = [], isLoading, isError, refetch } = useDashboard();

  const sortedLots = [...lots].sort((a, b) => b.prob_score - a.prob_score);
  const topLot = sortedLots[0];
  const constrainedLot = [...lots].sort((a, b) => a.prob_score - b.prob_score)[0];
  const averageScore = lots.length
    ? Math.round((lots.reduce((sum, lot) => sum + lot.prob_score, 0) / lots.length) * 100)
    : 0;
  const highConfidenceCount = lots.filter((lot) => lot.confidence_level === "high").length;

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

          <section className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
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
                  <div key={lot.lot_id} className="metric-row">
                    <div className="flex items-center gap-4">
                      <span className="rank-chip">{index + 1}</span>
                      <div>
                        <p className="font-medium text-slate-900">{lot.lot_name}</p>
                        <p className="text-sm text-slate-500 capitalize">{lot.lot_type} lot</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-slate-950">{formatPercent(lot.prob_score)}</p>
                      <p className="text-xs uppercase tracking-[0.18em] text-slate-400">
                        {lot.confidence_level}
                      </p>
                    </div>
                  </div>
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
        </>
      )}
    </main>
  );
}
