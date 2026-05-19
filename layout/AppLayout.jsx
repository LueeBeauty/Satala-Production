import React, { useState, useEffect } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import NotificationBell from '@/components/layout/NotificationBell';
import LiveClock from '@/components/layout/LiveClock';
import { useSession } from '@/lib/SessionContext';
import { getPageAccess } from '@/lib/AuthSession';
import {
  LayoutDashboard, BarChart2, Calculator,
  Archive, History, FlaskConical, Settings,
  Truck, ClipboardList, RotateCcw, CheckCircle2,
  Users, User, LogOut, Menu, X, ChevronRight, ChevronLeft,
  Package } from
'lucide-react';

// Bottom nav per role
const bottomNavByRole = {
  developer: [
  { path: '/', label: 'Produksi', icon: LayoutDashboard },
  { path: '/stok-hpp', label: 'Stock & Inv', icon: Archive },
  { path: '/tim', label: 'Manaj. Tim', icon: Users },
  { path: '/delivery', label: 'Delivery', icon: Truck },
  { path: '/profil-saya', label: 'Profil', icon: User }],

  owner: [
  { path: '/', label: 'Produksi', icon: LayoutDashboard },
  { path: '/stok-hpp', label: 'Stock & Inv', icon: Archive },
  { path: '/kalkulator-hpp', label: 'HPP', icon: Calculator },
  { path: '/riwayat-produksi', label: 'Riwayat HPP', icon: History },
  { path: '/profil-saya', label: 'Profil', icon: User }],

  admin: [
  { path: '/', label: 'Produksi', icon: LayoutDashboard },
  { path: '/tim', label: 'Manaj. Tim', icon: Users },
  { path: '/kalkulator-hpp', label: 'HPP', icon: Calculator },
  { path: '/riwayat-produksi', label: 'Riwayat HPP', icon: History },
  { path: '/profil-saya', label: 'Profil', icon: User }],

  supervisor_office: [
  { path: '/', label: 'Produksi', icon: LayoutDashboard },
  { path: '/stok-hpp', label: 'Stock & Inv', icon: Archive },
  { path: '/kalkulator-hpp', label: 'HPP', icon: Calculator },
  { path: '/riwayat-produksi', label: 'Riwayat HPP', icon: History },
  { path: '/profil-saya', label: 'Profil', icon: User }],

  supervisor_produksi: [
  { path: '/', label: 'Produksi', icon: LayoutDashboard },
  { path: '/stok-hpp', label: 'Stock & Inv', icon: Archive },
  { path: '/tugas', label: 'Tugas Saya', icon: ClipboardList },
  { path: '/sample-racikan', label: 'Sample', icon: FlaskConical },
  { path: '/profil-saya', label: 'Profil', icon: User }],

  operator_office: [
  { path: '/', label: 'Produksi', icon: LayoutDashboard },
  { path: '/stok-hpp', label: 'Stock & Inv', icon: Archive },
  { path: '/tugas', label: 'Tugas Saya', icon: ClipboardList },
  { path: '/riwayat-produksi', label: 'Riwayat HPP', icon: History },
  { path: '/profil-saya', label: 'Profil', icon: User }],

  operator_produksi: [
  { path: '/', label: 'Produksi', icon: LayoutDashboard },
  { path: '/stok-hpp', label: 'Stock & Inv', icon: Archive },
  { path: '/tugas', label: 'Tugas Saya', icon: ClipboardList },
  { path: '/delivery', label: 'Delivery', icon: Truck },
  { path: '/profil-saya', label: 'Profil', icon: User }]

};

// Fallback bottom nav jika role tidak dikenal
const defaultBottomNav = [
{ path: '/', label: 'Produksi', icon: LayoutDashboard },
{ path: '/kalkulator-hpp', label: 'HPP', icon: Calculator },
{ path: '/riwayat-produksi', label: 'Riwayat', icon: History },
{ path: '/tugas', label: 'Tugas', icon: ClipboardList },
{ path: '/profil-saya', label: 'Profil', icon: User }];


