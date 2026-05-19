import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  Plus, ClipboardList, ChevronDown, ChevronUp, CheckCircle2,
  PlayCircle, Clock, AlertCircle, Pause, X, UserPlus, Trash2
} from "lucide-react";
import { format } from "date-fns";
import { id as idLocale } from "date-fns/locale";
import { toast } from "sonner";

const ACTIVITY_OPTIONS = [
  { value: "racik", label: "🧪 Racik / Mixing", color: "bg-purple-100 text-purple-700" },
  { value: "filling", label: "💧 Filling", color: "bg-cyan-100 text-cyan-700" },
  { value: "packing", label: "📦 Packing", color: "bg-orange-100 text-orange-700" },
  { value: "labeling", label: "🏷️ Labeling", color: "bg-pink-100 text-pink-700" },
  { value: "qc", label: "✅ QC / Quality Check", color: "bg-green-100 text-green-700" },
  { value: "preparation", label: "🔧 Persiapan", color: "bg-blue-100 text-blue-700" },
  { value: "other", label: "📋 Lainnya", color: "bg-gray-100 text-gray-600" },
];

const STATUS_CONFIG = {
  assigned: { label: "Belum Dimulai", cls: "bg-amber-100 text-amber-700", icon: AlertCircle },
  in_progress: { label: "Sedang Berjalan", cls: "bg-blue-100 text-blue-700", icon: PlayCircle },
  completed: { label: "Selesai", cls: "bg-green-100 text-green-700", icon: CheckCircle2 },
  on_hold: { label: "Ditunda", cls: "bg-gray-100 text-gray-600", icon: Pause },
  cancelled: { label: "Dibatalkan", cls: "bg-red-100 text-red-600", icon: X },
};

// Roles yang BOLEH dipilih
const ALLOWED_ROLES = ["admin", "supervisor_office", "supervisor", "operator_office", "operator_produksi"];

const ROLE_LABELS = {
  admin: "Admin",
  supervisor_office: "Supervisor Office",
  supervisor: "Supervisor Produksi",
  operator_office: "Operator Office",
  operator_produksi: "Operator Produksi",
};

// Searchable member selector: search + dropdown satu kesatuan
function MemberRoleSelector({ label, roleValue, onRoleChange, memberValue, onMemberChange, members }) {
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);

  // Semua member eligible, filter by role jika role dipilih
  const filteredMembers = useMemo(() => {
    return members.filter(m => {
      const matchRole = !roleValue || roleValue === "all" || m.role === roleValue;
      const matchSearch = !search || m.full_name?.toLowerCase().includes(search.toLowerCase());
      return matchRole && matchSearch;
    });
  }, [members, roleValue, search]);

  const selectedMember = members.find(m => m.id === memberValue);

  return (
    <div className="space-y-2">
      <Label className="text-xs font-semibold">{label}</Label>
      <div className="relative">
        {/* Trigger button */}
        <button
          type="button"
          onClick={() => setOpen(v => !v)}
          className="w-full flex items-center justify-between h-9 px-3 rounded-md border border-input bg-background text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring text-left"
        >
          <span className={selectedMember ? "text-foreground" : "text-muted-foreground"}>
            {selectedMember
              ? `${selectedMember.full_name}${selectedMember.position ? ` · ${selectedMember.position}` : ""}`
              : "Cari dan pilih orang..."}
          </span>
          <svg className="w-4 h-4 text-muted-foreground shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {open && (
          <div className="absolute z-50 mt-1 w-full bg-popover border border-border rounded-md shadow-lg">
            {/* Search + Role filter dalam satu panel */}
            <div className="p-2 border-b border-border space-y-1.5">
              <input
                autoFocus
                className="w-full h-7 px-2.5 text-xs rounded border border-input bg-background focus:outline-none focus:ring-1 focus:ring-ring"
                placeholder="Ketik untuk cari nama..."
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
              <div className="flex flex-wrap gap-1">
                <button
                  type="button"
                  onClick={() => onRoleChange("all")}
                  className={`px-2 py-0.5 rounded-full text-[10px] font-medium transition-colors ${(!roleValue || roleValue === "all") ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/70"}`}
                >Semua</button>
                {ALLOWED_ROLES.map(r => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => onRoleChange(r)}
                    className={`px-2 py-0.5 rounded-full text-[10px] font-medium transition-colors ${roleValue === r ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/70"}`}
                  >{ROLE_LABELS[r]}</button>
                ))}
              </div>
            </div>
            <div className="max-h-40 overflow-y-auto">
              {filteredMembers.length === 0 ? (
                <div className="px-3 py-3 text-xs text-muted-foreground text-center">Tidak ditemukan</div>
              ) : (
                filteredMembers.map(m => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => {
                      onMemberChange(m.id);
                      onRoleChange(m.role);
                      setOpen(false);
                      setSearch("");
                    }}
                    className={`w-full text-left px-3 py-2 text-xs hover:bg-muted/50 flex items-center gap-2 transition-colors ${memberValue === m.id ? "bg-primary/10 text-primary font-semibold" : ""}`}
                  >
                    <span className="flex-1">{m.full_name}{m.position ? ` · ${m.position}` : ""}</span>
                    <span className="text-[10px] text-muted-foreground">{ROLE_LABELS[m.role] || m.role}</span>
                  </button>
                ))
              )}
            </div>
            {selectedMember && (
              <div className="p-2 border-t border-border">
                <button
                  type="button"
                  onClick={() => { onMemberChange(""); setOpen(false); setSearch(""); }}
                  className="w-full text-xs text-muted-foreground hover:text-destructive text-center py-1"
                >Hapus pilihan</button>
              </div>
            )}
          </div>
        )}
        {/* Backdrop */}
        {open && <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />}
      </div>
    </div>
  );
}

