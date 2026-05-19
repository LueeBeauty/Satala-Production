import { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { useSession } from "@/lib/SessionContext";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, PlayCircle, QrCode, AlertCircle, Clock, Timer, ScanLine, Keyboard } from "lucide-react";
import { format } from "date-fns";
import { id as idLocale } from "date-fns/locale";

const ACTIVITY_LABELS = {
  racik: "Racik / Mixing", maserasi: "Maserasi",
  filling: "Filling", packing: "Packing",
  labeling: "Labeling", qc: "QC",
  preparation: "Persiapan", other: "Lainnya",
};

// Map: jenis tugas → status PO saat MULAI dan SELESAI
const TASK_PO_STATUS_MAP = {
  racik: { onStart: "diracik", onComplete: "maserasi" },
  maserasi: { onStart: "maserasi", onComplete: "menunggu_filling" },
  filling: { onStart: "filling", onComplete: "menunggu_packing" },
  packing: { onStart: "packing", onComplete: "siap_kirim" },
};

export default function ScanTaskDialog({ task, open, onClose, onUpdated }) {
  const { member } = useSession();
  const [step, setStep] = useState(1);
  const [inputId, setInputId] = useState("");
  const [scanMode, setScanMode] = useState("scan"); // "scan" | "manual"
  const [notes, setNotes] = useState("");
  const [completedQty, setCompletedQty] = useState("");
  const [maserasiJam, setMaserasiJam] = useState("");
  const [maserasiHari, setMaserasiHari] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const scanInputRef = useRef(null);
  const scanBufferRef = useRef("");
  const scanTimerRef = useRef(null);

  // Focus scan input saat dialog dibuka
  useEffect(() => {
    if (open && step === 1 && scanMode === "scan") {
      setTimeout(() => scanInputRef.current?.focus(), 100);
    }
  }, [open, step, scanMode]);

  // Handle scan QR: scanner biasanya kirim karakter cepat diakhiri Enter
  const handleScanInput = (e) => {
    const value = e.target.value;
    setInputId(value);

    // Jika scanner mengirim Enter (barcodes biasanya diakhiri \n)
    if (value.endsWith("\n") || value.endsWith("\r")) {
      const scanned = value.trim();
      setInputId(scanned);
      verifyId(scanned);
      return;
    }

    // Reset timer auto-verify (scanner mengirim chars sangat cepat, lalu berhenti)
    clearTimeout(scanTimerRef.current);
    scanTimerRef.current = setTimeout(() => {
      if (value.trim().length > 0) {
        // Auto verify setelah 300ms tidak ada input baru (tanda scan selesai)
      }
    }, 300);
  };

  if (!task) return null;

  const isStarting = task.status === "assigned";
  const isCompleting = task.status === "in_progress";
  const actionLabel = isStarting ? "Mulai Tugas" : "Selesaikan Tugas";
  const isRacik = task.activity_type === "racik";
  const poStatusMap = TASK_PO_STATUS_MAP[task.activity_type];

  const verifyId = (id = inputId) => {
    setError("");
    const expectedId = member?.employee_id;
    if (!expectedId) {
      setError("Akun Anda tidak memiliki Employee ID. Hubungi admin.");
      return;
    }
    if (id.trim() !== expectedId) {
      setError("Employee ID tidak cocok. Pastikan ID yang benar.");
      return;
    }
    setStep(2);
  };

  const handleVerify = () => verifyId();

  const handleConfirm = async () => {
    setLoading(true);
    setError("");
    const now = new Date().toISOString();
    const scanLog = {
      timestamp: now,
      employee_id: member.employee_id,
      name: member.full_name,
      action: isStarting ? "start" : "complete",
    };

    let updateData = {};
    if (isStarting) {
      updateData = {
        status: "in_progress",
        start_time: now,
        started_by_employee_id: member.employee_id,
        started_by_name: member.full_name,
        scan_logs: [...(task.scan_logs || []), scanLog],
        notes: notes || task.notes,
      };

      // Auto-update status PO saat tugas dimulai
      if (task.po_id && poStatusMap?.onStart) {
        await base44.entities.ProductionOrder.update(task.po_id, {
          status: poStatusMap.onStart,
        }).catch(() => {});
      }

    } else {
      const durationMinutes = task.start_time
        ? Math.round((Date.now() - new Date(task.start_time).getTime()) / 60000)
        : 0;

      updateData = {
        status: "completed",
        end_time: now,
        completed_by_employee_id: member.employee_id,
        completed_by_name: member.full_name,
        duration_minutes: durationMinutes,
        completed_quantity: completedQty ? Number(completedQty) : task.target_quantity,
        scan_logs: [...(task.scan_logs || []), scanLog],
        notes: notes || task.notes,
      };

      // Simpan data maserasi jika tugas racik
      if (isRacik) {
        updateData.maserasi_jam = maserasiJam ? Number(maserasiJam) : 0;
        updateData.maserasi_hari = maserasiHari ? Number(maserasiHari) : 0;

        // Update PO dengan info maserasi
        if (task.po_id) {
          await base44.entities.ProductionOrder.update(task.po_id, {
            status: "maserasi",
            maserasi_start: now,
            maserasi_durasi_jam: maserasiJam ? Number(maserasiJam) : 0,
            maserasi_durasi_hari: maserasiHari ? Number(maserasiHari) : 0,
          }).catch(() => {});
        }
      } else if (task.po_id && poStatusMap?.onComplete) {
        // Auto-update status PO saat tugas selesai
        await base44.entities.ProductionOrder.update(task.po_id, {
          status: poStatusMap.onComplete,
        }).catch(() => {});
      }

      // Auto-save ke CatatanHarian
      const today = now.split("T")[0];
      const aktivitasMap = {
        racik: "Mixing", maserasi: "Lainnya", filling: "Filling",
        packing: "Packing", labeling: "Labeling", qc: "QC",
        preparation: "Lainnya", other: "Lainnya",
      };
      await base44.entities.CatatanHarian.create({
        tanggal: today,
        shift: getShiftFromHour(new Date().getHours()),
        aktivitas: aktivitasMap[task.activity_type] || "Lainnya",
        operator: member.full_name,
        jumlah_output: completedQty ? Number(completedQty) : (task.target_quantity || 0),
        satuan_output: task.unit || "pcs",
        nama_produk: task.task_name,
        catatan: `[Tugas] ${task.task_name}${task.po_number ? ` · PO: ${task.po_number}` : ""}. Durasi: ${durationMinutes} menit.${notes ? " " + notes : ""}`,
        kendala: "",
        status: "selesai",
      });

      updateData.saved_to_catatan = true;
    }

    await base44.entities.ProductionTask.update(task.id, updateData);
    setLoading(false);
    onUpdated?.();
    onClose();
  };

  const getShiftFromHour = (hour) => {
    if (hour >= 6 && hour < 14) return "Pagi";
    if (hour >= 14 && hour < 22) return "Siang";
    return "Malam";
  };

  const handleClose = () => {
    setStep(1);
    setInputId("");
    setScanMode("scan");
    setNotes("");
    setCompletedQty("");
    setMaserasiJam("");
    setMaserasiHari("");
    setError("");
    clearTimeout(scanTimerRef.current);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {isStarting ? <PlayCircle className="w-5 h-5 text-blue-500" /> : <CheckCircle2 className="w-5 h-5 text-green-500" />}
            {actionLabel}
          </DialogTitle>
        </DialogHeader>

        {/* Task Info */}
        <div className="bg-muted/50 rounded-xl p-3 space-y-1">
          <p className="font-semibold text-sm">{task.task_name}</p>
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant="outline" className="text-xs">{ACTIVITY_LABELS[task.activity_type] || task.activity_type}</Badge>
            {task.po_number && <span className="text-xs text-muted-foreground">PO: {task.po_number}</span>}
            {task.po_brand && <span className="text-xs text-muted-foreground font-medium">{task.po_brand}</span>}
            {task.target_quantity > 0 && <span className="text-xs text-muted-foreground">Target: {task.target_quantity} {task.unit}</span>}
          </div>
          {isCompleting && task.start_time && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
              <Clock className="w-3 h-3" />
              Dimulai: {format(new Date(task.start_time), "HH:mm", { locale: idLocale })}
            </div>
          )}
          {/* Status PO yang akan berubah */}
          {poStatusMap && (
            <div className="mt-1.5 text-xs">
              {isStarting && (
                <span className="text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">
                  ⚡ Status PO akan → <strong>{poStatusMap.onStart.replace(/_/g, " ").toUpperCase()}</strong>
                </span>
              )}
              {isCompleting && (
                <span className="text-green-600 bg-green-50 px-2 py-0.5 rounded-full">
                  ✅ Status PO akan → <strong>{poStatusMap.onComplete.replace(/_/g, " ").toUpperCase()}</strong>
                </span>
              )}
            </div>
          )}
        </div>

        {step === 1 ? (
          <div className="space-y-4">
            {/* Mode Toggle */}
            <div className="flex gap-1 p-1 bg-muted rounded-xl">
              <button
                onClick={() => { setScanMode("scan"); setInputId(""); setError(""); setTimeout(() => scanInputRef.current?.focus(), 100); }}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-sm font-medium transition-all ${scanMode === "scan" ? "bg-card shadow-sm text-foreground" : "text-muted-foreground"}`}
              >
                <ScanLine className="w-4 h-4" /> Scan QR
              </button>
              <button
                onClick={() => { setScanMode("manual"); setInputId(""); setError(""); }}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-sm font-medium transition-all ${scanMode === "manual" ? "bg-card shadow-sm text-foreground" : "text-muted-foreground"}`}
              >
                <Keyboard className="w-4 h-4" /> Input Manual
              </button>
            </div>

            {scanMode === "scan" ? (
              <div className="space-y-3">
                {/* Area scan QR — tampilan visual */}
                <div className="relative border-2 border-dashed border-primary/40 rounded-2xl p-8 flex flex-col items-center gap-3 bg-primary/5">
                  <div className="relative">
                    <QrCode className="w-16 h-16 text-primary/40" />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <ScanLine className="w-10 h-10 text-primary animate-pulse" />
                    </div>
                  </div>
                  <p className="text-sm font-medium text-center text-primary">Arahkan scanner ke QR Card Anda</p>
                  <p className="text-xs text-muted-foreground text-center">Pastikan QR reader terhubung dan kursor ada di halaman ini</p>
                </div>
                {/* Input tersembunyi yang menangkap input dari scanner hardware */}
                <Input
                  ref={scanInputRef}
                  value={inputId}
                  onChange={handleScanInput}
                  onKeyDown={(e) => e.key === "Enter" && handleVerify()}
                  className="opacity-0 h-0 p-0 border-0 absolute pointer-events-none"
                  tabIndex={-1}
                  aria-hidden="true"
                />
                {inputId && (
                  <div className="text-center text-xs text-muted-foreground">
                    Terdeteksi: <span className="font-mono font-bold text-foreground">{inputId}</span>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-1.5">
                <Label className="text-xs font-medium flex items-center gap-1.5">
                  <QrCode className="w-3.5 h-3.5" /> Masukkan Employee ID
                </Label>
                <Input
                  placeholder="Ketik Employee ID Anda..."
                  value={inputId}
                  onChange={(e) => setInputId(e.target.value)}
                  className="font-mono tracking-wider text-center"
                  onKeyDown={(e) => e.key === "Enter" && handleVerify()}
                  autoFocus
                />
                <p className="text-xs text-muted-foreground">Ketik Employee ID sesuai yang terdaftar</p>
              </div>
            )}

            {error && (
              <div className="flex items-center gap-2 text-sm text-destructive bg-destructive/10 rounded-lg px-3 py-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                {error}
              </div>
            )}

            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={handleClose}>Batal</Button>
              <Button className="flex-1" onClick={handleVerify} disabled={!inputId.trim()}>Verifikasi</Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm text-green-600 bg-green-50 rounded-lg px-3 py-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              Identitas terverifikasi sebagai <strong>{member?.full_name}</strong>
            </div>

            {isCompleting && (
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Jumlah Output Selesai</Label>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    placeholder={task.target_quantity || "0"}
                    value={completedQty}
                    onChange={(e) => setCompletedQty(e.target.value)}
                    min="0"
                  />
                  <span className="text-sm text-muted-foreground shrink-0">{task.unit || "pcs"}</span>
                </div>
                <p className="text-xs text-muted-foreground">Kosongkan jika sama dengan target ({task.target_quantity} {task.unit})</p>
              </div>
            )}

            {/* Input Maserasi — hanya muncul saat menyelesaikan tugas Racik */}
            {isCompleting && isRacik && (
              <div className="border border-purple-200 bg-purple-50 rounded-xl p-3 space-y-2">
                <p className="text-xs font-semibold text-purple-700 flex items-center gap-1.5">
                  <Timer className="w-3.5 h-3.5" />
                  Rencana Durasi Maserasi
                </p>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-xs mb-1 block text-purple-700">Hari</Label>
                    <Input
                      type="number"
                      placeholder="0"
                      value={maserasiHari}
                      onChange={(e) => setMaserasiHari(e.target.value)}
                      min="0"
                      className="h-8 text-sm"
                    />
                  </div>
                  <div>
                    <Label className="text-xs mb-1 block text-purple-700">Jam</Label>
                    <Input
                      type="number"
                      placeholder="0"
                      value={maserasiJam}
                      onChange={(e) => setMaserasiJam(e.target.value)}
                      min="0"
                      max="23"
                      className="h-8 text-sm"
                    />
                  </div>
                </div>
                <p className="text-[11px] text-purple-600">Setelah racik selesai, PO akan masuk ke status Maserasi</p>
              </div>
            )}

            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Catatan (opsional)</Label>
              <Textarea
                placeholder="Catatan tambahan..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
              />
            </div>

            {isCompleting && (
              <div className="bg-blue-50 rounded-lg px-3 py-2 text-xs text-blue-700">
                ✓ Tugas selesai akan otomatis tersimpan ke <strong>Catatan Harian</strong>
              </div>
            )}

            {error && (
              <div className="flex items-center gap-2 text-sm text-destructive bg-destructive/10 rounded-lg px-3 py-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                {error}
              </div>
            )}

            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setStep(1)}>Kembali</Button>
              <Button className="flex-1" onClick={handleConfirm} disabled={loading}>
                {loading ? "Menyimpan..." : isStarting ? "Mulai Sekarang" : "Selesaikan Tugas"}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}