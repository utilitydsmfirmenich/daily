import { Activity, ActivityDefaults, CategoryStat, DashboardStatsResponse, ImportBatch, ParsedImportRow, PIDInfo } from "../types";

class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers || {});
  if (!headers.has("Content-Type") && options.body && typeof options.body === "string") {
    headers.set("Content-Type", "application/json");
  }

  const res = await fetch(endpoint, {
    ...options,
    headers,
    credentials: "include" // include session cookie
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    const errorMsg = data.error || `Permintaan gagal dengan status ${res.status}`;
    throw new ApiError(errorMsg, res.status);
  }

  return data as T;
}

export const api = {
  // Auth
  login: (pid: string) =>
    request<{ user: PIDInfo }>("/api/login", {
      method: "POST",
      body: JSON.stringify({ pid })
    }),

  logout: () => request<{ ok: boolean }>("/api/logout", { method: "POST" }),

  getMe: () => request<{ user: PIDInfo | null }>("/api/me"),

  // Defaults
  getDefaults: () => request<ActivityDefaults>("/api/activities/defaults"),

  // Activities
  getActivities: (
    params: {
      from?: string;
      to?: string;
      kategori?: string;
      q?: string;
      before?: string;
      days?: number;
    } = {}
  ) => {
    const qp = new URLSearchParams();
    if (params.from) qp.set("from", params.from);
    if (params.to) qp.set("to", params.to);
    if (params.kategori) qp.set("kategori", params.kategori);
    if (params.q) qp.set("q", params.q);
    if (params.before) qp.set("before", params.before);
    if (params.days) qp.set("days", String(params.days));
    const qs = qp.toString();
    return request<{ activities: Activity[] }>(qs ? `/api/activities?${qs}` : "/api/activities");
  },

  createActivity: (data: {
    client_id?: string;
    tanggal?: string;
    hari?: string;
    start_time: string;
    finish_time?: string;
    kegiatan: string;
    kategori?: string | null;
    keterangan?: string | null;
    highlight?: boolean;
  }) =>
    request<{ activity: Activity }>("/api/activities", {
      method: "POST",
      body: JSON.stringify(data)
    }),

  updateActivity: (id: number, data: Partial<Activity>) =>
    request<{ activity: Activity }>(`/api/activities/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data)
    }),

  deleteActivity: (id: number) =>
    request<{ ok: boolean; id: string }>(`/api/activities/${id}`, {
      method: "DELETE"
    }),

  restoreActivity: (id: number) =>
    request<{ ok: boolean; activity: Activity }>(`/api/activities/${id}/restore`, {
      method: "POST"
    }),

  // Categories
  getCategories: () => request<{ categories: CategoryStat[] }>("/api/categories"),

  // Dashboard Stats
  getDashboardStats: (params: { from?: string; to?: string; pid?: string } = {}) => {
    const qp = new URLSearchParams();
    if (params.from) qp.set("from", params.from);
    if (params.to) qp.set("to", params.to);
    if (params.pid) qp.set("pid", params.pid);
    const qs = qp.toString();
    return request<DashboardStatsResponse>(qs ? `/api/dashboard/stats?${qs}` : "/api/dashboard/stats");
  },

  // Export
  getExportData: async (from?: string, to?: string, pid?: string) => {
    let allActivities: Activity[] = [];
    let afterId = 0;
    let hasMore = true;

    while (hasMore) {
      const qp = new URLSearchParams();
      if (from) qp.set("from", from);
      if (to) qp.set("to", to);
      if (pid) qp.set("pid", pid);
      if (afterId > 0) qp.set("after", String(afterId));
      qp.set("limit", "500");

      const res = await request<{ activities: Activity[]; has_more: boolean }>(
        `/api/export?${qp.toString()}`
      );
      allActivities = allActivities.concat(res.activities);
      hasMore = res.has_more;
      if (res.activities.length > 0) {
        afterId = res.activities[res.activities.length - 1].id;
      } else {
        hasMore = false;
      }
    }

    return allActivities;
  },

  // Import
  commitImportChunk: (data: {
    batch_id: string;
    filename: string;
    rows: ParsedImportRow[];
  }) =>
    request<{
      batch_id: string;
      inserted_count: number;
      skipped_count: number;
    }>("/api/import/commit", {
      method: "POST",
      body: JSON.stringify(data)
    }),

  undoImport: (batch_id: string) =>
    request<{ ok: boolean; batch_id: string }>("/api/import/undo", {
      method: "POST",
      body: JSON.stringify({ batch_id })
    }),

  getImportBatches: () => request<{ batches: ImportBatch[] }>("/api/import/batches")
};