import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { api } from "../lib/api-client";
import { parseExcelLogFile } from "../lib/excel-parser";
import { generateActivitiesExcel } from "../lib/excel-generator";
import { 
  ParsedImportRow, 
  ImportPreviewSummary, 
  ImportRowStatus, 
  ImportBatch, 
  Activity 
} from "../types";
import { 
  UploadCloud, 
  FileSpreadsheet, 
  AlertTriangle, 
  CheckCircle2, 
  XCircle, 
  Copy, 
  ArrowRight, 
  RotateCcw, 
  Download, 
  Loader2, 
  Sparkles, 
  Edit3, 
  ArrowLeft 
} from "lucide-react";

export const ImportWizardPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  // Wizard state: 1: file, 2: preview, 3: committing, 4: complete
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);

  // File & parsing states
  const [file, setFile] = useState<File | null>(null);
  const [parsing, setParsing] = useState(false);
  const [parseError, setParseError] = useState<string | null>(null);
  const [summary, setSummary] = useState<ImportPreviewSummary | null>(null);

  // Filter in preview table
  const [activeTab, setActiveTab] = useState<"all" | "warning" | "rejected" | "duplicate" | "ready">("all");
  const [importMode, setImportMode] = useState<"skip_duplicates" | "add_all">("skip_duplicates");

  // Commit progress
  const [progressPercent, setProgressPercent] = useState(0);
  const [insertedTotal, setInsertedTotal] = useState(0);
  const [skippedTotal, setSkippedTotal] = useState(0);
  const [currentBatchId, setCurrentBatchId] = useState<string | null>(null);

  // Past batches
  const [batches, setBatches] = useState<ImportBatch[]>([]);
  const [loadingBatches, setLoadingBatches] = useState(false);

  // Load existing activities for duplicate check
  const [existingActs, setExistingActs] = useState<Array<{ tanggal: string; start_time: string; finish_time: string; kegiatan: string }>>([]);

  useEffect(() => {
    loadBatches();
    loadExistingActivities();
  }, [user]);

  const loadBatches = async () => {
    setLoadingBatches(true);
    try {
      const res = await api.getImportBatches();
      setBatches(res.batches);
    } catch {
      // ignore
    } finally {
      setLoadingBatches(false);
    }
  };

  const loadExistingActivities = async () => {
    try {
      const res = await api.getActivities({});
      setExistingActs(res.activities.map((a) => ({
        tanggal: a.tanggal,
        start_time: a.start_time,
        finish_time: a.finish_time,
        kegiatan: a.kegiatan
      })));
    } catch {
      // ignore
    }
  };

  const handleFileDrop = async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processSelectedFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processSelectedFile(e.target.files[0]);
    }
  };

  const processSelectedFile = async (selectedFile: File) => {
    if (!user) return;
    if (!selectedFile.name.endsWith(".xlsx")) {
      setParseError("Hanya file Excel berformat .xlsx yang didukung.");
      return;
    }
    if (selectedFile.size > 5 * 1024 * 1024) {
      setParseError("Ukuran file maksimal 5 MB.");
      return;
    }

    setFile(selectedFile);
    setParseError(null);
    setParsing(true);

    try {
      const arrayBuffer = await selectedFile.arrayBuffer();
      const res = await parseExcelLogFile(arrayBuffer, user.pid, existingActs);
      setSummary(res);
      setStep(2);
    } catch (err: any) {
      setParseError(err.message || "Gagal membaca berkas Excel.");
    } finally {
      setParsing(false);
    }
  };

  // Commit Import
  const handleStartImport = async () => {
    if (!user || !summary || !file) return;

    const rowsToProcess = summary.rows.filter((r) => {
      if (r.status === "rejected" || r.status === "skipped") return false;
      if (importMode === "skip_duplicates" && r.status === "duplicate") return false;
      return true;
    });

    if (rowsToProcess.length === 0) {
      alert("Tidak ada baris data valid untuk diimpor.");
      return;
    }

    setStep(3);
    const batchId = crypto.randomUUID();
    setCurrentBatchId(batchId);

    const chunkSize = 200;
    let totalInserted = 0;
    let totalSkipped = 0;

    for (let i = 0; i < rowsToProcess.length; i += chunkSize) {
      const chunk = rowsToProcess.slice(i, i + chunkSize);
      try {
        const res = await api.commitImportChunk({
          batch_id: batchId,
          filename: file.name,
          rows: chunk
        });
        totalInserted += res.inserted_count;
        totalSkipped += res.skipped_count;
      } catch (err: any) {
        alert("Terjadi kendala saat mengirim data: " + err.message);
        break;
      }

      const percent = Math.round(((i + chunk.length) / rowsToProcess.length) * 100);
      setProgressPercent(percent);
    }

    setInsertedTotal(totalInserted);
    setSkippedTotal(totalSkipped);
    setStep(4);
    loadBatches();
  };

  // Undo Batch
  const handleUndoBatch = async (batchId: string) => {
    if (!confirm("Apakah Anda yakin ingin membatalkan (undo) seluruh catatan dari batch impor ini?")) {
      return;
    }
    try {
      await api.undoImport(batchId);
      alert("Batch impor berhasil dibatalkan.");
      loadBatches();
    } catch (err: any) {
      alert("Gagal membatalkan batch: " + err.message);
    }
  };

  // Download Rejected Report
  const handleDownloadRejectReport = async () => {
    if (!summary || !user) return;
    const rejectedRows = summary.rows.filter((r) => r.status === "rejected");
    if (rejectedRows.length === 0) {
      alert("Tidak ada baris yang ditolak.");
      return;
    }

    const dummyActs: Activity[] = rejectedRows.map((r, idx) => ({
      id: idx + 1,
      client_id: `rejected-${idx}`,
      pid: user.pid,
      tanggal: r.tanggal || "TIDAK VALID",
      hari: r.hari,
      start_time: r.start_time || "—",
      finish_time: r.finish_time || "—",
      duration_min: r.duration_min,
      kegiatan: `[DITOLAK: ${r.issues.join(", ")}] ${r.kegiatan}`,
      kategori: r.kategori,
      keterangan: r.keterangan,
      highlight: 0,
      source: "import",
      import_id: null,
      created_at: new Date().toISOString(),
      updated_at: null,
      edit_count: 0,
      deleted_at: null
    }));

    const buffer = await generateActivitiesExcel(user.pid, dummyActs, {
      layout: "single_table",
      durationFormat: "minutes"
    });

    const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `laporan_penolakan_${user.pid}.xlsx`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };
  const filteredRows = summary?.rows.filter((r) => {
    if (activeTab === "all") return r.status !== "skipped";
    return r.status === activeTab;
  }) || [];

  return (
    <div className="max-w-6xl mx-auto px-3 sm:px-6 lg:px-8 py-6 pb-24 text-slate-100">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <div>
          <div className="flex items-center gap-2 text-xs text-blue-400 font-semibold mb-1">
            <Link to="/riwayat" className="hover:underline flex items-center gap-1">
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Kembali ke Riwayat</span>
            </Link>
          </div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <UploadCloud className="w-5 h-5 text-blue-400" />
            <span>Impor Log Kegiatan dari Excel (.xlsx)</span>
          </h1>
        </div>
      </div>

      {parseError && (
        <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-2xl flex items-start gap-3 text-xs text-red-400">
          <XCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-sm">Gagal membaca berkas:</p>
            <p className="mt-0.5">{parseError}</p>
          </div>
        </div>
      )}

      {/* STEP 1: File Picker */}
      {step === 1 && (
        <div className="space-y-8">
          <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleFileDrop}
            className="border-2 border-dashed border-slate-700 hover:border-blue-500/70 bg-slate-800/60 rounded-3xl p-8 sm:p-12 text-center transition cursor-pointer flex flex-col items-center justify-center group shadow-sm"
          >
            <div className="w-16 h-16 rounded-2xl bg-blue-600/10 text-blue-400 flex items-center justify-center border border-blue-500/20 group-hover:scale-105 transition mb-4">
              <FileSpreadsheet className="w-8 h-8" />
            </div>

            <h3 className="text-base font-bold text-white mb-1">
              Pilih Berkas Excel Acuan (.xlsx)
            </h3>
            <p className="text-xs text-slate-400 max-w-md mx-auto mb-5">
              Tarik dan lepas file <strong className="text-slate-200">pencatatan_kegiatan.xlsx</strong> ke sini, atau klik tombol di bawah untuk memilih file.
            </p>

            <label className="relative cursor-pointer">
              <span className="bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold px-5 py-2.5 rounded-xl shadow-md transition inline-flex items-center gap-2">
                <UploadCloud className="w-4 h-4" />
                <span>Pilih File dari Komputer</span>
              </span>
              <input
                type="file"
                accept=".xlsx"
                onChange={handleFileInput}
                className="sr-only"
              />
            </label>

            <div className="mt-6 text-[11px] text-slate-400 flex flex-wrap items-center justify-center gap-4">
              <span>Maksimal ukuran: 5 MB</span>
              <span>•</span>
              <span>Hanya sheet bernama "{user?.pid}" yang akan dibaca</span>
              <span>•</span>
              <span>Validasi langsung di browser</span>
            </div>
          </div>

          {/* Past Batches List */}
          {batches.length > 0 && (
            <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-5 shadow-sm">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider mb-4 flex items-center gap-2">
                <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
                <span>Riwayat Batch Impor Sebelumnya</span>
              </h3>

              <div className="divide-y divide-slate-700/60 text-xs">
                {batches.map((b) => (
                  <div key={b.id} className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <div className="font-semibold text-white flex items-center gap-2">
                        <span>{b.filename}</span>
                        {b.undone_at ? (
                          <span className="text-[10px] px-2 py-0.5 rounded bg-red-500/20 text-red-300 font-medium">
                            Dibatalkan (Undone)
                          </span>
                        ) : (
                          <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-medium">
                            Aktif
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-slate-400 mt-0.5">
                        {b.rows_inserted} tersimpan · {b.rows_skipped} duplikat dilewati · {new Date(b.created_at).toLocaleString("id-ID")}
                      </div>
                    </div>

                    {!b.undone_at && (
                      <button
                        type="button"
                        onClick={() => handleUndoBatch(b.id)}
                        className="self-start sm:self-auto text-xs font-semibold text-red-400 hover:text-red-300 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>Batalkan Impor</span>
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* STEP 2: Preview & Validation Table */}
      {step === 2 && summary && (
        <div className="space-y-6">
          {/* Summary Banner */}
          <div className="bg-slate-800 border border-slate-700 rounded-2xl p-5 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 pb-4 border-b border-slate-700">
              <div>
                <span className="text-[11px] font-semibold text-blue-400 uppercase tracking-wider">
                  Sheet Acuan Terbaca:
                </span>
                <h3 className="text-base font-bold text-white">
                  Sheet "{summary.sheet_name}" (Sesuai PID: {user?.pid})
                </h3>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="px-3 py-1.5 rounded-xl border border-slate-700 hover:bg-slate-700 text-xs font-medium text-slate-300 transition"
                >
                  Ganti File
                </button>
                <button
                  type="button"
                  onClick={handleStartImport}
                  className="px-4 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-xs font-semibold text-white shadow-md transition flex items-center gap-1.5"
                >
                  <span>Impor Sekarang</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Counts Metric Badges */}
            <div className="grid grid-cols-2 sm:grid-cols-6 gap-2 text-center text-xs">
              <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-700">
                <div className="font-bold text-base text-white">{summary.total_read}</div>
                <div className="text-[11px] text-slate-400">Total Baris</div>
              </div>
              <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30">
                <div className="font-bold text-base text-emerald-400">{summary.ready_count}</div>
                <div className="text-[11px] text-emerald-300">Siap Masuk</div>
              </div>
              <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30">
                <div className="font-bold text-base text-amber-400">{summary.warning_count}</div>
                <div className="text-[11px] text-amber-300">Peringatan</div>
              </div>
              <div className="p-2.5 rounded-xl bg-purple-500/10 border border-purple-500/30">
                <div className="font-bold text-base text-purple-400">{summary.duplicate_count}</div>
                <div className="text-[11px] text-purple-300">Duplikat</div>
              </div>
              <div className="p-2.5 rounded-xl bg-red-500/10 border border-red-500/30">
                <div className="font-bold text-base text-red-400">{summary.rejected_count}</div>
                <div className="text-[11px] text-red-300">Ditolak</div>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-900/60 border border-slate-700/60">
                <div className="font-bold text-base text-slate-400">{summary.skipped_count}</div>
                <div className="text-[11px] text-slate-400">Dilewati</div>
              </div>
            </div>

            {/* Category Merge Suggestions */}
            {summary.category_suggestions.length > 0 && (
              <div className="mt-4 p-3 bg-blue-950/40 border border-blue-800/50 rounded-xl text-xs flex items-start gap-2.5">
                <Sparkles className="w-4 h-4 text-blue-400 flex-shrink-0 mt-0.5" />
                <div>
                  <strong className="text-blue-300">Saran Penggabungan Kategori:</strong>
                  <p className="text-slate-300 mt-0.5">
                    Ditemukan penulisan kategori yang sangat mirip:{" "}
                    {summary.category_suggestions.map((s, idx) => (
                      <span key={idx} className="font-semibold text-white">
                        "{s.from}" → "{s.to}"{idx < summary.category_suggestions.length - 1 ? ", " : ""}
                      </span>
                    ))}
                    . Sistem akan menyamakan penulisan secara otomatis.
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Mode Selector */}
          <div className="bg-slate-800/80 border border-slate-700 p-4 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs">
            <div>
              <span className="font-bold text-slate-200">Mode Penanganan Data:</span>
              <div className="flex items-center gap-4 mt-1.5">
                <label className="flex items-center gap-2 cursor-pointer text-slate-300">
                  <input
                    type="radio"
                    name="importMode"
                    checked={importMode === "skip_duplicates"}
                    onChange={() => setImportMode("skip_duplicates")}
                    className="text-blue-600 focus:ring-0"
                  />
                  <span>Tambahkan data baru, lewati duplikat (Rekomendasi)</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer text-slate-300">
                  <input
                    type="radio"
                    name="importMode"
                    checked={importMode === "add_all"}
                    onChange={() => setImportMode("add_all")}
                    className="text-blue-600 focus:ring-0"
                  />
                  <span>Tambahkan semua (termasuk duplikat)</span>
                </label>
              </div>
            </div>

            {summary.rejected_count > 0 && (
              <button
                type="button"
                onClick={handleDownloadRejectReport}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-red-500/40 text-red-400 hover:bg-red-500/10 transition font-medium"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Unduh Laporan Penolakan ({summary.rejected_count})</span>
              </button>
            )}
          </div>

          {/* Filter Tabs */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
            {[
              { id: "all", label: `Semua Baris (${summary.rows.filter((r) => r.status !== "skipped").length})` },
              { id: "ready", label: `Siap (${summary.ready_count})` },
              { id: "warning", label: `Peringatan (${summary.warning_count})` },
              { id: "duplicate", label: `Duplikat (${summary.duplicate_count})` },
              { id: "rejected", label: `Ditolak (${summary.rejected_count})` }
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id as any)}
                className={`px-3.5 py-1.5 rounded-xl font-medium whitespace-nowrap transition ${
                  activeTab === tab.id
                    ? "bg-blue-600 text-white shadow-sm"
                    : "bg-slate-800 text-slate-400 hover:text-white border border-slate-700"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Table Preview */}
          <div className="bg-slate-800 border border-slate-700 rounded-2xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto max-h-[500px]">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-900 sticky top-0 z-10 border-b border-slate-700 text-slate-300">
                  <tr>
                    <th className="py-2.5 px-3 w-16 text-center">Baris</th>
                    <th className="py-2.5 px-3 w-28">Tanggal</th>
                    <th className="py-2.5 px-3 w-20">Start</th>
                    <th className="py-2.5 px-3 w-20">Finish</th>
                    <th className="py-2.5 px-3">Kegiatan</th>
                    <th className="py-2.5 px-3 w-32">Kategori</th>
                    <th className="py-2.5 px-3 w-32">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700/60">
                  {filteredRows.slice(0, 100).map((r, idx) => (
                    <tr key={idx} className="hover:bg-slate-700/30">
                      <td className="py-2 px-3 text-center text-slate-400 font-mono">
                        {r.row_number}
                      </td>
                      <td className="py-2 px-3 font-mono text-slate-200">
                        {r.tanggal || "—"}
                      </td>
                      <td className="py-2 px-3 font-mono text-slate-200">
                        {r.start_time || "—"}
                      </td>
                      <td className="py-2 px-3 font-mono text-slate-200">
                        {r.finish_time || "—"}
                      </td>
                      <td className="py-2 px-3 text-slate-100">
                        <div className="line-clamp-2">{r.kegiatan}</div>
                        {r.issues.length > 0 && (
                          <div className="text-[10px] text-amber-400 mt-0.5 flex flex-wrap gap-1">
                            {r.issues.map((issue, i) => (
                              <span key={i} className="bg-amber-500/10 px-1 rounded border border-amber-500/20">
                                {issue}
                              </span>
                            ))}
                          </div>
                        )}
                      </td>
                      <td className="py-2 px-3 text-slate-300">
                        {r.kategori || "—"}
                      </td>
                      <td className="py-2 px-3">
                        {r.status === "ready" && (
                          <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-[10px] font-semibold flex items-center gap-1 w-fit">
                            <CheckCircle2 className="w-3 h-3" />
                            <span>Siap</span>
                          </span>
                        )}
                        {r.status === "warning" && (
                          <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 text-[10px] font-semibold flex items-center gap-1 w-fit">
                            <AlertTriangle className="w-3 h-3" />
                            <span>Peringatan</span>
                          </span>
                        )}
                        {r.status === "duplicate" && (
                          <span className="px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-400 text-[10px] font-semibold flex items-center gap-1 w-fit">
                            <Copy className="w-3 h-3" />
                            <span>Duplikat</span>
                          </span>
                        )}
                        {r.status === "rejected" && (
                          <span className="px-2 py-0.5 rounded-full bg-red-500/20 text-red-400 text-[10px] font-semibold flex items-center gap-1 w-fit">
                            <XCircle className="w-3 h-3" />
                            <span>Ditolak</span>
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {filteredRows.length > 100 && (
              <div className="p-3 text-center text-xs text-slate-400 bg-slate-900/60 border-t border-slate-700">
                Menampilkan 100 dari {filteredRows.length} baris. Seluruh baris yang valid akan tetap diimpor.
              </div>
            )}
          </div>
        </div>
      )}

      {/* STEP 3: In Progress Bar */}
      {step === 3 && (
        <div className="bg-slate-800 border border-slate-700 rounded-3xl p-10 text-center max-w-lg mx-auto shadow-2xl space-y-5">
          <div className="w-16 h-16 rounded-2xl bg-blue-600/20 text-blue-400 flex items-center justify-center mx-auto border border-blue-500/30">
            <Loader2 className="w-8 h-8 animate-spin" />
          </div>

          <div>
            <h3 className="text-lg font-bold text-white">Sedang Menyimpan Data...</h3>
            <p className="text-xs text-slate-400 mt-1">
              Data dikirim dan disimpan secara bertahap per 200 baris ke database Cloudflare D1.
            </p>
          </div>

          <div className="w-full bg-slate-900 rounded-full h-3 overflow-hidden border border-slate-700 p-0.5">
            <div
              className="bg-blue-600 h-full rounded-full transition-all duration-300"
              style={{ width: `${progressPercent}%` }}
            />
          </div>

          <div className="text-xs font-mono font-bold text-blue-400">
            {progressPercent}% Selesai
          </div>
        </div>
      )}

      {/* STEP 4: Success & Summary */}
      {step === 4 && (
        <div className="bg-slate-800 border border-slate-700 rounded-3xl p-8 sm:p-10 text-center max-w-lg mx-auto shadow-2xl space-y-6">
          <div className="w-16 h-16 rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto border border-emerald-500/30">
            <CheckCircle2 className="w-8 h-8" />
          </div>

          <div>
            <h3 className="text-lg font-bold text-white">Impor Berhasil Selesai!</h3>
            <p className="text-xs text-slate-400 mt-1">
              Catatan kegiatan berhasil diproses dan disimpan ke database PID {user?.pid}.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 text-center text-xs">
            <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30">
              <div className="text-xl font-bold text-emerald-400">{insertedTotal}</div>
              <div className="text-[11px] text-emerald-300 mt-0.5">Baris Berhasil Masuk</div>
            </div>
            <div className="p-3 rounded-xl bg-slate-900 border border-slate-700">
              <div className="text-xl font-bold text-slate-300">{skippedTotal}</div>
              <div className="text-[11px] text-slate-400 mt-0.5">Duplikat Dilewati</div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            <button
              type="button"
              onClick={() => navigate("/riwayat")}
              className="w-full sm:w-auto bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold px-6 py-2.5 rounded-xl transition"
            >
              Lihat di Riwayat
            </button>
            {currentBatchId && (
              <button
                type="button"
                onClick={() => handleUndoBatch(currentBatchId)}
                className="w-full sm:w-auto border border-slate-700 hover:bg-slate-700 text-slate-300 text-xs font-semibold px-4 py-2.5 rounded-xl transition flex items-center justify-center gap-1.5"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Batalkan Impor Ini (Undo)</span>
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};