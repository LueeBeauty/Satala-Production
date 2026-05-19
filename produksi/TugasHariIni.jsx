import { useState } from "react";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Plus, ClipboardList, Users, CheckCircle2, PlayCircle, AlertCircle, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { id as idLocale } from "date-fns/locale";

const ACTIVITY_OPTIONS = [
  { value: "preparation", label: "Persiapan" },
  { value: "mixing", label: "Mixing" },
  { value: "filling", label: "Filling" },
  { value: "sealing", label: "Sealing" },
  { value: "labeling", label: "Labeling" },
  { value: "qc", label: "QC" },
  { value: "packaging", label: "Packaging" },
  { value: "other", label: "Lainnya" },
];

const STATUS_BADGE = {
  assigned: { label: "Menunggu", cls: "bg-amber-100 text-amber-700" },
  in_progress: { label: "Berjalan", cls: "bg-blue-100 text-blue-700" },
  completed: { label: "Selesai", cls: "bg-green-100 text-green-700" },
  on_hold: { label: "Ditunda", cls: "bg-gray-100 text-gray-600" },
  cancelled: { label: "Batal", cls: "bg-red-100 text-red-600" },
};

const emptyForm = {
  task_name: "",
  activity_type: "filling",
  target_quantity: "",
  unit: "pcs",
  pic_id: "",
  pic_name: "",
  po_number: "",
  notes: "",
};

