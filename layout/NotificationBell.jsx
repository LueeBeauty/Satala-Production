import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Bell, CalendarClock, Package, X, Droplets, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Link, useNavigate } from 'react-router-dom';

export default function NotificationBell() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  const STALE = 5 * 60 * 1000; // 5 menit

  const { data: orders = [] } = useQuery({
    queryKey: ['production-orders'],
    queryFn: () => base44.entities.ProductionOrder.list('order_number'),
    staleTime: STALE,
  });

  const { data: botolList = [] } = useQuery({ queryKey: ['botol'], queryFn: () => base44.entities.Botol.list(), staleTime: STALE });
  const { data: tutupList = [] } = useQuery({ queryKey: ['tutup'], queryFn: () => base44.entities.Tutup.list(), staleTime: STALE });
  const { data: sprayList = [] } = useQuery({ queryKey: ['spray'], queryFn: () => base44.entities.Spray.list(), staleTime: STALE });
  const { data: bahanList = [] } = useQuery({ queryKey: ['bahan-cair'], queryFn: () => base44.entities.BahanCair.list(), staleTime: STALE });

  const today = new Date();
  const in3Days = new Date(today); in3Days.setDate(today.getDate() + 3);
  const in7Days = new Date(today); in7Days.setDate(today.getDate() + 7);

  const deadlineAlerts = orders
    .filter(o => !o.is_shipped && o.status !== 'done' && o.deadline)
    .map(o => ({ ...o, deadlineDate: new Date(o.deadline) }))
    .filter(o => o.deadlineDate >= today && o.deadlineDate <= in7Days)
    .sort((a, b) => a.deadlineDate - b.deadlineDate);

  // Bahan cair stok < 1kg
  const lowBahan = bahanList.filter(i => i.stok != null && i.stok < 1);

  // Packaging stok < 100 pcs
  const packagingAll = [
    ...botolList.map(i => ({ ...i, _tipe: 'botol' })),
    ...tutupList.map(i => ({ ...i, _tipe: 'tutup' })),
    ...sprayList.map(i => ({ ...i, _tipe: 'spray' })),
  ];
  const lowPackaging = packagingAll.filter(i => i.stok != null && i.stok < 100);

  const total = deadlineAlerts.length + lowBahan.length + lowPackaging.length;

  const formatDate = (d) => d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
  const daysLeft = (d) => {
    const diff = Math.ceil((d - today) / (1000 * 60 * 60 * 24));
    if (diff === 0) return 'Hari ini!';
    if (diff === 1) return 'Besok!';
    return `${diff} hari lagi`;
  };

  const goToStok = (tab) => {
    setOpen(false);
    navigate(`/stok-hpp?tab=${tab}`);
  };

  return (
    <div className="relative">
      <Button variant="ghost" size="icon" onClick={() => setOpen(o => !o)} className="relative">
        <Bell className="w-5 h-5" />
        {total > 0 && (
          <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-destructive text-white text-[10px] flex items-center justify-center font-bold">
            {total > 9 ? '9+' : total}
          </span>
        )}
      </Button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-11 z-50 w-80 rounded-xl border bg-popover shadow-xl">
            <div className="flex items-center justify-between px-4 py-3 border-b">
              <h3 className="font-semibold text-sm">Notifikasi</h3>
              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setOpen(false)}>
                <X className="w-3.5 h-3.5" />
              </Button>
            </div>

            <div className="max-h-[460px] overflow-y-auto">
              {total === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Bell className="w-8 h-8 mx-auto mb-2 opacity-20" />
                  <p className="text-sm">Semua aman 👍</p>
                </div>
              ) : (
                <div className="p-2 space-y-1">

                  {/* Deadline Mendekat */}
                  {deadlineAlerts.length > 0 && (
                    <>
                      <p className="text-[10px] font-semibold text-muted-foreground uppercase px-2 pt-1 flex items-center gap-1">
                        <CalendarClock className="w-3 h-3" /> Deadline Mendekat ({deadlineAlerts.length})
                      </p>
                      {deadlineAlerts.map(o => (
                        <Link key={o.id} to={`/production/${o.id}`} onClick={() => setOpen(false)}>
                          <div className="flex items-start gap-3 rounded-lg px-3 py-2.5 hover:bg-accent transition-colors cursor-pointer">
                            <CalendarClock className={`w-4 h-4 mt-0.5 shrink-0 ${o.deadlineDate <= in3Days ? 'text-destructive' : 'text-yellow-600'}`} />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium truncate">{o.brand_name}</p>
                              <p className="text-xs text-muted-foreground">
                                {formatDate(o.deadlineDate)} ·{' '}
                                <span className={o.deadlineDate <= in3Days ? 'text-destructive font-medium' : 'text-yellow-600 font-medium'}>
                                  {daysLeft(o.deadlineDate)}
                                </span>
                              </p>
                            </div>
                          </div>
                        </Link>
                      ))}
                    </>
                  )}

                  {/* Bahan Cair Kritis < 1kg */}
                  {lowBahan.length > 0 && (
                    <>
                      <p className="text-[10px] font-semibold text-muted-foreground uppercase px-2 pt-2 flex items-center gap-1">
                        <Droplets className="w-3 h-3 text-blue-600" /> Bahan Cair Menipis ({lowBahan.length})
                      </p>
                      {lowBahan.map(i => (
                        <button
                          key={i.id}
                          type="button"
                          onClick={() => goToStok('bahan')}
                          className="w-full text-left flex items-start gap-3 rounded-lg px-3 py-2.5 hover:bg-accent transition-colors"
                        >
                          <Droplets className={`w-4 h-4 mt-0.5 shrink-0 ${i.stok <= 0 ? 'text-destructive' : 'text-blue-600'}`} />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{i.nama}</p>
                            <p className="text-xs text-muted-foreground">
                              {i.kategori} ·{' '}
                              <span className={i.stok <= 0 ? 'text-destructive font-medium' : 'text-blue-600 font-medium'}>
                                {i.stok <= 0 ? 'Habis!' : `Sisa ${i.stok} ${i.satuan || 'kg'} (batas 1kg)`}
                              </span>
                            </p>
                          </div>
                        </button>
                      ))}
                    </>
                  )}

                  {/* Packaging Kritis < 100 pcs */}
                  {lowPackaging.length > 0 && (
                    <>
                      <p className="text-[10px] font-semibold text-muted-foreground uppercase px-2 pt-2 flex items-center gap-1">
                        <Package className="w-3 h-3 text-orange-500" /> Packaging Menipis ({lowPackaging.length})
                      </p>
                      {lowPackaging.map(i => (
                        <button
                          key={i.id + i._tipe}
                          type="button"
                          onClick={() => goToStok('packaging')}
                          className="w-full text-left flex items-start gap-3 rounded-lg px-3 py-2.5 hover:bg-accent transition-colors"
                        >
                          <Package className={`w-4 h-4 mt-0.5 shrink-0 ${i.stok <= 0 ? 'text-destructive' : 'text-orange-500'}`} />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{i.nama}</p>
                            <p className="text-xs text-muted-foreground capitalize">
                              {i._tipe} ·{' '}
                              <span className={i.stok <= 0 ? 'text-destructive font-medium' : 'text-orange-500 font-medium'}>
                                {i.stok <= 0 ? 'Habis!' : `Sisa ${i.stok} pcs (batas 100 pcs)`}
                              </span>
                            </p>
                          </div>
                        </button>
                      ))}
                    </>
                  )}

                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}