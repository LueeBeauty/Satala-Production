import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Download, QrCode } from "lucide-react";

export default function EmployeeQRCard({ open, member, onClose }) {
  if (!member) return null;

  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(member.employee_id || member.id)}&bgcolor=ffffff&color=1a1a1a&margin=10`;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-xs">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <QrCode className="w-4 h-4" />
            QR Card Karyawan
          </DialogTitle>
        </DialogHeader>
        <div className="flex flex-col items-center gap-4 py-2">
          {/* Card Visual */}
          <div className="w-full bg-gradient-to-br from-primary to-primary/80 rounded-2xl p-5 text-primary-foreground text-center shadow-lg">
            <p className="text-xs opacity-70 mb-1 font-medium uppercase tracking-widest">Tim Produksi</p>
            <div className="bg-white rounded-xl p-2 mx-auto w-fit mb-3">
              <img src={qrUrl} alt="QR Code" className="w-44 h-44 block" />
            </div>
            {member.photo_url ? (
              <img src={member.photo_url} alt="" className="w-12 h-12 rounded-full object-cover border-2 border-white/30 mx-auto mb-2" />
            ) : (
              <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center mx-auto mb-2">
                <span className="text-xl font-bold">{member.full_name?.charAt(0)?.toUpperCase()}</span>
              </div>
            )}
            <p className="font-bold text-lg leading-tight">{member.full_name}</p>
            <p className="text-sm opacity-80">{member.position || member.role}</p>
            <p className="text-xs opacity-60 mt-1 font-mono">{member.employee_id || "No ID"}</p>
          </div>

          <p className="text-xs text-muted-foreground text-center">
            Scan QR ini untuk verifikasi tugas produksi
          </p>

          <Button variant="outline" size="sm" className="gap-2" onClick={onClose}>
            Tutup
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}