import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useSession } from "@/lib/SessionContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Eye, EyeOff, QrCode, KeyRound, AlertCircle, Camera, X } from "lucide-react";

// icon map for tabs used via variable
const ICONS = { KeyRound, QrCode };

export default function TeamLogin() {
  const navigate = useNavigate();
  const { login, member } = useSession();

  const [mode, setMode] = useState("password"); // "password" | "qr_id"
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [employeeId, setEmployeeId] = useState("");
  const [qrIdTab, setQrIdTab] = useState("id"); // "id" | "qr"
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [scanning, setScanning] = useState(false);
  const videoRef = useRef(null);
  const streamRef = useRef(null);

  useEffect(() => {
    if (member) navigate("/profil-saya");
  }, [member]);

  useEffect(() => {
    return () => stopCamera();
  }, []);

  const stopCamera = () => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setScanning(false);
  };

  const startCamera = async () => {
    setError("");
    setScanning(true);
    const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
    streamRef.current = stream;
    if (videoRef.current) {
      videoRef.current.srcObject = stream;
      videoRef.current.play();
    }
    const interval = setInterval(async () => {
      if (!videoRef.current) {clearInterval(interval);return;}
      const canvas = document.createElement("canvas");
      canvas.width = videoRef.current.videoWidth;
      canvas.height = videoRef.current.videoHeight;
      canvas.getContext("2d").drawImage(videoRef.current, 0, 0);
      canvas.toBlob(async (blob) => {
        if (!blob) return;
        if ("BarcodeDetector" in window) {
          const detector = new window.BarcodeDetector({ formats: ["qr_code"] });
          try {
            const bitmapSource = await createImageBitmap(blob);
            const codes = await detector.detect(bitmapSource);
            if (codes.length > 0) {
              clearInterval(interval);
              stopCamera();
              await handleQRResult(codes[0].rawValue);
            }
          } catch {}
        }
      }, "image/jpeg");
    }, 300);
  };

  const handleQRResult = async (rawValue) => {
    setLoading(true);
    setError("");
    const members = await base44.entities.TeamMember.list();
    const found = members.find(
      (m) => m.employee_id === rawValue.trim() && m.status === "aktif"
    );
    if (found) {
      login(found);
      navigate("/tugas");
    } else {
      setError("QR tidak dikenali atau akun tidak aktif.");
    }
    setLoading(false);
  };

  const getHomeByRole = (role) => {
    if (role === "operator" || role === "user") return "/tugas";
    return "/"; // admin & supervisor ke dashboard
  };

  const handlePasswordLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const members = await base44.entities.TeamMember.list();
      const found = members.find(
        (m) => m.email === email && m.password === password && m.status === "aktif"
      );
      if (found) {
        login(found);
        navigate(getHomeByRole(found.role));
      } else {
        setError("Email atau password salah, atau akun tidak aktif.");
      }
    } catch (err) {
      console.error(err);
      setError("Terjadi kesalahan saat menghubungi server. Pastikan pengaturan aplikasi benar.");
    }
    setLoading(false);
  };

  const handleEmployeeIdLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const members = await base44.entities.TeamMember.list();
      const found = members.find(
        (m) => m.employee_id === employeeId.trim() && m.status === "aktif"
      );
      if (found) {
        login(found);
        navigate(getHomeByRole(found.role));
      } else {
        setError("ID Karyawan tidak ditemukan atau akun tidak aktif.");
      }
    } catch (err) {
      console.error(err);
      setError("Terjadi kesalahan saat menghubungi server. Pastikan pengaturan aplikasi benar.");
    }
    setLoading(false);
  };

  const mainTabs = [
  { id: "password", label: "Email & Password", icon: "KeyRound" },
  { id: "qr_id", label: "Scan QR / ID", icon: "QrCode" }];


  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-secondary/30 to-background flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center mb-4">
            <img
              src="/logo.png"
              alt="Satala Dermatech Essential"
              className="h-20 w-auto object-contain" />
            
          </div>
          <h1 className="text-2xl font-bold tracking-tight">Login Tim Satala</h1>
          <p className="text-muted-foreground text-sm mt-1">Masuk untuk melihat orderan dan tugas harian anda</p>
        </div>

        {/* Mode Tabs */}
        <div className="flex gap-1 p-1 bg-muted rounded-xl mb-6">
          {mainTabs.map(({ id, label, icon }) => {
            const TabIcon = ICONS[icon] || KeyRound;
            return (
              <button
                key={id}
                onClick={() => {setMode(id);setError("");stopCamera();}}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all ${
                mode === id ? "bg-card shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"}`
                }>
                
                <TabIcon className="w-4 h-4" />
                <span>{label}</span>
              </button>);

          })}
        </div>

        {/* Card */}
        <div className="bg-card border border-border rounded-2xl shadow-xl p-6 space-y-5">
          {error &&
          <div className="flex items-center gap-2 text-sm text-destructive bg-destructive/10 rounded-lg px-3 py-2.5">
              <AlertCircle className="w-4 h-4 shrink-0" />
              {error}
            </div>
          }

          {/* ─── Mode: Email & Password ─── */}
          {mode === "password" &&
          <form onSubmit={handlePasswordLogin} className="space-y-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Email</Label>
                <Input
                type="email"
                placeholder="email@perusahaan.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required />
              
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Password</Label>
                <div className="relative">
                  <Input
                  type={showPass ? "text" : "password"}
                  placeholder="Password..."
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="pr-10" />
                
                  <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                  
                    {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Memverifikasi..." : "Masuk"}
              </Button>
            </form>
          }

          {/* ─── Mode: Scan QR / ID ─── */}
          {mode === "qr_id" &&
          <div className="space-y-4">
              {/* Sub-tabs: ID | QR */}
              <div className="flex gap-1 p-1 bg-muted rounded-lg">
                <button
                onClick={() => {setQrIdTab("id");setError("");stopCamera();}}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-md text-xs font-medium transition-all ${
                qrIdTab === "id" ? "bg-card shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"}`
                }>
                
                  <KeyRound className="w-3.5 h-3.5" />
                  Masukkan ID
                </button>
                <button
                onClick={() => {setQrIdTab("qr");setError("");}}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-md text-xs font-medium transition-all ${
                qrIdTab === "qr" ? "bg-card shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"}`
                }>
                
                  <Camera className="w-3.5 h-3.5" />
                  Scan QR
                </button>
              </div>

              {/* Input ID */}
              {qrIdTab === "id" &&
            <form onSubmit={handleEmployeeIdLogin} className="space-y-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium">ID Karyawan</Label>
                    <Input
                  placeholder="Contoh: EMP001"
                  value={employeeId}
                  onChange={(e) => setEmployeeId(e.target.value)}
                  required
                  className="text-center text-lg font-mono tracking-widest" />
                
                    <p className="text-xs text-muted-foreground text-center">
                      ID karyawan tertera di kartu QR Anda
                    </p>
                  </div>
                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading ? "Memverifikasi..." : "Masuk dengan ID"}
                  </Button>
                </form>
            }

              {/* Scan QR */}
              {qrIdTab === "qr" &&
            <div className="space-y-4">
                  {scanning ?
              <div className="space-y-3">
                      <div className="relative rounded-xl overflow-hidden bg-black aspect-square">
                        <video ref={videoRef} className="w-full h-full object-cover" muted playsInline />
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                          <div className="w-48 h-48 border-2 border-accent rounded-xl relative">
                            <div className="absolute top-0 left-0 w-6 h-6 border-t-4 border-l-4 border-accent rounded-tl-xl" />
                            <div className="absolute top-0 right-0 w-6 h-6 border-t-4 border-r-4 border-accent rounded-tr-xl" />
                            <div className="absolute bottom-0 left-0 w-6 h-6 border-b-4 border-l-4 border-accent rounded-bl-xl" />
                            <div className="absolute bottom-0 right-0 w-6 h-6 border-b-4 border-r-4 border-accent rounded-br-xl" />
                          </div>
                        </div>
                      </div>
                      <Button variant="outline" className="w-full gap-2" onClick={stopCamera}>
                        <X className="w-4 h-4" /> Stop Kamera
                      </Button>
                      <p className="text-xs text-center text-muted-foreground">
                        Arahkan kamera ke QR card karyawan
                      </p>
                    </div> :

              <div className="text-center space-y-4">
                      <div className="w-20 h-20 mx-auto bg-muted rounded-2xl flex items-center justify-center">
                        <Camera className="w-10 h-10 text-muted-foreground opacity-40" />
                      </div>
                      <div>
                        <p className="text-sm font-medium">Scan QR Karyawan</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          Gunakan kamera untuk scan kartu QR karyawan Anda
                        </p>
                      </div>
                      <Button className="w-full gap-2" onClick={startCamera} disabled={loading}>
                        <Camera className="w-4 h-4" /> Buka Kamera
                      </Button>
                      {!("BarcodeDetector" in window) &&
                <p className="text-xs text-amber-600 bg-amber-50 rounded-lg p-2">
                          Browser Anda mungkin tidak mendukung scan otomatis. Gunakan tab "Masukkan ID" sebagai alternatif.
                        </p>
                }
                    </div>
              }
                </div>
            }
            </div>
          }
        </div>

        <p className="text-center text-xs text-muted-foreground mt-6">
          Hubungi admin jika lupa password atau ID karyawan
        </p>
      </div>
    </div>);

}