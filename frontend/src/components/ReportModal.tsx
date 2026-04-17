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
  { value: "found_spot",    label: "Found a spot" },
  { value: "hard_to_find", label: "Hard to find" },
  { value: "lot_full",     label: "Lot is full" },
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
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="report-modal-title"
    >
      <div className="w-full max-w-sm rounded-2xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
          <h2 id="report-modal-title" className="font-semibold text-gray-900">
            Report — {lot.lot_name}
          </h2>
          <button
            onClick={onClose}
            className="rounded-full p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600
              focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
            aria-label="Close modal"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {submitted ? (
          <p className="px-5 py-8 text-center text-green-600 font-medium">
            Thanks! Report submitted.
          </p>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4 px-5 py-4">
            <fieldset>
              <legend className="mb-2 text-sm font-medium text-gray-700">
                Status <span className="text-red-500">*</span>
              </legend>
              <div className="space-y-2">
                {STATUS_OPTIONS.map((opt) => (
                  <label key={opt.value} className="flex cursor-pointer items-center gap-3">
                    <input
                      type="radio"
                      name="status"
                      value={opt.value}
                      checked={status === opt.value}
                      onChange={() => setStatus(opt.value)}
                      className="accent-blue-600"
                    />
                    <span className="text-sm text-gray-700">{opt.label}</span>
                  </label>
                ))}
              </div>
            </fieldset>

            <div>
              <label htmlFor="approx" className="mb-1 block text-sm font-medium text-gray-700">
                Estimated open spots <span className="text-gray-400 font-normal">(optional)</span>
              </label>
              <input
                id="approx"
                type="number"
                min={0}
                value={approx}
                onChange={(e) => setApprox(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm
                  focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                placeholder="e.g. 5"
              />
            </div>

            <div>
              <label htmlFor="note" className="mb-1 block text-sm font-medium text-gray-700">
                Note <span className="text-gray-400 font-normal">(optional)</span>
              </label>
              <textarea
                id="note"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                maxLength={300}
                rows={2}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm
                  focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                placeholder="Any extra context…"
              />
            </div>

            {mutation.isError && (
              <p className="text-sm text-red-600">Submission failed. Please try again.</p>
            )}

            <button
              type="submit"
              disabled={mutation.isPending}
              className="w-full rounded-xl bg-blue-600 py-2.5 text-sm font-semibold text-white
                hover:bg-blue-700 disabled:opacity-60 focus:outline-none
                focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
            >
              {mutation.isPending ? "Submitting…" : "Submit Report"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
