import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Info } from "lucide-react";
import {
  LineChart, Line, XAxis, YAxis, Tooltip,
  CartesianGrid, ResponsiveContainer, ReferenceLine,
} from "recharts";
import { useLotPredictions } from "../hooks/useDashboard";
import ProbabilityBadge from "../components/ProbabilityBadge";
import type { Prediction } from "../types";

function formatHour(iso: string) {
  return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function scoreToColor(score: number) {
  if (score >= 0.65) return "green" as const;
  if (score >= 0.35) return "yellow" as const;
  return "red" as const;
}

export default function LotDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const lotId = Number(id);

  const { data: predictions = [], isLoading } = useLotPredictions(lotId);

  const chartData = [...predictions]
    .reverse()
    .map((p: Prediction) => ({
      time: formatHour(p.target_time),
      score: Math.round(p.prob_score * 100),
    }));

  const latest: Prediction | undefined = predictions[0];

  return (
    <main className="min-h-screen bg-gray-50 p-6">
      <button
        onClick={() => navigate(-1)}
        className="mb-4 flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Dashboard
      </button>

      {isLoading ? (
        <p className="text-center text-sm text-gray-500 py-16">Loading predictions…</p>
      ) : (
        <>
          {/* Header */}
          <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Lot {id} — Predictions</h1>
              <p className="text-sm text-gray-500">24-hour prediction history</p>
            </div>
            {latest && (
              <ProbabilityBadge
                score={latest.prob_score}
                color={scoreToColor(latest.prob_score)}
                size="lg"
              />
            )}
          </div>

          {/* Chart */}
          <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm mb-6">
            <h2 className="mb-4 text-sm font-semibold text-gray-700 uppercase tracking-wide">
              Availability Over Time
            </h2>
            <ResponsiveContainer width="100%" height={240}>
              <LineChart data={chartData} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="time" tick={{ fontSize: 11 }} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} unit="%" />
                <Tooltip formatter={(v) => [`${v}%`, "Availability"]} />
                <ReferenceLine y={65} stroke="#22c55e" strokeDasharray="4 4" label={{ value: "High", fontSize: 10 }} />
                <ReferenceLine y={35} stroke="#ef4444" strokeDasharray="4 4" label={{ value: "Low", fontSize: 10 }} />
                <Line
                  type="monotone"
                  dataKey="score"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Factors */}
          {latest?.factors_summary && (
            <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
              <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold text-gray-700 uppercase tracking-wide">
                <Info className="h-4 w-4 text-blue-500" />
                Prediction Factors
              </h2>
              <dl className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                {Object.entries(latest.factors_summary).map(([k, v]) => (
                  <div key={k}>
                    <dt className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                      {k.replace(/_/g, " ")}
                    </dt>
                    <dd className="mt-1 text-sm font-semibold text-gray-900">
                      {Array.isArray(v) ? (v.length > 0 ? v.join(", ") : "None") : String(v)}
                    </dd>
                  </div>
                ))}
              </dl>
            </div>
          )}
        </>
      )}
    </main>
  );
}
