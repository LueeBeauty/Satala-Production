import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ShieldCheck, AlertTriangle } from "lucide-react";

/**
 * Dialog untuk tambah Owner atau Developer.
 * Hanya bisa diakses oleh member dengan role yang sama (owner → owner, developer → developer).
 * @param {string} roleToAdd - "owner" | "developer"
 */
export default function AddPrivilegedMemberDialog({ open, onClose, onSaved, roleToAdd }) {
  const [form, setForm] = useState({
    full_name: "", email: "", password: "", phone: "", employee_id: "",
    position: "", department: "", status: "aktif",
    join_date: new Date().toISOString().split("T")[0], notes: ""
  });
  const [loading, setLoading] = useState(false);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const handleSave = async () => {
    if (!form.full_name || !form.email || !form.password) return;
    setLoading(true);
    await base44.entities.TeamMember.create({ ...form, role: roleToAdd });
    setLoading(false);
    setForm({
      full_name: "", email: "", password: "", phone: "", employee_id: "",
      position: "", department: "", status: "aktif",
      join_date: new Date().toISOString().split("T")[0], notes: ""
    });
    onSaved?.();
    onClose();
  };

  const roleLabel = roleToAdd === "owner" ? "Owner" : "Developer";
  const badgeCls = roleToAdd === "owner" ? "bg-yellow-100 text-yellow-800" : "bg-black text-white";

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5" />
            Tambah {roleLabel}
            <Badge className={`text-xs px-2 ${badgeCls}`}>{roleLabel}</Badge>
          </DialogTitle>
        </DialogHeader>

        


        

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1 col-span-2">
              <Label className="text-xs">Nama Lengkap *</Label>
              <Input value={form.full_name} onChange={(e) => set("full_name", e.target.value)} placeholder="Nama lengkap..." />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Email *</Label>
              <Input type="email" value={form.email} onChange={(e) => set("email", e.target.value)} placeholder="email@..." />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Password *</Label>
              <Input value={form.password} onChange={(e) => set("password", e.target.value)} placeholder="Password login..." />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">No. Telepon</Label>
              <Input value={form.phone} onChange={(e) => set("phone", e.target.value)} placeholder="08xx..." />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Employee ID</Label>
              <Input value={form.employee_id} onChange={(e) => set("employee_id", e.target.value)} placeholder="EMP001..." className="font-mono" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Jabatan</Label>
              <Input value={form.position} onChange={(e) => set("position", e.target.value)} placeholder="Jabatan..." />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Departemen</Label>
              <Input value={form.department} onChange={(e) => set("department", e.target.value)} placeholder="Departemen..." />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Tanggal Bergabung</Label>
              <Input type="date" value={form.join_date} onChange={(e) => set("join_date", e.target.value)} />
            </div>
            <div className="space-y-1 col-span-2">
              <Label className="text-xs">Catatan</Label>
              <Textarea value={form.notes} onChange={(e) => set("notes", e.target.value)} rows={2} placeholder="Catatan tambahan..." />
            </div>
          </div>
          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={onClose}>Batal</Button>
            <Button onClick={handleSave} disabled={loading || !form.full_name || !form.email || !form.password}>
              {loading ? "Menyimpan..." : `Tambah ${roleLabel}`}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>);

}