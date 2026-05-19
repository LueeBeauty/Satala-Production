import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Info } from "lucide-react";

export default function EditMemberDialog({ open, member, onClose, onSaved }) {
  const [form, setForm] = useState({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (member) setForm({ ...member });
  }, [member]);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const handleSave = async () => {
    if (!form.full_name || !form.email || !form.password) return;
    setLoading(true);
    await base44.entities.TeamMember.update(member.id, form);
    setLoading(false);
    onSaved?.();
    onClose();
  };

  if (!member) return null;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Anggota Tim</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1 col-span-2">
              <Label className="text-xs">Nama Lengkap *</Label>
              <Input value={form.full_name || ""} onChange={(e) => set("full_name", e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Email *</Label>
              <Input type="email" value={form.email || ""} onChange={(e) => set("email", e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Password *</Label>
              <Input value={form.password || ""} onChange={(e) => set("password", e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">No. Telepon</Label>
              <Input value={form.phone || ""} onChange={(e) => set("phone", e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Employee ID</Label>
              <Input value={form.employee_id || ""} onChange={(e) => set("employee_id", e.target.value)} className="font-mono" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Jabatan</Label>
              <Input value={form.position || ""} onChange={(e) => set("position", e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Departemen</Label>
              <Input value={form.department || ""} onChange={(e) => set("department", e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Role</Label>
              {(form.role === "developer" || form.role === "owner") ? (
                <div className="flex items-center gap-2 px-3 py-2 bg-muted/60 rounded-lg border border-border">
                  <Info className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                  <span className="text-xs text-muted-foreground capitalize">{form.role} — role tidak dapat diubah</span>
                </div>
              ) : (
                <>
                  <Select value={form.role || "operator_produksi"} onValueChange={(v) => set("role", v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="admin">Admin</SelectItem>
                      <SelectItem value="supervisor_office">Spv. Office</SelectItem>
                      <SelectItem value="supervisor">Spv. Produksi</SelectItem>
                      <SelectItem value="operator_office">Op. Office</SelectItem>
                      <SelectItem value="operator_produksi">Op. Produksi</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-[10px] text-muted-foreground flex items-center gap-1 mt-0.5">
                    <Info className="w-3 h-3" /> Role Owner & Developer tidak dapat ditugaskan
                  </p>
                </>
              )}
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Status</Label>
              <Select value={form.status || "aktif"} onValueChange={(v) => set("status", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="aktif">Aktif</SelectItem>
                  <SelectItem value="nonaktif">Nonaktif</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Tanggal Bergabung</Label>
              <Input type="date" value={form.join_date || ""} onChange={(e) => set("join_date", e.target.value)} />
            </div>
            <div className="space-y-1 col-span-2">
              <Label className="text-xs">Catatan</Label>
              <Textarea value={form.notes || ""} onChange={(e) => set("notes", e.target.value)} rows={2} />
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
    </Dialog>
  );
}