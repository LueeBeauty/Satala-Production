import { useState } from "react";
import { useSession } from "@/lib/SessionContext";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { base44 } from "@/api/base44Client";
import {
  Mail, Eye, EyeOff, CreditCard, Phone, Building2,
  Briefcase, CalendarDays, LogOut, Camera, User } from
"lucide-react";

const ROLE_BADGE = {
  admin: "bg-red-100 text-red-700",
  supervisor: "bg-purple-100 text-purple-700",
  operator: "bg-blue-100 text-blue-700",
  user: "bg-gray-100 text-gray-600"
};

export default function ProfilSaya() {
  const { member, logout } = useSession();
  const navigate = useNavigate();
  const [showPass, setShowPass] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const { refreshMember } = useSession();

  if (!member) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4">
        <User className="w-12 h-12 text-muted-foreground opacity-30" />
        <p className="text-muted-foreground text-sm">Anda belum login sebagai anggota tim.</p>
        <Button onClick={() => navigate("/login-tim")}>Login Tim</Button>
      </div>);

  }

  const initials = member.full_name?.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();

  const handlePhotoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingPhoto(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    await base44.entities.TeamMember.update(member.id, { photo_url: file_url });
    await refreshMember();
    setUploadingPhoto(false);
  };

  const handleLogout = () => {
    logout();
    navigate("/login-tim");
  };

  const formatDate = (d) => {
    if (!d) return "—";
    return new Date(d).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" });
  };

  return (
    <div className="max-w-lg mx-auto space-y-4 pb-6">
      <div>
        <h1 className="text-2xl font-bold">Profil Saya</h1>
        <p className="text-muted-foreground text-sm">Informasi akun dan identitas karyawan</p>
      </div>

      {/* Avatar Card */}
      <div className="bg-card border border-border rounded-2xl p-5">
        <div className="flex items-center gap-4">
          <div className="relative shrink-0">
            {member.photo_url ?
            <img src={member.photo_url} alt="" className="w-16 h-16 rounded-2xl object-cover border-2 border-border" /> :

            <div className="w-16 h-16 rounded-2xl bg-accent/20 flex items-center justify-center border-2 border-border">
                <span className="text-xl font-bold text-accent">{initials}</span>
              </div>
            }
            <label className={`absolute -bottom-1 -right-1 w-6 h-6 bg-accent text-accent-foreground rounded-full flex items-center justify-center cursor-pointer shadow hover:opacity-90 ${uploadingPhoto ? 'opacity-50 pointer-events-none' : ''}`}>
              <Camera className="w-3 h-3" />
              <input type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} />
            </label>
          </div>
          <div>
            <p className="text-lg font-bold leading-tight">{member.full_name}</p>
            <p className="text-sm text-muted-foreground">{member.position || "—"}</p>
            <div className="flex gap-1.5 mt-1.5">
              <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full capitalize ${ROLE_BADGE[member.role] || ROLE_BADGE.user}`}>
                {member.role}
              </span>
              <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
              member.status === "aktif" ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600"}`
              }>
                {member.status === "aktif" ? "Aktif" : "Nonaktif"}
              </span>
            </div>
          </div>
        </div>
        

        
      </div>

      {/* Informasi Akun */}
      <div className="bg-card border border-border rounded-2xl overflow-hidden">
        <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground px-5 py-3 border-b border-border bg-muted/30">
          Informasi Akun
        </p>
        <div className="divide-y divide-border">
          <InfoRow icon={Mail} label="Email Login" value={member.email} />
          <div className="flex items-center gap-3 px-5 py-3.5">
            <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center shrink-0">
              <Eye className="w-4 h-4 text-muted-foreground" />
            </div>
            <div className="flex-1">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wide font-medium">Password</p>
              <p className="text-sm font-medium font-mono mt-0.5">{showPass ? member.password : "••••••••"}</p>
            </div>
            <button onClick={() => setShowPass(!showPass)} className="text-muted-foreground hover:text-foreground p-1.5 rounded-md hover:bg-muted transition-colors">
              {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          <InfoRow icon={CreditCard} label="Employee ID (QR)" value={member.employee_id || "—"} mono />
        </div>
      </div>

      {/* Data Karyawan */}
      <div className="bg-card border border-border rounded-2xl overflow-hidden">
        <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground px-5 py-3 border-b border-border bg-muted/30">
          Data Karyawan
        </p>
        <div className="divide-y divide-border">
          <InfoRow icon={Phone} label="Nomor Telepon" value={member.phone || "—"} />
          <InfoRow icon={Building2} label="Departemen" value={member.department || "—"} />
          <InfoRow icon={Briefcase} label="Jabatan" value={member.position || "—"} />
          <InfoRow icon={CalendarDays} label="Tanggal Bergabung" value={formatDate(member.join_date)} />
        </div>
        {member.notes &&
        <div className="px-5 py-3 border-t border-border">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wide font-medium mb-0.5">Catatan</p>
            <p className="text-sm text-accent">{member.notes}</p>
          </div>
        }
      </div>

      {/* Logout */}
      <Button
        variant="outline"
        className="w-full gap-2 border-destructive/30 text-destructive hover:bg-destructive/10"
        onClick={handleLogout}>
        
        <LogOut className="w-4 h-4" />
        Keluar dari Akun Tim
      </Button>
    </div>);

}

function InfoRow({ icon: Icon, label, value, mono }) {
  return (
    <div className="flex items-center gap-3 px-5 py-3.5">
      <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center shrink-0">
        <Icon className="w-4 h-4 text-muted-foreground" />
      </div>
      <div>
        <p className="text-[10px] text-muted-foreground uppercase tracking-wide font-medium">{label}</p>
        <p className={`text-sm font-medium mt-0.5 ${mono ? 'font-mono text-accent' : ''}`}>{value}</p>
      </div>
    </div>);

}