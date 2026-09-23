import React, { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { api } from "../lib/api-client";
import { 
  calculateDuration, 
  getDayFromDate, 
  formatDurationHuman, 
  formatDateToIndonesian, 
  getCurrentWIB,
  addMinutesToTime 
} from "../lib/time-utils";
import { Activity, ActivityDefaults, DayName } from "../types";
import { QuickActivityButtons } from "../components/QuickActivityButtons";
import { QuickDurationButtons } from "../components/QuickDurationButtons";
import { QuickCategoryPills } from "../components/QuickCategoryPills";
import { TodayActivitiesTable } from "../components/TodayActivitiesTable";
import { generateActivitiesExcel } from "../lib/excel-generator";
import { 
  Clock, 
  Sparkles, 
  CheckCircle2, 
  AlertCircle, 
  RefreshCw, 
  Calendar, 
  History, 
  ArrowRight,
  Bookmark,
  FileSpreadsheet,
  Loader2,
  RotateCcw,
  Edit3,
  Trash2,
  Check,
  X
} from "lucide-react";

export const RecordPage: React.FC = () => {
  const { user } = useAuth();

  // Live WIB clock
  const [liveWib, setLiveWib] = useState(getCurrentWIB());

  useEffect(() => {
    const timer = setInterval(() => {
      setLiveWib(getCurrentWIB());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Defaults from server
  const [defaults, setDefaults] = useState<ActivityDefaults | null>(null);
  const [loadingDefaults, setLoadingDefaults] = useState(true);

  // Form states
  const [tanggal, setTanggal] = useState("");
  const [hari, setHari] = useState<DayName>("Senin");
  const [startTime, setStartTime] = useState("");
  const [finishTime, setFinishTime] = useState("");
  const [kegiatan, setKegiatan] = useState("");
  const [kategori, setKategori] = useState("");
  const [keterangan, setKeterangan] = useState("");
  const [highlight, setHighlight] = useState(false);

  const [categories, setCategories] = useState<string[]>([]);
  const [filteredCategories, setFilteredCategories] = useState<string[]>([]);
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);

  const [isShiftActive, setIsShiftActive] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Today's preview activities
  const [todayActivities, setTodayActivities] = useState<Activity[]>([]);
  const [loadingTodayActivities, setLoadingTodayActivities] = useState(false);

  // Edit Modal State
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

  // Undo delete snackbar
  const [undoItem, setUndoItem] = useState<{ id: number; activity: Activity } | null>(null);
  const [undoTimer, setUndoTimer] = useState<number | null>(null);

  const startInputRef = useRef<HTMLInputElement>(null);
  const kegiatanInputRef = useRef<HTMLTextAreaElement>(null);
  const categoryContainerRef = useRef<HTMLDivElement>(null);

  // Load defaults & categories
  const loadInitialData = async () => {
    setLoadingDefaults(true);
    try {
      const [defs, cats] = await Promise.all([
        api.getDefaults(),
        api.getCategories()
      ]);
      setDefaults(defs);
      setCategories(cats.categories.map((c) => c.kategori));

      // Restore local draft if available
      const draftKey = `log_draft_${user?.pid}`;
      const savedDraft = localStorage.getItem(draftKey);
      if (savedDraft) {
        try {
          const parsed = JSON.parse(savedDraft);
          setTanggal(parsed.tanggal || defs.tanggal);
          setHari(parsed.hari || defs.hari);
          setStartTime(parsed.start_time || defs.start_time);
          setFinishTime(parsed.finish_time || defs.finish_time);
          setKegiatan(parsed.kegiatan || "");
          setKategori(parsed.kategori || "");
          setKeterangan(parsed.keterangan || "");
          setHighlight(Boolean(parsed.highlight));
          setIsShiftActive(Boolean(parsed.is_shift_active ?? defs.is_shift_date));
          setLoadingDefaults(false);
          return;
        } catch {
          // ignore corrupted draft
        }
      }

      // Apply server defaults
      setTanggal(defs.tanggal);
      setHari(defs.hari);
      setStartTime(defs.start_time);
      setFinishTime(defs.finish_time);
      setIsShiftActive(defs.is_shift_date);

      // Auto-focus Start if empty, otherwise Kegiatan
      setTimeout(() => {
        if (!defs.start_time) {
          startInputRef.current?.focus();
        } else {
          kegiatanInputRef.current?.focus();
        }
      }, 100);
    } catch (err: any) {
      setErrorMessage(err.message || "Gagal memuat rekomendasi waktu.");
    } finally {
      setLoadingDefaults(false);
    }
  };

  useEffect(() => {
    loadInitialData();
  }, [user]);

  // Autosave draft to localStorage
  useEffect(() => {
    if (!user || loadingDefaults) return;
    const draftKey = `log_draft_${user.pid}`;
    const draft = {
      tanggal,
      hari,
      start_time: startTime,
      finish_time: finishTime,
      kegiatan,
      kategori,
      keterangan,
      highlight,
      is_shift_active: isShiftActive
    };
    localStorage.setItem(draftKey, JSON.stringify(draft));
  }, [tanggal, hari, startTime, finishTime, kegiatan, kategori, keterangan, highlight, isShiftActive]);

  // Click outside category dropdown
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (categoryContainerRef.current && !categoryContainerRef.current.contains(e.target as Node)) {
        setShowCategoryDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Update Hari when Tanggal changes
  const handleDateChange = (newDate: string) => {
    setTanggal(newDate);
    if (newDate) {
      setHari(getDayFromDate(newDate));
    }
  };

  // Load activities for current selected date
  const loadTodayActivities = async (targetDate?: string) => {
    const d = targetDate || tanggal;
    if (!d) return;
    setLoadingTodayActivities(true);
    try {
      const res = await api.getActivities({ from: d, to: d });
      setTodayActivities(res.activities || []);
    } catch {
      // ignore
    } finally {
      setLoadingTodayActivities(false);
    }
  };

  useEffect(() => {
    if (tanggal) {
      loadTodayActivities(tanggal);
    }
  }, [tanggal]);

  // Edit Activity Handlers
  const handleStartEdit = (act: Activity) => {
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

      setTodayActivities((prev) =>
        prev.map((a) => (a.id === editingActivity.id ? res.activity : a))
      );
      setEditingActivity(null);
      setEditForm(null);
      setSuccessMessage("Catatan kegiatan berhasil diperbarui!");
      setTimeout(() => setSuccessMessage(null), 4000);
    } catch (err: any) {
      alert(err.message || "Gagal memperbarui catatan.");
    } finally {
      setSavingEdit(false);
    }
  };

  // Delete & Undo Handlers
  const handleDeleteActivity = async (act: Activity) => {
    try {
      await api.deleteActivity(act.id);
      setTodayActivities((prev) => prev.filter((a) => a.id !== act.id));

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
      setTodayActivities((prev) =>
        [...prev, res.activity].sort((a, b) => a.id - b.id || a.start_time.localeCompare(b.start_time))
      );
      setUndoItem(null);
      if (undoTimer) clearTimeout(undoTimer);
      setSuccessMessage("Penghapusan catatan berhasil dibatalkan!");
      setTimeout(() => setSuccessMessage(null), 4000);
    } catch (err: any) {
      alert(err.message || "Gagal membatalkan penghapusan.");
    }
  };

  // Toggle shift date vs calendar date
  const toggleShiftDate = () => {
    if (!defaults) return;
    if (isShiftActive) {
      // Switch to calendar date
      setTanggal(defaults.calendar_tanggal);
      setHari(defaults.calendar_hari);
      setIsShiftActive(false);
    } else {
      // Switch back to shift date
      setTanggal(defaults.tanggal);
      setHari(defaults.hari);
      setIsShiftActive(true);
    }
  };

  // Quick Action Button handler
  const handleQuickSelect = (kegText: string, katText: string) => {
    setKegiatan(kegText);
    if (katText) {
      setKategori(katText);
    }
    setTimeout(() => {
      if (kegiatanInputRef.current) {
        kegiatanInputRef.current.focus();
        const len = kegText.length;
        kegiatanInputRef.current.setSelectionRange(len, len);
      }
    }, 50);
  };

  // Calculate duration live
  const durationResult = calculateDuration(startTime, finishTime);

  // Quick Duration Handler
  const handleSelectDuration = (minutes: number) => {
    let baseStart = startTime.trim();
    if (!baseStart) {
      baseStart = liveWib.timeStr;
      setStartTime(baseStart);
    }
    const newFinish = addMinutesToTime(baseStart, minutes);
    setFinishTime(newFinish);
  };

  // Category filter
  const handleCategoryInput = (val: string) => {
    setKategori(val);
    if (!val.trim()) {
      setFilteredCategories(categories.slice(0, 8));
    } else {
      const filtered = categories.filter((c) =>
        c.toLowerCase().includes(val.trim().toLowerCase())
      );
      setFilteredCategories(filtered);
    }
    setShowCategoryDropdown(true);
  };

  // Quick 1-click Export Today Handler
  const [exportingToday, setExportingToday] = useState(false);

  const handleExportToday = async () => {
    if (!user) return;
    setExportingToday(true);
    try {
      const targetDate = defaults?.is_shift_date && isShiftActive ? defaults.tanggal : tanggal;
      const activities = await api.getExportData(targetDate, targetDate);

      if (!activities || activities.length === 0) {
        setErrorMessage(`Belum ada catatan kegiatan untuk tanggal/shift ${formatDateToIndonesian(targetDate)}.`);
        setTimeout(() => setErrorMessage(null), 5000);
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

      setSuccessMessage(`File "${filename}" berhasil diunduh (${activities.length} kegiatan)!`);
      setTimeout(() => setSuccessMessage(null), 5000);
    } catch (err: any) {
      setErrorMessage(err.message || "Gagal mengunduh Excel hari ini.");
      setTimeout(() => setErrorMessage(null), 5000);
    } finally {
      setExportingToday(false);
    }
  };

  // Submit Handler
  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!kegiatan.trim()) {
      setErrorMessage("Kolom Kegiatan wajib diisi.");
      kegiatanInputRef.current?.focus();
      return;
    }
    if (!startTime) {
      setErrorMessage("Kolom Jam Mulai (Start) wajib diisi.");
      startInputRef.current?.focus();
      return;
    }

    if (!durationResult.isValid) {
      setErrorMessage(durationResult.error || "Waktu mulai dan selesai tidak valid.");
      return;
    }

    setErrorMessage(null);
    setSubmitting(true);

    try {
      const res = await api.createActivity({
        client_id: crypto.randomUUID(),
        tanggal,
        hari,
        start_time: startTime,
        finish_time: finishTime,
        kegiatan: kegiatan.trim(),
        kategori: kategori.trim() || null,
        keterangan: keterangan.trim() || null,
        highlight
      });

      // Clear draft
      localStorage.removeItem(`log_draft_${user?.pid}`);

      setSuccessMessage(`Kegiatan "${res.activity.kegiatan.substring(0, 30)}..." berhasil dicatat!`);
      setTimeout(() => setSuccessMessage(null), 5000);

      // Setup next chain: Start = previous Finish!
      setStartTime(finishTime);
      setKegiatan("");
      setKeterangan("");
      setHighlight(false);

      // Re-fetch defaults for next entry
      const defs = await api.getDefaults();
      setDefaults(defs);
      setFinishTime(defs.finish_time);

      // Reload today's activities preview table
      await loadTodayActivities(tanggal);

      kegiatanInputRef.current?.focus();
    } catch (err: any) {
      setErrorMessage(err.message || "Gagal menyimpan kegiatan.");
    } finally {
      setSubmitting(false);
    }
  };

  // Ctrl+Enter shortcut to save
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-3 sm:px-6 py-6 pb-24 text-slate-100">
      {/* Live Header & Clock */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6 bg-slate-800/80 border border-slate-700/80 p-4 rounded-2xl shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-blue-600/20 text-blue-400 border border-blue-500/30">
              Operator: {user?.pid}
            </span>
            <span className="text-xs text-slate-400">
              {user?.display_name}
            </span>
          </div>
          <h1 className="text-lg font-bold text-white mt-1">Catat Kegiatan Harian</h1>
        </div>

        {/* Quick Export & Live Running WIB Clock */}
        <div className="flex flex-wrap items-center gap-2.5 self-start sm:self-auto">
          <button
            type="button"
            onClick={handleExportToday}
            disabled={exportingToday}
            className="flex items-center gap-2 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 border border-emerald-500/40 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition active:scale-95 shadow-sm disabled:opacity-50"
            title="Unduh laporan Excel untuk kegiatan hari ini"
          >
            {exportingToday ? (
              <Loader2 className="w-4 h-4 animate-spin text-emerald-400" />
            ) : (
              <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
            )}
            <span>Ekspor Hari Ini</span>
          </button>

          <div className="flex items-center gap-2.5 bg-slate-900/90 border border-slate-700/90 px-3.5 py-2 rounded-xl text-xs font-mono shadow-inner">
            <Clock className="w-4 h-4 text-emerald-400 animate-pulse" />
            <div>
              <div className="text-[11px] text-slate-400 font-sans">Waktu Sekarang (WIB):</div>
              <div className="font-bold text-sm text-emerald-400">
                {liveWib.dayName}, {liveWib.timeStr} <span className="text-[10px] text-slate-500">WIB</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Notifications */}
      {successMessage && (
        <div className="mb-5 p-3.5 bg-emerald-500/10 border border-emerald-500/30 rounded-xl flex items-center gap-2.5 text-xs text-emerald-400 shadow-sm animate-fadeIn">
          <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
          <span className="font-medium">{successMessage}</span>
        </div>
      )}

      {errorMessage && (
        <div className="mb-5 p-3.5 bg-red-500/10 border border-red-500/30 rounded-xl flex items-center gap-2.5 text-xs text-red-400 shadow-sm animate-shake">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span className="font-medium">{errorMessage}</span>
        </div>
      )}

      {/* Main Entry Card */}
      <div className="bg-slate-800 border border-slate-700/90 rounded-2xl shadow-xl overflow-hidden" onKeyDown={handleKeyDown}>
        {/* Shift Date Banner */}
        {defaults?.is_shift_date && (
          <div className="bg-blue-950/50 border-b border-blue-800/40 px-5 py-2.5 flex flex-wrap items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-2 text-blue-300">
              <Sparkles className="w-4 h-4 text-blue-400 flex-shrink-0" />
              <span>
                <strong>Tanggal Shift Aktif:</strong> Mengikuti entri shift malam (
                {formatDateToIndonesian(defaults.tanggal)} - {defaults.hari})
              </span>
            </div>
            <button
              type="button"
              onClick={toggleShiftDate}
              className="text-[11px] font-semibold text-blue-400 hover:text-blue-300 bg-blue-900/40 hover:bg-blue-900/60 px-2.5 py-1 rounded-md border border-blue-700/50 transition"
            >
              {isShiftActive ? "Ganti ke Tanggal Kalender Hari Ini" : "Kembalikan ke Tanggal Shift"}
            </button>
          </div>
        )}

        <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-5">
          {/* Row 1: Tanggal & Hari */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Tanggal (dd/mm/yyyy)
              </label>
              <div className="relative">
                <input
                  type="date"
                  value={tanggal}
                  onChange={(e) => handleDateChange(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2 text-xs font-medium text-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Hari
              </label>
              <select
                value={hari}
                onChange={(e) => setHari(e.target.value as DayName)}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2 text-xs font-medium text-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition"
              >
                {["Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu", "Minggu"].map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Row 2: Waktu Start, Finish, & Live Total Duration */}
          <div className="p-4 bg-slate-900/60 border border-slate-700/70 rounded-xl">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-center">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Waktu Mulai (Start)
                </label>
                <input
                  ref={startInputRef}
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  placeholder="07:20"
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm font-mono font-bold text-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                />
                <span className="text-[10px] text-slate-400 mt-1 block">
                  {defaults?.start_time ? "Otomatis dari finish sebelumnya" : "Isi manual awal shift"}
                </span>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-semibold text-slate-300">
                    Waktu Selesai (Finish)
                  </label>
                  <button
                    type="button"
                    onClick={() => setFinishTime(liveWib.timeStr)}
                    className="text-[10px] text-blue-400 hover:text-blue-300 flex items-center gap-1 font-medium"
                    title="Gunakan jam server sekarang"
                  >
                    <RefreshCw className="w-2.5 h-2.5" />
                    <span>Jam sekarang</span>
                  </button>
                </div>
                <input
                  type="time"
                  value={finishTime}
                  onChange={(e) => setFinishTime(e.target.value)}
                  placeholder="07:50"
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm font-mono font-bold text-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                />
                <span className="text-[10px] text-slate-400 mt-1 block">
                  Default jam saat simpan
                </span>
              </div>

              {/* Total Duration Calculated Badge */}
              <div className="flex flex-col items-start sm:items-center justify-center p-3 bg-slate-800/80 rounded-lg border border-slate-700">
                <span className="text-[11px] text-slate-400 font-medium">Waktu Total:</span>
                <div className="text-base font-bold text-emerald-400 mt-0.5 font-mono flex items-center gap-1.5">
                  <span>{durationResult.isValid ? formatDurationHuman(durationResult.durationMin) : "—"}</span>
                  {durationResult.isMidnightRollover && (
                    <span className="text-[10px] font-sans px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                      +1 hari
                    </span>
                  )}
                </div>
                <span className="text-[10px] text-slate-500">
                  {durationResult.isValid ? `(${durationResult.durationMin} menit)` : "Menunggu waktu valid"}
                </span>
              </div>
            </div>

            {/* Quick Duration Buttons (+5m to +2h) */}
            <div className="pt-3 mt-3 border-t border-slate-800/80">
              <QuickDurationButtons
                onSelectDuration={handleSelectDuration}
                currentDurationMin={durationResult.isValid ? durationResult.durationMin : undefined}
              />
            </div>
          </div>

          {/* Quick Activity Buttons */}
          <div className="pt-1">
            <QuickActivityButtons onSelect={handleQuickSelect} />
          </div>

          {/* Row 3: Kegiatan (Wajib) */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-semibold text-slate-300">
                Kegiatan <span className="text-red-400">*</span>
              </label>
              <span className="text-[11px] text-slate-400 font-mono">
                {kegiatan.length}/1000
              </span>
            </div>
            <textarea
              ref={kegiatanInputRef}
              rows={3}
              maxLength={1000}
              value={kegiatan}
              onChange={(e) => setKegiatan(e.target.value)}
              placeholder="Tuliskan kegiatan operasional shift ini secara jelas..."
              className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition resize-y"
            />
          </div>

          {/* Row 4: Kategori (Autocomplete & Quick Pills) & Keterangan (Opsional) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="relative space-y-2" ref={categoryContainerRef}>
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Kategori Pekerjaan <span className="text-slate-500 font-normal">(opsional)</span>
                </label>
                <input
                  type="text"
                  value={kategori}
                  onChange={(e) => handleCategoryInput(e.target.value)}
                  onFocus={() => handleCategoryInput(kategori)}
                  placeholder="Pilih cepat di bawah atau ketik manual..."
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                />

                {/* Autocomplete Dropdown */}
                {showCategoryDropdown && filteredCategories.length > 0 && (
                  <div className="absolute left-0 right-0 mt-1 bg-slate-800 border border-slate-700 rounded-xl shadow-xl max-h-48 overflow-y-auto z-30 py-1 divide-y divide-slate-700/50">
                    {filteredCategories.map((cat) => (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => {
                          setKategori(cat);
                          setShowCategoryDropdown(false);
                        }}
                        className="w-full text-left px-3.5 py-2 text-xs text-slate-200 hover:bg-slate-700 transition"
                      >
                        {cat}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Quick Category Pills (7 Standard Categories) */}
              <QuickCategoryPills
                selectedCategory={kategori}
                onSelectCategory={(cat) => setKategori(cat)}
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Keterangan <span className="text-slate-500 font-normal">(opsional)</span>
              </label>
              <input
                type="text"
                value={keterangan}
                onChange={(e) => setKeterangan(e.target.value)}
                placeholder="Catatan tambahan pekerjaan..."
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Row 5: Highlight & Action Button */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-3 border-t border-slate-700/70">
            <label className="flex items-center gap-2.5 cursor-pointer text-xs select-none">
              <input
                type="checkbox"
                checked={highlight}
                onChange={(e) => setHighlight(e.target.checked)}
                className="w-4 h-4 rounded border-slate-700 text-yellow-400 focus:ring-0 focus:ring-offset-0 bg-slate-900"
              />
              <span className="flex items-center gap-1.5 text-slate-300 font-medium">
                <Bookmark className={`w-3.5 h-3.5 ${highlight ? "text-yellow-400 fill-yellow-400" : "text-slate-500"}`} />
                <span>Tandai Sorot Kuning (Highlight di Excel)</span>
              </span>
            </label>

            <div className="flex items-center gap-3">
              <span className="hidden sm:inline-block text-[11px] text-slate-400">
                Pintasan: <kbd className="px-1.5 py-0.5 bg-slate-900 border border-slate-700 rounded text-slate-300 font-mono">Ctrl+Enter</kbd>
              </span>
              <button
                type="submit"
                disabled={submitting}
                className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-lg shadow-blue-600/20 disabled:opacity-50 transition"
              >
                <span>SIMPAN KEGIATAN</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </form>
      </div>

      {/* Today's Activities Preview Table */}
      <div className="mt-8">
        <TodayActivitiesTable
          activities={todayActivities}
          dateStr={tanggal}
          loading={loadingTodayActivities}
          onEdit={handleStartEdit}
          onDelete={handleDeleteActivity}
          onRefresh={() => loadTodayActivities(tanggal)}
        />
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

      {/* Edit Activity Modal */}
      {editingActivity && editForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="w-full max-w-lg bg-slate-800 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-700 bg-slate-900/40">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Edit3 className="w-4 h-4 text-blue-400" />
                <span>Edit Catatan Kegiatan #{editingActivity.id}</span>
              </h3>
              <button
                type="button"
                onClick={() => setEditingActivity(null)}
                className="text-slate-400 hover:text-white p-1 rounded-md hover:bg-slate-700 transition"
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

              <div className="space-y-2.5">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-slate-300 mb-1">Kategori</label>
                    <input
                      type="text"
                      value={editForm.kategori}
                      onChange={(e) => setEditForm((prev) => ({ ...prev!, kategori: e.target.value }))}
                      placeholder="Pilih cepat di bawah atau ketik..."
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

                {/* Quick Category Pills in Edit Modal */}
                <QuickCategoryPills
                  selectedCategory={editForm.kategori}
                  onSelectCategory={(cat) => setEditForm((prev) => ({ ...prev!, kategori: cat }))}
                />
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
                className="px-3.5 py-1.5 rounded-lg border border-slate-700 hover:bg-slate-700 text-slate-300 font-medium transition"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleSaveEdit}
                disabled={savingEdit}
                className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-semibold shadow transition disabled:opacity-50"
              >
                {savingEdit ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Menyimpan...</span>
                  </>
                ) : (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    <span>Simpan Perubahan</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};