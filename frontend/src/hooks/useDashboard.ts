import { useQuery } from "@tanstack/react-query";
import api from "../lib/api";
import type { CampusEvent, DashboardLot, WeatherSnapshot } from "../types";

export function useDashboard(permitType?: string) {
  return useQuery<DashboardLot[]>({
    queryKey: ["dashboard", permitType],
    queryFn: async () => {
      const params = permitType ? { permit_type: permitType } : {};
      const { data } = await api.get("/dashboard", { params });
      return data;
    },
    refetchInterval: 60_000,
    staleTime: 55_000,
  });
}

export function useLotPredictions(lotId: number, hours = 24) {
  return useQuery({
    queryKey: ["predictions", lotId, hours],
    queryFn: async () => {
      const { data } = await api.get(`/lots/${lotId}/predictions`, {
        params: { hours },
      });
      return data;
    },
    enabled: lotId > 0,
  });
}

export function useWeather() {
  return useQuery<WeatherSnapshot>({
    queryKey: ["weather"],
    queryFn: async () => {
      const { data } = await api.get("/weather/current");
      return data;
    },
    refetchInterval: 10 * 60_000, // every 10 min
    staleTime: 9 * 60_000,
  });
}

export function useEvents() {
  return useQuery<CampusEvent[]>({
    queryKey: ["events"],
    queryFn: async () => {
      const { data } = await api.get("/events");
      return data;
    },
    refetchInterval: 60 * 60_000, // every hour
    staleTime: 55 * 60_000,
  });
}
