import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
import AppLayout from '@/components/layout/AppLayout';
import Dashboard from '@/pages/Dashboard';
import ProductionDetail from '@/pages/ProductionDetail';
// Inventory page merged into StokHPP
import QCLab from '@/pages/QCLab';
import DailyProduction from '@/pages/DailyProduction';
import Reporting from '@/pages/Reporting';
import LaporanPage from '@/pages/LaporanPage';
import ReturnPage from '@/pages/Return';
import Shipped from '@/pages/Shipped';
import DashboardBaru from '@/pages/DashboardBaru';
import StockPage from '@/pages/StockPage';
import BarangMasukPage from '@/pages/BarangMasukPage';
import ProduksiPage from '@/pages/ProduksiPage';
import KalkulatorHPP from '@/pages/KalkulatorHPP';
import StokHPP from '@/pages/StokHPP';
import StokItemDetail from '@/pages/StokItemDetail';
import RiwayatProduksiHPP from '@/pages/RiwayatProduksiHPP';
import ItemTambahanPage from '@/pages/ItemTambahanPage';
import SampleRacikanPage from '@/pages/SampleRacikanPage';
import PengaturanPerusahaan from '@/pages/PengaturanPerusahaan';
import DeliveryPage from '@/pages/DeliveryPage';
import TeamLogin from '@/pages/TeamLogin';
import TugasPage from '@/pages/TugasPage';
import TimProduksiPage from '@/pages/TimProduksiPage';
import ProfilSaya from '@/pages/ProfilSaya';
import { SessionProvider } from '@/lib/SessionContext';
// Add page imports here

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError, navigateToLogin } = useAuth();

  // Show loading spinner while checking app public settings or auth
  if (isLoadingPublicSettings || isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
      </div>
    );
  }

  // Handle authentication errors
  if (authError) {
    if (authError.type === 'user_not_registered') {
      return <UserNotRegisteredError />;
    } else if (authError.type === 'auth_required') {
      // Redirect to login automatically
      navigateToLogin();
      return null;
    }
  }

  // Render the main app
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route path="/" element={<Dashboard />} />

        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/dashboard-baru" element={<DashboardBaru />} />
        <Route path="/production/:id" element={<ProductionDetail />} />
        <Route path="/inventory" element={<StokHPP />} />
        <Route path="/stok-hpp" element={<StokHPP />} />
        <Route path="/stok-detail" element={<StokItemDetail />} />

        <Route path="/barang-masuk" element={<BarangMasukPage />} />
        <Route path="/stock" element={<StockPage />} />
        <Route path="/kalkulator-hpp" element={<KalkulatorHPP />} />
        <Route path="/riwayat-produksi" element={<RiwayatProduksiHPP />} />
        <Route path="/sample-racikan" element={<SampleRacikanPage />} />
        <Route path="/item-tambahan" element={<ItemTambahanPage />} />
        <Route path="/delivery" element={<DeliveryPage />} />
        <Route path="/shipped" element={<Shipped />} />
        <Route path="/return" element={<ReturnPage />} />
        <Route path="/laporan" element={<LaporanPage />} />
        <Route path="/reporting" element={<Reporting />} />

        <Route path="/pengaturan" element={<PengaturanPerusahaan />} />
        <Route path="/qc" element={<QCLab />} />
        <Route path="/daily" element={<DailyProduction />} />
        <Route path="/tim" element={<TimProduksiPage />} />
        <Route path="/tugas" element={<TugasPage />} />
        <Route path="/profil-saya" element={<ProfilSaya />} />
      </Route>
      {/* Login Tim — tanpa layout utama */}
      <Route path="/login-tim" element={<TeamLogin />} />
      <Route path="*" element={<PageNotFound />} />
    </Routes>
  );
};


function App() {

  return (
    <AuthProvider>
      <QueryClientProvider client={queryClientInstance}>
        <SessionProvider>
          <Router>
            <AuthenticatedApp />
          </Router>
          <Toaster />
        </SessionProvider>
      </QueryClientProvider>
    </AuthProvider>
  )
}

export default App