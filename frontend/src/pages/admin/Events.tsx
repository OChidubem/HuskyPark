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
    <section>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-lg font-semibold text-gray-900">
          <Calendar className="h-5 w-5 text-blue-600" />
          Campus Events
        </h2>
        <button
          className="flex items-center gap-1.5 rounded-lg bg-[#1a2744] px-3 py-2 text-xs
            font-semibold text-white hover:bg-[#243561] transition"
        >
          <Plus className="h-4 w-4" />
          New Event
        </button>
      </div>

      {isLoading && <p className="text-sm text-gray-500">Loading…</p>}

      <ul className="space-y-2">
        {events.map((ev) => (
          <li
            key={ev.event_id}
            className="flex items-center justify-between rounded-xl border border-gray-200
              bg-white px-4 py-3 shadow-sm"
          >
            <div>
              <p className="font-medium text-gray-900">{ev.title}</p>
              <p className="text-xs text-gray-500">
                {ev.location} · {new Date(ev.event_start).toLocaleDateString()}
                {ev.expected_attendance != null && ` · ~${ev.expected_attendance.toLocaleString()} attendees`}
              </p>
            </div>
            <button
              onClick={() => {
                if (confirm(`Delete "${ev.title}"?`)) deleteEvent.mutate(ev.event_id);
              }}
              className="rounded p-1 text-gray-400 hover:text-red-500 transition
                focus:outline-none focus-visible:ring-2 focus-visible:ring-red-400"
              aria-label={`Delete ${ev.title}`}
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
