import React from "react";
import { Clock } from "lucide-react";

export interface DurationOption {
  label: string;
  minutes: number;
}

export const DURATION_OPTIONS: DurationOption[] = [
  { label: "+5 mnt", minutes: 5 },
  { label: "+10 mnt", minutes: 10 },
  { label: "+15 mnt", minutes: 15 },
  { label: "+20 mnt", minutes: 20 },
  { label: "+30 mnt", minutes: 30 },
  { label: "+45 mnt", minutes: 45 },
  { label: "+1 jam", minutes: 60 },
  { label: "+1.5 jam", minutes: 90 },
  { label: "+2 jam", minutes: 120 }
];

interface QuickDurationButtonsProps {
  onSelectDuration: (minutes: number) => void;
  currentDurationMin?: number;
  className?: string;
}

export const QuickDurationButtons: React.FC<QuickDurationButtonsProps> = ({
  onSelectDuration,
  currentDurationMin,
  className = ""
}) => {
  return (
    <div className={`space-y-1.5 ${className}`}>
      <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
        <Clock className="w-3 h-3 text-blue-400" />
        <span className="font-semibold text-slate-300">Pilihan Cepat Durasi:</span>
        <span className="text-[10px] text-slate-500">(Otomatis isi Waktu Selesai)</span>
      </div>
      <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
        {DURATION_OPTIONS.map((opt) => {
          const isActive = currentDurationMin === opt.minutes;
          return (
            <button
              key={opt.minutes}
              type="button"
              onClick={() => onSelectDuration(opt.minutes)}
              className={`px-2.5 py-1 rounded-lg border text-xs font-mono font-medium transition active:scale-95 select-none ${
                isActive
                  ? "border-blue-500 bg-blue-600/30 text-blue-200 font-bold shadow-sm ring-1 ring-blue-500/50"
                  : "border-slate-700 bg-slate-800/90 text-slate-300 hover:border-slate-600 hover:text-white hover:bg-slate-750"
              }`}
            >
              {opt.label}
            </button>
          );
        })}
      </div>
    </div>
  );
};
