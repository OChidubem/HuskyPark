import { useQuery } from "@tanstack/react-query";
import api from "../lib/api";
import type { DashboardLot } from "../types";

export function useDashboard(permitType?: string) {
  return useQuery<DashboardLot[]>({
    queryKey: ["dashboard", permitType],
    queryFn: async () => {
      const params = permitType ? { permit_type: permitType } : {};
      const { data } = await api.get("/dashboard", { params });
      return data;
    },
    refetchInterval: 60_000, // poll every 60 seconds
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
