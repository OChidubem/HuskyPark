// ── Auth ──────────────────────────────────────────────────────

export interface User {
  user_id: number;
  full_name: string;
  email: string;
  role: "student" | "resident" | "employee" | "visitor" | "admin";
}

// ── Dashboard ─────────────────────────────────────────────────

export type ProbColor = "green" | "yellow" | "red";

export interface DashboardLot {
  lot_id: number;
  lot_code: string;
  lot_name: string;
  lot_type: string;
  latitude?: number | null;
  longitude?: number | null;
  prob_score: number;
  confidence_level: "low" | "medium" | "high";
  color: ProbColor;
  target_time: string;
  trend?: HourlyTrend;
}

export interface HourlyTrend {
  lot_id: number;
  date: string;
  hour: number;
  trend_summary?: {
    last_7_days_avg_pct: number;
    last_30_days_avg_pct: number;
  };
  model_output?: {
    prob_score: number;
    predicted_status: string;
  };
}

// ── Prediction ────────────────────────────────────────────────

export interface Prediction {
  pred_id: number;
  lot_id: number;
  prob_score: number;
  confidence_level: string;
  target_time: string;
  predicted_at: string;
  factors_summary?: FactorsSummary;
  model_version?: string;
}

export interface FactorsSummary {
  weather: string;
  hour_of_day: number;
  day_of_week: string;
  recent_report_count: number;
  active_events: string[];
}

// ── Reports ───────────────────────────────────────────────────

export type ReportStatus = "found_spot" | "lot_full" | "hard_to_find";

export interface SpotReport {
  report_id: number;
  lot_id: number;
  lot_name: string;
  status: ReportStatus;
  approx_available: number | null;
  reported_at: string;
  source_type: string;
}

export interface ReportCreatePayload {
  lot_id: number;
  status: ReportStatus;
  approx_available?: number;
  note?: string;
}

// ── Permits ───────────────────────────────────────────────────

export interface Permit {
  user_permit_id: number;
  permit_code: string;
  permit_name: string;
  permit_number: string;
  valid_from: string;
  valid_to: string;
  status: "active" | "expired" | "revoked";
}

export interface PermitCategory {
  permit_category_id: number;
  code: string;
  name: string;
  description: string | null;
}

// ── Events ────────────────────────────────────────────────────

export interface CampusEvent {
  event_id: number;
  title: string;
  location: string;
  event_start: string;
  event_end: string;
  expected_attendance: number | null;
}

// ── Weather ───────────────────────────────────────────────────

export interface WeatherSnapshot {
  condition: string;
  description?: string;
  temperature_f: number | null;
  feels_like_f?: number | null;
  humidity_pct?: number | null;
  wind_speed_mph: number | null;
  wind_gust_mph?: number | null;
  visibility_miles?: number | null;
  icon?: string;
  city?: string;
  source?: string;
  live?: boolean;
  recorded_at?: string | null;
}

// ── AI Recommend ──────────────────────────────────────────────

export interface LotRecommendation {
  rank: number;
  lot_id: number;
  lot_name: string;
  prob_score: number;
  rationale: string;
}

export interface RecommendResponse {
  recommendations: LotRecommendation[];
  ai_response_text: string;
  context: Record<string, unknown>;
}
