import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { AlertCircle, BarChart3, Sparkles, Send } from "lucide-react";
import api from "../lib/api";
import type { RecommendResponse } from "../types";
import ProbabilityBadge from "../components/ProbabilityBadge";
import { useDashboard } from "../hooks/useDashboard";

function scoreToColor(score: number) {
  if (score >= 0.65) return "green" as const;
  if (score >= 0.35) return "yellow" as const;
  return "red" as const;
}

export default function AIRecommend() {
  const [query, setQuery] = useState("");
  const [result, setResult] = useState<RecommendResponse | null>(null);
  const { data: fallbackLots = [] } = useDashboard();

  const mutation = useMutation({
    mutationFn: (q: string) =>
      api.post<RecommendResponse>("/recommend", { query: q }).then((r) => r.data),
    onSuccess: (data) => setResult(data),
  });

  const fallbackRecommendations = fallbackLots.slice(0, 3).map((lot, index) => ({
    rank: index + 1,
    lot_id: lot.lot_id,
    lot_name: lot.lot_name,
    prob_score: lot.prob_score,
    rationale: `${Math.round(lot.prob_score * 100)}% live availability with ${lot.confidence_level} confidence.`,
  }));

  const visibleRecommendations =
    result?.recommendations.length ? result.recommendations : fallbackRecommendations;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim().length >= 5) {
      mutation.mutate(query.trim());
    }
  };

  return (
    <main className="page-shell">
      <div className="mx-auto max-w-4xl">
        <div className="hero-panel">
          <div className="flex items-center gap-3">
            <Sparkles className="h-6 w-6 text-[var(--accent-strong)]" />
            <p className="eyebrow">AI Recommend</p>
          </div>
          <div>
            <h1 className="mt-4 text-4xl font-semibold tracking-tight text-slate-950">
              Ask for parking advice in plain language.
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600 sm:text-base">
              Describe where you are headed and when you plan to arrive. HuskyPark will rank the
              strongest lot options and explain the reasoning.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="mt-8">
            <div className="flex flex-col gap-3 sm:flex-row">
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Where can I park near Atwood at 9 AM?"
                className="input-field flex-1"
                aria-label="Parking query"
                minLength={5}
                required
              />
              <button
                type="submit"
                disabled={mutation.isPending || query.length < 5}
                className="button-primary justify-center sm:min-w-[148px]"
              >
                <Send className="h-4 w-4" />
                {mutation.isPending ? "Asking…" : "Ask"}
              </button>
            </div>
          </form>
        </div>

        {mutation.isError && (
          <div className="surface-card mb-4 border-amber-200/80 bg-amber-50/85 text-sm text-amber-700">
            <div className="flex items-start gap-3">
              <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
              <div>
                <p className="font-medium">AI reasoning is unavailable right now.</p>
                <p className="mt-1">
                  Live lot availability is still shown below so you can keep moving.
                </p>
              </div>
            </div>
          </div>
        )}

        {(result || fallbackRecommendations.length > 0) && (
          <div className="space-y-4">
            <section className="surface-card">
              <div className="mb-4 flex items-center justify-between gap-4">
                <h2 className="text-sm font-semibold uppercase tracking-[0.22em] text-slate-400">
                  {result ? "Recommended Lots" : "Live Availability"}
                </h2>
                {!result && (
                  <div className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                    <BarChart3 className="h-3.5 w-3.5" />
                    Fallback ranking
                  </div>
                )}
              </div>
              <ol className="space-y-3">
                {visibleRecommendations.map((rec) => (
                  <li
                    key={rec.lot_id}
                    className="flex items-start gap-4 rounded-[24px] border border-slate-200/70 bg-[var(--surface-raised)] p-4"
                  >
                    <span className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-slate-950 text-xs font-bold text-white">
                      {rec.rank}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-semibold text-slate-950">{rec.lot_name}</span>
                        <ProbabilityBadge
                          score={rec.prob_score}
                          color={scoreToColor(rec.prob_score)}
                          size="sm"
                        />
                      </div>
                      <p className="mt-1 text-sm text-slate-500">{rec.rationale}</p>
                    </div>
                  </li>
                ))}
              </ol>
            </section>

            <section className="surface-card">
              <h2 className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">
                <Sparkles className="h-3.5 w-3.5" />
                {result ? "AI Response" : "Status"}
              </h2>
              <p className="whitespace-pre-line text-sm leading-6 text-slate-700">
                {result?.ai_response_text ??
                  "Showing the best current lots by live availability because the recommendation service did not return an AI explanation."}
              </p>
            </section>
          </div>
        )}
      </div>
    </main>
  );
}
