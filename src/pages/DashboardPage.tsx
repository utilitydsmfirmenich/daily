import React, { useState, useEffect, useMemo, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { api } from "../lib/api-client";
import { 
  DashboardStatsResponse, 
  PIDType 
} from "../types";
import { 
  formatDateToIndonesian, 
  formatDurationHuman, 
  getCurrentWIB 
} from "../lib/time-utils";
import { generateActivitiesExcel } from "../lib/excel-generator";
import { 
  LayoutDashboard, 
  Clock, 
  CheckCircle2, 
  Sparkles, 
  BarChart3, 
  Calendar, 
  Download, 
  RefreshCw, 
  ExternalLink, 
  TrendingUp, 
  Award, 
  Users, 
  Loader2, 
  AlertCircle,
  FileSpreadsheet
} from "lucide-react";

type PeriodPreset = "today" | "7days" | "month" | "last_month" | "custom";

const OPERATOR_OPTIONS: { pid: string; label: string }[] = [
  { pid: "SELF", label: "Diri Sendiri" },
  { pid: "ALL", label: "Semua Operator (Tim)" },
  { pid: "AGSB", label: "Agus Sobarna (AGSB)" },
  { pid: "MUKB", label: "Muhammad Dimas F A (MUKB)" },
  { pid: "IKJA", label: "Diki Jaelani (IKJA)" },
  { pid: "AHIK", label: "Ahmad Abdul Malik (AHIK)" }
];

const CATEGORY_COLORS: Record<string, { bg: string; text: string; bar: string; border: string }> = {
  preventive: { bg: "bg-emerald-500/10", text: "text-emerald-400", bar: "bg-emerald-500", border: "border-emerald-500/30" },
  corrective: { bg: "bg-rose-500/10", text: "text-rose-400", bar: "bg-rose-500", border: "border-rose-500/30" },
  operational: { bg: "bg-blue-500/10", text: "text-blue-400", bar: "bg-blue-500", border: "border-blue-500/30" },
  admin: { bg: "bg-indigo-500/10", text: "text-indigo-400", bar: "bg-indigo-500", border: "border-indigo-500/30" },
  support: { bg: "bg-cyan-500/10", text: "text-cyan-400", bar: "bg-cyan-500", border: "border-cyan-500/30" },
  mobilitas: { bg: "bg-amber-500/10", text: "text-amber-400", bar: "bg-amber-500", border: "border-amber-500/30" },
  meeting: { bg: "bg-purple-500/10", text: "text-purple-400", bar: "bg-purple-500", border: "border-purple-500/30" },
  default: { bg: "bg-slate-700/30", text: "text-slate-300", bar: "bg-slate-500", border: "border-slate-600/50" }
};

export const DashboardPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const wib = getCurrentWIB();

  // Filters State
  const [periodPreset, setPeriodPreset] = useState<PeriodPreset>("month");
  const [selectedPid, setSelectedPid] = useState<string>("SELF");

  // Date bounds based on preset
  const calculatePresetDates = useCallback((preset: PeriodPreset): { from: string; to: string } => {
    const today = wib.isoDate;
    const [y, m] = today.split("-").map(Number);

    if (preset === "today") {
      return { from: today, to: today };
    }
    if (preset === "7days") {
      const d = new Date(Date.UTC(y, m - 1, Number(today.split("-")[2]) - 6, 12, 0, 0));
      const fy = d.getUTCFullYear();
      const fm = String(d.getUTCMonth() + 1).padStart(2, "0");
      const fd = String(d.getUTCDate()).padStart(2, "0");
      return { from: `${fy}-${fm}-${fd}`, to: today };
    }
    if (preset === "month") {
      const from = `${y}-${String(m).padStart(2, "0")}-01`;
      // last day of month
      const lastDayObj = new Date(Date.UTC(y, m, 0, 12, 0, 0));
      const to = `${y}-${String(m).padStart(2, "0")}-${String(lastDayObj.getUTCDate()).padStart(2, "0")}`;
      return { from, to };
    }
    if (preset === "last_month") {
      const prevDate = new Date(Date.UTC(y, m - 2, 1, 12, 0, 0));
      const py = prevDate.getUTCFullYear();
      const pm = String(prevDate.getUTCMonth() + 1).padStart(2, "0");
      const lastDayObj = new Date(Date.UTC(py, prevDate.getUTCMonth() + 1, 0, 12, 0, 0));
      const pd = String(lastDayObj.getUTCDate()).padStart(2, "0");
      return { from: `${py}-${pm}-01`, to: `${py}-${pm}-${pd}` };
    }
    return { from: today, to: today };
  }, [wib.isoDate]);

  const initialDates = useMemo(() => calculatePresetDates("month"), [calculatePresetDates]);
  const [fromDate, setFromDate] = useState<string>(initialDates.from);
  const [toDate, setToDate] = useState<string>(initialDates.to);

  // Stats Data
  const [stats, setStats] = useState<DashboardStatsResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [exporting, setExporting] = useState<boolean>(false);
  const [hoveredTrend, setHoveredTrend] = useState<any | null>(null);

  // Fetch Dashboard Stats
  const fetchDashboardStats = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      const queryPid = selectedPid === "SELF" ? user?.pid : selectedPid;
      const res = await api.getDashboardStats({
        from: fromDate,
        to: toDate,
        pid: queryPid
      });
      setStats(res);
    } catch (err: any) {
      console.error("Gagal memuat analitik dashboard:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [fromDate, toDate, selectedPid, user?.pid]);

  useEffect(() => {
    fetchDashboardStats();
  }, [fetchDashboardStats]);

  // Handle Preset Change
  const handleSelectPreset = (preset: PeriodPreset) => {
    setPeriodPreset(preset);
    if (preset !== "custom") {
      const dates = calculatePresetDates(preset);
      setFromDate(dates.from);
      setToDate(dates.to);
    }
  };

  // Export 1-Click Excel Handler
  const handleExportExcel = async () => {
    if (!user) return;
    setExporting(true);
    try {
      const queryPid = selectedPid === "SELF" ? user.pid : selectedPid;
      const activities = await api.getExportData(fromDate, toDate, queryPid);

      if (!activities || activities.length === 0) {
        alert("Tidak ada kegiatan dalam periode filter ini untuk diekspor.");
        return;
      }

      const activePidLabel = selectedPid === "ALL" ? "TIM_ALL" : (queryPid || user.pid);
      const buffer = await generateActivitiesExcel(activePidLabel as PIDType, activities, {
        layout: "as_original",
        durationFormat: "minutes"
      });

      const filename = `dashboard_laporan_${activePidLabel}_${fromDate}_sd_${toDate}.xlsx`;
      const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err: any) {
      alert("Gagal mengunduh Excel: " + (err.message || String(err)));
    } finally {
      setExporting(false);
    }
  };

  // Navigate to history with filters
  const handleViewInHistory = () => {
    navigate(`/riwayat?from=${fromDate}&to=${toDate}`);
  };

  // Calculations for KPI Cards
  const kpiData = useMemo(() => {
    if (!stats || !stats.kpi) {
      return {
        totalHoursStr: "0 jam",
        totalActivities: 0,
        highlightCount: 0,
        highlightPct: "0%",
        avgMinutesPerTask: "0 mnt",
        avgHoursPerDay: "0 jam",
        uniqueDays: 0,
        topCategory: null as { name: string; pct: string; hours: string } | null
      };
    }

    const { total_activities, total_duration_min, highlight_count, unique_days } = stats.kpi;
    const totalHoursStr = formatDurationHuman(total_duration_min);
    const highlightPct = total_activities > 0 ? `${((highlight_count / total_activities) * 100).toFixed(1)}%` : "0%";
    const avgMinutesPerTask = total_activities > 0 ? `${Math.round(total_duration_min / total_activities)} mnt` : "0 mnt";
    const avgHoursPerDay = unique_days > 0 ? `${(total_duration_min / unique_days / 60).toFixed(1)} jam` : "0 jam";

    // Top Category
    let topCat = null;
    if (stats.categories && stats.categories.length > 0 && total_duration_min > 0) {
      const top = stats.categories[0];
      const pct = `${((top.duration_min / total_duration_min) * 100).toFixed(0)}%`;
      topCat = {
        name: top.kategori,
        pct,
        hours: formatDurationHuman(top.duration_min)
      };
    }

    return {
      totalHoursStr,
      totalActivities: total_activities,
      highlightCount: highlight_count,
      highlightPct,
      avgMinutesPerTask,
      avgHoursPerDay,
      uniqueDays: unique_days,
      topCategory: topCat
    };
  }, [stats]);

  // Max daily duration for SVG chart scale (min 8 hours = 480 min)
  const maxDailyDuration = useMemo(() => {
    if (!stats || !stats.daily_trends || stats.daily_trends.length === 0) return 480;
    const maxVal = Math.max(...stats.daily_trends.map((d) => d.duration_min));
    return Math.max(maxVal * 1.15, 480);
  }, [stats]);

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-6 pb-28 text-slate-100">
      {/* Header & Filter Toolbar */}
      <div className="bg-slate-800/90 border border-slate-700/80 rounded-2xl p-4 sm:p-5 shadow-sm mb-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <div className="w-8 h-8 rounded-lg bg-blue-600/30 border border-blue-500/40 flex items-center justify-center text-blue-400">
                <LayoutDashboard className="w-4 h-4" />
              </div>
              <h1 className="text-xl font-bold text-white tracking-tight">Dashboard Detail & Analitik</h1>
            </div>
            <p className="text-xs text-slate-400">
              Visualisasi jam kerja, distribusi kategori operasional, tren harian, dan ringkasan tim Utility DSM-Firmenich.
            </p>
          </div>

          {/* Quick Action Buttons */}
          <div className="flex flex-wrap items-center gap-2 self-start lg:self-auto">
            <button
              type="button"
              onClick={() => fetchDashboardStats(true)}
              disabled={refreshing || loading}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-slate-700/70 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-600/80 transition active:scale-95 disabled:opacity-50"
              title="Perbarui data analitik"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin text-blue-400" : ""}`} />
              <span>Segarkan</span>
            </button>

            <button
              type="button"
              onClick={handleViewInHistory}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-slate-700/70 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-600/80 transition active:scale-95"
              title="Lihat daftar catatan lengkap di menu Riwayat"
            >
              <ExternalLink className="w-3.5 h-3.5 text-blue-400" />
              <span>Buka di Riwayat</span>
            </button>

            <button
              type="button"
              onClick={handleExportExcel}
              disabled={exporting || loading}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 border border-emerald-500/40 shadow-sm transition active:scale-95 disabled:opacity-50"
              title="Unduh seluruh kegiatan periode aktif ke file Excel"
            >
              {exporting ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <FileSpreadsheet className="w-3.5 h-3.5" />
              )}
              <span>Ekspor Excel</span>
            </button>
          </div>
        </div>

        {/* Filter Controls Row */}
        <div className="mt-4 pt-4 border-t border-slate-700/70 grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
          {/* Operator Selector */}
          <div className="md:col-span-4">
            <label className="block text-[11px] font-semibold text-slate-300 mb-1 flex items-center gap-1">
              <Users className="w-3 h-3 text-blue-400" />
              <span>Cakupan Operator:</span>
            </label>
            <select
              value={selectedPid}
              onChange={(e) => setSelectedPid(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs font-semibold text-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            >
              {OPERATOR_OPTIONS.map((opt) => (
                <option key={opt.pid} value={opt.pid}>
                  {opt.pid === "SELF" && user ? `Diri Sendiri (${user.pid} - ${user.display_name.split(" ")[0]})` : opt.label}
                </option>
              ))}
            </select>
          </div>

          {/* Period Presets */}
          <div className="md:col-span-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="w-full">
              <label className="block text-[11px] font-semibold text-slate-300 mb-1 flex items-center gap-1">
                <Calendar className="w-3 h-3 text-blue-400" />
                <span>Rentang Waktu:</span>
              </label>
              <div className="flex flex-wrap items-center gap-1.5">
                {(
                  [
                    { key: "today", label: "Hari Ini" },
                    { key: "7days", label: "7 Hari" },
                    { key: "month", label: "Bulan Ini" },
                    { key: "last_month", label: "Bulan Lalu" },
                    { key: "custom", label: "Kustom" }
                  ] as const
                ).map((p) => {
                  const isActive = periodPreset === p.key;
                  return (
                    <button
                      key={p.key}
                      type="button"
                      onClick={() => handleSelectPreset(p.key)}
                      className={`px-3 py-1.5 rounded-lg border text-xs font-medium transition ${
                        isActive
                          ? "border-blue-500 bg-blue-600/30 text-blue-200 font-bold shadow-sm ring-1 ring-blue-500/50"
                          : "border-slate-700 bg-slate-900/80 text-slate-300 hover:text-white hover:border-slate-600"
                      }`}
                    >
                      {p.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Custom Date Pickers (visible if custom selected) */}
            {periodPreset === "custom" && (
              <div className="flex items-center gap-2 self-stretch sm:self-end pt-1 sm:pt-0">
                <input
                  type="date"
                  value={fromDate}
                  onChange={(e) => setFromDate(e.target.value)}
                  className="bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white font-mono focus:outline-none focus:border-blue-500"
                />
                <span className="text-slate-400 text-xs font-medium">s/d</span>
                <input
                  type="date"
                  value={toDate}
                  onChange={(e) => setToDate(e.target.value)}
                  className="bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white font-mono focus:outline-none focus:border-blue-500"
                />
              </div>
            )}
          </div>
        </div>

        {/* Current Active Date Badge */}
        <div className="mt-2.5 flex items-center justify-between text-[11px] text-slate-400">
          <div>
            Periode aktif: <strong className="text-slate-200">{formatDateToIndonesian(fromDate)}</strong> s/d{" "}
            <strong className="text-slate-200">{formatDateToIndonesian(toDate)}</strong>
          </div>
          {selectedPid === "ALL" && (
            <span className="px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 text-[10px] font-semibold border border-blue-500/30">
              Menampilkan Gabungan Tim
            </span>
          )}
        </div>
      </div>

      {loading ? (
        <div className="p-16 flex flex-col items-center justify-center text-slate-400">
          <Loader2 className="w-8 h-8 animate-spin text-blue-500 mb-3" />
          <p className="text-xs font-medium">Mengagregasi statistik kegiatan...</p>
        </div>
      ) : (
        <>
          {/* SECTION 1: 4 KEY KPI SUMMARY CARDS */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            {/* Card 1: Total Jam Kerja */}
            <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-4 sm:p-5 shadow-sm relative overflow-hidden group hover:border-slate-600 transition">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-400">Total Waktu Kerja</span>
                <div className="w-8 h-8 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
                  <Clock className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-3">
                <div className="text-2xl font-black text-white font-mono tracking-tight">
                  {kpiData.totalHoursStr}
                </div>
                <div className="text-[11px] text-slate-400 mt-1 flex items-center gap-1.5">
                  <span className="text-blue-400 font-semibold">{kpiData.avgHoursPerDay}</span>
                  <span>rata-rata / hari aktif ({kpiData.uniqueDays} hari)</span>
                </div>
              </div>
            </div>

            {/* Card 2: Total Kegiatan */}
            <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-4 sm:p-5 shadow-sm relative overflow-hidden group hover:border-slate-600 transition">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-400">Total Kegiatan</span>
                <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                  <CheckCircle2 className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-3">
                <div className="text-2xl font-black text-white font-mono tracking-tight">
                  {kpiData.totalActivities}{" "}
                  <span className="text-sm font-sans font-medium text-slate-400">tugas</span>
                </div>
                <div className="text-[11px] text-slate-400 mt-1 flex items-center gap-1.5">
                  <span className="text-emerald-400 font-semibold">{kpiData.avgMinutesPerTask}</span>
                  <span>rata-rata durasi per tugas</span>
                </div>
              </div>
            </div>

            {/* Card 3: Highlight / Temuan Khusus */}
            <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-4 sm:p-5 shadow-sm relative overflow-hidden group hover:border-slate-600 transition">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-400">Pekerjaan Highlight</span>
                <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
                  <Sparkles className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-3">
                <div className="text-2xl font-black text-amber-300 font-mono tracking-tight">
                  {kpiData.highlightCount}{" "}
                  <span className="text-sm font-sans font-medium text-slate-400">kegiatan</span>
                </div>
                <div className="text-[11px] text-slate-400 mt-1 flex items-center gap-1.5">
                  <span className="text-amber-400 font-semibold">{kpiData.highlightPct}</span>
                  <span>dari seluruh kegiatan tercatat</span>
                </div>
              </div>
            </div>

            {/* Card 4: Kategori Terdominan */}
            <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-4 sm:p-5 shadow-sm relative overflow-hidden group hover:border-slate-600 transition">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-400">Kategori Terdominan</span>
                <div className="w-8 h-8 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
                  <BarChart3 className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-3">
                <div className="text-xl font-bold text-white truncate" title={kpiData.topCategory?.name || "Belum ada data"}>
                  {kpiData.topCategory?.name || "Belum ada data"}
                </div>
                <div className="text-[11px] text-slate-400 mt-1 flex items-center gap-1.5">
                  <span className="text-purple-400 font-semibold">{kpiData.topCategory?.pct || "0%"}</span>
                  <span>waktu ({kpiData.topCategory?.hours || "0 jam"})</span>
                </div>
              </div>
            </div>
          </div>

          {/* SECTION 2: CHARTS & VISUALIZATIONS GRID */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mb-6">
            {/* Left Column: Category Distribution Bars */}
            <div className="lg:col-span-5 bg-slate-800/80 border border-slate-700/80 rounded-2xl p-4 sm:p-5 shadow-sm flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <BarChart3 className="w-4 h-4 text-blue-400" />
                    <h2 className="text-sm font-bold text-white">Distribusi Kategori</h2>
                  </div>
                  <span className="text-[11px] text-slate-400 font-mono">
                    Total: {kpiData.totalHoursStr}
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 mb-4">
                  Alokasi jam kerja berdasarkan 7 kategori standar utility.
                </p>

                {/* Stacked Proportional Bar Preview */}
                {stats && stats.categories && stats.categories.length > 0 && stats.kpi.total_duration_min > 0 && (
                  <div className="w-full h-3 rounded-full bg-slate-900 overflow-hidden flex mb-5 border border-slate-700/80 shadow-inner">
                    {stats.categories.map((cat, idx) => {
                      const key = cat.kategori.toLowerCase().trim();
                      const color = CATEGORY_COLORS[key] || CATEGORY_COLORS.default;
                      const pct = (cat.duration_min / stats.kpi.total_duration_min) * 100;
                      if (pct <= 0) return null;
                      return (
                        <div
                          key={idx}
                          style={{ width: `${pct}%` }}
                          className={`${color.bar} h-full transition-all duration-500`}
                          title={`${cat.kategori}: ${pct.toFixed(1)}% (${formatDurationHuman(cat.duration_min)})`}
                        />
                      );
                    })}
                  </div>
                )}

                {/* Category List with Progress Bars */}
                <div className="space-y-3">
                  {stats && stats.categories && stats.categories.length > 0 ? (
                    stats.categories.map((cat, idx) => {
                      const key = cat.kategori.toLowerCase().trim();
                      const color = CATEGORY_COLORS[key] || CATEGORY_COLORS.default;
                      const pct = stats.kpi.total_duration_min > 0 ? (cat.duration_min / stats.kpi.total_duration_min) * 100 : 0;

                      return (
                        <div key={idx} className="space-y-1">
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-semibold text-slate-200 flex items-center gap-1.5">
                              <span className={`w-2 h-2 rounded-full ${color.bar}`} />
                              <span>{cat.kategori}</span>
                              <span className="text-[10px] text-slate-500 font-normal">({cat.count}x)</span>
                            </span>
                            <div className="flex items-center gap-2 font-mono">
                              <span className="text-slate-300 font-medium">{formatDurationHuman(cat.duration_min)}</span>
                              <span className="text-[11px] font-bold text-slate-400 w-10 text-right">
                                {pct.toFixed(0)}%
                              </span>
                            </div>
                          </div>
                          <div className="w-full bg-slate-900 rounded-full h-1.5 overflow-hidden">
                            <div
                              className={`h-full rounded-full ${color.bar} transition-all duration-700`}
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="py-8 text-center text-xs text-slate-500">
                      Belum ada data kategori dalam periode ini.
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Right Column: Daily Trend Interactive SVG Bar Chart */}
            <div className="lg:col-span-7 bg-slate-800/80 border border-slate-700/80 rounded-2xl p-4 sm:p-5 shadow-sm flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-emerald-400" />
                    <h2 className="text-sm font-bold text-white">Tren Jam Kerja Harian</h2>
                  </div>
                  <div className="flex items-center gap-3 text-[11px] text-slate-400 font-sans">
                    <div className="flex items-center gap-1">
                      <span className="w-2.5 h-2.5 rounded bg-blue-500" />
                      <span>Jam Kerja</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="w-3 border-t-2 border-dashed border-rose-400" />
                      <span className="text-rose-400 font-medium">Shift 8 Jam</span>
                    </div>
                  </div>
                </div>
                <p className="text-[11px] text-slate-400 mb-4">
                  Visualisasi jam kerja harian vs standar shift 8 jam (480 menit). Sentuh atau arahkan kursor ke batang tanggal untuk detail.
                </p>

                {/* SVG Responsive Bar Chart Container */}
                {stats && stats.daily_trends && stats.daily_trends.length > 0 ? (
                  <div className="relative mt-2">
                    {/* Hover Info Tooltip Bar */}
                    <div className="h-6 mb-2 flex items-center justify-between text-xs px-2 bg-slate-900/60 border border-slate-700/60 rounded-lg">
                      {hoveredTrend ? (
                        <>
                          <span className="text-white font-semibold">
                            {hoveredTrend.hari}, {formatDateToIndonesian(hoveredTrend.tanggal)}
                          </span>
                          <span className="text-emerald-400 font-mono font-bold">
                            {formatDurationHuman(hoveredTrend.duration_min)} ({(hoveredTrend.duration_min / 60).toFixed(1)} jam) • {hoveredTrend.count} kegiatan
                            {hoveredTrend.highlight_count > 0 && ` • ${hoveredTrend.highlight_count} highlight`}
                          </span>
                        </>
                      ) : (
                        <span className="text-[11px] text-slate-500 italic">
                          Arahkan kursor atau sentuh batang hari untuk melihat rincian jam kerja.
                        </span>
                      )}
                    </div>

                    {/* Chart Area */}
                    <div className="w-full h-56 flex items-end gap-1 sm:gap-2 px-1 pb-6 pt-4 bg-slate-900/80 border border-slate-700/80 rounded-xl relative overflow-x-auto">
                      {/* 8-Hour Reference Benchmark Line (480 min) */}
                      {(() => {
                        const shiftPct = (480 / maxDailyDuration) * 100;
                        if (shiftPct > 0 && shiftPct <= 100) {
                          return (
                            <div
                              style={{ bottom: `calc(${shiftPct}% + 1.5rem)` }}
                              className="absolute left-0 right-0 border-b-2 border-dashed border-rose-500/60 pointer-events-none z-10 flex items-center justify-end pr-2"
                            >
                              <span className="text-[9px] text-rose-400 font-bold bg-slate-900/90 px-1 rounded -translate-y-2">
                                8 jam (standar)
                              </span>
                            </div>
                          );
                        }
                        return null;
                      })()}

                      {/* Daily Bars */}
                      {stats.daily_trends.map((item, idx) => {
                        const heightPct = Math.min((item.duration_min / maxDailyDuration) * 100, 100);
                        const isOverShift = item.duration_min >= 480;
                        const hasHighlight = item.highlight_count > 0;
                        const dayLabel = item.tanggal.split("-")[2]; // DD

                        return (
                          <div
                            key={idx}
                            onMouseEnter={() => setHoveredTrend(item)}
                            onMouseLeave={() => setHoveredTrend(null)}
                            onClick={() => setHoveredTrend(item)}
                            className="flex-1 min-w-[20px] max-w-[40px] h-full flex flex-col justify-end items-center group cursor-pointer relative z-20"
                          >
                            <div
                              style={{ height: `${Math.max(heightPct, 4)}%` }}
                              className={`w-full rounded-t-md transition-all duration-300 ${
                                isOverShift
                                  ? "bg-blue-500 group-hover:bg-blue-400"
                                  : "bg-blue-600/70 group-hover:bg-blue-500"
                              } ${hasHighlight ? "ring-2 ring-amber-400/80" : ""}`}
                            />
                            {/* Date Label (DD) */}
                            <span className="absolute bottom-1 text-[10px] font-mono text-slate-400 group-hover:text-white group-hover:font-bold">
                              {dayLabel}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  <div className="py-16 text-center text-xs text-slate-500">
                    Tidak ada catatan tren harian dalam periode ini.
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* SECTION 3: TOP ACTIVITIES (LONGEST & MOST FREQUENT) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            {/* Top 5 Longest Activities */}
            <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-4 sm:p-5 shadow-sm">
              <div className="flex items-center gap-2 mb-1">
                <Clock className="w-4 h-4 text-blue-400" />
                <h3 className="text-sm font-bold text-white">Top 5 Kegiatan Alokasi Jam Terbesar</h3>
              </div>
              <p className="text-[11px] text-slate-400 mb-4">
                Pekerjaan yang memakan durasi waktu kerja paling lama.
              </p>

              <div className="space-y-2.5">
                {stats && stats.top_longest && stats.top_longest.length > 0 ? (
                  stats.top_longest.map((act, i) => (
                    <div
                      key={i}
                      className="p-2.5 bg-slate-900/70 border border-slate-700/70 rounded-xl flex items-center justify-between gap-3 text-xs"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className="w-5 h-5 rounded-full bg-blue-500/20 text-blue-300 font-bold text-[10px] flex items-center justify-center flex-shrink-0">
                          {i + 1}
                        </span>
                        <div className="min-w-0">
                          <p className="font-semibold text-slate-100 truncate" title={act.kegiatan}>
                            {act.kegiatan}
                          </p>
                          {act.kategori && (
                            <span className="text-[10px] text-slate-400">
                              Kategori: <strong className="text-slate-300">{act.kategori}</strong> ({act.count}x)
                            </span>
                          )}
                        </div>
                      </div>
                      <span className="font-mono font-bold text-blue-400 text-xs flex-shrink-0">
                        {formatDurationHuman(act.total_duration_min)}
                      </span>
                    </div>
                  ))
                ) : (
                  <div className="py-6 text-center text-xs text-slate-500">Belum ada data kegiatan.</div>
                )}
              </div>
            </div>

            {/* Top 5 Most Frequent Activities */}
            <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-4 sm:p-5 shadow-sm">
              <div className="flex items-center gap-2 mb-1">
                <Award className="w-4 h-4 text-emerald-400" />
                <h3 className="text-sm font-bold text-white">Top 5 Kegiatan Paling Sering Dilakukan</h3>
              </div>
              <p className="text-[11px] text-slate-400 mb-4">
                Rutinitas dengan frekuensi kemunculan tertinggi.
              </p>

              <div className="space-y-2.5">
                {stats && stats.top_frequent && stats.top_frequent.length > 0 ? (
                  stats.top_frequent.map((act, i) => (
                    <div
                      key={i}
                      className="p-2.5 bg-slate-900/70 border border-slate-700/70 rounded-xl flex items-center justify-between gap-3 text-xs"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-300 font-bold text-[10px] flex items-center justify-center flex-shrink-0">
                          {i + 1}
                        </span>
                        <div className="min-w-0">
                          <p className="font-semibold text-slate-100 truncate" title={act.kegiatan}>
                            {act.kegiatan}
                          </p>
                          {act.kategori && (
                            <span className="text-[10px] text-slate-400">
                              Kategori: <strong className="text-slate-300">{act.kategori}</strong>
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <span className="font-mono font-bold text-emerald-400 text-xs block">
                          {act.count} kali
                        </span>
                        <span className="text-[10px] text-slate-500 font-mono">
                          {formatDurationHuman(act.total_duration_min)}
                        </span>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="py-6 text-center text-xs text-slate-500">Belum ada data kegiatan.</div>
                )}
              </div>
            </div>
          </div>

          {/* SECTION 4: OPERATOR COMPARISON GRID (IF "ALL" SELECTED) */}
          {selectedPid === "ALL" && stats && stats.operator_stats && stats.operator_stats.length > 0 && (
            <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-4 sm:p-5 shadow-sm mb-6">
              <div className="flex items-center gap-2 mb-1">
                <Users className="w-4 h-4 text-blue-400" />
                <h3 className="text-sm font-bold text-white">Perbandingan Beban Kerja Antar-Operator</h3>
              </div>
              <p className="text-[11px] text-slate-400 mb-4">
                Ringkasan jam kerja dan jumlah kegiatan dari masing-masing operator dalam periode aktif.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {stats.operator_stats.map((op, i) => (
                  <div
                    key={i}
                    className="p-4 bg-slate-900/80 border border-slate-700/70 rounded-xl hover:border-slate-600 transition"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-blue-600/20 text-blue-300 border border-blue-500/30">
                        {op.pid}
                      </span>
                      <button
                        type="button"
                        onClick={() => setSelectedPid(op.pid)}
                        className="text-[10px] text-blue-400 hover:text-blue-300 font-medium"
                      >
                        Pilih &rarr;
                      </button>
                    </div>
                    <h4 className="font-bold text-sm text-white truncate" title={op.display_name}>
                      {op.display_name}
                    </h4>
                    <div className="mt-3 pt-3 border-t border-slate-800 space-y-1.5 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400">Total Jam:</span>
                        <strong className="font-mono text-emerald-400">
                          {formatDurationHuman(op.total_duration_min)}
                        </strong>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400">Kegiatan:</span>
                        <strong className="font-mono text-slate-200">{op.total_activities} tugas</strong>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400">Highlight:</span>
                        <strong className="font-mono text-amber-300">{op.highlight_count}</strong>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* SECTION 5: DETAILED CATEGORY BREAKDOWN TABLE */}
          <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-4 sm:p-5 shadow-sm mb-6 overflow-hidden">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-purple-400" />
                <h3 className="text-sm font-bold text-white">Rincian Lengkap per Kategori</h3>
              </div>
              <span className="text-[11px] text-slate-400">
                {stats?.categories?.length || 0} kategori ditemukan
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-700 text-slate-400 bg-slate-900/50">
                    <th className="py-2.5 px-3 font-semibold">Kategori</th>
                    <th className="py-2.5 px-3 font-semibold text-center">Jumlah Tugas</th>
                    <th className="py-2.5 px-3 font-semibold text-right">Total Durasi</th>
                    <th className="py-2.5 px-3 font-semibold text-right">Porsi Waktu (%)</th>
                    <th className="py-2.5 px-3 font-semibold text-right">Rata-rata / Tugas</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700/60 font-mono">
                  {stats && stats.categories && stats.categories.length > 0 ? (
                    stats.categories.map((cat, i) => {
                      const key = cat.kategori.toLowerCase().trim();
                      const color = CATEGORY_COLORS[key] || CATEGORY_COLORS.default;
                      const pct = stats.kpi.total_duration_min > 0 ? (cat.duration_min / stats.kpi.total_duration_min) * 100 : 0;
                      const avg = cat.count > 0 ? Math.round(cat.duration_min / cat.count) : 0;

                      return (
                        <tr key={i} className="hover:bg-slate-700/30 transition">
                          <td className="py-2.5 px-3 font-sans">
                            <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md border text-[11px] font-semibold ${color.bg} ${color.text} ${color.border}`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${color.bar}`} />
                              {cat.kategori}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-center text-slate-200">
                            {cat.count}
                          </td>
                          <td className="py-2.5 px-3 text-right font-bold text-white">
                            {formatDurationHuman(cat.duration_min)}
                          </td>
                          <td className="py-2.5 px-3 text-right text-blue-400 font-bold">
                            {pct.toFixed(1)}%
                          </td>
                          <td className="py-2.5 px-3 text-right text-slate-300">
                            {avg} mnt
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={5} className="py-6 text-center text-slate-500 font-sans">
                        Tidak ada data rincian kategori.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* SECTION 6: RECENT HIGHLIGHT ACTIVITIES IN PERIOD */}
          {stats && stats.highlights && stats.highlights.length > 0 && (
            <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-4 sm:p-5 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-amber-400" />
                  <h3 className="text-sm font-bold text-white">Daftar Pekerjaan Highlight Periode Ini</h3>
                </div>
                <span className="text-[11px] text-amber-300 font-mono">
                  {stats.highlights.length} kegiatan penting
                </span>
              </div>

              <div className="space-y-2">
                {stats.highlights.map((act) => (
                  <div
                    key={act.id}
                    className="p-3 bg-slate-900/80 border border-amber-500/30 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs hover:border-amber-500/50 transition"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-amber-300 font-mono">
                          {formatDateToIndonesian(act.tanggal)} ({act.hari})
                        </span>
                        <span className="text-slate-400 font-mono">
                          {act.start_time} - {act.finish_time}
                        </span>
                        <span className="px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 font-bold text-[10px]">
                          {act.duration_min} mnt
                        </span>
                        {act.kategori && (
                          <span className="text-[10px] text-blue-400 bg-blue-500/10 px-1.5 py-0.2 rounded border border-blue-500/20">
                            {act.kategori}
                          </span>
                        )}
                        <span className="text-[10px] font-bold text-slate-400 font-mono">
                          [{act.pid}]
                        </span>
                      </div>
                      <p className="font-bold text-white">{act.kegiatan}</p>
                      {act.keterangan && (
                        <p className="text-[11px] text-slate-400 italic">{act.keterangan}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};
