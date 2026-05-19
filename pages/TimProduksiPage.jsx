import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { useSession } from "@/lib/SessionContext";
import { canViewSensitiveData, canViewDeveloper, canManageTeam, canViewOtherQR, ROLE_ORDER, ROLE_LABEL as ROLE_LABEL_MAP } from "@/lib/AuthSession";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import AddMemberDialog from "@/components/team/AddMemberDialog";
import AddPrivilegedMemberDialog from "@/components/team/AddPrivilegedMemberDialog";
import EditMemberDialog from "@/components/team/EditMemberDialog";
import EmployeeQRCard from "@/components/team/EmployeeQRCard";
import PageAccessDialog from "@/components/team/PageAccessDialog";
import { Plus, Search, QrCode, Pencil, Trash2, Eye, EyeOff, Users, Mail, Phone, Factory, CreditCard, KeyRound, ShieldCheck, LayoutGrid } from "lucide-react";

const ROLE_BADGE = {
  owner: "bg-yellow-100 text-yellow-800",
  developer: "bg-black text-white",
  admin: "bg-red-100 text-red-700",
  supervisor_office: "bg-indigo-100 text-indigo-700",
  supervisor: "bg-purple-100 text-purple-700",
  operator_office: "bg-teal-100 text-teal-700",
  operator_produksi: "bg-blue-100 text-blue-700",
};

const ROLE_LABEL = ROLE_LABEL_MAP;

