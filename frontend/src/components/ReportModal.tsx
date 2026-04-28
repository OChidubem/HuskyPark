import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { X } from "lucide-react";
import api from "../lib/api";
import type { DashboardLot, ReportCreatePayload, ReportStatus } from "../types";

interface Props {
  lot: DashboardLot;
  onClose: () => void;
}

const STATUS_OPTIONS: { value: ReportStatus; label: string }[] = [
  { value: "found_spot", label: "Found a spot" },
  { value: "hard_to_find", label: "Hard to find" },
  { value: "lot_full", label: "Lot is full" },
];

export default function ReportModal({ lot, onClose }: Props) {
  const qc = useQueryClient();
  const [status, setStatus] = useState<ReportStatus>("found_spot");
  const [approx, setApprox] = useState("");
  const [note, setNote] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const mutation = useMutation({
    mutationFn: (payload: ReportCreatePayload) => api.post("/reports", payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["dashboard"] });
      setSubmitted(true);
      setTimeout(onClose, 1500);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    mutation.mutate({
      lot_id: lot.lot_id,
      status,
      approx_available: approx ? parseInt(approx, 10) : undefined,
      note: note || undefined,
    });
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="report-modal-title"
    >
      <div className="w-full max-w-md rounded-[32px] border border-white/70 bg-white/90 shadow-[0_30px_80px_-40px_rgba(15,23,42,0.6)] backdrop-blur-xl">
        <div className="flex items-center justify-between border-b border-slate-200/80 px-6 py-5">
          <h2 id="report-modal-title" className="font-semibold tracking-tight text-slate-950">
            Report — {lot.lot_name}
          </h2>
          <button
            onClick={onClose}
            className="button-secondary rounded-full px-3 py-2 text-slate-500 hover:text-slate-700"
            aria-label="Close modal"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {submitted ? (
          <p className="px-6 py-10 text-center font-medium text-emerald-600">
            Thanks! Report submitted.
          </p>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5 px-6 py-5">
            <fieldset>
              <legend className="input-label">Status</legend>
              <div className="space-y-2">
                {STATUS_OPTIONS.map((opt) => (
                  <label
                    key={opt.value}
                    className="flex cursor-pointer items-center gap-3 rounded-2xl border border-slate-200/80 bg-[var(--surface-raised)] px-4 py-3"
                  >
                    <input
                      type="radio"
                      name="status"
                      value={opt.value}
                      checked={status === opt.value}
                      onChange={() => setStatus(opt.value)}
                      className="accent-[var(--accent-strong)]"
                    />
                    <span className="text-sm text-slate-700">{opt.label}</span>
                  </label>
                ))}
              </div>
            </fieldset>

            <div>
              <label htmlFor="approx" className="input-label">
                Estimated open spots
              </label>
              <input
                id="approx"
                type="number"
                min={0}
                value={approx}
                onChange={(e) => setApprox(e.target.value)}
                className="input-field"
                placeholder="e.g. 5"
              />
            </div>

            <div>
              <label htmlFor="note" className="input-label">
                Note
              </label>
              <textarea
                id="note"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                maxLength={300}
                rows={2}
                className="input-field"
                placeholder="Any extra context…"
              />
            </div>

            {mutation.isError && (
              <p className="text-sm text-rose-600">Submission failed. Please try again.</p>
            )}

            <button type="submit" disabled={mutation.isPending} className="button-primary w-full justify-center">
              {mutation.isPending ? "Submitting…" : "Submit Report"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
