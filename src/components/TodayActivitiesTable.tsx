import React from "react";
import { Link } from "react-router-dom";
import { Activity } from "../types";
import { formatDateToIndonesian, formatDurationHuman } from "../lib/time-utils";
import { 
  Table, 
  Clock, 
  Edit3, 
  Trash2, 
  RefreshCw, 
  ArrowRight, 
  Bookmark, 
  Loader2,
  CalendarCheck2
} from "lucide-react";

interface TodayActivitiesTableProps {
  activities: Activity[];
  dateStr: string;
  loading: boolean;
  onEdit: (activity: Activity) => void;
  onDelete: (activity: Activity) => void;
  onRefresh: () => void;
  className?: string;
}

export const TodayActivitiesTable: React.FC<TodayActivitiesTableProps> = ({
  activities,
  dateStr,
  loading,
  onEdit,
  onDelete,
  onRefresh,
  className = ""
}) => {
  // Sort chronologically (earliest to latest in the shift)
  const sortedActivities = React.useMemo(() => {
    return [...activities].sort((a, b) => a.id - b.id || a.start_time.localeCompare(b.start_time));
  }, [activities]);

  // Total duration in minutes
  const totalMinutes = React.useMemo(() => {
    return sortedActivities.reduce((sum, item) => sum + (item.duration_min || 0), 0);
  }, [sortedActivities]);

  const highlightCount = React.useMemo(() => {
    return sortedActivities.filter((item) => item.highlight === 1).length;
  }, [sortedActivities]);

  return (
    <div className={`bg-slate-800/80 border border-slate-700/80 rounded-2xl p-4 sm:p-5 shadow-sm space-y-4 ${className}`}>
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-700/70">
        <div>
          <div className="flex items-center gap-2">
            <CalendarCheck2 className="w-5 h-5 text-emerald-400" />
            <h3 className="text-sm font-bold text-white">
              Tabel Pratinjau Catatan — {dateStr ? formatDateToIndonesian(dateStr) : "Hari Ini"}
            </h3>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Daftar kegiatan shift ini diurutkan secara kronologis
          </p>
        </div>

        {/* Stats Badges & Actions */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Count Badge */}
          <span className="px-2.5 py-1 rounded-lg bg-blue-950/60 border border-blue-500/30 text-blue-300 text-xs font-semibold">
            {sortedActivities.length} Kegiatan
          </span>

          {/* Total Duration Badge */}
          <span className="px-2.5 py-1 rounded-lg bg-emerald-950/60 border border-emerald-500/30 text-emerald-300 text-xs font-semibold font-mono flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-emerald-400" />
            <span>Total: {formatDurationHuman(totalMinutes)}</span>
            <span className="text-[10px] text-slate-400">({totalMinutes} mnt)</span>
          </span>

          {/* Refresh button */}
          <button
            type="button"
            onClick={onRefresh}
            disabled={loading}
            title="Muat ulang tabel"
            className="p-1.5 rounded-lg bg-slate-900 border border-slate-700 text-slate-300 hover:text-white hover:border-slate-600 transition disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin text-blue-400" : ""}`} />
          </button>

          {/* Link to Full History */}
          <Link
            to="/riwayat"
            className="text-xs text-blue-400 hover:text-blue-300 font-medium flex items-center gap-1 ml-1 px-2.5 py-1 rounded-lg hover:bg-slate-750 transition"
          >
            <span>Riwayat Lengkap</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>

      {/* Table Content */}
      {loading ? (
        <div className="py-12 flex flex-col items-center justify-center text-slate-400 text-xs">
          <Loader2 className="w-6 h-6 animate-spin text-blue-400 mb-2" />
          <span>Memuat data kegiatan hari ini...</span>
        </div>
      ) : sortedActivities.length === 0 ? (
        <div className="py-10 text-center text-slate-400 space-y-1">
          <Table className="w-8 h-8 text-slate-600 mx-auto mb-2 opacity-60" />
          <p className="text-xs font-semibold text-slate-300">Belum Ada Catatan Kegiatan untuk Tanggal Ini</p>
          <p className="text-[11px] text-slate-500">
            Isi formulir di atas dan klik <b>SIMPAN KEGIATAN</b> untuk menambahkan kegiatan pertama Anda.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-700/80 bg-slate-900/60 shadow-inner">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-700 bg-slate-800/90 text-slate-300 font-semibold text-[11px]">
                <th className="py-2.5 px-3 w-12 text-center">No</th>
                <th className="py-2.5 px-3 whitespace-nowrap">Waktu</th>
                <th className="py-2.5 px-3 text-center whitespace-nowrap">Durasi</th>
                <th className="py-2.5 px-3 min-w-[220px]">Kegiatan</th>
                <th className="py-2.5 px-3 whitespace-nowrap">Kategori</th>
                <th className="py-2.5 px-3 min-w-[160px]">Keterangan</th>
                <th className="py-2.5 px-3 w-20 text-center whitespace-nowrap">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80">
              {sortedActivities.map((act, index) => {
                const isHighlighted = act.highlight === 1;
                return (
                  <tr
                    key={act.id}
                    className={`transition hover:bg-slate-800/60 ${
                      isHighlighted ? "bg-amber-500/10 hover:bg-amber-500/15" : ""
                    }`}
                  >
                    {/* No */}
                    <td className="py-2.5 px-3 text-center text-slate-400 font-mono text-[11px]">
                      {index + 1}
                    </td>

                    {/* Waktu Start - Finish */}
                    <td className="py-2.5 px-3 whitespace-nowrap font-mono font-bold text-white text-xs">
                      <span>{act.start_time}</span>
                      <span className="text-slate-500 mx-1">→</span>
                      <span>{act.finish_time}</span>
                    </td>

                    {/* Durasi */}
                    <td className="py-2.5 px-3 text-center whitespace-nowrap">
                      <span className="px-2 py-0.5 rounded bg-slate-800 text-emerald-400 font-mono font-semibold text-[11px] border border-slate-700/70">
                        {act.duration_min} mnt
                      </span>
                    </td>

                    {/* Kegiatan */}
                    <td className="py-2.5 px-3 text-slate-100 font-medium">
                      <div className="flex items-start gap-1.5">
                        {isHighlighted && (
                          <Bookmark className="w-3.5 h-3.5 text-yellow-400 fill-yellow-400 shrink-0 mt-0.5" />
                        )}
                        <span className={isHighlighted ? "text-yellow-200 font-semibold" : ""}>
                          {act.kegiatan}
                        </span>
                      </div>
                    </td>

                    {/* Kategori */}
                    <td className="py-2.5 px-3 whitespace-nowrap">
                      {act.kategori ? (
                        <span className="px-2 py-0.5 rounded-md bg-slate-800 text-slate-300 border border-slate-700 text-[11px] font-medium">
                          {act.kategori}
                        </span>
                      ) : (
                        <span className="text-slate-600 text-[11px]">—</span>
                      )}
                    </td>

                    {/* Keterangan */}
                    <td className="py-2.5 px-3 text-slate-400 text-[11px] italic">
                      {act.keterangan || <span className="text-slate-600 not-italic">—</span>}
                    </td>

                    {/* Aksi Cepat Edit & Hapus */}
                    <td className="py-2.5 px-3 text-center whitespace-nowrap">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => onEdit(act)}
                          title="Edit kegiatan ini"
                          className="p-1.5 rounded-lg bg-blue-600/10 hover:bg-blue-600 text-blue-400 hover:text-white border border-blue-500/20 transition active:scale-95"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => onDelete(act)}
                          title="Hapus kegiatan ini"
                          className="p-1.5 rounded-lg bg-red-600/10 hover:bg-red-600 text-red-400 hover:text-white border border-red-500/20 transition active:scale-95"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
            {/* Table Summary Footer */}
            <tfoot>
              <tr className="bg-slate-850 border-t-2 border-slate-700 text-xs font-semibold text-slate-200">
                <td colSpan={2} className="py-2.5 px-3 text-slate-400 text-left">
                  Total Akumulasi Shift:
                </td>
                <td className="py-2.5 px-3 text-center font-mono font-bold text-emerald-400 whitespace-nowrap">
                  {totalMinutes} mnt
                </td>
                <td colSpan={4} className="py-2.5 px-3 text-slate-300">
                  <span className="font-bold text-white">{formatDurationHuman(totalMinutes)}</span>
                  {highlightCount > 0 && (
                    <span className="ml-3 text-[11px] text-yellow-400">
                      ★ {highlightCount} kegiatan ditandai sorot kuning
                    </span>
                  )}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  );
};
