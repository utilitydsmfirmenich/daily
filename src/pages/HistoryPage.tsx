import React, { useState, useEffect, useMemo, useRef } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { api } from "../lib/api-client";
import { Activity, DayName } from "../types";
import { 
  formatDateToIndonesian, 
  getDayFromDate, 
  formatDurationHuman, 
  calculateDuration,
  getCurrentWIB,
  addMinutesToTime 
} from "../lib/time-utils";
import { generateActivitiesExcel } from "../lib/excel-generator";
import { ExportDialog } from "../components/ExportDialog";
import { QuickActivityButtons } from "../components/QuickActivityButtons";
import { QuickDurationButtons } from "../components/QuickDurationButtons";
import { 
  History as HistoryIcon, 
  Search, 
  UploadCloud, 
  Download, 
  FileSpreadsheet,
  Edit3, 
  Trash2, 
  Check, 
  X, 
  RotateCcw, 
  Calendar, 
  Bookmark, 
  ChevronDown, 
  ChevronUp, 
  Loader2
} from "lucide-react";

export const HistoryPage: React.FC = () => {
  const { user } = useAuth();

  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [categories, setCategories] = useState<string[]>([]);

  // Modals & Snackbars
  const [exportOpen, setExportOpen] = useState(false);
  const [exportingToday, setExportingToday] = useState(false);
  const [exportStatus, setExportStatus] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [editingActivity, setEditingActivity] = useState<Activity | null>(null);
  const [editForm, setEditForm] = useState<{
    tanggal: string;
    hari: DayName;
    start_time: string;
    finish_time: string;
    kegiatan: string;
    kategori: string;
    keterangan: string;
    highlight: boolean;
  } | null>(null);
  const [savingEdit, setSavingEdit] = useState(false);
  const editKegiatanRef = useRef<HTMLTextAreaElement>(null);

  // Undo Snackbar
  const [undoItem, setUndoItem] = useState<{ id: number; activity: Activity } | null>(null);
  const [undoTimer, setUndoTimer] = useState<number | null>(null);

  // Expanded card items in mobile view
  const [expandedCards, setExpandedCards] = useState<Record<number, boolean>>({});

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [actRes, catRes] = await Promise.all([
        api.getActivities({
          from: fromDate || undefined,
          to: toDate || undefined,
          kategori: selectedCategory || undefined,
          q: searchQuery || undefined
        }),
        api.getCategories()
      ]);
      setActivities(actRes.activities);
      setCategories(catRes.categories.map((c) => c.kategori));
    } catch (err: any) {
      setError(err.message || "Gagal memuat riwayat kegiatan.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [fromDate, toDate, selectedCategory]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loadData();
  };

  const clearFilters = () => {
    setSearchQuery("");
    setSelectedCategory("");
    setFromDate("");
    setToDate("");
  };

  // Group activities by date
  const groupedByDay = useMemo(() => {
    const map = new Map<string, { tanggal: string; hari: string; items: Activity[]; totalMin: number }>();
    for (const act of activities) {
      const existing = map.get(act.tanggal) || {
        tanggal: act.tanggal,
        hari: act.hari,
        items: [],
        totalMin: 0
      };
      existing.items.push(act);
      existing.totalMin += act.duration_min;
      map.set(act.tanggal, existing);
    }
    return Array.from(map.values());
  }, [activities]);

  const startEdit = (act: Activity) => {
    setEditingActivity(act);
    setEditForm({
      tanggal: act.tanggal,
      hari: act.hari,
      start_time: act.start_time,
      finish_time: act.finish_time,
      kegiatan: act.kegiatan,
      kategori: act.kategori || "",
      keterangan: act.keterangan || "",
      highlight: act.highlight === 1
    });
  };

  const handleSaveEdit = async () => {
    if (!editingActivity || !editForm) return;
    if (!editForm.kegiatan.trim()) {
      alert("Kegiatan wajib diisi.");
      return;
    }

    const dur = calculateDuration(editForm.start_time, editForm.finish_time);
    if (!dur.isValid) {
      alert(dur.error || "Waktu mulai dan selesai tidak valid.");
      return;
    }

    setSavingEdit(true);
    try {
      const res = await api.updateActivity(editingActivity.id, {
        tanggal: editForm.tanggal,
        hari: editForm.hari,
        start_time: editForm.start_time,
        finish_time: editForm.finish_time,
        kegiatan: editForm.kegiatan.trim(),
        kategori: editForm.kategori.trim() || null,
        keterangan: editForm.keterangan.trim() || null,
        highlight: editForm.highlight ? 1 : 0
      });

      setActivities((prev) =>
        prev.map((a) => (a.id === editingActivity.id ? res.activity : a))
      );
      setEditingActivity(null);
      setEditForm(null);
    } catch (err: any) {
      alert(err.message || "Gagal memperbarui catatan.");
    } finally {
      setSavingEdit(false);
    }
  };

  const handleDelete = async (act: Activity) => {
    try {
      await api.deleteActivity(act.id);
      setActivities((prev) => prev.filter((a) => a.id !== act.id));

      if (undoTimer) clearTimeout(undoTimer);
      setUndoItem({ id: act.id, activity: act });

      const timer = window.setTimeout(() => {
        setUndoItem(null);
      }, 10000);
      setUndoTimer(timer);
    } catch (err: any) {
      alert(err.message || "Gagal menghapus catatan.");
    }
  };

  const handleUndoDelete = async () => {
    if (!undoItem) return;
    try {
      const res = await api.restoreActivity(undoItem.id);
      setActivities((prev) => [...prev, res.activity].sort((a, b) => b.tanggal.localeCompare(a.tanggal) || a.id - b.id));
      setUndoItem(null);
      if (undoTimer) clearTimeout(undoTimer);
    } catch (err: any) {
      alert(err.message || "Gagal membatalkan penghapusan.");
    }
  };

  const handleQuickExportToday = async () => {
    if (!user) return;
    setExportingToday(true);
    setExportStatus(null);
    try {
      let targetDate = getCurrentWIB().isoDate;
      try {
        const defs = await api.getDefaults();
        if (defs && defs.tanggal) {
          targetDate = defs.tanggal;
        }
      } catch {
        // Fallback to getCurrentWIB().isoDate
      }

      const activities = await api.getExportData(targetDate, targetDate);

      if (!activities || activities.length === 0) {
        setExportStatus({
          type: "error",
          message: `Belum ada catatan kegiatan untuk tanggal/shift ${formatDateToIndonesian(targetDate)}.`
        });
        setTimeout(() => setExportStatus(null), 5000);
        return;
      }

      const buffer = await generateActivitiesExcel(user.pid, activities, {
        layout: "as_original",
        durationFormat: "minutes"
      });

      const filename = `pencatatan_kegiatan_${user.pid}_${targetDate}.xlsx`;
      const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      setExportStatus({
        type: "success",
        message: `File "${filename}" berhasil diunduh (${activities.length} kegiatan)!`
      });
      setTimeout(() => setExportStatus(null), 5000);
    } catch (err: any) {
      setExportStatus({
        type: "error",
        message: err.message || "Gagal mengunduh Excel hari ini."
      });
      setTimeout(() => setExportStatus(null), 5000);
    } finally {
      setExportingToday(false);
    }
  };

  const toggleCard = (id: number) => {
    setExpandedCards((prev) => ({ ...prev, [id]: !prev[id] }));
  };
  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-6 pb-24 text-slate-100">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <HistoryIcon className="w-5 h-5 text-blue-400" />
            <span>Riwayat Kegiatan — {user?.pid}</span>
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Daftar kegiatan harian dikelompokkan per hari kerja
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center flex-wrap gap-2.5">
          <Link
            to="/riwayat/impor"
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-semibold text-slate-200 transition shadow-sm"
          >
            <UploadCloud className="w-4 h-4 text-blue-400" />
            <span>Impor Excel</span>
          </Link>
          <button
            type="button"
            onClick={handleQuickExportToday}
            disabled={exportingToday}
            title="Unduh langsung Excel catatan kegiatan shift / hari ini"
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-xs font-semibold text-white transition shadow-sm"
          >
            {exportingToday ? (
              <Loader2 className="w-4 h-4 animate-spin text-white" />
            ) : (
              <FileSpreadsheet className="w-4 h-4" />
            )}
            <span>{exportingToday ? "Mengekspor..." : "Ekspor Hari Ini"}</span>
          </button>
          <button
            type="button"
            onClick={() => setExportOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-semibold text-slate-200 transition shadow-sm"
          >
            <Download className="w-4 h-4 text-emerald-400" />
            <span>Ekspor Excel</span>
          </button>
        </div>
      </div>

      {/* Export Status Banner */}
      {exportStatus && (
        <div
          className={`mb-4 px-4 py-3 rounded-xl border text-xs font-medium flex items-center justify-between transition-all ${
            exportStatus.type === "success"
              ? "bg-emerald-950/40 border-emerald-500/30 text-emerald-300"
              : "bg-red-950/40 border-red-500/30 text-red-300"
          }`}
        >
          <span>{exportStatus.message}</span>
          <button
            type="button"
            onClick={() => setExportStatus(null)}
            className="text-slate-400 hover:text-white ml-2 text-sm font-bold"
          >
            ✕
          </button>
        </div>
      )}

      {/* Filter Bar */}
      <div className="bg-slate-800/90 border border-slate-700/80 p-4 rounded-2xl mb-6 shadow-sm">
        <form onSubmit={handleSearchSubmit} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 items-end">
          <div className="lg:col-span-2">
            <label className="block text-[11px] font-semibold text-slate-400 mb-1">Cari Kegiatan / Keterangan</label>
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Ketik kata kunci..."
                className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-8 pr-3 py-1.5 text-xs text-white focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-400 mb-1">Kategori</label>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-xl px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-blue-500"
            >
              <option value="">Semua Kategori</option>
              {categories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-[11px] font-semibold text-slate-400 mb-1">Dari</label>
              <input
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-2 py-1.5 text-xs text-white focus:outline-none focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-400 mb-1">Sampai</label>
              <input
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-2 py-1.5 text-xs text-white focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="submit"
              className="flex-1 bg-blue-600 hover:bg-blue-500 text-white px-3 py-1.5 rounded-xl text-xs font-semibold transition"
            >
              Terapkan
            </button>
            <button
              type="button"
              onClick={clearFilters}
              className="px-3 py-1.5 bg-slate-700 hover:bg-slate-650 rounded-xl text-xs text-slate-300 font-medium transition"
            >
              Reset
            </button>
          </div>
        </form>
      </div>

      {/* Undo Snackbar Notification */}
      {undoItem && (
        <div className="fixed bottom-20 sm:bottom-6 right-6 z-50 bg-slate-800 border border-blue-500/40 text-slate-100 px-4 py-3 rounded-xl shadow-2xl flex items-center gap-3">
          <span className="text-xs">Catatan berhasil dihapus.</span>
          <button
            type="button"
            onClick={handleUndoDelete}
            className="flex items-center gap-1 text-xs font-bold text-blue-400 hover:text-blue-300 bg-blue-600/20 px-2.5 py-1 rounded-md border border-blue-500/30 transition"
          >
            <RotateCcw className="w-3 h-3" />
            <span>Batalkan (Undo)</span>
          </button>
        </div>
      )}

      {/* Main Content Area */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 text-slate-400">
          <Loader2 className="w-8 h-8 animate-spin text-blue-500 mb-3" />
          <p className="text-xs">Memuat catatan kegiatan...</p>
        </div>
      ) : activities.length === 0 ? (
        <div className="bg-slate-800 border border-slate-700/80 rounded-2xl py-16 px-4 text-center">
          <HistoryIcon className="w-12 h-12 text-slate-600 mx-auto mb-3" />
          <h3 className="text-sm font-semibold text-white">Belum Ada Catatan Kegiatan</h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto mt-1">
            Mulai catat kegiatan shift Anda sekarang atau impor riwayat dari file Excel acuan.
          </p>
          <div className="flex items-center justify-center gap-3 mt-5">
            <Link to="/" className="bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold px-4 py-2 rounded-xl transition">
              Mulai Catat
            </Link>
            <Link to="/riwayat/impor" className="bg-slate-700 hover:bg-slate-650 text-slate-200 text-xs font-semibold px-4 py-2 rounded-xl transition">
              Impor dari Excel
            </Link>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {groupedByDay.map((group) => (
            <div key={group.tanggal} className="bg-slate-800/90 border border-slate-700 rounded-2xl overflow-hidden shadow-sm">
              {/* Day Header Banner */}
              <div className="bg-slate-800 border-b border-slate-700 px-4 sm:px-6 py-2.5 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-blue-400" />
                  <span className="font-bold text-white text-xs sm:text-sm">
                    {group.hari}, {formatDateToIndonesian(group.tanggal)}
                  </span>
                </div>
                <div className="text-xs font-semibold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-0.5 rounded-full">
                  Total: {formatDurationHuman(group.totalMin)}
                </div>
              </div>

              {/* Desktop Table (>= 1024px) */}
              <div className="hidden lg:block overflow-x-auto">
                <table className="w-full text-left border-collapse font-table text-xs">
                  <thead>
                    <tr className="bg-slate-900/60 text-slate-300 font-semibold border-b border-slate-700">
                      <th className="py-2.5 px-3 border-r border-slate-700 text-center w-24">Tanggal</th>
                      <th className="py-2.5 px-3 border-r border-slate-700 text-center w-20">Hari</th>
                      <th className="py-2.5 px-3 border-r border-slate-700 text-center w-16">Start</th>
                      <th className="py-2.5 px-3 border-r border-slate-700 text-center w-16">Finish</th>
                      <th className="py-2.5 px-3 border-r border-slate-700 text-center w-16">Total</th>
                      <th className="py-2.5 px-3 border-r border-slate-700 text-center w-20">Man Power</th>
                      <th className="py-2.5 px-3 border-r border-slate-700 min-w-[280px]">Kegiatan</th>
                      <th className="py-2.5 px-3 border-r border-slate-700 w-36">Kategori</th>
                      <th className="py-2.5 px-3 border-r border-slate-700 w-44">Keterangan</th>
                      <th className="py-2.5 px-3 text-center w-24">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-700/60 text-slate-200">
                    {group.items.map((act) => (
                      <tr
                        key={act.id}
                        onDoubleClick={() => startEdit(act)}
                        className="hover:bg-slate-700/40 transition group cursor-pointer"
                        title="Klik ganda untuk mengedit"
                      >
                        <td className="py-2 px-3 border-r border-slate-700/60 text-center text-slate-300">
                          {formatDateToIndonesian(act.tanggal)}
                        </td>
                        <td className="py-2 px-3 border-r border-slate-700/60 text-center text-slate-300">
                          {act.hari}
                        </td>
                        <td className="py-2 px-3 border-r border-slate-700/60 text-center font-mono font-medium">
                          {act.start_time}
                        </td>
                        <td className="py-2 px-3 border-r border-slate-700/60 text-center font-mono font-medium">
                          {act.finish_time}
                        </td>
                        <td className="py-2 px-3 border-r border-slate-700/60 text-center font-mono font-bold text-emerald-400">
                          {act.duration_min}
                        </td>
                        <td className="py-2 px-3 border-r border-slate-700/60 text-center font-bold text-slate-400">
                          {act.pid}
                        </td>
                        <td className={`py-2 px-3 border-r border-slate-700/60 font-sans leading-relaxed ${
                          act.highlight === 1 ? "bg-yellow-400 text-slate-950 font-medium" : ""
                        }`}>
                          <div className="flex items-center gap-1.5">
                            {act.highlight === 1 && <Bookmark className="w-3.5 h-3.5 fill-slate-950 flex-shrink-0" />}
                            <span>{act.kegiatan}</span>
                            {act.edit_count > 0 && (
                              <span className="text-[10px] text-slate-500 font-sans font-normal ml-1 italic">
                                (diedit)
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-2 px-3 border-r border-slate-700/60 text-slate-300 font-sans">
                          {act.kategori || "—"}
                        </td>
                        <td className="py-2 px-3 border-r border-slate-700/60 text-slate-400 font-sans italic">
                          {act.keterangan || "—"}
                        </td>
                        <td className="py-2 px-3 text-center">
                          <div className="flex items-center justify-center gap-1 opacity-80 group-hover:opacity-100 transition">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                startEdit(act);
                              }}
                              className="p-1 rounded hover:bg-slate-600 text-slate-300 hover:text-white"
                              title="Edit"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDelete(act);
                              }}
                              className="p-1 rounded hover:bg-red-500/20 text-slate-400 hover:text-red-400"
                              title="Hapus"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile / Tablet Cards */}
              <div className="lg:hidden divide-y divide-slate-700/60">
                {group.items.map((act) => (
                  <div key={act.id} className="p-3.5 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-white text-xs">
                          {act.start_time} → {act.finish_time}
                        </span>
                        <span className="text-emerald-400 text-xs font-semibold">
                          · {act.duration_min} mnt
                        </span>
                      </div>
                      <div className="flex items-center gap-1">
                        {act.kategori && (
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-700 text-slate-300 font-medium">
                            {act.kategori}
                          </span>
                        )}
                        <button
                          type="button"
                          onClick={() => startEdit(act)}
                          className="p-1 text-slate-400 hover:text-white"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(act)}
                          className="p-1 text-slate-400 hover:text-red-400"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    <p className={`text-xs leading-relaxed ${
                      act.highlight === 1 ? "bg-yellow-400/20 text-yellow-200 p-2 rounded-lg" : "text-slate-100"
                    }`}>
                      {act.kegiatan}
                    </p>

                    {act.keterangan && (
                      <div>
                        <button
                          type="button"
                          onClick={() => toggleCard(act.id)}
                          className="text-[11px] text-blue-400 hover:text-blue-300 flex items-center gap-1 font-medium"
                        >
                          <span>Keterangan</span>
                          {expandedCards[act.id] ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                        </button>
                        {expandedCards[act.id] && (
                          <p className="text-[11px] text-slate-400 italic bg-slate-900/60 p-2 rounded-md mt-1 border border-slate-750">
                            {act.keterangan}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Edit Activity Dialog */}
      {editingActivity && editForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-slate-800 border border-slate-700 w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-700">
              <h3 className="font-semibold text-white text-sm flex items-center gap-2">
                <Edit3 className="w-4 h-4 text-blue-400" />
                <span>Edit Catatan Kegiatan #{editingActivity.id}</span>
              </h3>
              <button
                type="button"
                onClick={() => setEditingActivity(null)}
                className="text-slate-400 hover:text-white p-1 rounded-md hover:bg-slate-700"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs max-h-[80vh] overflow-y-auto">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-300 mb-1">Tanggal</label>
                  <input
                    type="date"
                    value={editForm.tanggal}
                    onChange={(e) => {
                      const d = e.target.value;
                      setEditForm((prev) => ({
                        ...prev!,
                        tanggal: d,
                        hari: d ? getDayFromDate(d) : prev!.hari
                      }));
                    }}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-300 mb-1">Hari</label>
                  <select
                    value={editForm.hari}
                    onChange={(e) => setEditForm((prev) => ({ ...prev!, hari: e.target.value as DayName }))}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white"
                  >
                    {["Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu", "Minggu"].map((d) => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-300 mb-1">Start (HH:MM)</label>
                  <input
                    type="time"
                    value={editForm.start_time}
                    onChange={(e) => setEditForm((prev) => ({ ...prev!, start_time: e.target.value }))}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-300 mb-1">Finish (HH:MM)</label>
                  <input
                    type="time"
                    value={editForm.finish_time}
                    onChange={(e) => setEditForm((prev) => ({ ...prev!, finish_time: e.target.value }))}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white font-mono font-bold"
                  />
                </div>
              </div>

              {/* Quick Duration Buttons in Edit Modal */}
              <QuickDurationButtons
                onSelectDuration={(minutes) => {
                  let baseStart = editForm.start_time.trim();
                  if (!baseStart) {
                    baseStart = getCurrentWIB().timeStr;
                    setEditForm((prev) => ({ ...prev!, start_time: baseStart }));
                  }
                  const newFinish = addMinutesToTime(baseStart, minutes);
                  setEditForm((prev) => ({ ...prev!, finish_time: newFinish }));
                }}
                currentDurationMin={(() => {
                  const d = calculateDuration(editForm.start_time, editForm.finish_time);
                  return d.isValid ? d.durationMin : undefined;
                })()}
                className="mb-2"
              />

              <div>
                <QuickActivityButtons
                  onSelect={(kegText, katText) => {
                    setEditForm((prev) => ({
                      ...prev!,
                      kegiatan: kegText,
                      kategori: katText ? katText : prev!.kategori
                    }));
                    setTimeout(() => {
                      if (editKegiatanRef.current) {
                        editKegiatanRef.current.focus();
                        const len = kegText.length;
                        editKegiatanRef.current.setSelectionRange(len, len);
                      }
                    }, 50);
                  }}
                  className="mb-3"
                />
                <label className="block font-semibold text-slate-300 mb-1">Kegiatan *</label>
                <textarea
                  ref={editKegiatanRef}
                  rows={3}
                  value={editForm.kegiatan}
                  onChange={(e) => setEditForm((prev) => ({ ...prev!, kegiatan: e.target.value }))}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-white resize-y"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-300 mb-1">Kategori</label>
                  <input
                    type="text"
                    value={editForm.kategori}
                    onChange={(e) => setEditForm((prev) => ({ ...prev!, kategori: e.target.value }))}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-300 mb-1">Keterangan</label>
                  <input
                    type="text"
                    value={editForm.keterangan}
                    onChange={(e) => setEditForm((prev) => ({ ...prev!, keterangan: e.target.value }))}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white"
                  />
                </div>
              </div>

              <label className="flex items-center gap-2 cursor-pointer pt-2">
                <input
                  type="checkbox"
                  checked={editForm.highlight}
                  onChange={(e) => setEditForm((prev) => ({ ...prev!, highlight: e.target.checked }))}
                  className="w-4 h-4 rounded border-slate-700 text-yellow-400 bg-slate-900"
                />
                <span className="text-slate-300 font-medium">Sorot Kuning (Highlight di Excel)</span>
              </label>
            </div>

            <div className="flex items-center justify-end gap-2 px-5 py-3.5 bg-slate-900/60 border-t border-slate-700">
              <button
                type="button"
                onClick={() => setEditingActivity(null)}
                className="px-3.5 py-1.5 rounded-lg border border-slate-700 text-slate-300 hover:bg-slate-750 text-xs font-medium"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleSaveEdit}
                disabled={savingEdit}
                className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold"
              >
                {savingEdit ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                <span>Simpan Perubahan</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Export Dialog */}
      <ExportDialog isOpen={exportOpen} onClose={() => setExportOpen(false)} />
    </div>
  );
};