import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { RefreshCw } from "lucide-react";
import { useDashboard } from "../hooks/useDashboard";
import LotCard from "../components/LotCard";
import type { DashboardLot } from "../types";

const PERMIT_FILTERS = [
  { value: "",          label: "All Lots" },
  { value: "commuter",  label: "Commuter" },
  { value: "resident",  label: "Resident" },
  { value: "employee",  label: "Employee" },
  { value: "ramp",      label: "Ramp / Pay" },
];

export default function Dashboard() {
  const navigate = useNavigate();
  const [permitType, setPermitType] = useState("");
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<"high" | "low">("high");

  const { data: lots = [], isLoading, isError, refetch, isFetching } = useDashboard(
    permitType || undefined
  );

  const filtered = lots
    .filter((l) =>
      l.lot_name.toLowerCase().includes(search.toLowerCase())
    )
    .sort((a, b) =>
      sortBy === "high" ? b.prob_score - a.prob_score : a.prob_score - b.prob_score
    );

  const handleDetail = (lot: DashboardLot) => {
    navigate(`/lots/${lot.lot_id}`);
  };

  return (
    <main className="min-h-screen bg-gray-50 p-6">
      {/* Header */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Parking Dashboard</h1>
          <p className="text-sm text-gray-500">Live probability scores — refreshes every 60 s</p>
        </div>
        <button
          onClick={() => refetch()}
          disabled={isFetching}
          className="flex items-center gap-2 rounded-lg border border-gray-300 bg-white
            px-3 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50
            disabled:opacity-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
          aria-label="Refresh dashboard"
        >
          <RefreshCw className={`h-4 w-4 ${isFetching ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      {/* Filters */}
      <div className="mb-5 flex flex-wrap gap-3">
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search lot name…"
          className="w-48 rounded-lg border border-gray-300 px-3 py-2 text-sm
            focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          aria-label="Search lots"
        />

        <select
          value={permitType}
          onChange={(e) => setPermitType(e.target.value)}
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm
            focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          aria-label="Filter by permit type"
        >
          {PERMIT_FILTERS.map((f) => (
            <option key={f.value} value={f.value}>{f.label}</option>
          ))}
        </select>

        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as "high" | "low")}
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm
            focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          aria-label="Sort order"
        >
          <option value="high">Highest availability first</option>
          <option value="low">Lowest availability first</option>
        </select>
      </div>

      {/* States */}
      {isLoading && (
        <p className="text-center text-sm text-gray-500 py-16">Loading lots…</p>
      )}

      {isError && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          Failed to load dashboard data.{" "}
          <button onClick={() => refetch()} className="underline">Retry</button>
        </div>
      )}

      {/* Grid */}
      {!isLoading && !isError && (
        <>
          {filtered.length === 0 ? (
            <p className="text-center text-sm text-gray-500 py-16">No lots match your filters.</p>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {filtered.map((lot) => (
                <LotCard key={lot.lot_id} lot={lot} onDetailClick={handleDetail} />
              ))}
            </div>
          )}
        </>
      )}
    </main>
  );
}
