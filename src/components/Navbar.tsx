import React, { useState, useRef, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { generateTemplateExcel } from "../lib/excel-generator";
import { 
  ClipboardList, 
  PenTool, 
  History, 
  UploadCloud, 
  Download, 
  Smartphone, 
  LogOut, 
  ChevronDown
} from "lucide-react";

export const Navbar: React.FC = () => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const [installPrompt, setInstallPrompt] = useState<any>(null);

  useEffect(() => {
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setInstallPrompt(e);
    };
    window.addEventListener("beforeinstallprompt", handleBeforeInstall);
    return () => window.removeEventListener("beforeinstallprompt", handleBeforeInstall);
  }, []);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleDownloadTemplate = async () => {
    if (!user) return;
    try {
      const buffer = await generateTemplateExcel(user.pid);
      const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `template_pencatatan_kegiatan_${user.pid}.xlsx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setDropdownOpen(false);
    } catch (err) {
      alert("Gagal membuat template Excel: " + String(err));
    }
  };

  const handleInstallApp = () => {
    if (installPrompt) {
      installPrompt.prompt();
      installPrompt.userChoice.then((choice: any) => {
        if (choice.outcome === "accepted") {
          setInstallPrompt(null);
        }
      });
    } else {
      alert('Untuk memasang di Android / Desktop: Buka menu peramban Chrome, lalu pilih "Instal Aplikasi" atau "Tambahkan ke Layar Utama".');
    }
    setDropdownOpen(false);
  };

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  if (!user) return null;

  return (
    <>
      {/* Top Navbar for Desktop/Tablet */}
      <header className="sticky top-0 z-40 bg-slate-800/95 backdrop-blur border-b border-slate-700/80 shadow-sm">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link to="/" className="flex items-center gap-2 text-white font-bold tracking-tight hover:opacity-90">
              <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center shadow-inner">
                <ClipboardList className="w-5 h-5 text-white" />
              </div>
              <span className="text-base font-semibold">Log Harian PID</span>
            </Link>

            {/* Desktop Navigation */}
            <nav className="hidden sm:flex items-center gap-1 ml-6">
              <Link
                to="/"
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition ${
                  location.pathname === "/"
                    ? "bg-blue-600/20 text-blue-400 border border-blue-500/30"
                    : "text-slate-300 hover:text-white hover:bg-slate-700/50"
                }`}
              >
                <PenTool className="w-3.5 h-3.5" />
                <span>Catat</span>
              </Link>
              <Link
                to="/riwayat"
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition ${
                  location.pathname.startsWith("/riwayat") && !location.pathname.includes("/impor")
                    ? "bg-blue-600/20 text-blue-400 border border-blue-500/30"
                    : "text-slate-300 hover:text-white hover:bg-slate-700/50"
                }`}
              >
                <History className="w-3.5 h-3.5" />
                <span>Riwayat</span>
              </Link>
              <Link
                to="/riwayat/impor"
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition ${
                  location.pathname.includes("/impor")
                    ? "bg-blue-600/20 text-blue-400 border border-blue-500/30"
                    : "text-slate-300 hover:text-white hover:bg-slate-700/50"
                }`}
              >
                <UploadCloud className="w-3.5 h-3.5" />
                <span>Impor Excel</span>
              </Link>
            </nav>
          </div>

          {/* User Profile & Actions Dropdown */}
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setDropdownOpen(!dropdownOpen)}
              className="flex items-center gap-2 bg-slate-700/80 hover:bg-slate-700 text-slate-100 px-3 py-1.5 rounded-lg border border-slate-600/80 text-xs font-medium transition focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="font-bold text-white tracking-wide">{user.pid}</span>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
            </button>

            {dropdownOpen && (
              <div className="absolute right-0 mt-2 w-56 bg-slate-800 border border-slate-700 rounded-xl shadow-xl py-1 z-50 text-xs text-slate-200 divide-y divide-slate-700/60">
                <div className="px-4 py-2.5 bg-slate-850">
                  <p className="text-[11px] text-slate-400">Login sebagai:</p>
                  <p className="font-semibold text-white truncate">{user.display_name || user.pid}</p>
                </div>

                <div className="py-1">
                  <button
                    onClick={handleDownloadTemplate}
                    className="w-full flex items-center gap-2.5 px-4 py-2 text-left hover:bg-slate-700/70 text-slate-200 transition"
                  >
                    <Download className="w-4 h-4 text-emerald-400" />
                    <span>Unduh Template Excel</span>
                  </button>
                  <button
                    onClick={handleInstallApp}
                    className="w-full flex items-center gap-2.5 px-4 py-2 text-left hover:bg-slate-700/70 text-slate-200 transition"
                  >
                    <Smartphone className="w-4 h-4 text-blue-400" />
                    <span>Pasang Aplikasi (PWA)</span>
                  </button>
                </div>

                <div className="py-1">
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-2.5 px-4 py-2 text-left hover:bg-red-500/10 text-red-400 transition font-medium"
                  >
                    <LogOut className="w-4 h-4 text-red-400" />
                    <span>Keluar (Logout)</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Bottom Nav for Mobile (<640px) */}
      <nav className="sm:hidden fixed bottom-0 left-0 right-0 z-40 bg-slate-900/95 backdrop-blur border-t border-slate-800 flex items-center justify-around h-16 pb-safe">
        <Link
          to="/"
          className={`flex flex-col items-center justify-center w-full h-full py-1 text-[11px] font-medium transition ${
            location.pathname === "/" ? "text-blue-400" : "text-slate-400 hover:text-slate-200"
          }`}
        >
          <PenTool className="w-5 h-5 mb-0.5" />
          <span>Catat</span>
        </Link>
        <Link
          to="/riwayat"
          className={`flex flex-col items-center justify-center w-full h-full py-1 text-[11px] font-medium transition ${
            location.pathname.startsWith("/riwayat") && !location.pathname.includes("/impor")
              ? "text-blue-400"
              : "text-slate-400 hover:text-slate-200"
          }`}
        >
          <History className="w-5 h-5 mb-0.5" />
          <span>Riwayat</span>
        </Link>
        <Link
          to="/riwayat/impor"
          className={`flex flex-col items-center justify-center w-full h-full py-1 text-[11px] font-medium transition ${
            location.pathname.includes("/impor") ? "text-blue-400" : "text-slate-400 hover:text-slate-200"
          }`}
        >
          <UploadCloud className="w-5 h-5 mb-0.5" />
          <span>Impor</span>
        </Link>
      </nav>
    </>
  );
};