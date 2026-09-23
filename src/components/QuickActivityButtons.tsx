import React, { useState, useMemo } from "react";
import { 
  MessageSquare, 
  Footprints, 
  Coffee, 
  PauseCircle, 
  Moon,
  Gauge,
  ClipboardList,
  FlaskConical,
  Fuel,
  Snowflake,
  Flame,
  Truck,
  Cylinder,
  Factory,
  Wrench,
  HardHat,
  Users,
  Search,
  X,
  SlidersHorizontal
} from "lucide-react";

export interface QuickActivityItem {
  id: string;
  label: string;
  kegiatan: string;
  kategori?: string;
  group: string;
  icon: React.ReactNode;
  colorClass: string;
  isFavorite?: boolean;
}

interface QuickActivityButtonsProps {
  onSelect: (kegiatan: string, kategori: string) => void;
  className?: string;
}

export const ALL_QUICK_ACTIVITIES: QuickActivityItem[] = [
  // 1. Operasional & Utilitas Harian
  {
    id: "cek-level-air",
    label: "Cek Level Air",
    kegiatan: "Cek level air",
    group: "Operasional & Utilitas",
    icon: <Gauge className="w-3.5 h-3.5 text-cyan-400" />,
    colorClass: "hover:border-cyan-500/60 hover:bg-cyan-600/10 text-cyan-300",
    isFavorite: true
  },
  {
    id: "pencatatan-harian",
    label: "Pencatatan Harian",
    kegiatan: "Pencatatan harian",
    group: "Operasional & Utilitas",
    icon: <ClipboardList className="w-3.5 h-3.5 text-blue-400" />,
    colorClass: "hover:border-blue-500/60 hover:bg-blue-600/10 text-blue-300",
    isFavorite: true
  },
  {
    id: "isi-solar",
    label: "Isi Solar",
    kegiatan: "Isi solar",
    group: "Operasional & Utilitas",
    icon: <Fuel className="w-3.5 h-3.5 text-amber-400" />,
    colorClass: "hover:border-amber-500/60 hover:bg-amber-600/10 text-amber-300",
    isFavorite: true
  },

  // 2. Water Treatment
  {
    id: "sampling-demin",
    label: "Sampling Demin",
    kegiatan: "Sampling demin",
    group: "Water Treatment",
    icon: <FlaskConical className="w-3.5 h-3.5 text-sky-400" />,
    colorClass: "hover:border-sky-500/60 hover:bg-sky-600/10 text-sky-300",
    isFavorite: true
  },
  {
    id: "regen-demin",
    label: "Regen Demin",
    kegiatan: "Regen demin",
    group: "Water Treatment",
    icon: <FlaskConical className="w-3.5 h-3.5 text-teal-400" />,
    colorClass: "hover:border-teal-500/60 hover:bg-teal-600/10 text-teal-300"
  },
  {
    id: "regen-softener",
    label: "Regen Softener",
    kegiatan: "Regen softener",
    group: "Water Treatment",
    icon: <FlaskConical className="w-3.5 h-3.5 text-teal-400" />,
    colorClass: "hover:border-teal-500/60 hover:bg-teal-600/10 text-teal-300"
  },

  // 3. Chiller - Start
  {
    id: "start-chiller-wash-oil",
    label: "Start Chiller Wash Oil",
    kegiatan: "Start chiller wash oil",
    group: "Chiller",
    icon: <Snowflake className="w-3.5 h-3.5 text-emerald-400" />,
    colorClass: "hover:border-emerald-500/60 hover:bg-emerald-600/10 text-emerald-300"
  },
  {
    id: "start-chiller-emulsi",
    label: "Start Chiller Emulsi",
    kegiatan: "Start chiller emulsi",
    group: "Chiller",
    icon: <Snowflake className="w-3.5 h-3.5 text-emerald-400" />,
    colorClass: "hover:border-emerald-500/60 hover:bg-emerald-600/10 text-emerald-300"
  },
  {
    id: "start-chiller-cooling-patchouly",
    label: "Start Chiller Cooling Patchouly",
    kegiatan: "Start chiller cooling patchouly",
    group: "Chiller",
    icon: <Snowflake className="w-3.5 h-3.5 text-emerald-400" />,
    colorClass: "hover:border-emerald-500/60 hover:bg-emerald-600/10 text-emerald-300"
  },
  {
    id: "start-chiller-vacuum-patchouly",
    label: "Start Chiller Vacuum Patchouly",
    kegiatan: "Start chiller vacuum patchouly",
    group: "Chiller",
    icon: <Snowflake className="w-3.5 h-3.5 text-emerald-400" />,
    colorClass: "hover:border-emerald-500/60 hover:bg-emerald-600/10 text-emerald-300"
  },

  // 4. Chiller - Stop
  {
    id: "stop-chiller-wash-oil",
    label: "Stop Chiller Wash Oil",
    kegiatan: "Stop chiller wash oil",
    group: "Chiller",
    icon: <Snowflake className="w-3.5 h-3.5 text-rose-400" />,
    colorClass: "hover:border-rose-500/60 hover:bg-rose-600/10 text-rose-300"
  },
  {
    id: "stop-chiller-emulsi",
    label: "Stop Chiller Emulsi",
    kegiatan: "Stop chiller emulsi",
    group: "Chiller",
    icon: <Snowflake className="w-3.5 h-3.5 text-rose-400" />,
    colorClass: "hover:border-rose-500/60 hover:bg-rose-600/10 text-rose-300"
  },
  {
    id: "stop-chiller-cooling-patchouly",
    label: "Stop Chiller Cooling Patchouly",
    kegiatan: "Stop chiller cooling patchouly",
    group: "Chiller",
    icon: <Snowflake className="w-3.5 h-3.5 text-rose-400" />,
    colorClass: "hover:border-rose-500/60 hover:bg-rose-600/10 text-rose-300"
  },
  {
    id: "stop-chiller-vacuum-patchouly",
    label: "Stop Chiller Vacuum Patchouly",
    kegiatan: "Stop chiller vacuum patchouly",
    group: "Chiller",
    icon: <Snowflake className="w-3.5 h-3.5 text-rose-400" />,
    colorClass: "hover:border-rose-500/60 hover:bg-rose-600/10 text-rose-300"
  },

  // 5. Boiler Steam
  {
    id: "start-boiler-shallot",
    label: "Start Up Boiler Shallot",
    kegiatan: "Start up boiler shallot",
    group: "Boiler",
    icon: <Flame className="w-3.5 h-3.5 text-orange-400" />,
    colorClass: "hover:border-orange-500/60 hover:bg-orange-600/10 text-orange-300"
  },
  {
    id: "start-boiler-patchouly",
    label: "Start Up Boiler Patchouly",
    kegiatan: "Start up boiler patchouly",
    group: "Boiler",
    icon: <Flame className="w-3.5 h-3.5 text-orange-400" />,
    colorClass: "hover:border-orange-500/60 hover:bg-orange-600/10 text-orange-300"
  },

  // 6. Bahan Kimia & Tabung Gas
  {
    id: "unloading-pg",
    label: "Unloading PG",
    kegiatan: "Unloading PG",
    group: "Kimia & Gas",
    icon: <Truck className="w-3.5 h-3.5 text-indigo-400" />,
    colorClass: "hover:border-indigo-500/60 hover:bg-indigo-600/10 text-indigo-300"
  },
  {
    id: "unloading-dpg",
    label: "Unloading DPG",
    kegiatan: "Unloading DPG",
    group: "Kimia & Gas",
    icon: <Truck className="w-3.5 h-3.5 text-indigo-400" />,
    colorClass: "hover:border-indigo-500/60 hover:bg-indigo-600/10 text-indigo-300"
  },
  {
    id: "ganti-tabung-qc-tth",
    label: "Ganti Tabung QC TTH",
    kegiatan: "Ganti tabung QC TTH",
    group: "Kimia & Gas",
    icon: <Cylinder className="w-3.5 h-3.5 text-purple-400" />,
    colorClass: "hover:border-purple-500/60 hover:bg-purple-600/10 text-purple-300"
  },
  {
    id: "ganti-tabung-qc-pnb",
    label: "Ganti Tabung QC PNB",
    kegiatan: "Ganti tabung QC PNB",
    group: "Kimia & Gas",
    icon: <Cylinder className="w-3.5 h-3.5 text-purple-400" />,
    colorClass: "hover:border-purple-500/60 hover:bg-purple-600/10 text-purple-300"
  },
  {
    id: "ganti-tabung-prod-pnb",
    label: "Ganti Tabung Prod PNB",
    kegiatan: "Ganti tabung Prod PNB",
    group: "Kimia & Gas",
    icon: <Cylinder className="w-3.5 h-3.5 text-purple-400" />,
    colorClass: "hover:border-purple-500/60 hover:bg-purple-600/10 text-purple-300"
  },

  // 7. Support Produksi
  {
    id: "support-produksi-tth",
    label: "Support Produksi TTH",
    kegiatan: "Support produksi TTH",
    group: "Support Produksi",
    icon: <Factory className="w-3.5 h-3.5 text-pink-400" />,
    colorClass: "hover:border-pink-500/60 hover:bg-pink-600/10 text-pink-300"
  },
  {
    id: "support-produksi-pnb",
    label: "Support Produksi PNB",
    kegiatan: "Support produksi PNB",
    group: "Support Produksi",
    icon: <Factory className="w-3.5 h-3.5 text-pink-400" />,
    colorClass: "hover:border-pink-500/60 hover:bg-pink-600/10 text-pink-300"
  },

  // 8. Maintenance & Proyek
  {
    id: "pm",
    label: "PM",
    kegiatan: "PM ",
    group: "Maintenance & Proyek",
    icon: <Wrench className="w-3.5 h-3.5 text-yellow-400" />,
    colorClass: "hover:border-yellow-500/60 hover:bg-yellow-600/10 text-yellow-300"
  },
  {
    id: "troubleshooting",
    label: "Troubleshooting",
    kegiatan: "Troubleshooting ",
    group: "Maintenance & Proyek",
    icon: <Wrench className="w-3.5 h-3.5 text-red-400" />,
    colorClass: "hover:border-red-500/60 hover:bg-red-600/10 text-red-300"
  },
  {
    id: "supervisi-project",
    label: "Supervisi Project",
    kegiatan: "Supervisi project ",
    group: "Maintenance & Proyek",
    icon: <HardHat className="w-3.5 h-3.5 text-amber-400" />,
    colorClass: "hover:border-amber-500/60 hover:bg-amber-600/10 text-amber-300"
  },
  {
    id: "survey-vendor",
    label: "Survey Vendor",
    kegiatan: "Survey vendor ",
    group: "Maintenance & Proyek",
    icon: <Users className="w-3.5 h-3.5 text-lime-400" />,
    colorClass: "hover:border-lime-500/60 hover:bg-lime-600/10 text-lime-300"
  },

  // 9. Rutin & Istirahat
  {
    id: "briefing",
    label: "Briefing",
    kegiatan: "Briefing",
    group: "Rutin & Istirahat",
    icon: <MessageSquare className="w-3.5 h-3.5 text-blue-400" />,
    colorClass: "hover:border-blue-500/60 hover:bg-blue-600/10 text-blue-300",
    isFavorite: true
  },
  {
    id: "berjalan",
    label: "Berjalan",
    kegiatan: "Berjalan ke ",
    group: "Rutin & Istirahat",
    icon: <Footprints className="w-3.5 h-3.5 text-emerald-400" />,
    colorClass: "hover:border-emerald-500/60 hover:bg-emerald-600/10 text-emerald-300",
    isFavorite: true
  },
  {
    id: "istirahat",
    label: "Istirahat",
    kegiatan: "Istirahat",
    group: "Rutin & Istirahat",
    icon: <Coffee className="w-3.5 h-3.5 text-amber-400" />,
    colorClass: "hover:border-amber-500/60 hover:bg-amber-600/10 text-amber-300",
    isFavorite: true
  },
  {
    id: "break",
    label: "Break",
    kegiatan: "Break",
    group: "Rutin & Istirahat",
    icon: <PauseCircle className="w-3.5 h-3.5 text-orange-400" />,
    colorClass: "hover:border-orange-500/60 hover:bg-orange-600/10 text-orange-300",
    isFavorite: true
  },
  {
    id: "solat",
    label: "Solat",
    kegiatan: "Solat",
    group: "Rutin & Istirahat",
    icon: <Moon className="w-3.5 h-3.5 text-purple-400" />,
    colorClass: "hover:border-purple-500/60 hover:bg-purple-600/10 text-purple-300",
    isFavorite: true
  }
];

