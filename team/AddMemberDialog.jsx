import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Info } from "lucide-react";

const empty = {
  full_name: "", email: "", password: "", phone: "", employee_id: "",
  position: "", department: "", role: "operator_produksi", status: "aktif",

  join_date: new Date().toISOString().split("T")[0], notes: ""
};

export default function AddMemberDialog({ open, onClose, onSaved }) {
  const [form, setForm] = useState(empty);
  const [loading, setLoading] = useState(false);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const handleSave = async () => {
    if (!form.full_name || !form.email || !form.password) return;
    setLoading(true);
    await base44.entities.TeamMember.create(form);
    setLoading(false);
    setForm(empty);
    onSaved?.();
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Tambah Anggota Tim</DialogTitle>
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
              <Input value={form.position} onChange={(e) => set("position", e.target.value)} placeholder="Operator, Supervisor..." />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Departemen</Label>
              <Input value={form.department} onChange={(e) => set("department", e.target.value)} placeholder="Produksi, QC..." />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Role</Label>
              <Select value={form.role} onValueChange={(v) => set("role", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="supervisor_office">Spv. Office</SelectItem>
                  <SelectItem value="supervisor">Spv. Produksi</SelectItem>
                  <SelectItem value="operator_office">Op. Office</SelectItem>
                  <SelectItem value="operator_produksi">Op. Produksi</SelectItem>
                </SelectContent>
              </Select>
              

              
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Status</Label>
              <Select value={form.status} onValueChange={(v) => set("status", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="aktif">Aktif</SelectItem>
                  <SelectItem value="nonaktif">Nonaktif</SelectItem>
                </SelectContent>
              </Select>
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
              {loading ? "Menyimpan..." : "Simpan"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>);

}