export default function TambahTugasSection({ order }) {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [expanded, setExpanded] = useState(null);

  const emptyForm = {
    activity_type: "",
    task_name: "",
    target_quantity: "",
    unit: "pcs",
    pic_role: "",
    pic_id: "",
    notes: "",
    task_date: new Date().toISOString().split("T")[0],
    pendukung: [], // [{role, id, name}]
  };
  const [form, setForm] = useState(emptyForm);

  // Untuk tambah pendukung
  const [pendukungRole, setPendukungRole] = useState("");
  const [pendukungId, setPendukungId] = useState("");

  const { data: members = [] } = useQuery({
    queryKey: ["team-members"],
    queryFn: () => base44.entities.TeamMember.filter({ status: "aktif" }),
  });

  // Hanya anggota yang boleh dipilih (exclude developer & owner)
  const eligibleMembers = useMemo(() =>
    members.filter(m => ALLOWED_ROLES.includes(m.role)),
    [members]
  );

  const { data: allTasks = [] } = useQuery({
    queryKey: ["production-tasks", order.id],
    queryFn: () => base44.entities.ProductionTask.filter({ po_id: order.id }),
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.ProductionTask.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["production-tasks", order.id] });
      queryClient.invalidateQueries({ queryKey: ["production-tasks"] });
      queryClient.invalidateQueries({ queryKey: ["production-order", order.id] });
      toast.success("Tugas berhasil ditambahkan!");
      setShowForm(false);
      setForm(emptyForm);
      setPendukungRole("");
      setPendukungId("");
    },
  });

  const handleActivityChange = (val) => {
    const opt = ACTIVITY_OPTIONS.find((o) => o.value === val);
    setForm((f) => ({
      ...f,
      activity_type: val,
      task_name: opt ? `${order.brand_name} - ${opt.label.replace(/^.*?\s/, "")}` : f.task_name,
    }));
  };

  const handleAddPendukung = () => {
    if (!pendukungId) return toast.error("Pilih tenaga pendukung dulu");
    const member = eligibleMembers.find(m => m.id === pendukungId);
    if (!member) return;
    if (form.pendukung.some(p => p.id === pendukungId)) return toast.error("Orang ini sudah ditambahkan");
    setForm(f => ({ ...f, pendukung: [...f.pendukung, { role: member.role, id: pendukungId, name: member.full_name }] }));
    setPendukungRole("");
    setPendukungId("");
  };

  const handleRemovePendukung = (id) => {
    setForm(f => ({ ...f, pendukung: f.pendukung.filter(p => p.id !== id) }));
  };

  const handleSubmit = () => {
    if (!form.activity_type) return toast.error("Pilih jenis tugas dulu");
    if (!form.task_name.trim()) return toast.error("Nama tugas wajib diisi");

    const selectedMember = eligibleMembers.find((m) => m.id === form.pic_id);
    const taskData = {
      task_name: form.task_name.trim(),
      po_id: order.id,
      po_number: String(order.order_number),
      po_brand: order.brand_name,
      activity_type: form.activity_type,
      target_quantity: Number(form.target_quantity) || 0,
      unit: form.unit,
      pic_id: form.pic_id || null,
      pic_name: selectedMember?.full_name || null,
      pendukung: form.pendukung,
      notes: form.notes,
      task_date: form.task_date,
      status: "assigned",
    };
    createMutation.mutate(taskData);
  };

  const actTasks = allTasks.filter((t) => ["assigned", "in_progress", "on_hold"].includes(t.status));
  const doneTasks = allTasks.filter((t) => ["completed", "cancelled"].includes(t.status));

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="font-display text-lg flex items-center gap-2">
              <ClipboardList className="w-5 h-5 text-primary" />
              Tugas Produksi
            </CardTitle>
            <p className="text-xs text-muted-foreground mt-0.5">
              {allTasks.length} tugas · {actTasks.length} aktif · {doneTasks.length} selesai
            </p>
          </div>
          <Button size="sm" className="gap-1.5 text-xs h-8" onClick={() => setShowForm((v) => !v)}>
            <Plus className="w-3 h-3" />
            Tambah Tugas
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Form Tambah */}
        {showForm && (
          <div className="border border-primary/20 bg-primary/5 rounded-xl p-4 space-y-3">
            <p className="text-sm font-semibold text-primary">Tugas Baru</p>

            <div>
              <Label className="text-xs mb-1 block">Jenis Tugas *</Label>
              <Select value={form.activity_type} onValueChange={handleActivityChange}>
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="Pilih jenis tugas..." />
                </SelectTrigger>
                <SelectContent>
                  {ACTIVITY_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-xs mb-1 block">Nama Tugas *</Label>
              <Input
                value={form.task_name}
                onChange={(e) => setForm((f) => ({ ...f, task_name: e.target.value }))}
                placeholder="Nama tugas..."
                className="h-9"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs mb-1 block">Target Qty</Label>
                <Input
                  type="number"
                  value={form.target_quantity}
                  onChange={(e) => setForm((f) => ({ ...f, target_quantity: e.target.value }))}
                  placeholder={order.target_qty || "0"}
                  className="h-9"
                />
              </div>
              <div>
                <Label className="text-xs mb-1 block">Satuan</Label>
                <Select value={form.unit} onValueChange={(v) => setForm((f) => ({ ...f, unit: v }))}>
                  <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {["pcs", "botol", "kg", "liter", "ml", "gram", "lusin"].map((u) => (
                      <SelectItem key={u} value={u}>{u}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* PIC: Search + pilih orang dalam satu dropdown */}
            <MemberRoleSelector
              label="Penanggung Jawab (PIC)"
              roleValue={form.pic_role}
              onRoleChange={v => setForm(f => ({ ...f, pic_role: v }))}
              memberValue={form.pic_id}
              onMemberChange={v => setForm(f => ({ ...f, pic_id: v }))}
              members={eligibleMembers}
            />

            {/* Tenaga Pendukung */}
            <div className="space-y-2">
              <Label className="text-xs font-semibold flex items-center gap-1">
                <UserPlus className="w-3 h-3" /> Tenaga Pendukung (opsional)
              </Label>
              {form.pendukung.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {form.pendukung.map(p => (
                    <Badge key={p.id} variant="secondary" className="gap-1 pr-1 text-xs">
                      {p.name}
                      <button onClick={() => handleRemovePendukung(p.id)} className="ml-0.5 hover:text-destructive">
                        <X className="w-2.5 h-2.5" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
              <div className="bg-muted/40 rounded-lg p-2.5 space-y-2">
                <MemberRoleSelector
                  label="Tambah pendukung"
                  roleValue={pendukungRole}
                  onRoleChange={v => setPendukungRole(v)}
                  memberValue={pendukungId}
                  onMemberChange={setPendukungId}
                  members={eligibleMembers}
                />
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="w-full h-7 text-xs gap-1"
                  onClick={handleAddPendukung}
                  disabled={!pendukungId}
                >
                  <UserPlus className="w-3 h-3" /> Tambahkan
                </Button>
              </div>
            </div>

            <div>
              <Label className="text-xs mb-1 block">Tanggal Tugas</Label>
              <Input
                type="date"
                value={form.task_date}
                onChange={(e) => setForm((f) => ({ ...f, task_date: e.target.value }))}
                className="h-9"
              />
            </div>

            <div>
              <Label className="text-xs mb-1 block">Catatan</Label>
              <Textarea
                value={form.notes}
                onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                placeholder="Instruksi atau catatan khusus..."
                rows={2}
                className="resize-none"
              />
            </div>

            <div className="flex gap-2 pt-1">
              <Button variant="outline" size="sm" className="flex-1" onClick={() => { setShowForm(false); setForm(emptyForm); setPendukungRole(""); setPendukungId(""); }}>
                Batal
              </Button>
              <Button size="sm" className="flex-1" onClick={handleSubmit} disabled={createMutation.isPending}>
                {createMutation.isPending ? "Menyimpan..." : "Tambah Tugas"}
              </Button>
            </div>
          </div>
        )}

        {/* Task List */}
        {allTasks.length === 0 && !showForm ? (
          <div className="text-center py-8 text-muted-foreground">
            <ClipboardList className="w-8 h-8 mx-auto mb-2 opacity-20" />
            <p className="text-sm">Belum ada tugas. Klik "Tambah Tugas" untuk mulai.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {allTasks.map((task) => {
              const statusCfg = STATUS_CONFIG[task.status] || STATUS_CONFIG.assigned;
              const StatusIcon = statusCfg.icon;
              const actOpt = ACTIVITY_OPTIONS.find((o) => o.value === task.activity_type);
              const isExpanded = expanded === task.id;

              return (
                <div key={task.id} className="border border-border rounded-xl overflow-hidden">
                  <div
                    className="flex items-center gap-3 p-3 cursor-pointer hover:bg-muted/30 transition-colors"
                    onClick={() => setExpanded(isExpanded ? null : task.id)}
                  >
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 text-sm ${actOpt?.color || "bg-gray-100 text-gray-600"}`}>
                      {actOpt?.label.split(" ")[0] || "📋"}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold truncate">{task.task_name}</p>
                      <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                        <span className={`inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded font-medium ${task.pic_name ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"}`}>
                          👤 {task.pic_name || "Belum ada PIC"}
                        </span>
                        {task.pendukung?.length > 0 && (
                          <span className="text-[10px] text-muted-foreground">+{task.pendukung.length} pendukung</span>
                        )}
                        {task.task_date && (
                          <span className="text-[10px] text-muted-foreground">· {format(new Date(task.task_date), "dd MMM", { locale: idLocale })}</span>
                        )}
                      </div>
                    </div>
                    <span className={`inline-flex items-center gap-1 text-[10px] px-2 py-1 rounded-full font-medium shrink-0 ${statusCfg.cls}`}>
                      <StatusIcon className="w-3 h-3" />
                      {statusCfg.label}
                    </span>
                    {isExpanded ? <ChevronUp className="w-4 h-4 text-muted-foreground shrink-0" /> : <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />}
                  </div>

                  {isExpanded && (
                    <div className="px-3 pb-3 border-t border-border/50 bg-muted/20 pt-3 space-y-2 text-xs text-muted-foreground">
                      {task.target_quantity > 0 && (
                        <div className="flex justify-between">
                          <span>Target:</span>
                          <span className="font-semibold text-foreground">{task.target_quantity} {task.unit}</span>
                        </div>
                      )}
                      {task.pendukung?.length > 0 && (
                        <div>
                          <span className="font-medium text-foreground flex items-center gap-1 mb-1"><UserPlus className="w-3 h-3" /> Tenaga Pendukung:</span>
                          <div className="flex flex-wrap gap-1 mt-0.5">
                            {task.pendukung.map((p, i) => (
                              <Badge key={i} variant="secondary" className="text-[10px]">{p.name} ({ROLE_LABELS[p.role] || p.role})</Badge>
                            ))}
                          </div>
                        </div>
                      )}
                      {task.status === "completed" && task.completed_quantity > 0 && (
                        <div className="flex justify-between">
                          <span>Output:</span>
                          <span className="font-semibold text-green-700">{task.completed_quantity} {task.unit}</span>
                        </div>
                      )}
                      {task.status === "completed" && task.duration_minutes > 0 && (
                        <div className="flex justify-between">
                          <span>Durasi:</span>
                          <span className="font-semibold text-foreground flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {task.duration_minutes >= 60
                              ? `${Math.floor(task.duration_minutes / 60)}j ${task.duration_minutes % 60}m`
                              : `${task.duration_minutes} menit`}
                          </span>
                        </div>
                      )}
                      {task.notes && <p className="italic">📝 {task.notes}</p>}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}