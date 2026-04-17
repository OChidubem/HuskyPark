import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Sparkles, Send } from "lucide-react";
import api from "../lib/api";
import type { RecommendResponse } from "../types";
import ProbabilityBadge from "../components/ProbabilityBadge";

function scoreToColor(score: number) {
  if (score >= 0.65) return "green" as const;
  if (score >= 0.35) return "yellow" as const;
  return "red" as const;
}

export default function AIRecommend() {
  const [query, setQuery] = useState("");
  const [result, setResult] = useState<RecommendResponse | null>(null);

  const mutation = useMutation({
    mutationFn: (q: string) =>
      api.post<RecommendResponse>("/recommend", { query: q }).then((r) => r.data),
    onSuccess: (data) => setResult(data),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim().length >= 5) {
      mutation.mutate(query.trim());
    }
  };

  return (
    <main className="min-h-screen bg-gray-50 p-6">
      <div className="mx-auto max-w-2xl">
        <div className="mb-6 flex items-center gap-3">
          <Sparkles className="h-6 w-6 text-yellow-500" />
          <div>
            <h1 className="text-2xl font-bold text-gray-900">AI Recommendation</h1>
            <p className="text-sm text-gray-500">Ask where to park in natural language</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="mb-6">
          <div className="flex gap-2">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="e.g. Where can I park near Atwood at 9 AM?"
              className="flex-1 rounded-xl border border-gray-300 px-4 py-3 text-sm
                focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              aria-label="Parking query"
              minLength={5}
              required
            />
            <button
              type="submit"
              disabled={mutation.isPending || query.length < 5}
              className="flex items-center gap-2 rounded-xl bg-[#1a2744] px-5 py-3 text-sm
                font-semibold text-white hover:bg-[#243561] disabled:opacity-60 transition
                focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
            >
              <Send className="h-4 w-4" />
              {mutation.isPending ? "Asking…" : "Ask"}
            </button>
          </div>
        </form>

        {mutation.isError && (
          <p className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-600 border border-red-200">
            Recommendation failed. Please try again.
          </p>
        )}

        {result && (
          <div className="space-y-4">
            {/* Ranked lots */}
            <section>
              <h2 className="mb-3 text-sm font-semibold text-gray-700 uppercase tracking-wide">
                Recommended Lots
              </h2>
              <ol className="space-y-3">
                {result.recommendations.map((rec) => (
                  <li
                    key={rec.lot_id}
                    className="flex items-start gap-4 rounded-xl border border-gray-200 bg-white p-4 shadow-sm"
                  >
                    <span className="flex h-7 w-7 flex-shrink-0 items-center justify-center
                      rounded-full bg-[#1a2744] text-xs font-bold text-white">
                      {rec.rank}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-semibold text-gray-900">{rec.lot_name}</span>
                        <ProbabilityBadge
                          score={rec.prob_score}
                          color={scoreToColor(rec.prob_score)}
                          size="sm"
                        />
                      </div>
                      <p className="mt-1 text-sm text-gray-500">{rec.rationale}</p>
                    </div>
                  </li>
                ))}
              </ol>
            </section>

            {/* AI response text */}
            <section className="rounded-xl border border-blue-100 bg-blue-50 p-4">
              <h2 className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-blue-700">
                <Sparkles className="h-3.5 w-3.5" />
                AI Response
              </h2>
              <p className="text-sm text-blue-900 whitespace-pre-line">{result.ai_response_text}</p>
            </section>
          </div>
        )}
      </div>
    </main>
  );
}
