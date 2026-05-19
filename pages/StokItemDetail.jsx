import React, { useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Link } from 'react-router-dom';
import { ArrowLeft, Edit2, Trash2, Package, Droplets, Users, Database, AlertTriangle, Tag, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { smartDisplayQty } from '@/lib/unitConverter';
import { useKurs } from '@/hooks/useKurs';
import LastUpdated from '@/components/ui/LastUpdated';
import PackagingForm from '@/components/stok/PackagingForm';
import StokBahanForm from '@/components/stok/StokBahanForm';
import ItemTambahanForm from '@/components/stok/ItemTambahanForm';
import { useState } from 'react';
import { toast } from 'sonner';

const fmt = (n) => n != null ? new Intl.NumberFormat('id-ID').format(Math.round(n)) : '—';

export default function StokItemDetail() {
  const urlParams = new URLSearchParams(window.location.search);
  const itemId = urlParams.get('id');
  const tipe = urlParams.get('tipe'); // botol, tutup, spray, bahan, item-tambahan
  const { kurs } = useKurs();
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);

  // Load data berdasarkan tipe
  const { data: botolList = [] } = useQuery({ queryKey: ['botol'], queryFn: () => base44.entities.Botol.list() });
  const { data: tutupList = [] } = useQuery({ queryKey: ['tutup'], queryFn: () => base44.entities.Tutup.list() });
  const { data: sprayList = [] } = useQuery({ queryKey: ['spray'], queryFn: () => base44.entities.Spray.list() });
  const { data: bahanList = [] } = useQuery({ queryKey: ['bahan-cair'], queryFn: () => base44.entities.BahanCair.list() });
  const { data: itemTambahanList = [] } = useQuery({ queryKey: ['item-tambahan'], queryFn: () => base44.entities.ItemTambahan.list() });
  const { data: orders = [] } = useQuery({ queryKey: ['production-orders'], queryFn: () => base44.entities.ProductionOrder.list('brand_name') });
  const { data: racikanDb = [] } = useQuery({ queryKey: ['racikan-database'], queryFn: () => base44.entities.RacikanDatabase.list('nama_brand') });
  const { data: bahanDb = [] } = useQuery({ queryKey: ['database-bahan'], queryFn: () => base44.entities.DatabaseBahan.list('nama_brand') });

  const delBotol = useMutation({ mutationFn: id => base44.entities.Botol.delete(id), onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['botol'] }); window.history.back(); } });
  const delTutup = useMutation({ mutationFn: id => base44.entities.Tutup.delete(id), onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['tutup'] }); window.history.back(); } });
  const delSpray = useMutation({ mutationFn: id => base44.entities.Spray.delete(id), onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['spray'] }); window.history.back(); } });
  const delBahan = useMutation({ mutationFn: id => base44.entities.BahanCair.delete(id), onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['bahan-cair'] }); window.history.back(); } });
  const delItem = useMutation({ mutationFn: id => base44.entities.ItemTambahan.delete(id), onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['item-tambahan'] }); window.history.back(); } });

  // Cari item
  const item = useMemo(() => {
    if (!itemId || !tipe) return null;
    if (tipe === 'botol') return botolList.find(i => i.id === itemId) || null;
    if (tipe === 'tutup') return tutupList.find(i => i.id === itemId) || null;
    if (tipe === 'spray') return sprayList.find(i => i.id === itemId) || null;
    if (tipe === 'bahan') return bahanList.find(i => i.id === itemId) || null;
    if (tipe === 'item-tambahan') return itemTambahanList.find(i => i.id === itemId) || null;
    return null;
  }, [itemId, tipe, botolList, tutupList, sprayList, bahanList, itemTambahanList]);

  // Brand usage (PO yang pakai)
  const brandUsage = useMemo(() => {
    if (!item) return [];
    const namaLower = (item.nama || '').toLowerCase().trim();
    const brandMap = {};
    orders.forEach(order => {
      const brand = order.brand_name || 'Unknown';
      let used = false;
      (order.components || []).forEach(comp => {
        const compName = (comp.item_name || '').toLowerCase().trim();
        if (compName === namaLower || compName.includes(namaLower) || namaLower.includes(compName.split(' ')[0])) used = true;
      });
      if (!used && (tipe === 'bahan')) {
        (order.racikan_digunakan || []).forEach(r => {
          const rName = (r.nama_bahan || '').toLowerCase().trim();
          if (rName === namaLower || rName.includes(namaLower) || namaLower.includes(rName)) used = true;
        });
      }
      if (used) brandMap[brand] = (brandMap[brand] || 0) + 1;
    });
    return Object.entries(brandMap).map(([brand, count]) => ({ brand, count })).sort((a, b) => b.count - a.count);
  }, [orders, item, tipe]);

  // Database usage
  const dbUsage = useMemo(() => {
    if (!item) return [];
    const namaLower = (item.nama || '').toLowerCase().trim();
    const results = [];
    if (tipe === 'bahan') {
      racikanDb.forEach(db => {
        const found = (db.racikan || []).some(r => (r.nama_bahan || '').toLowerCase().includes(namaLower) || namaLower.includes((r.nama_bahan || '').toLowerCase()));
        if (found) results.push({ brand: db.nama_brand, varian: db.nama_varian, source: 'Racikan DB' });
      });
      bahanDb.forEach(db => {
        const found = (db.racikan || []).some(r => (r.nama_bahan || '').toLowerCase().includes(namaLower) || namaLower.includes((r.nama_bahan || '').toLowerCase()));
        if (found) results.push({ brand: db.nama_brand, varian: db.nama_varian, source: 'Database Bahan' });
      });
    } else {
      bahanDb.forEach(db => {
        const fields = ['botol_nama', 'tutup_nama', 'spray_nama'];
        const found = fields.some(f => { const val = (db[f] || '').toLowerCase(); return val.includes(namaLower) || namaLower.includes(val.split(' ')[0]); });
        if (found) results.push({ brand: db.nama_brand, varian: db.nama_varian, source: 'Database Bahan' });
      });
    }
    return results;
  }, [racikanDb, bahanDb, item, tipe]);

  const handleDelete = () => {
    if (!item || !confirm(`Hapus ${item.nama}?`)) return;
    if (tipe === 'botol') delBotol.mutate(item.id);
    else if (tipe === 'tutup') delTutup.mutate(item.id);
    else if (tipe === 'spray') delSpray.mutate(item.id);
    else if (tipe === 'bahan') delBahan.mutate(item.id);
    else if (tipe === 'item-tambahan') delItem.mutate(item.id);
  };

  const handleSaved = () => {
    setShowForm(false);
    ['botol', 'tutup', 'spray', 'bahan-cair', 'item-tambahan'].forEach(k => queryClient.invalidateQueries({ queryKey: [k] }));
  };

  const isLoading = !itemId || !tipe || (
    (tipe === 'botol' && !botolList.length && !bahanList.length) ||
    false
  );

  if (!item && itemId) {
    return (
      <div className="text-center py-20">
        <p className="text-muted-foreground">Item tidak ditemukan</p>
        <Link to="/stok-hpp">
          <Button variant="outline" className="mt-4">Kembali ke Stok & Inventori</Button>
        </Link>
      </div>
    );
  }

  if (!item) return (
    <div className="flex items-center justify-center py-20">
      <div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin" />
    </div>
  );

  const isLow = tipe === 'bahan'
    ? (item.stok != null && item.stok < 0.5)
    : (item.stok != null && item.stok < 10);

  const tipeLabel = tipe === 'botol' ? 'Botol' : tipe === 'tutup' ? 'Tutup' : tipe === 'spray' ? 'Spray' : tipe === 'bahan' ? 'Bahan Cair' : 'Item Tambahan';
  const tipeIcon = tipe === 'bahan' ? <Droplets className="w-5 h-5" /> : tipe === 'item-tambahan' ? <Tag className="w-5 h-5" /> : <Package className="w-5 h-5" />;

  const backUrl = `/stok-hpp?tab=${tipe === 'bahan' ? 'bahan' : tipe === 'item-tambahan' ? 'item-tambahan' : 'packaging'}`;

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      {/* Back + Actions */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <Link to={backUrl}>
          <Button variant="ghost" size="sm" className="gap-2 text-muted-foreground">
            <ArrowLeft className="w-4 h-4" /> Stok & Inventori
          </Button>
        </Link>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setShowForm(true)}>
            <Edit2 className="w-3.5 h-3.5" /> Edit
          </Button>
          <Button variant="outline" size="sm" className="gap-1.5 text-destructive hover:text-destructive" onClick={handleDelete}>
            <Trash2 className="w-3.5 h-3.5" /> Hapus
          </Button>
        </div>
      </div>

      {/* Header Card */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-start gap-4">
            <div className={`p-3 rounded-xl shrink-0 ${tipe === 'bahan' ? 'bg-purple-100 text-purple-700' : tipe === 'item-tambahan' ? 'bg-pink-100 text-pink-700' : 'bg-primary/10 text-primary'}`}>
              {tipeIcon}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <Badge variant="outline" className="text-xs">{tipeLabel}</Badge>
                {item.kategori && <Badge variant="outline" className="text-xs">{item.kategori}</Badge>}
                {item.grade && <Badge className="text-xs bg-amber-100 text-amber-700">{item.grade}</Badge>}
                {tipe === 'botol' && item.ukuran_label_ml && <Badge variant="outline" className="text-xs">{item.ukuran_label_ml}ml</Badge>}
                {tipe === 'spray' && item.tipe && <Badge className="text-xs bg-green-100 text-green-700">{item.tipe}</Badge>}
              </div>
              <h1 className="font-display text-2xl font-bold">{item.nama}</h1>
              {item.vendor && <p className="text-sm text-muted-foreground mt-1">Vendor: <span className="text-foreground font-medium">{item.vendor}</span></p>}
              {item.catatan_teknis && <p className="text-xs text-amber-600 mt-1 italic flex items-center gap-1"><FileText className="w-3 h-3 shrink-0" />{item.catatan_teknis}</p>}
              {item.catatan && <p className="text-xs text-muted-foreground mt-1 italic">{item.catatan}</p>}
              <div className="mt-2"><LastUpdated date={item.updated_date || item.created_date} /></div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stok & Harga */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <Card className={isLow ? 'border-red-200 bg-red-50' : ''}>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              {isLow && <AlertTriangle className="w-4 h-4 text-red-600" />}
              <p className="text-xs font-semibold text-muted-foreground uppercase">Stok Saat Ini</p>
            </div>
            {tipe === 'bahan' ? (
              <p className={`text-2xl font-bold ${isLow ? 'text-red-600' : ''}`}>
                {(() => { const { display, unit } = smartDisplayQty(item.stok, item.satuan); return `${display} ${unit}`; })()}
              </p>
            ) : (
              <p className={`text-2xl font-bold ${isLow ? 'text-red-600' : ''}`}>{item.stok ?? '—'} pcs</p>
            )}
            {isLow && <p className="text-xs text-red-600 mt-0.5 flex items-center gap-1"><AlertTriangle className="w-3 h-3" />Stok menipis</p>}
          </CardContent>
        </Card>

        {(item.harga_rupiah || item.harga_dollar) && (
          <Card>
            <CardContent className="p-4">
              <p className="text-xs font-semibold text-muted-foreground uppercase mb-1">Harga</p>
              {item.harga_dollar ? (
                <>
                  <p className="text-lg font-bold">${item.harga_dollar}</p>
                  <p className="text-xs text-muted-foreground">≈ Rp {fmt(item.harga_dollar * kurs)}/{item.satuan || 'pcs'}</p>
                </>
              ) : (
                <p className="text-lg font-bold">Rp {fmt(item.harga_rupiah)}<span className="text-sm font-normal text-muted-foreground">/{item.satuan || 'pcs'}</span></p>
              )}
            </CardContent>
          </Card>
        )}

        {tipe === 'botol' && item.ukuran_aktual_ml && item.ukuran_aktual_ml !== item.ukuran_label_ml && (
          <Card>
            <CardContent className="p-4">
              <p className="text-xs font-semibold text-muted-foreground uppercase mb-1">Ukuran Aktual</p>
              <p className="text-xl font-bold">{item.ukuran_aktual_ml}ml</p>
              <p className="text-xs text-muted-foreground">Label: {item.ukuran_label_ml}ml</p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Brand PO yang pakai */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-muted-foreground" />
            <CardTitle className="text-base">Dipakai di PO Brand</CardTitle>
            <Badge variant="secondary" className="ml-auto">{brandUsage.length} brand</Badge>
          </div>
        </CardHeader>
        <CardContent>
          {brandUsage.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">Belum terdeteksi di PO aktif</p>
          ) : (
            <div className="space-y-2">
              {brandUsage.map(({ brand, count }) => (
                <div key={brand} className="flex items-center justify-between px-3 py-2.5 bg-muted/40 rounded-xl">
                  <span className="font-medium text-sm">{brand}</span>
                  <Badge className="bg-primary/10 text-primary border-primary/20">{count}× PO</Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Terdaftar di Database */}
      {dbUsage.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Database className="w-4 h-4 text-muted-foreground" />
              <CardTitle className="text-base">Terdaftar di Database</CardTitle>
              <Badge variant="secondary" className="ml-auto">{dbUsage.length}</Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {dbUsage.map((u, i) => (
                <div key={i} className="flex items-center justify-between px-3 py-2.5 bg-blue-50 border border-blue-100 rounded-xl">
                  <div>
                    <p className="text-sm font-semibold">{u.brand}</p>
                    <p className="text-xs text-muted-foreground">{u.varian}</p>
                  </div>
                  <Badge className="text-xs bg-blue-100 text-blue-700">{u.source}</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Edit Form */}
      {showForm && tipe === 'packaging' && (
        <PackagingForm item={item} tipeAwal={tipe} kurs={kurs} onClose={() => setShowForm(false)} onSaved={handleSaved} />
      )}
      {showForm && (tipe === 'botol' || tipe === 'tutup' || tipe === 'spray') && (
        <PackagingForm item={item} tipeAwal={tipe} kurs={kurs} onClose={() => setShowForm(false)} onSaved={handleSaved} />
      )}
      {showForm && tipe === 'bahan' && (
        <StokBahanForm item={item} kurs={kurs} onClose={() => setShowForm(false)} onSaved={handleSaved} />
      )}
      {showForm && tipe === 'item-tambahan' && (
        <ItemTambahanForm item={item} onClose={() => setShowForm(false)} onSaved={handleSaved} />
      )}
    </div>
  );
}