import React, { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { api } from "../lib/api-client";
import { 
  calculateDuration, 
  getDayFromDate, 
  formatDurationHuman, 
  formatDateToIndonesian, 
  getCurrentWIB 
} from "../lib/time-utils";
import { Activity, ActivityDefaults, DayName } from "../types";
import { QuickActivityButtons } from "../components/QuickActivityButtons";
import { 
  Clock, 
  Sparkles, 
  CheckCircle2, 
  AlertCircle, 
  RefreshCw, 
  Calendar, 
  History, 
  ArrowRight,
  Bookmark
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
    setKategori(katText);
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

        {/* Live Running WIB Clock */}
        <div className="flex items-center gap-2.5 bg-slate-900/90 border border-slate-700/90 px-3.5 py-2 rounded-xl text-xs font-mono self-start sm:self-auto shadow-inner">
          <Clock className="w-4 h-4 text-emerald-400 animate-pulse" />
          <div>
            <div className="text-[11px] text-slate-400 font-sans">Waktu Sekarang (WIB):</div>
            <div className="font-bold text-sm text-emerald-400">
              {liveWib.dayName}, {liveWib.timeStr} <span className="text-[10px] text-slate-500">WIB</span>
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

          {/* Row 4: Kategori (Autocomplete) & Keterangan (Opsional) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="relative" ref={categoryContainerRef}>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Kategori Pekerjaan <span className="text-slate-500 font-normal">(opsional)</span>
              </label>
              <input
                type="text"
                value={kategori}
                onChange={(e) => handleCategoryInput(e.target.value)}
                onFocus={() => handleCategoryInput(kategori)}
                placeholder="Contoh: Briefing, Administratif, Operasional..."
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

      {/* Last Activity Section */}
      {defaults?.last_activity && (
        <div className="mt-8 bg-slate-800/60 border border-slate-700/60 rounded-2xl p-4 sm:p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-semibold text-slate-300 flex items-center gap-2">
              <History className="w-4 h-4 text-blue-400" />
              <span>Catatan Terakhir Shift Ini ({formatDateToIndonesian(defaults.last_activity.tanggal)})</span>
            </h3>
            <Link
              to="/riwayat"
              className="text-xs text-blue-400 hover:text-blue-300 font-medium flex items-center gap-1"
            >
              <span>Buka Riwayat Lengkap</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="bg-slate-900/80 border border-slate-700/80 rounded-xl p-3.5 text-xs">
            <div className="flex flex-wrap items-center justify-between gap-2 mb-1.5">
              <div className="flex items-center gap-2 font-mono font-bold text-white">
                <span>{defaults.last_activity.start_time}</span>
                <span className="text-slate-500">→</span>
                <span>{defaults.last_activity.finish_time}</span>
                <span className="text-emerald-400 font-sans text-xs">
                  ({defaults.last_activity.duration_min} mnt)
                </span>
              </div>
              {defaults.last_activity.kategori && (
                <span className="px-2 py-0.5 rounded-md bg-slate-800 text-slate-300 border border-slate-700 text-[11px]">
                  {defaults.last_activity.kategori}
                </span>
              )}
            </div>
            <p className="text-slate-200 font-medium">{defaults.last_activity.kegiatan}</p>
            {defaults.last_activity.keterangan && (
              <p className="text-slate-400 text-[11px] mt-1 italic">
                Ket: {defaults.last_activity.keterangan}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
};