export default function TugasHariIni() {
  const queryClient = useQueryClient();
  const today = new Date().toISOString().split("T")[0];
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);

  const { data: tasks = [] } = useQuery({
    queryKey: ["production-tasks"],
    queryFn: () => base44.entities.ProductionTask.list("-created_date"),
  });

  const { data: members = [] } = useQuery({
    queryKey: ["team-members"],
    queryFn: () => base44.entities.TeamMember.list(),
  });

  // Hanya tampilkan tugas hari ini
  const todayTasks = tasks.filter((t) => {
    const createdDate = t.created_date ? t.created_date.split("T")[0] : "";
    const taskDate = t.task_date || "";
    return createdDate === today || taskDate === today;
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.ProductionTask.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["production-tasks"] });
      setShowForm(false);
      setForm(emptyForm);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.ProductionTask.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["production-tasks"] }),
  });

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const handlePICSelect = (memberId) => {
    const m = members.find((x) => x.id === memberId);
    set("pic_id", memberId);
    set("pic_name", m?.full_name || "");
  };

  const handleSave = () => {
    const data = {
      ...form,
      target_quantity: form.target_quantity ? Number(form.target_quantity) : undefined,
      task_date: today,
      status: "assigned",
    };
    if (!data.target_quantity) delete data.target_quantity;
    createMutation.mutate(data);
  };

  const activeMembers = members.filter((m) => m.status === "aktif");

  const doneCount = todayTasks.filter((t) => t.status === "completed").length;
  const activeCount = todayTasks.filter((t) => t.status === "in_progress").length;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ClipboardList className="w-5 h-5 text-accent" />
          <div>
            <h2 className="font-bold text-base">Tugas Hari Ini</h2>
            <p className="text-xs text-muted-foreground">
              {format(new Date(), "EEEE, dd MMMM yyyy", { locale: idLocale })}
            </p>
          </div>
        </div>
        <Button size="sm" onClick={() => setShowForm(true)} className="gap-1.5">
          <Plus className="w-3.5 h-3.5" /> Buat Tugas
        </Button>
      </div>

      {/* Mini Stats */}
      {todayTasks.length > 0 && (
        <div className="flex gap-2 flex-wrap">
          <span className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full bg-secondary text-secondary-foreground">
            <ClipboardList className="w-3 h-3" /> {todayTasks.length} tugas
          </span>
          {activeCount > 0 && (
            <span className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full bg-blue-100 text-blue-700">
              <PlayCircle className="w-3 h-3" /> {activeCount} berjalan
            </span>
          )}
          {doneCount > 0 && (
            <span className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full bg-green-100 text-green-700">
              <CheckCircle2 className="w-3 h-3" /> {doneCount} selesai
            </span>
          )}
        </div>
      )}

      {/* Task List */}
      {todayTasks.length === 0 ? (
        <div className="border-2 border-dashed border-border rounded-xl py-10 text-center text-muted-foreground">
          <ClipboardList className="w-8 h-8 mx-auto mb-2 opacity-20" />
          <p className="text-sm">Belum ada tugas hari ini.</p>
          <button onClick={() => setShowForm(true)} className="text-xs text-primary underline mt-1">Buat tugas pertama</button>
        </div>
      ) : (
        <div className="space-y-2">
          {todayTasks.map((task) => {
            const statusCfg = STATUS_BADGE[task.status] || STATUS_BADGE.assigned;
            const actLabel = ACTIVITY_OPTIONS.find((a) => a.value === task.activity_type)?.label || task.activity_type;
            return (
              <Card key={task.id} className="hover:shadow-sm transition-shadow">
                <CardContent className="p-3">
                  <div className="flex items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-medium text-sm truncate">{task.task_name}</p>
                        <Badge variant="outline" className="text-[10px] shrink-0">{actLabel}</Badge>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium shrink-0 ${statusCfg.cls}`}>
                          {statusCfg.label}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 mt-0.5 text-xs text-muted-foreground">
                        {task.pic_name && (
                          <span className="flex items-center gap-0.5">
                            <Users className="w-3 h-3" /> {task.pic_name}
                          </span>
                        )}
                        {task.target_quantity && (
                          <span>Target: {task.target_quantity} {task.unit}</span>
                        )}
                        {task.po_number && <span>PO: {task.po_number}</span>}
                        {task.status === "completed" && task.saved_to_catatan && (
                          <span className="text-green-600 flex items-center gap-0.5">
                            <CheckCircle2 className="w-3 h-3" /> tersimpan di catatan
                          </span>
                        )}
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="w-7 h-7 text-muted-foreground/40 hover:text-destructive shrink-0"
                      onClick={() => { if (confirm("Hapus tugas ini?")) deleteMutation.mutate(task.id); }}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Form Dialog */}
      <Dialog open={showForm} onOpenChange={(o) => { if (!o) { setShowForm(false); setForm(emptyForm); } }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Buat Tugas Hari Ini</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-xs">Nama Tugas *</Label>
              <Input value={form.task_name} onChange={(e) => set("task_name", e.target.value)} placeholder="Deskripsi tugas..." />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Jenis Aktivitas</Label>
                <Select value={form.activity_type} onValueChange={(v) => set("activity_type", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {ACTIVITY_OPTIONS.map((o) => (
                      <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">PIC / Operator</Label>
                <Select value={form.pic_id} onValueChange={handlePICSelect}>
                  <SelectTrigger><SelectValue placeholder="Pilih operator..." /></SelectTrigger>
                  <SelectContent>
                    {activeMembers.map((m) => (
                      <SelectItem key={m.id} value={m.id}>{m.full_name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5 col-span-2">
                <Label className="text-xs">Target Output</Label>
                <Input type="number" min="0" value={form.target_quantity} onChange={(e) => set("target_quantity", e.target.value)} placeholder="0" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Satuan</Label>
                <Input value={form.unit} onChange={(e) => set("unit", e.target.value)} placeholder="pcs" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Nomor PO (opsional)</Label>
              <Input value={form.po_number} onChange={(e) => set("po_number", e.target.value)} placeholder="PO-XXXX..." className="font-mono" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Catatan</Label>
              <Textarea value={form.notes} onChange={(e) => set("notes", e.target.value)} rows={2} placeholder="Instruksi tambahan..." />
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => { setShowForm(false); setForm(emptyForm); }}>Batal</Button>
              <Button onClick={handleSave} disabled={!form.task_name || createMutation.isPending}>
                {createMutation.isPending ? "Menyimpan..." : "Buat Tugas"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}