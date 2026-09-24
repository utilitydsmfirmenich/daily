import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { ArrowRight, AlertCircle, Loader2 } from "lucide-react";

export const LoginPage: React.FC = () => {
  const [pid, setPid] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleLogin = async (targetPid?: string) => {
    const chosenPid = (targetPid || pid).trim().toUpperCase();
    if (!chosenPid) {
      setError("Silakan masukkan kode PID Anda.");
      return;
    }

    setError(null);
    setSubmitting(true);

    try {
      await login(chosenPid);
      navigate("/");
    } catch (err: any) {
      setError(err.message || "Gagal masuk. Periksa kembali PID Anda.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleLogin();
  };

  const quickPids = [
    { pid: "AGSB", name: "Agus Sobarna" },
    { pid: "MUKB", name: "Muhammad Dimas F A" },
    { pid: "IKJA", name: "Diki Jaelani" },
    { pid: "AHIK", name: "Ahmad Abdul Malik" }
  ];

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col justify-center py-12 sm:px-6 lg:px-8 px-4 selection:bg-blue-600 selection:text-white">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center">
          <img
            src="/logo.png"
            alt="Log Harian Utility"
            className="w-16 h-16 rounded-2xl object-contain drop-shadow-xl"
          />
        </div>
        <h2 className="mt-4 text-center text-2xl font-bold tracking-tight text-white">
          Log Harian Utility
        </h2>
        <p className="mt-1 text-center text-xs text-slate-400">
          Aplikasi pencatatan kegiatan harian dan shift operasional utility
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-slate-800 border border-slate-700 py-8 px-5 shadow-2xl rounded-2xl sm:px-10">
          <form className="space-y-5" onSubmit={handleFormSubmit}>
            {error && (
              <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl flex items-start gap-2.5 text-xs text-red-400 animate-shake">
                <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <div>
              <label htmlFor="pid-input" className="block text-xs font-semibold text-slate-300 mb-1.5">
                Kode PID
              </label>
              <div className="relative">
                <input
                  id="pid-input"
                  type="text"
                  maxLength={10}
                  autoFocus
                  placeholder="Contoh: AGSB"
                  value={pid}
                  onChange={(e) => setPid(e.target.value.toUpperCase())}
                  className="block w-full rounded-xl bg-slate-900 border border-slate-700 px-3.5 py-2.5 text-sm font-bold uppercase tracking-wider text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition"
                />
              </div>
              <p className="mt-1.5 text-[11px] text-slate-400">
                Sesi login tersimpan otomatis di perangkat selama 30 hari.
              </p>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-md hover:bg-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-slate-900 disabled:opacity-50 transition"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Memverifikasi...</span>
                </>
              ) : (
                <>
                  <span>Masuk ke Aplikasi</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Quick Select Buttons */}
          <div className="mt-8 border-t border-slate-700/80 pt-6">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-3 text-center">
              Pilih Cepat PID Aktif:
            </p>
            <div className="grid grid-cols-2 gap-2">
              {quickPids.map((item) => (
                <button
                  key={item.pid}
                  type="button"
                  onClick={() => handleLogin(item.pid)}
                  disabled={submitting}
                  className="flex flex-col items-start p-2.5 rounded-xl border border-slate-700/80 bg-slate-900/60 hover:bg-slate-700/60 hover:border-slate-600 transition text-left group"
                >
                  <span className="text-xs font-bold text-blue-400 group-hover:text-blue-300">
                    {item.pid}
                  </span>
                  <span className="text-[11px] text-slate-400 truncate w-full">
                    {item.name}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};