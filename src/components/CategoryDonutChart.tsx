import React, { useState, useMemo } from "react";
import { CategoryDistributionItem } from "../types";
import { formatDurationHuman } from "../lib/time-utils";

interface CategoryDonutChartProps {
  categories: CategoryDistributionItem[];
  totalDurationMin: number;
}

const CATEGORY_HEX_COLORS: Record<string, string> = {
  preventive: "#10b981", // emerald-500
  corrective: "#f43f5e", // rose-500
  operational: "#3b82f6", // blue-500
  admin: "#6366f1", // indigo-500
  support: "#06b6d4", // cyan-500
  mobilitas: "#f59e0b", // amber-500
  meeting: "#a855f7", // purple-500
  default: "#64748b" // slate-500
};

export const CategoryDonutChart: React.FC<CategoryDonutChartProps> = ({
  categories,
  totalDurationMin
}) => {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  // Filter out zero-duration categories
  const validCategories = useMemo(() => {
    return categories.filter((c) => c.duration_min > 0);
  }, [categories]);

  // Slices geometry
  const slices = useMemo(() => {
    if (totalDurationMin <= 0 || validCategories.length === 0) return [];

    let currentAngle = -Math.PI / 2; // start at top (12 o'clock)
    const result: Array<{
      category: CategoryDistributionItem;
      startAngle: number;
      endAngle: number;
      pct: number;
      color: string;
      pathD: string;
      index: number;
    }> = [];

    const cx = 100;
    const cy = 100;
    const outerR = 82;
    const innerR = 54;

    // Single item 100% case
    if (validCategories.length === 1) {
      const cat = validCategories[0];
      const key = cat.kategori.toLowerCase().trim();
      const color = CATEGORY_HEX_COLORS[key] || CATEGORY_HEX_COLORS.default;
      return [
        {
          category: cat,
          startAngle: 0,
          endAngle: Math.PI * 2,
          pct: 100,
          color,
          pathD: "", // Will use circle in render
          index: 0
        }
      ];
    }

    validCategories.forEach((cat, idx) => {
      const pct = (cat.duration_min / totalDurationMin) * 100;
      const angleSweep = (cat.duration_min / totalDurationMin) * (Math.PI * 2);
      const startAngle = currentAngle;
      const endAngle = currentAngle + angleSweep;
      currentAngle = endAngle;

      const key = cat.kategori.toLowerCase().trim();
      const color = CATEGORY_HEX_COLORS[key] || CATEGORY_HEX_COLORS.default;

      // Calculate path arc
      const x1 = cx + outerR * Math.cos(startAngle);
      const y1 = cy + outerR * Math.sin(startAngle);
      const x2 = cx + outerR * Math.cos(endAngle);
      const y2 = cy + outerR * Math.sin(endAngle);

      const x3 = cx + innerR * Math.cos(endAngle);
      const y3 = cy + innerR * Math.sin(endAngle);
      const x4 = cx + innerR * Math.cos(startAngle);
      const y4 = cy + innerR * Math.sin(startAngle);

      const largeArc = angleSweep > Math.PI ? 1 : 0;

      const pathD = `M ${x1.toFixed(3)} ${y1.toFixed(3)} A ${outerR} ${outerR} 0 ${largeArc} 1 ${x2.toFixed(3)} ${y2.toFixed(3)} L ${x3.toFixed(3)} ${y3.toFixed(3)} A ${innerR} ${innerR} 0 ${largeArc} 0 ${x4.toFixed(3)} ${y4.toFixed(3)} Z`;

      result.push({
        category: cat,
        startAngle,
        endAngle,
        pct,
        color,
        pathD,
        index: idx
      });
    });

    return result;
  }, [validCategories, totalDurationMin]);

  // Active slice info
  const activeSlice = hoveredIdx !== null && slices[hoveredIdx] ? slices[hoveredIdx] : null;

  if (validCategories.length === 0 || totalDurationMin <= 0) {
    return (
      <div className="flex flex-col items-center justify-center p-6 text-slate-500 text-xs">
        <p>Tidak ada data jam kerja untuk visualisasi chart.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col sm:flex-row items-center justify-center gap-6 py-2">
      {/* SVG Donut */}
      <div className="relative w-48 h-48 sm:w-52 sm:h-52 flex-shrink-0">
        <svg
          viewBox="0 0 200 200"
          className="w-full h-full transform transition-all duration-300"
        >
          {slices.length === 1 ? (
            <circle
              cx="100"
              cy="100"
              r="68"
              fill="none"
              stroke={slices[0].color}
              strokeWidth="28"
              className="transition-all duration-300 cursor-pointer"
              onMouseEnter={() => setHoveredIdx(0)}
              onMouseLeave={() => setHoveredIdx(null)}
            />
          ) : (
            slices.map((slice, i) => {
              const isHovered = hoveredIdx === i;
              return (
                <path
                  key={i}
                  d={slice.pathD}
                  fill={slice.color}
                  stroke="#1e293b" // slate-800 divider border
                  strokeWidth="2.5"
                  className="transition-all duration-200 cursor-pointer origin-center"
                  style={{
                    transform: isHovered ? "scale(1.04)" : "scale(1)",
                    transformOrigin: "100px 100px",
                    filter: isHovered ? "drop-shadow(0 0 8px rgba(0,0,0,0.5))" : "none",
                    opacity: hoveredIdx !== null && !isHovered ? 0.6 : 1
                  }}
                  onMouseEnter={() => setHoveredIdx(i)}
                  onMouseLeave={() => setHoveredIdx(null)}
                  onClick={() => setHoveredIdx(hoveredIdx === i ? null : i)}
                />
              );
            })
          )}
        </svg>

        {/* Center Text inside Donut Hole */}
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center px-4">
          {activeSlice ? (
            <>
              <span
                className="text-[10px] font-bold uppercase tracking-wider line-clamp-1"
                style={{ color: activeSlice.color }}
              >
                {activeSlice.category.kategori}
              </span>
              <span className="text-lg font-black text-white font-mono leading-tight">
                {activeSlice.pct.toFixed(0)}%
              </span>
              <span className="text-[10px] text-slate-300 font-mono mt-0.5">
                {formatDurationHuman(activeSlice.category.duration_min)}
              </span>
            </>
          ) : (
            <>
              <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                Total
              </span>
              <span className="text-base font-black text-white font-mono leading-tight">
                {formatDurationHuman(totalDurationMin)}
              </span>
              <span className="text-[9px] text-slate-500 font-medium">
                {validCategories.length} Kategori
              </span>
            </>
          )}
        </div>
      </div>

      {/* Mini Legend List beside Donut */}
      <div className="grid grid-cols-2 sm:grid-cols-1 gap-x-4 gap-y-1.5 w-full sm:w-auto text-xs">
        {slices.map((slice, i) => {
          const isHovered = hoveredIdx === i;
          return (
            <button
              key={i}
              type="button"
              onMouseEnter={() => setHoveredIdx(i)}
              onMouseLeave={() => setHoveredIdx(null)}
              onClick={() => setHoveredIdx(hoveredIdx === i ? null : i)}
              className={`flex items-center justify-between gap-2 px-2 py-1 rounded-lg text-left transition ${
                isHovered
                  ? "bg-slate-700/80 ring-1 ring-slate-500 text-white"
                  : "hover:bg-slate-800 text-slate-300"
              }`}
            >
              <div className="flex items-center gap-1.5 min-w-0">
                <span
                  className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                  style={{ backgroundColor: slice.color }}
                />
                <span className="truncate text-[11px] font-medium max-w-[90px] sm:max-w-[110px]" title={slice.category.kategori}>
                  {slice.category.kategori}
                </span>
              </div>
              <span className="font-mono text-[11px] font-bold text-slate-400">
                {slice.pct.toFixed(0)}%
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