export default function TimProduksiPage() {
  const { member: currentMember } = useSession();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [filterRole, setFilterRole] = useState("Semua");
  const [filterStatus, setFilterStatus] = useState("Semua");
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showAddOwner, setShowAddOwner] = useState(false);
  const [showAddDeveloper, setShowAddDeveloper] = useState(false);
  const [editMember, setEditMember] = useState(null);
  const [qrMember, setQrMember] = useState(null);
  const [showPassIds, setShowPassIds] = useState({});
  const [accessMember, setAccessMember] = useState(null);

  const { data: members = [], isLoading } = useQuery({
    queryKey: ["team-members"],
    queryFn: () => base44.entities.TeamMember.list("-join_date"),
  });

  const canAdd = canManageTeam(currentMember);
  const canEdit = canManageTeam(currentMember);
  // Owner bisa tambah owner DAN developer; Developer bisa tambah developer DAN owner
  const canAddOwner = ["owner", "developer"].includes(currentMember?.role);
  const canAddDeveloper = ["developer", "owner"].includes(currentMember?.role);

  const canDelete = (target) => {
    // Admin tidak bisa hapus owner/developer
    if (currentMember?.role === "admin" && ["owner", "developer"].includes(target.role)) return false;
    return canManageTeam(currentMember) && target.id !== currentMember?.id;
  };

  // Password & Employee ID: hanya developer/owner/admin bisa lihat milik orang lain
  const canViewPass = (target) => {
    if (target.id === currentMember?.id) return true;
    return ["developer", "owner", "admin"].includes(currentMember?.role);
  };

  // Developer hanya bisa dilihat namanya oleh owner & admin ke atas
  const isDeveloperHidden = (target) =>
    target.role === "developer" && !canViewDeveloper(currentMember);

  // QR: developer/owner/admin bisa lihat semua, selain itu hanya diri sendiri
  const canViewQR = (target) => {
    if (["developer", "owner", "admin"].includes(currentMember?.role)) return true;
    return currentMember?.id === target.id;
  };

  const filtered = members
    .filter((m) => {
      const q = search.toLowerCase();
      const matchSearch = !q || m.full_name?.toLowerCase().includes(q) || m.email?.toLowerCase().includes(q) || m.employee_id?.toLowerCase().includes(q) || m.phone?.toLowerCase().includes(q) || m.position?.toLowerCase().includes(q);
      const matchRole = filterRole === "Semua" || m.role === filterRole;
      const matchStatus = filterStatus === "Semua" || m.status === filterStatus;
      return matchSearch && matchRole && matchStatus;
    })
    .sort((a, b) => (ROLE_ORDER.indexOf(a.role) - ROLE_ORDER.indexOf(b.role)) || (a.full_name || "").localeCompare(b.full_name || ""));

  const handleDelete = async (id) => {
    if (!confirm("Hapus anggota tim ini?")) return;
    await base44.entities.TeamMember.delete(id);
    queryClient.invalidateQueries({ queryKey: ["team-members"] });
  };

  const togglePass = (id) => setShowPassIds((p) => ({ ...p, [id]: !p[id] }));

  const getPageAccessSummary = (member) => {
    const pa = member.page_access || {};
    const keys = Object.keys(pa).filter(k => pa[k] !== "none");
    if (keys.length === 0) return null;
    const editCount = keys.filter(k => pa[k] === "edit").length;
    const viewCount = keys.filter(k => pa[k] === "view").length;
    const parts = [];
    if (editCount > 0) parts.push(`${editCount} edit`);
    if (viewCount > 0) parts.push(`${viewCount} lihat`);
    return parts.join(", ");
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold">Tim Produksi</h1>
          <p className="text-muted-foreground text-sm mt-0.5">Kelola anggota tim produksi</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {/* Owner hanya bisa tambah Owner */}
          {canAddOwner && (
            <Button variant="outline" onClick={() => setShowAddOwner(true)} className="gap-2 border-yellow-300 text-yellow-700 hover:bg-yellow-50">
              <ShieldCheck className="w-4 h-4" /> Tambah Owner
            </Button>
          )}
          {/* Developer hanya bisa tambah Developer */}
          {canAddDeveloper && (
            <Button variant="outline" onClick={() => setShowAddDeveloper(true)} className="gap-2 border-gray-400 text-gray-800 hover:bg-gray-50">
              <ShieldCheck className="w-4 h-4" /> Tambah Developer
            </Button>
          )}
          {canAdd && (
            <Button onClick={() => setShowAddDialog(true)} className="gap-2">
              <Plus className="w-4 h-4" /> Tambah Anggota
            </Button>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="flex gap-3 flex-wrap">
        {[
          { label: "Total", value: members.length, color: "text-foreground" },
          { label: "Aktif", value: members.filter((m) => m.status === "aktif").length, color: "text-green-600" },
          { label: "Nonaktif", value: members.filter((m) => m.status === "nonaktif").length, color: "text-muted-foreground" },
          { label: "Owner", value: members.filter((m) => m.role === "owner").length, color: "text-yellow-700" },
          { label: "Developer", value: members.filter((m) => m.role === "developer").length, color: "text-gray-800" },
          { label: "Admin", value: members.filter((m) => m.role === "admin").length, color: "text-red-600" },
          { label: "Supervisor", value: members.filter((m) => ["supervisor", "supervisor_office"].includes(m.role)).length, color: "text-purple-600" },
          { label: "Operator", value: members.filter((m) => ["operator_office", "operator_produksi"].includes(m.role)).length, color: "text-teal-600" },
        ].map((s) => (
          <div key={s.label} className="bg-card border border-border rounded-xl px-4 py-2 text-center min-w-[70px]">
            <p className={`text-xl font-bold ${s.color}`}>{s.value}</p>
            <p className="text-xs text-muted-foreground">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Filter */}
      <div className="flex flex-wrap gap-2 items-center">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <Input placeholder="Cari nama, email, ID..." className="pl-8 h-8 w-48" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <Select value={filterRole} onValueChange={setFilterRole}>
          <SelectTrigger className="h-8 w-44"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="Semua">Semua Role</SelectItem>
            <SelectItem value="owner">Owner</SelectItem>
            <SelectItem value="developer">Developer</SelectItem>
            <SelectItem value="admin">Admin</SelectItem>
            <SelectItem value="supervisor_office">Spv. Office</SelectItem>
            <SelectItem value="supervisor">Spv. Produksi</SelectItem>
            <SelectItem value="operator_office">Op. Office</SelectItem>
            <SelectItem value="operator_produksi">Op. Produksi</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="h-8 w-28"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="Semua">Semua Status</SelectItem>
            <SelectItem value="aktif">Aktif</SelectItem>
            <SelectItem value="nonaktif">Nonaktif</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* List */}
      {isLoading ? (
        <div className="text-center py-12 text-muted-foreground text-sm">Memuat data...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <Users className="w-10 h-10 mx-auto mb-3 opacity-20" />
          <p className="text-sm">Tidak ada anggota ditemukan.</p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {filtered.map((m) => {
            const accessSummary = getPageAccessSummary(m);
            return (
              <Card key={m.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    {/* Avatar */}
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 text-sm font-bold
                      ${m.role === "owner" ? "bg-yellow-100 text-yellow-700" :
                        m.role === "developer" ? "bg-gray-900 text-white" :
                        m.role === "admin" ? "bg-red-100 text-red-700" :
                        m.role === "supervisor_office" || m.role === "supervisor" ? "bg-purple-100 text-purple-700" :
                        "bg-primary/10 text-primary"}`}>
                      {isDeveloperHidden(m) ? "?" : m.full_name?.charAt(0)?.toUpperCase()}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="font-semibold text-sm leading-tight">
                            {isDeveloperHidden(m) ? <span className="italic text-muted-foreground">— Tersembunyi —</span> : m.full_name}
                          </p>
                          <p className="text-xs text-muted-foreground">{isDeveloperHidden(m) ? "" : (m.position || "—")}</p>
                        </div>
                        <div className="flex items-center gap-1 shrink-0 flex-wrap justify-end">
                          <Badge className={`text-[10px] px-1.5 ${ROLE_BADGE[m.role] || "bg-gray-100 text-gray-600"}`}>
                            {ROLE_LABEL[m.role] || m.role}
                          </Badge>
                          <Badge variant={m.status === "aktif" ? "default" : "secondary"} className="text-[10px] px-1.5">
                            {m.status}
                          </Badge>
                        </div>
                      </div>

                      <div className="mt-2 space-y-1 text-xs text-muted-foreground">
                        <div className="flex items-center gap-1.5">
                          <Mail className="w-3 h-3 shrink-0 text-muted-foreground/60" />
                          <span>{isDeveloperHidden(m) ? "••••••••••••" : m.email}</span>
                        </div>
                        {m.phone && !isDeveloperHidden(m) && (
                          <div className="flex items-center gap-1.5">
                            <Phone className="w-3 h-3 shrink-0 text-muted-foreground/60" />
                            <span>{m.phone}</span>
                          </div>
                        )}
                        {m.department && !isDeveloperHidden(m) && (
                          <div className="flex items-center gap-1.5">
                            <Factory className="w-3 h-3 shrink-0 text-muted-foreground/60" />
                            <span>{m.department}</span>
                          </div>
                        )}
                        {m.employee_id && !isDeveloperHidden(m) && ["developer", "owner", "admin"].includes(currentMember?.role) && (
                          <div className="flex items-center gap-1.5">
                            <CreditCard className="w-3 h-3 shrink-0 text-muted-foreground/60" />
                            <span className="font-mono text-foreground">{m.employee_id}</span>
                          </div>
                        )}
                        {canViewPass(m) && (
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <KeyRound className="w-3 h-3 shrink-0 text-muted-foreground/60" />
                            <span className="font-mono">{showPassIds[m.id] ? m.password : "••••••••"}</span>
                            <button onClick={() => togglePass(m.id)} className="text-muted-foreground hover:text-foreground ml-0.5">
                              {showPassIds[m.id] ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                            </button>
                          </div>
                        )}
                        {accessSummary && !isDeveloperHidden(m) && (
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <LayoutGrid className="w-3 h-3 shrink-0 text-muted-foreground/60" />
                            <span className="text-[11px] text-blue-600">{accessSummary}</span>
                          </div>
                        )}
                      </div>

                      {/* Actions */}
                      <div className="flex gap-1 mt-3 -mb-1 flex-wrap">
                        {canViewQR(m) && m.employee_id && !isDeveloperHidden(m) && (
                          <Button variant="outline" size="sm" className="h-7 gap-1 text-xs" onClick={() => setQrMember(m)}>
                            <QrCode className="w-3 h-3" /> QR
                          </Button>
                        )}
                        {/* Edit hanya untuk developer, owner, admin */}
                        {["developer", "owner", "admin"].includes(currentMember?.role) && canEdit && !["owner", "developer"].includes(m.role) && (
                          <Button variant="outline" size="sm" className="h-7 gap-1 text-xs" onClick={() => setEditMember(m)}>
                            <Pencil className="w-3 h-3" /> Edit
                          </Button>
                        )}
                        {/* Owner & Developer bisa saling edit satu sama lain */}
                        {["owner", "developer"].includes(m.role) && ["owner", "developer"].includes(currentMember?.role) && m.id !== currentMember?.id && (
                          <Button variant="outline" size="sm" className="h-7 gap-1 text-xs" onClick={() => setEditMember(m)}>
                            <Pencil className="w-3 h-3" /> Edit
                          </Button>
                        )}
                        {/* Akses halaman - hanya untuk admin ke atas & bukan owner/developer */}
                        {canEdit && !["owner", "developer"].includes(m.role) && !isDeveloperHidden(m) && (
                          <Button variant="outline" size="sm" className="h-7 gap-1 text-xs text-blue-600 border-blue-200 hover:bg-blue-50" onClick={() => setAccessMember(m)}>
                            <LayoutGrid className="w-3 h-3" /> Akses
                          </Button>
                        )}
                        {canDelete(m) && (
                          <Button variant="ghost" size="sm" className="h-7 gap-1 text-xs text-destructive/70 hover:text-destructive" onClick={() => handleDelete(m.id)}>
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Dialog tambah anggota biasa */}
      <AddMemberDialog
        open={showAddDialog}
        onClose={() => setShowAddDialog(false)}
        onSaved={() => queryClient.invalidateQueries({ queryKey: ["team-members"] })}
      />

      {/* Dialog tambah Owner (hanya bisa dibuka oleh Owner) */}
      <AddPrivilegedMemberDialog
        open={showAddOwner}
        roleToAdd="owner"
        onClose={() => setShowAddOwner(false)}
        onSaved={() => queryClient.invalidateQueries({ queryKey: ["team-members"] })}
      />

      {/* Dialog tambah Developer (hanya bisa dibuka oleh Developer) */}
      <AddPrivilegedMemberDialog
        open={showAddDeveloper}
        roleToAdd="developer"
        onClose={() => setShowAddDeveloper(false)}
        onSaved={() => queryClient.invalidateQueries({ queryKey: ["team-members"] })}
      />

      <EditMemberDialog
        open={!!editMember}
        member={editMember}
        onClose={() => setEditMember(null)}
        onSaved={() => { queryClient.invalidateQueries({ queryKey: ["team-members"] }); setEditMember(null); }}
      />

      <EmployeeQRCard
        open={!!qrMember}
        member={qrMember}
        onClose={() => setQrMember(null)}
      />

      {/* Dialog akses halaman */}
      <PageAccessDialog
        open={!!accessMember}
        member={accessMember}
        onClose={() => setAccessMember(null)}
        onSaved={() => {
          queryClient.invalidateQueries({ queryKey: ["team-members"] });
          setAccessMember(null);
        }}
      />
    </div>
  );
}