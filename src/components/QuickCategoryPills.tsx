import React from "react";
import { Tag } from "lucide-react";

export interface CategoryOption {
  name: string;
  label: string;
  activeColorClass: string;
  inactiveColorClass: string;
}

export const STANDARD_CATEGORIES: CategoryOption[] = [
  {
    name: "Admin",
    label: "Admin",
    activeColorClass: "border-blue-500 bg-blue-600 text-white font-bold shadow-sm shadow-blue-500/30",
    inactiveColorClass: "border-slate-700 bg-slate-800/90 text-slate-300 hover:border-blue-500/60 hover:text-blue-300 hover:bg-blue-600/10"
  },
  {
    name: "Operational",
    label: "Operational",
    activeColorClass: "border-cyan-500 bg-cyan-600 text-white font-bold shadow-sm shadow-cyan-500/30",
    inactiveColorClass: "border-slate-700 bg-slate-800/90 text-slate-300 hover:border-cyan-500/60 hover:text-cyan-300 hover:bg-cyan-600/10"
  },
  {
    name: "Preventive",
    label: "Preventive",
    activeColorClass: "border-emerald-500 bg-emerald-600 text-white font-bold shadow-sm shadow-emerald-500/30",
    inactiveColorClass: "border-slate-700 bg-slate-800/90 text-slate-300 hover:border-emerald-500/60 hover:text-emerald-300 hover:bg-emerald-600/10"
  },
  {
    name: "Corrective",
    label: "Corrective",
    activeColorClass: "border-rose-500 bg-rose-600 text-white font-bold shadow-sm shadow-rose-500/30",
    inactiveColorClass: "border-slate-700 bg-slate-800/90 text-slate-300 hover:border-rose-500/60 hover:text-rose-300 hover:bg-rose-600/10"
  },
  {
    name: "Support",
    label: "Support",
    activeColorClass: "border-purple-500 bg-purple-600 text-white font-bold shadow-sm shadow-purple-500/30",
    inactiveColorClass: "border-slate-700 bg-slate-800/90 text-slate-300 hover:border-purple-500/60 hover:text-purple-300 hover:bg-purple-600/10"
  },
  {
    name: "Mobilitas",
    label: "Mobilitas",
    activeColorClass: "border-amber-500 bg-amber-600 text-white font-bold shadow-sm shadow-amber-500/30",
    inactiveColorClass: "border-slate-700 bg-slate-800/90 text-slate-300 hover:border-amber-500/60 hover:text-amber-300 hover:bg-amber-600/10"
  },
  {
    name: "Meeting",
    label: "Meeting",
    activeColorClass: "border-sky-500 bg-sky-600 text-white font-bold shadow-sm shadow-sky-500/30",
    inactiveColorClass: "border-slate-700 bg-slate-800/90 text-slate-300 hover:border-sky-500/60 hover:text-sky-300 hover:bg-sky-600/10"
  }
];

interface QuickCategoryPillsProps {
  selectedCategory: string;
  onSelectCategory: (category: string) => void;
  className?: string;
}

export const QuickCategoryPills: React.FC<QuickCategoryPillsProps> = ({
  selectedCategory,
  onSelectCategory,
  className = ""
}) => {
  const handleToggle = (catName: string) => {
    // If already selected (case-insensitive check), deselect it
    if (selectedCategory.trim().toLowerCase() === catName.toLowerCase()) {
      onSelectCategory("");
    } else {
      onSelectCategory(catName);
    }
  };

  return (
    <div className={`space-y-1.5 ${className}`}>
      <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
        <Tag className="w-3 h-3 text-blue-400" />
        <span className="font-semibold text-slate-300">Pilihan Cepat Kategori:</span>
        <span className="text-[10px] text-slate-500">(1-klik pilih / klik ulang batal)</span>
      </div>
      <div className="flex flex-wrap items-center gap-1.5">
        {STANDARD_CATEGORIES.map((cat) => {
          const isActive = selectedCategory.trim().toLowerCase() === cat.name.toLowerCase();
          return (
            <button
              key={cat.name}
              type="button"
              onClick={() => handleToggle(cat.name)}
              className={`px-2.5 py-1 rounded-lg border text-xs font-medium transition active:scale-95 select-none ${
                isActive ? cat.activeColorClass : cat.inactiveColorClass
              }`}
            >
              {cat.label}
            </button>
          );
        })}
      </div>
    </div>
  );
};