// Definisi nav dengan pageKey yang akan dicek terhadap getPageAccess
const navGroups = [
{
  group: 'Utama',
  items: [
  { path: '/', label: 'Produksi', icon: LayoutDashboard, pageKey: 'dashboard' },
  { path: '/kalkulator-hpp', label: 'Kalkulator HPP', icon: Calculator, pageKey: 'kalkulator_hpp' },
  { path: '/sample-racikan', label: 'Sample & Racikan', icon: FlaskConical, pageKey: 'sample_racikan' },
  { path: '/riwayat-produksi', label: 'Riwayat HPP', icon: History, pageKey: 'riwayat_hpp' }]
},
{
  group: 'Inventori & Stok',
  pageKey: 'stok_inventori',
  items: [
  { path: '/stok-hpp', label: 'Stok & Inventori', icon: Archive, pageKey: 'stok_inventori' }]
},
{
  group: 'Delivery',
  items: [
  { path: '/delivery', label: 'Delivery', icon: Truck, pageKey: 'delivery' },
  { path: '/shipped', label: 'Selesai', icon: CheckCircle2, pageKey: 'selesai' },
  { path: '/return', label: 'Return', icon: RotateCcw, pageKey: 'return' }]
},
{
  group: 'Laporan',
  items: [
  { path: '/laporan', label: 'Laporan', icon: BarChart2, pageKey: 'laporan' }]
},
{
  group: 'Tim Produksi',
  items: [
  { path: '/tim', label: 'Manajemen Tim', icon: Users, pageKey: 'manajemen_tim' },
  { path: '/tugas', label: 'Tugas Saya', icon: ClipboardList, pageKey: 'tugas_saya' }]
},
{
  group: 'Pengaturan',
  pageKey: 'pengaturan',
  items: [
  { path: '/pengaturan', label: 'Pengaturan Perusahaan', icon: Settings, pageKey: 'pengaturan' }]
}];