export const QuickActivityButtons: React.FC<QuickActivityButtonsProps> = ({ onSelect, className = "" }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeGroup, setActiveGroup] = useState<string>("Semua");

  const favoriteActivities = useMemo(() => {
    return ALL_QUICK_ACTIVITIES.filter((item) => item.isFavorite);
  }, []);

  const groups = useMemo(() => {
    const list = Array.from(new Set(ALL_QUICK_ACTIVITIES.map((a) => a.group)));
    return ["Semua", ...list];
  }, []);

  const filteredModalActivities = useMemo(() => {
    let result = ALL_QUICK_ACTIVITIES;
    if (activeGroup !== "Semua") {
      result = result.filter((item) => item.group === activeGroup);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(
        (item) =>
          item.label.toLowerCase().includes(q) ||
          item.kegiatan.toLowerCase().includes(q) ||
          item.group.toLowerCase().includes(q)
      );
    }
    return result;
  }, [activeGroup, searchQuery]);

  const handleItemClick = (item: QuickActivityItem) => {
    onSelect(item.kegiatan, item.kategori || "");
    setIsModalOpen(false);
  };

  return (
    <div className={`space-y-1.5 ${className}`}>
      {/* Front Bar Label & Open Modal Button */}
      <div className="flex items-center justify-between text-[11px] text-slate-400">
        <span className="font-semibold text-slate-300">Pilihan Cepat Kegiatan:</span>
        <button
          type="button"
          onClick={() => {
            setSearchQuery("");
            setActiveGroup("Semua");
            setIsModalOpen(true);
          }}
          className="text-xs font-semibold text-blue-400 hover:text-blue-300 flex items-center gap-1 transition px-2 py-0.5 rounded-md hover:bg-blue-600/10"
        >
          <SlidersHorizontal className="w-3 h-3" />
          <span>Semua Pilihan ({ALL_QUICK_ACTIVITIES.length})</span>
        </button>
      </div>

      {/* Front Bar Buttons (Favorites) */}
      <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
        {favoriteActivities.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => handleItemClick(item)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-700 bg-slate-900/80 text-xs font-medium transition active:scale-95 select-none ${item.colorClass}`}
          >
            {item.icon}
            <span>{item.label}</span>
          </button>
        ))}

        {/* Dedicated "Lainnya / Semua" Button at the end of the bar */}
        <button
          type="button"
          onClick={() => {
            setSearchQuery("");
            setActiveGroup("Semua");
            setIsModalOpen(true);
          }}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-blue-500/40 bg-blue-600/20 text-blue-300 text-xs font-semibold hover:bg-blue-600/30 hover:border-blue-400 transition active:scale-95"
        >
          <SlidersHorizontal className="w-3.5 h-3.5 text-blue-400" />
          <span>+ Semua Pilihan ({ALL_QUICK_ACTIVITIES.length})</span>
        </button>
      </div>

      {/* Modal / Dialog for All 32 Quick Activities */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-150">
          <div 
            className="w-full max-w-3xl max-h-[90vh] bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl flex flex-col overflow-hidden text-slate-100"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800 bg-slate-850">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <SlidersHorizontal className="w-4 h-4 text-blue-400" />
                  <span>Daftar Lengkap Pilihan Cepat Kegiatan</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Klik kegiatan untuk langsung mengisinya ke form pencatatan
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Search Input Bar */}
            <div className="p-4 border-b border-slate-800 bg-slate-900/90 space-y-3">
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Ketik untuk mencari kegiatan (misal: chiller, boiler, demin, solar, tabung, PM)..."
                  className="w-full bg-slate-800/90 border border-slate-700 rounded-xl pl-9 pr-9 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                  autoFocus
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery("")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Category Filter Pills */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none text-xs">
                {groups.map((grp) => (
                  <button
                    key={grp}
                    type="button"
                    onClick={() => setActiveGroup(grp)}
                    className={`px-3 py-1 rounded-lg font-medium whitespace-nowrap transition text-xs ${
                      activeGroup === grp
                        ? "bg-blue-600 text-white shadow-sm"
                        : "bg-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-750"
                    }`}
                  >
                    {grp}
                  </button>
                ))}
              </div>
            </div>

            {/* Modal Body - Activities List */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-5">
              {filteredModalActivities.length === 0 ? (
                <div className="text-center py-12 text-slate-400">
                  <Search className="w-8 h-8 mx-auto mb-2 text-slate-600 opacity-60" />
                  <p className="text-xs">Tidak ada kegiatan yang cocok dengan "{searchQuery}"</p>
                </div>
              ) : activeGroup === "Semua" && !searchQuery.trim() ? (
                // Grouped View
                groups.filter(g => g !== "Semua").map((groupName) => {
                  const itemsInGroup = ALL_QUICK_ACTIVITIES.filter((a) => a.group === groupName);
                  if (itemsInGroup.length === 0) return null;
                  return (
                    <div key={groupName} className="space-y-2">
                      <div className="flex items-center gap-2 border-b border-slate-800 pb-1">
                        <span className="text-xs font-bold text-slate-300">{groupName}</span>
                        <span className="text-[10px] text-slate-500 font-mono">({itemsInGroup.length})</span>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                        {itemsInGroup.map((item) => (
                          <button
                            key={item.id}
                            type="button"
                            onClick={() => handleItemClick(item)}
                            className={`flex items-center gap-2 px-3 py-2 rounded-xl border border-slate-700/80 bg-slate-800/80 text-left text-xs font-medium transition hover:scale-[1.01] active:scale-95 ${item.colorClass}`}
                          >
                            <span className="shrink-0">{item.icon}</span>
                            <span className="truncate">{item.label}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  );
                })
              ) : (
                // Flat filtered grid
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                  {filteredModalActivities.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => handleItemClick(item)}
                      className={`flex items-center gap-2 px-3 py-2 rounded-xl border border-slate-700/80 bg-slate-800/80 text-left text-xs font-medium transition hover:scale-[1.01] active:scale-95 ${item.colorClass}`}
                    >
                      <span className="shrink-0">{item.icon}</span>
                      <div className="min-w-0">
                        <div className="truncate">{item.label}</div>
                        <div className="text-[10px] text-slate-500 truncate">{item.group}</div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-5 py-3 border-t border-slate-800 bg-slate-850 flex items-center justify-between text-xs text-slate-400">
              <span>Menampilkan {filteredModalActivities.length} pilihan kegiatan</span>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium rounded-xl transition"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};