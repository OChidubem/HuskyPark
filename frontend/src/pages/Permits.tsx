import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { CreditCard, Plus } from "lucide-react";
import api from "../lib/api";
import type { Permit } from "../types";

function statusBadge(status: string) {
  const styles: Record<string, string> = {
    active:  "bg-green-100 text-green-800",
    expired: "bg-gray-100 text-gray-600",
    revoked: "bg-red-100 text-red-700",
  };
  return (
    <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${styles[status] ?? styles.expired}`}>
      {status}
    </span>
  );
}

export default function Permits() {
  const qc = useQueryClient();
  const { data: permits = [], isLoading } = useQuery<Permit[]>({
    queryKey: ["permits"],
    queryFn: () => api.get("/permits").then((r) => r.data),
  });

  const deactivate = useMutation({
    mutationFn: (id: number) =>
      api.patch(`/permits/${id}`, { valid_to: new Date().toISOString().split("T")[0] }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["permits"] }),
  });

  return (
    <main className="min-h-screen bg-gray-50 p-6">
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <CreditCard className="h-6 w-6 text-blue-600" />
          <h1 className="text-2xl font-bold text-gray-900">My Permits</h1>
        </div>
        <button
          className="flex items-center gap-2 rounded-xl bg-[#1a2744] px-4 py-2 text-sm
            font-semibold text-white hover:bg-[#243561] transition
            focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
        >
          <Plus className="h-4 w-4" />
          New Permit
        </button>
      </div>

      {isLoading && <p className="text-center text-sm text-gray-500 py-16">Loading permits…</p>}

      {!isLoading && permits.length === 0 && (
        <p className="text-center text-sm text-gray-500 py-16">No permits found.</p>
      )}

      <div className="space-y-3">
        {permits.map((p) => (
          <div
            key={p.user_permit_id}
            className="flex items-center justify-between rounded-2xl border border-gray-200
              bg-white px-5 py-4 shadow-sm"
          >
            <div>
              <div className="flex items-center gap-2">
                <span className="font-semibold text-gray-900">{p.permit_name}</span>
                {statusBadge(p.status)}
              </div>
              <p className="mt-0.5 text-xs text-gray-500">
                #{p.permit_number} · Valid {p.valid_from} → {p.valid_to}
              </p>
            </div>
            {p.status === "active" && (
              <button
                onClick={() => {
                  if (confirm("Deactivate this permit?")) deactivate.mutate(p.user_permit_id);
                }}
                className="text-xs text-red-500 hover:text-red-700 underline
                  focus:outline-none focus-visible:ring-2 focus-visible:ring-red-400 rounded"
              >
                Deactivate
              </button>
            )}
          </div>
        ))}
      </div>
    </main>
  );
}
