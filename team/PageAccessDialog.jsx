import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Eye, Edit3, EyeOff, Save,
  LayoutDashboard, Package, Calculator, FlaskConical, History,
  Archive, Truck, CheckCircle2, RotateCcw, BarChart2,
  Users, ClipboardList, Settings
} from "lucide-react";

const PAGES = [
  { key: "dashboard",    label: "Dashboard",            Icon: LayoutDashboard },
  { key: "produksi",     label: "Produksi",              Icon: Package },
  { key: "kalkulator_hpp",  label: "Kalkulator HPP",    Icon: Calculator },
  { key: "sample_racikan",  label: "Sample & Racikan",  Icon: FlaskConical },
  { key: "riwayat_hpp",     label: "Riwayat HPP",       Icon: History },
  { key: "stok_inventori",  label: "Stok & Inventori",  Icon: Archive },
  { key: "delivery",     label: "Delivery",              Icon: Truck },
  { key: "selesai",      label: "Selesai",               Icon: CheckCircle2 },
  { key: "return",       label: "Return",                Icon: RotateCcw },
  { key: "laporan",      label: "Laporan",               Icon: BarChart2 },
  { key: "manajemen_tim",   label: "Manajemen Tim",     Icon: Users },
  { key: "tugas_saya",   label: "Tugas Saya",            Icon: ClipboardList },
  { key: "pengaturan",   label: "Pengaturan Perusahaan", Icon: Settings },
];

const ACCESS_OPTIONS = [
  { value: "none", label: "Tidak bisa akses", icon: EyeOff, cls: "text-muted-foreground" },
  { value: "view", label: "Hanya lihat", icon: Eye, cls: "text-blue-600" },
  { value: "edit", label: "Bisa edit", icon: Edit3, cls: "text-green-600" },
];

export default function PageAccessDialog({ open, member, onClose, onSaved }) {
  const [access, setAccess] = useState({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (member) {
      setAccess(member.page_access || {});
    }
  }, [member]);

  const toggle = (key) => {
    setAccess(prev => {
      const current = prev[key] || "none";
      const next = current === "none" ? "view" : current === "view" ? "edit" : "none";
      return { ...prev, [key]: next };
    });
  };

  const handleSave = async () => {
    setLoading(true);
    await base44.entities.TeamMember.update(member.id, { page_access: access });
    setLoading(false);
    onSaved?.();
    onClose();
  };

  const setAll = (val) => {
    const newAccess = {};
    PAGES.forEach(p => { newAccess[p.key] = val; });
    setAccess(newAccess);
  };

  if (!member) return null;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-base">Akses Halaman — {member.full_name}</DialogTitle>
          <p className="text-xs text-muted-foreground mt-1">
            Klik nama halaman untuk mengubah tingkat akses karyawan ini.
          </p>
        </DialogHeader>

        {/* Shortcut buttons */}
        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" size="sm" className="text-xs h-7" onClick={() => setAll("edit")}>
            Semua Bisa Edit
          </Button>
          <Button variant="outline" size="sm" className="text-xs h-7" onClick={() => setAll("view")}>
            Semua Hanya Lihat
          </Button>
          <Button variant="outline" size="sm" className="text-xs h-7" onClick={() => setAll("none")}>
            Semua Tidak Akses
          </Button>
        </div>

        <div className="space-y-1.5">
          {PAGES.map(page => {
            const currentAccess = access[page.key] || "none";
            const opt = ACCESS_OPTIONS.find(o => o.value === currentAccess);
            const AccessIcon = opt.icon;
            const PageIcon = page.Icon;
            return (
              <button
                key={page.key}
                type="button"
                onClick={() => toggle(page.key)}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg border border-border hover:bg-muted/40 transition-colors text-left"
              >
                <PageIcon className="w-4 h-4 shrink-0 text-muted-foreground" />
                <span className="flex-1 text-sm font-medium">{page.label}</span>
                <div className={`flex items-center gap-1.5 text-xs font-medium ${opt.cls}`}>
                  <AccessIcon className="w-3.5 h-3.5" />
                  <span>{opt.label}</span>
                </div>
              </button>
            );
          })}
        </div>

        <div className="flex gap-2 pt-2">
          <Button variant="outline" className="flex-1" onClick={onClose}>Batal</Button>
          <Button className="flex-1 gap-2" onClick={handleSave} disabled={loading}>
            <Save className="w-4 h-4" />
            {loading ? "Menyimpan..." : "Simpan Akses"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}