export type PIDType = "AGSB" | "MUKB" | "IKJA" | "AHIK";

export type DayName = "Senin" | "Selasa" | "Rabu" | "Kamis" | "Jumat" | "Sabtu" | "Minggu";

export interface PIDInfo {
  pid: PIDType;
  display_name: string;
  is_active: number;
  created_at: string;
}

export interface Activity {
  id: number;
  client_id: string;
  pid: PIDType;
  tanggal: string; // YYYY-MM-DD
  hari: DayName;
  start_time: string; // HH:MM
  finish_time: string; // HH:MM
  duration_min: number;
  kegiatan: string;
  kategori: string | null;
  keterangan: string | null;
  highlight: number; // 0 or 1
  source: "app" | "import";
  import_id: string | null;
  created_at: string;
  updated_at: string | null;
  edit_count: number;
  deleted_at: string | null;
}

export interface ActivityDefaults {
  tanggal: string;
  hari: DayName;
  start_time: string;
  finish_time: string;
  is_shift_date: boolean;
  shift_date_reason?: string;
  calendar_tanggal: string;
  calendar_hari: DayName;
  last_activity?: Activity | null;
}

export interface CategoryStat {
  kategori: string;
  count: number;
}

export interface ImportBatch {
  id: string;
  pid: string;
  filename: string;
  rows_read: number;
  rows_inserted: number;
  rows_skipped: number;
  rows_rejected: number;
  created_at: string;
  undone_at: string | null;
}

export type ImportRowStatus = "ready" | "warning" | "duplicate" | "rejected" | "skipped";

export interface ParsedImportRow {
  row_number: number;
  tanggal: string; // YYYY-MM-DD
  hari: DayName;
  start_time: string; // HH:MM
  finish_time: string; // HH:MM
  duration_min: number;
  man_power: string;
  kegiatan: string;
  kategori: string;
  keterangan: string;
  highlight: boolean;
  status: ImportRowStatus;
  issues: string[];
  original_data?: Record<string, unknown>;
}

export interface ImportPreviewSummary {
  sheet_name: string;
  total_read: number;
  ready_count: number;
  warning_count: number;
  duplicate_count: number;
  rejected_count: number;
  skipped_count: number;
  category_suggestions: Array<{ from: string; to: string }>;
  rows: ParsedImportRow[];
}

export interface DashboardKPI {
  total_activities: number;
  total_duration_min: number;
  highlight_count: number;
  unique_days: number;
}

export interface CategoryDistributionItem {
  kategori: string;
  count: number;
  duration_min: number;
}

export interface DailyTrendItem {
  tanggal: string;
  hari: DayName;
  duration_min: number;
  count: number;
  highlight_count: number;
}

export interface TopActivityItem {
  kegiatan: string;
  kategori: string | null;
  count: number;
  total_duration_min: number;
}

export interface OperatorStatItem {
  pid: PIDType;
  display_name: string;
  total_activities: number;
  total_duration_min: number;
  highlight_count: number;
}

export interface ShiftDetailStats {
  regular_min: number;
  overtime_min: number;
  total_min: number;
  activity_count: number;
}

export interface ShiftBreakdownStats {
  shift_1: ShiftDetailStats;
  shift_2: ShiftDetailStats;
  total_regular_min: number;
  total_overtime_min: number;
  total_min: number;
}

export interface DashboardStatsResponse {
  kpi: DashboardKPI;
  categories: CategoryDistributionItem[];
  daily_trends: DailyTrendItem[];
  top_longest: TopActivityItem[];
  top_frequent: TopActivityItem[];
  operator_stats: OperatorStatItem[];
  highlights: Activity[];
  shift_stats?: ShiftBreakdownStats;
}
