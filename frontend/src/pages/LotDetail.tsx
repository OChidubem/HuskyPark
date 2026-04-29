import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Info } from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ResponsiveContainer,
  ReferenceLine,
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

  const chartData = [...predictions].reverse().map((p: Prediction) => ({
    time: formatHour(p.target_time),
    score: Math.round(p.prob_score * 100),
  }));

  const latest: Prediction | undefined = predictions[0];

  return (
    <main className="page-shell">
      <button onClick={() => navigate(-1)} className="button-secondary mb-4">
        <ArrowLeft className="h-4 w-4" />
        Back to Dashboard
      </button>

      {isLoading ? (
        <p className="empty-state">Loading predictions…</p>
      ) : (
        <>
          <section className="hero-panel">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="eyebrow">Lot Detail</p>
                <h1 className="mt-4 text-4xl font-semibold tracking-tight text-slate-950">
                  Lot {id} prediction timeline
                </h1>
                <p className="mt-2 text-sm text-slate-500">24-hour prediction history</p>
              </div>
              {latest && (
                <ProbabilityBadge
                  score={latest.prob_score}
                  color={scoreToColor(latest.prob_score)}
                  size="lg"
                />
              )}
            </div>
          </section>

          <div className="grid gap-4 xl:grid-cols-[1.25fr_0.75fr]">
            <div className="surface-card">
              <h2 className="section-title">Availability Over Time</h2>
              <p className="section-copy mt-1">Short horizon probability trend for this lot.</p>
              <div className="mt-6 h-[260px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="time" tick={{ fontSize: 11, fill: "#64748b" }} />
                    <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: "#64748b" }} unit="%" />
                    <Tooltip formatter={(v) => [`${v}%`, "Availability"]} />
                    <ReferenceLine y={65} stroke="#10b981" strokeDasharray="4 4" label={{ value: "High", fontSize: 10 }} />
                    <ReferenceLine y={35} stroke="#f43f5e" strokeDasharray="4 4" label={{ value: "Low", fontSize: 10 }} />
                    <Line
                      type="monotone"
                      dataKey="score"
                      stroke="#4254d0"
                      strokeWidth={2.5}
                      dot={false}
                      activeDot={{ r: 5 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {latest?.factors_summary && (
              <div className="surface-card">
                <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold tracking-tight text-slate-950">
                  <Info className="h-4 w-4 text-[var(--accent-strong)]" />
                  Prediction Factors
                </h2>
                <dl className="grid gap-3">
                  {Object.entries(latest.factors_summary).map(([k, v]) => (
                    <div key={k} className="rounded-[24px] bg-[var(--surface-raised)] px-4 py-4">
                      <dt className="text-[11px] font-medium uppercase tracking-[0.18em] text-slate-400">
                        {k.replace(/_/g, " ")}
                      </dt>
                      <dd className="mt-2 text-sm font-semibold text-slate-950">
                        {Array.isArray(v) ? (v.length > 0 ? v.join(", ") : "None") : String(v)}
                      </dd>
                    </div>
                  ))}
                </dl>
              </div>
            )}
          </div>
        </>
      )}
    </main>
  );
}
