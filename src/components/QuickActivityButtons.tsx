import React from "react";
import { MessageSquare, Footprints, Coffee, PauseCircle, Moon } from "lucide-react";

export interface QuickActivityItem {
  id: string;
  label: string;
  kegiatan: string;
  kategori: string;
  icon: React.ReactNode;
  colorClass: string;
}

interface QuickActivityButtonsProps {
  onSelect: (kegiatan: string, kategori: string) => void;
  className?: string;
}

export const QUICK_ACTIVITIES: QuickActivityItem[] = [
  {
    id: "briefing",
    label: "Briefing",
    kegiatan: "Briefing",
    kategori: "Briefing",
    icon: <MessageSquare className="w-3.5 h-3.5 text-blue-400" />,
    colorClass: "hover:border-blue-500/60 hover:bg-blue-600/10 text-blue-300"
  },
  {
    id: "berjalan",
    label: "Berjalan",
    kegiatan: "Berjalan ke ",
    kategori: "Berjalan",
    icon: <Footprints className="w-3.5 h-3.5 text-emerald-400" />,
    colorClass: "hover:border-emerald-500/60 hover:bg-emerald-600/10 text-emerald-300"
  },
  {
    id: "istirahat",
    label: "Istirahat",
    kegiatan: "Istirahat",
    kategori: "Istirahat",
    icon: <Coffee className="w-3.5 h-3.5 text-amber-400" />,
    colorClass: "hover:border-amber-500/60 hover:bg-amber-600/10 text-amber-300"
  },
  {
    id: "break",
    label: "Break",
    kegiatan: "Break",
    kategori: "Break",
    icon: <PauseCircle className="w-3.5 h-3.5 text-orange-400" />,
    colorClass: "hover:border-orange-500/60 hover:bg-orange-600/10 text-orange-300"
  },
  {
    id: "solat",
    label: "Solat",
    kegiatan: "Solat",
    kategori: "Solat",
    icon: <Moon className="w-3.5 h-3.5 text-purple-400" />,
    colorClass: "hover:border-purple-500/60 hover:bg-purple-600/10 text-purple-300"
  }
];

export const QuickActivityButtons: React.FC<QuickActivityButtonsProps> = ({ onSelect, className = "" }) => {
  return (
    <div className={`space-y-1.5 ${className}`}>
      <div className="flex items-center justify-between text-[11px] text-slate-400">
        <span className="font-semibold text-slate-300">Pilih Cepat Kegiatan:</span>
        <span className="text-[10px] text-slate-500">Isi Kegiatan & Kategori</span>
      </div>
      <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
        {QUICK_ACTIVITIES.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => onSelect(item.kegiatan, item.kategori)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-700 bg-slate-900/80 text-xs font-medium transition active:scale-95 select-none ${item.colorClass}`}
          >
            {item.icon}
            <span>{item.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
};