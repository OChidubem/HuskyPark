import { useState } from "react";
import { MapPin } from "lucide-react";
import type { DashboardLot } from "../types";
import ProbabilityBadge from "./ProbabilityBadge";
import ReportModal from "./ReportModal";

interface Props {
  lot: DashboardLot;
  onDetailClick: (lot: DashboardLot) => void;
}

const BORDER_COLOR = {
  green:  "border-l-green-500",
  yellow: "border-l-yellow-500",
  red:    "border-l-red-500",
};

export default function LotCard({ lot, onDetailClick }: Props) {
  const [showReport, setShowReport] = useState(false);

  return (
    <>
      <article
        className={`relative rounded-xl border border-gray-200 border-l-4
          ${BORDER_COLOR[lot.color]} bg-white shadow-sm transition hover:shadow-md`}
      >
        <button
          className="w-full text-left p-4"
          onClick={() => onDetailClick(lot)}
          aria-label={`View details for ${lot.lot_name}`}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h3 className="truncate font-semibold text-gray-900">{lot.lot_name}</h3>
              <p className="mt-0.5 flex items-center gap-1 text-xs text-gray-500">
                <MapPin className="h-3 w-3 flex-shrink-0" aria-hidden="true" />
                <span className="capitalize">{lot.lot_type}</span>
                &nbsp;·&nbsp;
                <span className="capitalize">{lot.confidence_level} confidence</span>
              </p>
            </div>
            <ProbabilityBadge score={lot.prob_score} color={lot.color} size="sm" />
          </div>

          {lot.trend?.trend_summary && (
            <p className="mt-2 text-xs text-gray-400">
              7-day avg: {lot.trend.trend_summary.last_7_days_avg_pct.toFixed(1)}%
            </p>
          )}
        </button>

        <div className="border-t border-gray-100 px-4 py-2">
          <button
            className="text-xs font-medium text-blue-600 hover:text-blue-800 focus:outline-none
              focus-visible:ring-2 focus-visible:ring-blue-500 rounded"
            onClick={() => setShowReport(true)}
            aria-label={`Report spot status for ${lot.lot_name}`}
          >
            + Report Spot
          </button>
        </div>
      </article>

      {showReport && (
        <ReportModal
          lot={lot}
          onClose={() => setShowReport(false)}
        />
      )}
    </>
  );
}
