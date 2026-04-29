import { useState } from "react";
import { ArrowUpRight, MapPin } from "lucide-react";
import type { DashboardLot } from "../types";
import ReportModal from "./ReportModal";

interface Props {
  lot: DashboardLot;
  onDetailClick: (lot: DashboardLot) => void;
}

const BORDER_COLOR = {
  green: "border-l-8 border-emerald-500",
  yellow: "border-l-8 border-amber-500",
  red: "border-l-8 border-rose-500",
};

const SCORE_COLOR = {
  green: "text-emerald-600",
  yellow: "text-amber-600",
  red: "text-rose-600",
};

const STATUS_COPY = {
  green: "High availability",
  yellow: "Filling up",
  red: "Nearly full",
};

const ACCENT_STRIP = {
  green: "bg-emerald-600",
  yellow: "bg-amber-600",
  red: "bg-rose-600",
};

export default function LotCard({ lot, onDetailClick }: Props) {
  const [showReport, setShowReport] = useState(false);

  return (
    <>
      <article
        className={`relative overflow-hidden rounded-[28px] border border-[#dbe5f0] bg-white shadow-[0_20px_55px_-38px_rgba(15,47,99,0.3)] transition duration-200 hover:-translate-y-1 ${BORDER_COLOR[lot.color]}`}
      >
        <div className={`absolute inset-y-0 left-0 w-5 ${ACCENT_STRIP[lot.color]}`} />
        <button className="w-full px-1 text-left" onClick={() => onDetailClick(lot)} aria-label={`View details for ${lot.lot_name}`}>
          <div className="flex items-start justify-between gap-6 px-7 pt-7">
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-400">
                {lot.lot_code}
              </p>
              <h3 className="mt-2 truncate text-2xl font-semibold tracking-tight text-[var(--accent-deep)]">
                {lot.lot_name}
              </h3>
              <p className="mt-3 text-lg text-slate-500">{STATUS_COPY[lot.color]}</p>
              <p className="mt-4 flex items-center gap-1 text-xs uppercase tracking-[0.18em] text-slate-400">
                <MapPin className="h-3 w-3 flex-shrink-0" aria-hidden="true" />
                <span className="capitalize">{lot.lot_type}</span>
                &nbsp;·&nbsp;
                <span className="capitalize">{lot.confidence_level} confidence</span>
              </p>
            </div>
            <div className="flex flex-col items-end">
              <p className={`text-5xl font-semibold tracking-tight ${SCORE_COLOR[lot.color]}`}>
                {Math.round(lot.prob_score * 100)}%
              </p>
              <span className="mt-2 flex items-center gap-1.5 text-xs uppercase tracking-[0.18em] text-slate-400">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
                  <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500" />
                </span>
                Live
              </span>
              <div className="mt-4 inline-flex items-center gap-1 rounded-full bg-slate-100 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                Open details
                <ArrowUpRight className="h-3.5 w-3.5" />
              </div>
            </div>
          </div>

          {lot.trend?.trend_summary && (
            <div className="mt-6 flex gap-3 px-7">
              <div className="rounded-[22px] bg-[var(--surface-raised)] px-4 py-3">
                <p className="text-[11px] uppercase tracking-[0.18em] text-slate-400">7-day avg</p>
                <p className="mt-2 text-xl font-semibold tracking-tight text-[var(--accent-deep)]">
                  {lot.trend.trend_summary.last_7_days_avg_pct.toFixed(1)}%
                </p>
              </div>
            </div>
          )}
        <div className="px-7 pb-5 pt-4">
          <div className="relative h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
            <div
              className={`absolute inset-y-0 left-0 rounded-full transition-all duration-700 ease-out ${
                lot.color === "green"
                  ? "bg-emerald-500"
                  : lot.color === "yellow"
                    ? "bg-amber-500"
                    : "bg-rose-500"
              }`}
              style={{ width: `${Math.round(lot.prob_score * 100)}%` }}
              aria-hidden="true"
            />
          </div>
        </div>
        </button>

        <div className="border-t border-slate-200/70 px-7 pb-6 pt-4">
          <button className="button-secondary px-3 py-2 text-xs" onClick={() => setShowReport(true)} aria-label={`Report spot status for ${lot.lot_name}`}>
            Report spot
          </button>
        </div>
      </article>

      {showReport && <ReportModal lot={lot} onClose={() => setShowReport(false)} />}
    </>
  );
}