function SidebarContent({ onLinkClick, collapsed }) {
  const location = useLocation();
  const { member, logout } = useSession();
  const isActive = (path) =>
  path === '/' ? location.pathname === '/' : location.pathname.startsWith(path);

  // Filter nav berdasarkan page_access atau role member
  const visibleGroups = navGroups.
  map((group) => {
    return {
      ...group,
      items: group.items.filter((item) => {
        if (item.pageKey) return getPageAccess(member, item.pageKey) !== "none";
        return true;
      })
    };
  }).
  filter((group) => {
    if (group.pageKey) return getPageAccess(member, group.pageKey) !== "none" && group.items.length > 0;
    return group.items.length > 0;
  });

  return (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className={`border-b border-sidebar-border flex items-center bg-[hsl(var(--background))] ${collapsed ? 'px-2 py-5 justify-center' : 'px-5 py-5'}`}>
        <Link to="/" className="flex items-center gap-3" onClick={onLinkClick}>
          {collapsed ?
          <div className="w-8 h-8 rounded-full bg-accent flex items-center justify-center shrink-0 shadow-sm">
              <span className="text-accent-foreground text-xs font-bold tracking-tight">S</span>
            </div> :

          <div className="flex items-center gap-2">
              <img src="/logo.png" alt="Satala Dermatech" className="h-8 w-auto object-contain" />
              <div className="flex flex-col">
                <span className="text-base font-bold tracking-wide text-sidebar-foreground font-display whitespace-nowrap leading-tight">Satala</span>
                <span className="text-[10px] text-sidebar-foreground/50 tracking-widest uppercase whitespace-nowrap leading-tight mt-0.5">Dermatech Essential</span>
              </div>
            </div>
          }
        </Link>
      </div>

      {/* Member Profile mini */}
      {member &&
      <Link to="/profil-saya" onClick={onLinkClick}>
          <div className={`border-b border-sidebar-border hover:bg-sidebar-accent transition-colors bg-[hsl(var(--background))] ${collapsed ? 'flex justify-center py-2.5' : 'px-4 py-2.5'}`}>
            {collapsed ?
          <div className="w-7 h-7 rounded-full bg-accent/15 flex items-center justify-center">
                {member.photo_url ?
            <img src={member.photo_url} className="w-7 h-7 rounded-full object-cover" alt="" /> :
            <span className="text-xs font-bold text-accent">{member.full_name?.charAt(0)}</span>
            }
              </div> :

          <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-full bg-accent/15 flex items-center justify-center shrink-0">
                  {member.photo_url ?
              <img src={member.photo_url} className="w-7 h-7 rounded-full object-cover" alt="" /> :
              <span className="text-xs font-bold text-accent">{member.full_name?.charAt(0)}</span>
              }
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-sidebar-foreground truncate">{member.full_name}</p>
                  <p className="text-[10px] text-sidebar-foreground/40 capitalize">{member.role?.replace(/_/g, ' ')}</p>
                </div>
              </div>
          }
          </div>
        </Link>
      }

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-3 px-2 bg-[hsl(var(--background))]">
        {visibleGroups.map((group, gi) => {
          return (
            <div key={group.group} className={gi > 0 ? 'mt-3' : ''}>
              {!collapsed &&
              <p className="px-3 mb-1 text-[9px] font-bold uppercase tracking-widest text-sidebar-foreground/30 select-none">
                  {group.group}
                </p>
              }
              {group.items.map((item) => {
                const Icon = item.icon;
                const active = isActive(item.path);
                return (
                  <Link key={item.path} to={item.path} onClick={onLinkClick} title={collapsed ? item.label : undefined}>
                    <div className={`flex items-center gap-2.5 px-3 py-2 rounded-lg mb-0.5 transition-all ${
                    collapsed ? 'justify-center px-2' : ''} ${
                    active ?
                    'bg-accent/10 text-accent font-semibold border border-accent/20' :
                    'text-sidebar-foreground/60 hover:bg-sidebar-accent hover:text-sidebar-foreground border border-transparent'}`
                    }>
                      <Icon className="w-4 h-4 shrink-0" />
                      {!collapsed && <span className="text-[13px]">{item.label}</span>}
                    </div>
                  </Link>);

              })}
              {collapsed && <div className="border-b border-sidebar-border/20 my-2 mx-2" />}
            </div>);

        })}
      </nav>

      {/* Bottom: Profil & Logout */}
      <div className="border-t border-sidebar-border px-2 py-2 space-y-0.5 bg-[hsl(var(--background))]">
        <Link to="/profil-saya" onClick={onLinkClick} title={collapsed ? 'Profil Saya' : undefined}>
          <div className={`flex items-center gap-2.5 px-3 py-2 rounded-lg transition-colors ${collapsed ? 'justify-center px-2' : ''} ${
          location.pathname === '/profil-saya' ?
          'bg-accent text-accent-foreground font-semibold' :
          'text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground'}`
          }>
            <User className="w-4 h-4" />
            {!collapsed && <span className="text-sm">Profil Saya</span>}
          </div>
        </Link>
        {member &&
        <button
          onClick={() => {logout();onLinkClick?.();}}
          title={collapsed ? 'Keluar' : undefined}
          className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sidebar-foreground/60 hover:bg-destructive/10 hover:text-destructive transition-colors ${collapsed ? 'justify-center px-2' : ''}`}>
          
            <LogOut className="w-4 h-4" />
            {!collapsed && <span className="text-sm">Keluar</span>}
          </button>
        }
      </div>
    </div>);

}

export default function AppLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { member } = useSession();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  // Guard: wajib login via session tim
  useEffect(() => {
    if (!member) {
      navigate("/login-tim", { replace: true });
    }
  }, [member]);

  if (!member) return null;

  const isActive = (path) =>
  path === '/' ? location.pathname === '/' : location.pathname.startsWith(path);

  const sidebarWidth = sidebarCollapsed ? 'w-16' : 'w-56';
  const mainMargin = sidebarCollapsed ? 'md:ml-16' : 'md:ml-56';

  return (
    <div className="min-h-screen bg-background flex">
      {/* Desktop Sidebar */}
      <aside className={`hidden md:flex ${sidebarWidth} shrink-0 flex-col bg-sidebar-background border-r border-sidebar-border fixed inset-y-0 left-0 z-30 transition-all duration-300`}>
        <SidebarContent onLinkClick={() => {}} collapsed={sidebarCollapsed} />
        {/* Toggle collapse button */}
        <button
          onClick={() => setSidebarCollapsed((p) => !p)}
          className="absolute -right-3 top-16 w-6 h-6 rounded-full bg-sidebar-background border border-sidebar-border flex items-center justify-center shadow-sm hover:bg-sidebar-accent transition-colors z-10">
          
          {sidebarCollapsed ? <ChevronRight className="w-3 h-3 text-sidebar-foreground/60" /> : <ChevronLeft className="w-3 h-3 text-sidebar-foreground/60" />}
        </button>
      </aside>

      {/* Mobile Sidebar Overlay */}
      {sidebarOpen &&
      <>
          <div
          className="fixed inset-0 z-40 bg-black/50 md:hidden"
          onClick={() => setSidebarOpen(false)} />
        
          <aside className="fixed inset-y-0 left-0 z-50 w-64 bg-sidebar-background border-r border-sidebar-border md:hidden flex flex-col shadow-2xl">
            <div className="flex items-center justify-between px-4 py-3 border-b border-sidebar-border bg-[hsl(var(--background))]">
              <span className="font-display font-bold text-sidebar-foreground">Menu</span>
              <button onClick={() => setSidebarOpen(false)} className="p-1.5 rounded-md hover:bg-sidebar-accent">
                <X className="w-4 h-4 text-sidebar-foreground" />
              </button>
            </div>
            <div className="flex-1 overflow-hidden">
              <SidebarContent onLinkClick={() => setSidebarOpen(false)} collapsed={false} />
            </div>
          </aside>
        </>
      }

      {/* Main Content */}
      <div className={`flex-1 flex flex-col ${mainMargin} transition-all duration-300`}>
        {/* Mobile Header */}
        <header className="md:hidden sticky top-0 z-20 bg-background/90 backdrop-blur-xl border-b border-border/50">
          <div className="px-4 h-14 flex items-center justify-between gap-2">
            <button
              onClick={() => setSidebarOpen(true)}
              className="p-2 rounded-lg hover:bg-muted transition-colors">
              
              <Menu className="w-5 h-5" />
            </button>
            <Link to="/" className="flex items-center gap-2">
              <img src="/logo.png" alt="Satala Dermatech" className="h-6 w-auto object-contain" />
              <div className="flex flex-col">
                <span className="font-display font-bold text-sm tracking-wide leading-tight text-foreground">Satala</span>
                <span className="text-[8px] text-muted-foreground tracking-widest uppercase leading-tight">Dermatech Essential</span>
              </div>
            </Link>
            <div className="flex items-center gap-1">
              <LiveClock />
              <NotificationBell />
            </div>
          </div>
        </header>

        {/* Desktop top bar */}
        <header className="hidden md:flex sticky top-0 z-20 bg-background/90 backdrop-blur-xl border-b border-border/50">
          <div className="px-6 h-14 flex items-center justify-between gap-2 w-full">
            <div />
            <div className="flex items-center gap-2">
              <LiveClock />
              <NotificationBell />
            </div>
          </div>
        </header>

        <main className="flex-1 px-4 py-5 md:px-6 pb-24 md:pb-6">
          <Outlet />
        </main>
      </div>

      {/* Mobile Bottom Navigation */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 z-30 bg-background border-t border-border safe-area-inset-bottom">
        <div className="flex items-center">
          {(bottomNavByRole[member?.role] || defaultBottomNav).map((item) => {
            const Icon = item.icon;
            const active = isActive(item.path);
            return (
              <Link key={item.path} to={item.path} className="flex-1">
                <div className={`flex flex-col items-center gap-0.5 py-2.5 transition-colors ${
                active ? 'text-accent' : 'text-muted-foreground'}`
                }>
                  <Icon className={`w-5 h-5 ${active ? 'stroke-[2.5]' : ''}`} />
                  <span className={`text-[9px] font-medium ${active ? 'font-bold' : ''}`}>{item.label}</span>
                </div>
              </Link>);

          })}
        </div>
      </nav>
    </div>);

}