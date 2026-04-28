import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CreditCard, Plus, X } from "lucide-react";
import api from "../lib/api";
import type { Permit, PermitCategory } from "../types";

function statusBadge(status: string) {
  const styles: Record<string, string> = {
    active: "bg-emerald-100 text-emerald-700",
    expired: "bg-slate-100 text-slate-600",
    revoked: "bg-rose-100 text-rose-700",
  };

  return (
    <span
      className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
        styles[status] ?? styles.expired
      }`}
    >
      {status}
    </span>
  );
}

function isoToday() {
  return new Date().toISOString().split("T")[0];
}

function defaultExpiry() {
  const date = new Date();
  date.setMonth(date.getMonth() + 4);
  return date.toISOString().split("T")[0];
}

export default function Permits() {
  const qc = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [permitCategoryId, setPermitCategoryId] = useState("");
  const [validFrom, setValidFrom] = useState(isoToday());
  const [validTo, setValidTo] = useState(defaultExpiry());
  const [createError, setCreateError] = useState("");

  const { data: permits = [], isLoading } = useQuery<Permit[]>({
    queryKey: ["permits"],
    queryFn: () => api.get("/permits").then((r) => r.data),
  });

  const { data: categories = [], isLoading: categoriesLoading } = useQuery<PermitCategory[]>({
    queryKey: ["permit-categories"],
    queryFn: () => api.get("/permits/categories").then((r) => r.data),
  });

  const defaultCategoryId = categories.length > 0 ? String(categories[0].permit_category_id) : "";

  const createPermit = useMutation({
    mutationFn: () =>
      api
        .post<Permit>("/permits", {
          permit_category_id: Number(permitCategoryId || defaultCategoryId),
          valid_from: validFrom,
          valid_to: validTo,
        })
        .then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["permits"] });
      setShowCreate(false);
      setCreateError("");
      setPermitCategoryId("");
      setValidFrom(isoToday());
      setValidTo(defaultExpiry());
    },
    onError: (error: unknown) => {
      const message =
        typeof error === "object" &&
        error !== null &&
        "response" in error &&
        typeof (error as { response?: { data?: { detail?: string } } }).response?.data?.detail ===
          "string"
          ? (error as { response: { data: { detail: string } } }).response.data.detail
          : "Could not create permit. Please check your dates and try again.";
      setCreateError(message);
    },
  });

  const deactivate = useMutation({
    mutationFn: (id: number) =>
      api.patch(`/permits/${id}`, { valid_to: new Date().toISOString().split("T")[0] }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["permits"] }),
  });

  return (
    <main className="page-shell">
      <section className="hero-panel">
        <div className="mb-6 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <CreditCard className="h-6 w-6 text-[var(--accent-strong)]" />
            <div>
              <p className="eyebrow">Permits</p>
              <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">
                Your active parking access
              </h1>
            </div>
          </div>
          <button
            className="button-primary"
            onClick={() => {
              setCreateError("");
              setPermitCategoryId(defaultCategoryId);
              setShowCreate(true);
            }}
          >
            <Plus className="h-4 w-4" />
            New permit
          </button>
        </div>

        <p className="max-w-2xl text-sm leading-6 text-slate-600">
          Manage permit validity and keep your profile current before the next trip to campus.
        </p>
      </section>

      {isLoading && <p className="empty-state">Loading permits…</p>}

      {!isLoading && permits.length === 0 && <p className="empty-state">No permits found.</p>}

      <div className="space-y-3">
        {permits.map((p) => (
          <div
            key={p.user_permit_id}
            className="surface-card flex items-center justify-between gap-4"
          >
            <div>
              <div className="flex items-center gap-2">
                <span className="text-lg font-semibold tracking-tight text-slate-950">
                  {p.permit_name}
                </span>
                {statusBadge(p.status)}
              </div>
              <p className="mt-1 text-sm text-slate-500">
                #{p.permit_number} · Valid {p.valid_from} to {p.valid_to}
              </p>
            </div>
            {p.status === "active" && (
              <button
                onClick={() => {
                  if (confirm("Deactivate this permit?")) deactivate.mutate(p.user_permit_id);
                }}
                className="button-secondary text-rose-600 hover:text-rose-700"
              >
                Deactivate
              </button>
            )}
          </div>
        ))}
      </div>

      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-[32px] border border-white/70 bg-white/90 p-6 shadow-[0_30px_80px_-40px_rgba(15,23,42,0.6)] backdrop-blur-xl">
            <div className="flex items-center justify-between">
              <div>
                <p className="eyebrow">Create Permit</p>
                <h2 className="mt-3 text-2xl font-semibold tracking-tight text-slate-950">
                  Add a new parking permit
                </h2>
              </div>
              <button
                className="button-secondary px-3 py-2 text-slate-500 hover:text-slate-700"
                onClick={() => setShowCreate(false)}
                aria-label="Close create permit form"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form
              className="mt-6 space-y-4"
              onSubmit={(e) => {
                e.preventDefault();
                createPermit.mutate();
              }}
            >
              <div>
                <label htmlFor="permitCategory" className="input-label">
                  Permit type
                </label>
                <select
                  id="permitCategory"
                  className="input-field"
                  value={permitCategoryId || defaultCategoryId}
                  onChange={(e) => setPermitCategoryId(e.target.value)}
                  disabled={categoriesLoading || categories.length === 0}
                >
                  {categories.map((category) => (
                    <option key={category.permit_category_id} value={category.permit_category_id}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="validFrom" className="input-label">
                    Valid from
                  </label>
                  <input
                    id="validFrom"
                    type="date"
                    className="input-field"
                    value={validFrom}
                    onChange={(e) => setValidFrom(e.target.value)}
                    required
                  />
                </div>

                <div>
                  <label htmlFor="validTo" className="input-label">
                    Valid to
                  </label>
                  <input
                    id="validTo"
                    type="date"
                    className="input-field"
                    value={validTo}
                    onChange={(e) => setValidTo(e.target.value)}
                    required
                  />
                </div>
              </div>

              {createError && <p className="text-sm text-rose-600">{createError}</p>}

              <div className="flex gap-3">
                <button
                  type="button"
                  className="button-secondary"
                  onClick={() => setShowCreate(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="button-primary"
                  disabled={createPermit.isPending || categories.length === 0}
                >
                  {createPermit.isPending ? "Creating…" : "Create permit"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}
