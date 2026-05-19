import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { useSession } from "@/lib/SessionContext";
import { getPageAccess } from "@/lib/AuthSession";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import ScanTaskDialog from "@/components/tugas/ScanTaskDialog";
import {
  ClipboardList, PlayCircle, CheckCircle2, Clock, AlertCircle,
  LogOut, User, Package, Pause
} from "lucide-react";
import { format } from "date-fns";
import { id as idLocale } from "date-fns/locale";

const ACTIVITY_LABELS = {
  preparation: "Persiapan", mixing: "Mixing", filling: "Filling",
  sealing: "Sealing", labeling: "Labeling", qc: "QC",
  packaging: "Packaging", other: "Lainnya",
};

const STATUS_CONFIG = {
  assigned: { label: "Belum Dimulai", cls: "bg-amber-100 text-amber-700", icon: AlertCircle },
  in_progress: { label: "Sedang Berjalan", cls: "bg-blue-100 text-blue-700", icon: PlayCircle },
  completed: { label: "Selesai", cls: "bg-green-100 text-green-700", icon: CheckCircle2 },
  on_hold: { label: "Ditunda", cls: "bg-gray-100 text-gray-600", icon: Pause },
  cancelled: { label: "Dibatalkan", cls: "bg-red-100 text-red-600", icon: AlertCircle },
};

const ACTIVITY_COLORS = {
  preparation: "bg-purple-100 text-purple-700",
  mixing: "bg-blue-100 text-blue-700",
  filling: "bg-cyan-100 text-cyan-700",
  sealing: "bg-indigo-100 text-indigo-700",
  labeling: "bg-pink-100 text-pink-700",
  qc: "bg-green-100 text-green-700",
  packaging: "bg-orange-100 text-orange-700",
  other: "bg-gray-100 text-gray-600",
};

