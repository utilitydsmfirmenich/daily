import React, { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { api } from "../lib/api-client";
import { generateActivitiesExcel } from "../lib/excel-generator";
import { getCurrentWIB } from "../lib/time-utils";
import { X, FileSpreadsheet, Download, Loader2, AlertCircle } from "lucide-react";

interface ExportDialogProps {
  isOpen: boolean;
  onClose: () => void;
  initialRange?: "today" | "month" | "week" | "all" | "custom";
}

export const ExportDialog: React.FC<ExportDialogProps> = ({ isOpen, onClose, initialRange = "today" }) => {
  const { user } = useAuth();
  const [rangeType, setRangeType] = useState<"today" | "month" | "week" | "all" | "custom">(initialRange);
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [layout, setLayout] = useState<"as_original" | "single_table">("as_original");
  const [durationFormat, setDurationFormat] = useState<"minutes" | "hours_minutes">("minutes");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen || !user) return null;

  const handleExport = async () => {
    setError(null);
    setLoading(true);

    try {
      let fromDate: string | undefined;
      let toDate: string | undefined;

      const today = new Date();
      const pad = (n: number) => String(n).padStart(2, "0");
      const fmt = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

      if (rangeType === "today") {
        const wib = getCurrentWIB();
        fromDate = wib.isoDate;
        toDate = wib.isoDate;
      } else if (rangeType === "month") {
        const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
        const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0);
        fromDate = fmt(firstDay);
        toDate = fmt(lastDay);
      } else if (rangeType === "week") {
        const dayOfWeek = today.getDay(); // 0 is Sunday
        const diff = today.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1); // Monday
        const monday = new Date(today.setDate(diff));
        const sunday = new Date(today.setDate(diff + 6));
        fromDate = fmt(monday);
        toDate = fmt(sunday);
      } else if (rangeType === "custom") {
        if (!customFrom || !customTo) {
          setError("Silakan tentukan tanggal awal dan tanggal akhir.");
          setLoading(false);
          return;
        }
        fromDate = customFrom;
        toDate = customTo;
      }

      // Fetch export data
      const activities = await api.getExportData(fromDate, toDate);

      if (!activities || activities.length === 0) {
        setError("Tidak ada data pada rentang tanggal yang dipilih.");
        setLoading(false);
        return;
      }

      // Generate Excel file
      const buffer = await generateActivitiesExcel(user.pid, activities, {
        layout,
        durationFormat
      });

      let filename: string;
      if (fromDate && toDate && fromDate === toDate) {
        filename = `pencatatan_kegiatan_${user.pid}_${fromDate}.xlsx`;
      } else {
        const fromLabel = fromDate || "awal";
        const toLabel = toDate || "akhir";
        filename = `pencatatan_kegiatan_${user.pid}_${fromLabel}_${toLabel}.xlsx`;
      }

      const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      onClose();
    } catch (err: any) {
      setError(err.message || "Gagal membuat berkas ekspor.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
      <div className="bg-slate-850 bg-slate-800 border border-slate-700 w-full max-w-md rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-700">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-600/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30">
              <FileSpreadsheet className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-semibold text-white text-sm">Ekspor ke Excel (.xlsx)</h3>
              <p className="text-[11px] text-slate-400">Sheet "{user.pid}" berformat standar acuan</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-md hover:bg-slate-700 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4 text-xs">
          {error && (
            <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg flex items-start gap-2 text-red-400">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Range Selection */}
          <div className="space-y-1.5">
            <label className="font-medium text-slate-300">Rentang Tanggal</label>
            <div className="grid grid-cols-2 gap-2">
              {[
                { id: "today", label: "Hari Ini" },
                { id: "week", label: "Pekan Ini" },
                { id: "month", label: "Bulan Ini" },
                { id: "all", label: "Semua Data" },
                { id: "custom", label: "Kustom Tanggal" }
              ].map((r) => (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => setRangeType(r.id as any)}
                  className={`py-2 px-3 rounded-lg border text-left font-medium transition ${
                    rangeType === r.id
                      ? "bg-blue-600/20 border-blue-500 text-blue-400"
                      : "bg-slate-900 border-slate-700 text-slate-400 hover:bg-slate-750 hover:text-slate-200"
                  }`}
                >
                  {r.label}
                </button>
              ))}
            </div>

            {rangeType === "custom" && (
              <div className="grid grid-cols-2 gap-2 pt-2">
                <div>
                  <span className="text-[11px] text-slate-400 block mb-1">Dari Tanggal:</span>
                  <input
                    type="date"
                    value={customFrom}
                    onChange={(e) => setCustomFrom(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-slate-100 focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <span className="text-[11px] text-slate-400 block mb-1">Sampai Tanggal:</span>
                  <input
                    type="date"
                    value={customTo}
                    onChange={(e) => setCustomTo(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-slate-100 focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Layout Selection */}
          <div className="space-y-1.5">
            <label className="font-medium text-slate-300">Tata Letak Tabel</label>
            <div className="space-y-1.5">
              <label
                className={`flex items-start gap-2.5 p-2.5 rounded-lg border cursor-pointer transition ${
                  layout === "as_original"
                    ? "bg-blue-600/10 border-blue-500/50 text-slate-100"
                    : "bg-slate-900/60 border-slate-700 text-slate-300 hover:bg-slate-750"
                }`}
              >
                <input
                  type="radio"
                  name="layout"
                  checked={layout === "as_original"}
                  onChange={() => setLayout("as_original")}
                  className="mt-0.5 text-blue-600 focus:ring-0"
                />
                <div>
                  <div className="font-semibold text-slate-100">Seperti file asli (Rekomendasi)</div>
                  <div className="text-[11px] text-slate-400">
                    Header 2 baris berulang di awal tiap hari, dipisah 1 baris kosong antar hari.
                  </div>
                </div>
              </label>

              <label
                className={`flex items-start gap-2.5 p-2.5 rounded-lg border cursor-pointer transition ${
                  layout === "single_table"
                    ? "bg-blue-600/10 border-blue-500/50 text-slate-100"
                    : "bg-slate-900/60 border-slate-700 text-slate-300 hover:bg-slate-750"
                }`}
              >
                <input
                  type="radio"
                  name="layout"
                  checked={layout === "single_table"}
                  onChange={() => setLayout("single_table")}
                  className="mt-0.5 text-blue-600 focus:ring-0"
                />
                <div>
                  <div className="font-semibold text-slate-100">Tabel tunggal kontinu</div>
                  <div className="text-[11px] text-slate-400">
                    Satu baris header di paling atas dengan filter aktif dan baris beku (freeze pane).
                  </div>
                </div>
              </label>
            </div>
          </div>

          {/* Total Duration Format */}
          <div className="space-y-1.5">
            <label className="font-medium text-slate-300">Format Waktu Total</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setDurationFormat("minutes")}
                className={`p-2 rounded-lg border text-left font-medium transition ${
                  durationFormat === "minutes"
                    ? "bg-blue-600/20 border-blue-500 text-blue-400"
                    : "bg-slate-900 border-slate-700 text-slate-400 hover:bg-slate-750 hover:text-slate-200"
                }`}
              >
                <div>Menit (angka bulat)</div>
                <div className="text-[10px] text-slate-500 mt-0.5">Contoh: 30, 90</div>
              </button>
              <button
                type="button"
                onClick={() => setDurationFormat("hours_minutes")}
                className={`p-2 rounded-lg border text-left font-medium transition ${
                  durationFormat === "hours_minutes"
                    ? "bg-blue-600/20 border-blue-500 text-blue-400"
                    : "bg-slate-900 border-slate-700 text-slate-400 hover:bg-slate-750 hover:text-slate-200"
                }`}
              >
                <div>Jam:menit (h:mm)</div>
                <div className="text-[10px] text-slate-500 mt-0.5">Contoh: 0:30, 1:30</div>
              </button>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-end gap-2 px-5 py-3.5 bg-slate-900/60 border-t border-slate-700">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="px-3.5 py-1.5 rounded-lg border border-slate-700 text-slate-300 hover:bg-slate-750 text-xs font-medium transition"
          >
            Batal
          </button>
          <button
            type="button"
            onClick={handleExport}
            disabled={loading}
            className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-semibold shadow-sm transition"
          >
            {loading ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Menyiapkan Berkas...</span>
              </>
            ) : (
              <>
                <Download className="w-3.5 h-3.5" />
                <span>Unduh File .xlsx</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};