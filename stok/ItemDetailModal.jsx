import React, { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { X, Package, Users, AlertTriangle, Droplets } from 'lucide-react';

/**
 * Modal detail item (packaging / bahan cair)
 * Menampilkan info item + daftar brand PO yang menggunakan item ini
 */
export default function ItemDetailModal({ item, tipe, onClose }) {
  const { data: orders = [] } = useQuery({
    queryKey: ['production-orders'],
    queryFn: () => base44.entities.ProductionOrder.list('brand_name'),
  });
  const { data: racikanDb = [] } = useQuery({
    queryKey: ['racikan-database'],
    queryFn: () => base44.entities.RacikanDatabase.list('nama_brand'),
  });
  const { data: bahanDb = [] } = useQuery({
    queryKey: ['database-bahan'],
    queryFn: () => base44.entities.DatabaseBahan.list('nama_brand'),
  });

  // Cari brand PO yang pakai item ini (dari components di order)
  const brandUsage = useMemo(() => {
    if (!item) return [];
    const namaLower = (item.nama || '').toLowerCase().trim();

    const brandMap = {}; // brand -> count

    orders.forEach(order => {
      const brand = order.brand_name || 'Unknown';
      let used = false;

      // Cek di components
      (order.components || []).forEach(comp => {
        const compName = (comp.item_name || '').toLowerCase().trim();
        if (compName === namaLower || compName.includes(namaLower) || namaLower.includes(compName.split(' ')[0])) {
          used = true;
        }
      });

      // Cek di racikan (bahan cair)
      if (!used && (tipe === 'bahan' || tipe === 'bibit')) {
        (order.racikan_digunakan || []).forEach(r => {
          const rName = (r.nama_bahan || '').toLowerCase().trim();
          if (rName === namaLower || rName.includes(namaLower) || namaLower.includes(rName)) {
            used = true;
          }
        });
      }

      if (used) {
        brandMap[brand] = (brandMap[brand] || 0) + 1;
      }
    });

    return Object.entries(brandMap)
      .map(([brand, count]) => ({ brand, count }))
      .sort((a, b) => b.count - a.count);
  }, [orders, item, tipe]);

  // Cek di database racikan & database bahan
  const dbRacikanUsage = useMemo(() => {
    if (!item || (tipe !== 'bahan' && tipe !== 'bibit')) return [];
    const namaLower = (item.nama || '').toLowerCase().trim();
    const results = [];
    racikanDb.forEach(db => {
      const found = (db.racikan || []).some(r =>
        (r.nama_bahan || '').toLowerCase().includes(namaLower) || namaLower.includes((r.nama_bahan || '').toLowerCase())
      );
      if (found) results.push({ brand: db.nama_brand, varian: db.nama_varian, source: 'Racikan DB' });
    });
    bahanDb.forEach(db => {
      const found = (db.racikan || []).some(r =>
        (r.nama_bahan || '').toLowerCase().includes(namaLower) || namaLower.includes((r.nama_bahan || '').toLowerCase())
      );
      if (found) results.push({ brand: db.nama_brand, varian: db.nama_varian, source: 'Bahan DB' });
    });
    return results;
  }, [racikanDb, bahanDb, item, tipe]);

  // Cek di database bahan untuk packaging (botol/tutup/spray)
  const dbPackagingUsage = useMemo(() => {
    if (!item || tipe === 'bahan' || tipe === 'bibit') return [];
    const namaLower = (item.nama || '').toLowerCase().trim();
    const results = [];
    bahanDb.forEach(db => {
      const fields = ['botol_nama', 'tutup_nama', 'spray_nama'];
      const found = fields.some(f => {
        const val = (db[f] || '').toLowerCase();
        return val.includes(namaLower) || namaLower.includes(val.split(' ')[0]);
      });
      if (found) results.push({ brand: db.nama_brand, varian: db.nama_varian, source: 'Bahan DB' });
    });
    return results;
  }, [bahanDb, item, tipe]);

  const allDbUsage = [...dbRacikanUsage, ...dbPackagingUsage];

  const isLow = tipe === 'bahan'
    ? (item?.stok != null && item.stok < 1)
    : (item?.stok != null && item.stok < 100);

  const kategoriLabel = tipe === 'bahan' ? 'Bahan Cair' : tipe === 'botol' ? 'Botol' : tipe === 'tutup' ? 'Tutup' : tipe === 'spray' ? 'Spray' : tipe;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-card border border-border rounded-2xl shadow-2xl w-full max-w-md max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center gap-3 px-5 py-4 border-b border-border">
          <div className="p-2 bg-primary/10 rounded-lg">
            {tipe === 'bahan' ? <Droplets className="w-4 h-4 text-primary" /> : <Package className="w-4 h-4 text-primary" />}
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="font-semibold text-sm truncate">{item?.nama}</h2>
            <p className="text-xs text-muted-foreground">{kategoriLabel}{item?.kategori ? ` · ${item.kategori}` : ''}</p>
          </div>
          <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        </div>

        <div className="overflow-y-auto flex-1 p-4 space-y-4">
          {/* Info stok */}
          <div className={`rounded-xl p-3 border ${isLow ? 'bg-red-50 border-red-200' : 'bg-muted/40 border-border'}`}>
            <div className="flex items-center gap-2">
              {isLow && <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />}
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase">Stok Saat Ini</p>
                <p className={`text-lg font-bold ${isLow ? 'text-red-600' : 'text-foreground'}`}>
                  {item?.stok ?? '—'} {tipe === 'bahan' ? (item?.satuan || 'kg') : 'pcs'}
                </p>
                {isLow && (
                  <p className="text-xs text-red-600 font-medium mt-0.5">
                    ⚠️ Stok {tipe === 'bahan' ? 'di bawah 1kg' : 'di bawah 100 pcs'}
                  </p>
                )}
              </div>
            </div>
            {tipe === 'botol' && item?.ukuran_label_ml && (
              <p className="text-xs text-muted-foreground mt-1">Ukuran: {item.ukuran_label_ml}ml</p>
            )}
            {item?.vendor && <p className="text-xs text-muted-foreground mt-0.5">Vendor: {item.vendor}</p>}
            {item?.catatan_teknis && <p className="text-xs text-amber-700 mt-0.5 italic">📝 {item.catatan_teknis}</p>}
            {item?.catatan && <p className="text-xs text-muted-foreground mt-0.5 italic">{item.catatan}</p>}
          </div>

          {/* Brand PO yang pakai */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Users className="w-4 h-4 text-muted-foreground" />
              <p className="text-xs font-semibold text-muted-foreground uppercase">Dipakai di PO Brand</p>
              <Badge variant="secondary" className="text-xs ml-auto">{brandUsage.length} brand</Badge>
            </div>
            {brandUsage.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-3">Belum terdeteksi di PO aktif</p>
            ) : (
              <div className="space-y-1.5">
                {brandUsage.map(({ brand, count }) => (
                  <div key={brand} className="flex items-center justify-between px-3 py-2 bg-muted/40 rounded-lg">
                    <span className="text-sm font-medium">{brand}</span>
                    <Badge className="text-xs bg-primary/10 text-primary border-primary/20">{count}× PO</Badge>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Dari database racikan/bahan */}
          {allDbUsage.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-2">
                <p className="text-xs font-semibold text-muted-foreground uppercase">Terdaftar di Database</p>
                <Badge variant="secondary" className="text-xs ml-auto">{allDbUsage.length}</Badge>
              </div>
              <div className="space-y-1.5">
                {allDbUsage.map((u, i) => (
                  <div key={i} className="flex items-center justify-between px-3 py-2 bg-blue-50 border border-blue-100 rounded-lg">
                    <div>
                      <p className="text-xs font-semibold">{u.brand}</p>
                      <p className="text-xs text-muted-foreground">{u.varian}</p>
                    </div>
                    <Badge className="text-[10px] bg-blue-100 text-blue-700">{u.source}</Badge>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}