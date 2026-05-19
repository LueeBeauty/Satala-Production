// Simple session management untuk Tim Produksi
const SESSION_KEY = "produksi_team_session";

export const setSession = (member) => {
  try {
    localStorage.setItem(SESSION_KEY, JSON.stringify(member));
  } catch {}
};

export const getSession = () => {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

export const clearSession = () => {
  try {
    localStorage.removeItem(SESSION_KEY);
  } catch {}
};

export const isLoggedIn = () => !!getSession();

// Hierarchy: developer(6) > owner(5) > admin(4) > supervisor_office(3.5) > supervisor(3) > operator_office(2) > operator_produksi(1)
const ROLE_LEVEL = {
  developer: 6,
  owner: 5,
  admin: 4,
  supervisor_office: 3,
  supervisor: 3,
  operator_office: 2,
  operator_produksi: 1,
};

// Urutan tampilan di Tim Produksi (organigram)
// owner → developer → admin → spv office → spv produksi → op. office → op. produksi
export const ROLE_ORDER = [
  "owner",
  "developer",
  "admin",
  "supervisor_office",
  "supervisor",
  "operator_office",
  "operator_produksi",
];

export const hasRole = (member, minRole) =>
  (ROLE_LEVEL[member?.role] || 0) >= (ROLE_LEVEL[minRole] || 0);

// Developer hanya bisa dilihat namanya oleh owner & admin ke atas
export const canViewDeveloper = (currentMember) =>
  ["developer", "owner", "admin"].includes(currentMember?.role);

export const canViewSensitiveData = (currentMember, targetMember) => {
  if (["developer", "owner", "admin"].includes(currentMember?.role)) return true;
  if (["supervisor", "supervisor_office"].includes(currentMember?.role) &&
      ["operator_office", "operator_produksi"].includes(targetMember?.role)) return true;
  return currentMember?.id === targetMember?.id;
};

// ── RBAC Policies ────────────────────────────────────────────────

/**
 * Dapatkan tingkat akses member untuk halaman tertentu.
 * Mengutamakan member.page_access, fallback ke logika role lama.
 */
export const getPageAccess = (member, pageKey) => {
  if (!member) return "none";
  
  // 1. Jika ada pengaturan page_access spesifik, prioritaskan ini
  if (member.page_access && member.page_access[pageKey] !== undefined) {
    return member.page_access[pageKey];
  }

  // 2. Fallback logika role bawaan (Default)
  const role = member.role;
  const isDeveloperOwner = ["developer", "owner"].includes(role);
  const isAdminKeAtas = ["developer", "owner", "admin"].includes(role);
  const isSpvOfficeKeAtas = ["developer", "owner", "admin", "supervisor_office"].includes(role);
  const isOpProduksi = role === "operator_produksi";

  switch (pageKey) {
    case "dashboard":
    case "produksi":
      return isSpvOfficeKeAtas ? "edit" : "view";
    
    case "kalkulator_hpp":
      if (isOpProduksi) return "none";
      return isSpvOfficeKeAtas ? "edit" : "view";

    case "sample_racikan":
      if (["developer", "owner", "supervisor_produksi"].includes(role)) return "edit";
      return "view";

    case "riwayat_hpp":
      if (isOpProduksi) return "none";
      return isSpvOfficeKeAtas ? "edit" : "view";

    case "stok_inventori":
      if (isOpProduksi) return "none";
      return "edit";
      
    case "delivery":
    case "selesai":
    case "return":
      return isSpvOfficeKeAtas ? "edit" : "view";

    case "laporan":
      return isAdminKeAtas ? "edit" : "view";

    case "manajemen_tim":
      return isAdminKeAtas ? "edit" : "view";

    case "tugas_saya":
      return "edit";

    case "pengaturan":
      return isDeveloperOwner ? "edit" : (isAdminKeAtas ? "view" : "none");

    default:
      return "view";
  }
};

/** Bisa lihat QR milik orang lain? developer/owner/admin = semua, lainnya = hanya diri sendiri */
export const canViewOtherQR = (currentMember) =>
  ["developer", "owner", "admin"].includes(currentMember?.role);

/** Bisa menambah/edit anggota tim? Menggunakan getPageAccess */
export const canManageTeam = (currentMember) =>
  getPageAccess(currentMember, "manajemen_tim") === "edit";

/** Bisa edit Pengaturan Perusahaan? Menggunakan getPageAccess */
export const canEditCompanySettings = (currentMember) =>
  getPageAccess(currentMember, "pengaturan") === "edit";

/** Bisa edit Riwayat HPP (Input Bayar, Edit record)? Menggunakan getPageAccess */
export const canEditRiwayatHPP = (currentMember) =>
  getPageAccess(currentMember, "riwayat_hpp") === "edit";

/** Bisa akses laporan? Menggunakan getPageAccess */
export const canEditLaporan = (currentMember) =>
  getPageAccess(currentMember, "laporan") === "edit";

/** Bisa kelola pengiriman (barang masuk & keluar)? Menggunakan getPageAccess */
export const canManageDelivery = (currentMember) =>
  getPageAccess(currentMember, "delivery") === "edit";

/** Bisa kelola orderan selesai (Shipped)? Menggunakan getPageAccess */
export const canManageSelesai = (currentMember) =>
  getPageAccess(currentMember, "selesai") === "edit";

/** Bisa kelola pengembalian (Return)? Menggunakan getPageAccess */
export const canManageReturn = (currentMember) =>
  getPageAccess(currentMember, "return") === "edit";

/** Bisa tambah Rekening Bank? Meminjam hak riwayat HPP */
export const canManageBank = (currentMember) =>
  getPageAccess(currentMember, "riwayat_hpp") === "edit";

/** Bisa tambah/edit PO (Production Order)? Menggunakan getPageAccess produksi */
export const canManagePO = (currentMember) =>
  getPageAccess(currentMember, "produksi") === "edit";

/** Bisa tambah/edit di halaman Log Produksi? Menggunakan getPageAccess dashboard */
export const canManageProduksi = (currentMember) =>
  getPageAccess(currentMember, "dashboard") === "edit";

/** Bisa lihat halaman Kalkulator HPP? Menggunakan getPageAccess */
export const canAccessHPP = (currentMember) =>
  getPageAccess(currentMember, "kalkulator_hpp") !== "none";

/** Bisa lihat halaman Riwayat HPP? Menggunakan getPageAccess */
export const canAccessRiwayatHPP = (currentMember) =>
  getPageAccess(currentMember, "riwayat_hpp") !== "none";

/** Bisa lihat halaman Stok & Inventori? Menggunakan getPageAccess */
export const canAccessStok = (currentMember) =>
  getPageAccess(currentMember, "stok_inventori") !== "none";

/** Role hanya bisa lihat (view-only), tidak bisa edit/tambah apapun. Dimap ke fungsi lama */
export const isViewOnly = (currentMember) =>
  ["operator_office", "operator_produksi"].includes(currentMember?.role);

/** Supervisor produksi hanya bisa lihat di produksi & PO (tidak bisa tambah/edit) */
export const isSupervisorProduksiOnly = (currentMember) =>
  currentMember?.role === "supervisor";

/** Role yang TIDAK boleh dipilih saat assign/tambah/edit anggota tim. */
export const UNASSIGNABLE_ROLES = ["developer", "owner"];

/** Label display untuk setiap role */
export const ROLE_LABEL = {
  owner: "Owner",
  developer: "Developer",
  admin: "Admin",
  supervisor_office: "Spv. Office",
  supervisor: "Spv. Produksi",
  operator_office: "Op. Office",
  operator_produksi: "Op. Produksi",
};