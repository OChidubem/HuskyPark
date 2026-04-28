import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Calendar, Trash2, Plus } from "lucide-react";
import api from "../../lib/api";
import type { CampusEvent } from "../../types";

export default function AdminEvents() {
  const qc = useQueryClient();
  const { data: events = [], isLoading } = useQuery<CampusEvent[]>({
    queryKey: ["events"],
    queryFn: () => api.get("/events").then((r) => r.data),
  });

  const deleteEvent = useMutation({
    mutationFn: (id: number) => api.delete(`/events/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["events"] }),
  });

  return (
    <main className="page-shell">
      <section className="hero-panel">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="eyebrow">Admin</p>
            <h1 className="mt-4 flex items-center gap-3 text-3xl font-semibold tracking-tight text-slate-950">
              <Calendar className="h-6 w-6 text-[var(--accent-strong)]" />
              Campus Events
            </h1>
            <p className="mt-2 text-sm text-slate-500">
              Review event impact and remove stale entries that may distort parking predictions.
            </p>
          </div>
          <button className="button-primary">
            <Plus className="h-4 w-4" />
            New event
          </button>
        </div>
      </section>

      {isLoading && <p className="empty-state">Loading events…</p>}

      <ul className="space-y-3">
        {events.map((ev) => (
          <li key={ev.event_id} className="surface-card flex items-center justify-between gap-4">
            <div>
              <p className="font-medium text-slate-950">{ev.title}</p>
              <p className="text-sm text-slate-500">
                {ev.location} · {new Date(ev.event_start).toLocaleDateString()}
                {ev.expected_attendance != null && ` · ~${ev.expected_attendance.toLocaleString()} attendees`}
              </p>
            </div>
            <button
              onClick={() => {
                if (confirm(`Delete "${ev.title}"?`)) deleteEvent.mutate(ev.event_id);
              }}
              className="button-secondary px-3 py-2 text-rose-600 hover:text-rose-700"
              aria-label={`Delete ${ev.title}`}
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </li>
        ))}
      </ul>
    </main>
  );
}