export default function TugasPage() {
  const { member, logout } = useSession();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState("active");
  const [selectedTask, setSelectedTask] = useState(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const canEdit = getPageAccess(member, "tugas_saya") === "edit";

  const { data: tasks = [], isLoading } = useQuery({
    queryKey: ["production-tasks"],
    queryFn: () => base44.entities.ProductionTask.list("-created_date"),
  });

  // Redirect jika belum login
  if (!member) {
    navigate("/login-tim");
    return null;
  }

  const myTasks = tasks.filter(
    (t) =>
      t.pic_id === member?.id ||
      t.helper_ids?.some((h) => h.member_id === member?.id)
  );

  const activeTasks = myTasks.filter((t) =>
    ["assigned", "in_progress", "on_hold"].includes(t.status)
  );
  const doneTasks = myTasks.filter((t) =>
    ["completed", "cancelled"].includes(t.status)
  );

  const handleTaskClick = (task) => {
    if (task.status === "assigned" || task.status === "in_progress") {
      setSelectedTask(task);
      setDialogOpen(true);
    }
  };

  const handleUpdated = () => {
    queryClient.invalidateQueries({ queryKey: ["production-tasks"] });
    queryClient.invalidateQueries({ queryKey: ["catatan-harian"] });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {member.photo_url ? (
            <img src={member.photo_url} alt="" className="w-10 h-10 rounded-full object-cover border border-border" />
          ) : (
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
              <span className="text-sm font-bold text-primary">
                {member.full_name?.charAt(0)?.toUpperCase()}
              </span>
            </div>
          )}
          <div>
            <h1 className="text-xl font-bold leading-tight">Halo, {member.full_name?.split(" ")[0]}!</h1>
            <p className="text-xs text-muted-foreground capitalize">{member.position || member.role} · {member.department || "Tim Produksi"}</p>
          </div>
        </div>
        <Button variant="ghost" size="sm" onClick={logout} className="gap-1.5 text-muted-foreground">
          <LogOut className="w-4 h-4" />
          <span className="hidden sm:block">Keluar</span>
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Total Tugas", value: myTasks.length, icon: ClipboardList, cls: "text-foreground" },
          { label: "Aktif", value: activeTasks.length, icon: PlayCircle, cls: "text-blue-600" },
          { label: "Selesai", value: doneTasks.length, icon: CheckCircle2, cls: "text-green-600" },
        ].map((s) => {
          const Icon = s.icon;
          return (
            <Card key={s.label}>
              <CardContent className="p-3 flex items-center gap-2.5">
                <Icon className={`w-5 h-5 shrink-0 ${s.cls}`} />
                <div>
                  <p className="text-xl font-bold leading-none">{s.value}</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">{s.label}</p>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-muted rounded-xl">
        <button
          onClick={() => setActiveTab("active")}
          className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === "active" ? "bg-card shadow-sm text-foreground" : "text-muted-foreground"}`}
        >
          Tugas Aktif ({activeTasks.length})
        </button>
        <button
          onClick={() => setActiveTab("done")}
          className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === "done" ? "bg-card shadow-sm text-foreground" : "text-muted-foreground"}`}
        >
          Selesai ({doneTasks.length})
        </button>
      </div>

      {/* Task List */}
      {isLoading ? (
        <div className="text-center py-12 text-muted-foreground text-sm">Memuat tugas...</div>
      ) : (
        <div className="space-y-3">
          {(activeTab === "active" ? activeTasks : doneTasks).length === 0 ? (
            <div className="text-center py-16 text-muted-foreground">
              <ClipboardList className="w-10 h-10 mx-auto mb-3 opacity-20" />
              <p className="text-sm">{activeTab === "active" ? "Tidak ada tugas aktif." : "Belum ada tugas selesai."}</p>
            </div>
          ) : (
            (activeTab === "active" ? activeTasks : doneTasks).map((task) => {
              const statusCfg = STATUS_CONFIG[task.status] || STATUS_CONFIG.assigned;
              const StatusIcon = statusCfg.icon;
              const actCls = ACTIVITY_COLORS[task.activity_type] || ACTIVITY_COLORS.other;
              const isClickable = canEdit && ["assigned", "in_progress"].includes(task.status);

              return (
                <Card
                  key={task.id}
                  className={`transition-all ${isClickable ? "cursor-pointer hover:shadow-md hover:border-primary/30 active:scale-[0.99]" : ""}`}
                  onClick={() => handleTaskClick(task)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${actCls}`}>
                        <Package className="w-5 h-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <p className="font-semibold text-sm leading-tight">{task.task_name}</p>
                            <div className="flex flex-wrap items-center gap-1.5 mt-1">
                              <Badge className={`text-[10px] px-1.5 py-0 ${actCls}`}>
                                {ACTIVITY_LABELS[task.activity_type] || task.activity_type}
                              </Badge>
                              {task.po_number && (
                                <span className="text-[11px] text-muted-foreground">PO: {task.po_number}</span>
                              )}
                            </div>
                          </div>
                          <span className={`inline-flex items-center gap-1 text-[10px] px-2 py-1 rounded-full font-medium shrink-0 ${statusCfg.cls}`}>
                            <StatusIcon className="w-3 h-3" />
                            {statusCfg.label}
                          </span>
                        </div>

                        {/* Meta */}
                        <div className="flex flex-wrap items-center gap-3 mt-2 text-xs text-muted-foreground">
                          {task.target_quantity && (
                            <span>Target: <strong className="text-foreground">{task.target_quantity} {task.unit}</strong></span>
                          )}
                          {task.status === "completed" && task.completed_quantity && (
                            <span>Output: <strong className="text-green-700">{task.completed_quantity} {task.unit}</strong></span>
                          )}
                          {task.status === "completed" && task.duration_minutes && (
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {task.duration_minutes >= 60
                                ? `${Math.floor(task.duration_minutes / 60)}j ${task.duration_minutes % 60}m`
                                : `${task.duration_minutes} menit`}
                            </span>
                          )}
                          {task.status === "in_progress" && task.start_time && (
                            <span className="flex items-center gap-1 text-blue-600">
                              <Clock className="w-3 h-3" />
                              Mulai: {format(new Date(task.start_time), "HH:mm")}
                            </span>
                          )}
                        </div>

                        {isClickable && (
                          <p className="text-[11px] text-primary/70 mt-1.5 font-medium">
                            {task.status === "assigned" ? "Ketuk untuk mulai" : "Ketuk untuk selesaikan"}
                          </p>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>
      )}

      <ScanTaskDialog
        task={selectedTask}
        open={dialogOpen}
        onClose={() => { setDialogOpen(false); setSelectedTask(null); }}
        onUpdated={handleUpdated}
      />
    </div>
  );
}