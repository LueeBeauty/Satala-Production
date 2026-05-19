import React, { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Search, TrendingDown, TrendingUp, BarChart3, Star, AlertCircle } from 'lucide-react';

const fmt = (n) => new Intl.NumberFormat('id-ID').format(Math.round(n));

export default function KomparasiHarga({ vendorList, bahanList, hargaVendorList }) {
  const [search, setSearch] = useState('');
  const [filterKategori, setFilterKategori] = useState('Semua');

  // Group harga by bahan
  const bahanMap = {};
  hargaVendorList.forEach(h => {
    if (!bahanMap[h.bahan_id]) {
      bahanMap[h.bahan_id] = {
        bahan_id: h.bahan_id,
        bahan_nama: h.bahan_nama,
        bahan_kategori: h.bahan_kategori || '',
        hargaList: [],
      };
    }
    bahanMap[h.bahan_id].hargaList.push(h);
  });

  const bahanGroups = Object.values(bahanMap);

  // Filter
  const filtered = bahanGroups.filter(g => {
    const matchSearch = !search || g.bahan_nama.toLowerCase().includes(search.toLowerCase());
    const matchKategori = filterKategori === 'Semua' || g.bahan_kategori === filterKategori;
    return matchSearch && matchKategori;
  });

  const kategoriList = ['Semua', ...new Set(bahanGroups.map(g => g.bahan_kategori).filter(Boolean))].sort();

  if (bahanGroups.length === 0) {
    return (
      <div className="text-center py-20 text-muted-foreground">
        <BarChart3 className="w-14 h-14 mx-auto mb-4 opacity-20" />
        <p className="font-semibold text-foreground">Belum ada data untuk dibandingkan</p>
        <p className="text-sm mt-1">Tambahkan harga bahan dari tab "Harga Vendor" terlebih dahulu</p>
        <div className="mt-4 bg-muted/40 rounded-xl p-4 text-xs max-w-sm mx-auto text-left space-y-1.5">
          <p className="font-semibold text-foreground">Cara pakai:</p>
          <p>1. Buka tab <strong>Harga Vendor</strong></p>
          <p>2. Klik <strong>Tambah Harga</strong></p>
          <p>3. Pilih vendor dan bahan yang sama dari beberapa vendor</p>
          <p>4. Kembali ke Komparasi untuk melihat perbandingan</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Cari nama bahan..." className="pl-9 h-9" />
        </div>
        <div className="flex gap-1.5 flex-wrap">
          {kategoriList.map(k => (
            <button key={k} onClick={() => setFilterKategori(k)}
              className={`px-3 py-1 rounded-full text-xs font-medium border transition-all ${filterKategori === k ? 'bg-primary text-primary-foreground border-primary' : 'border-border text-muted-foreground hover:border-primary/50'}`}>
              {k}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          <p>Tidak ada bahan ditemukan</p>
        </div>
      )}

      <div className="space-y-4">
        {filtered.map(group => {
          const hargaList = group.hargaList;
          if (hargaList.length === 0) return null;

          // Hitung harga per ml
          const withPerMl = hargaList.map(h => ({
            ...h,
            harga_per_ml: (h.satuan === 'kg' || h.satuan === 'liter') ? h.harga_rupiah / 1000 : h.harga_rupiah,
            vendor: vendorList.find(v => v.id === h.vendor_id),
          }));

          const sorted = [...withPerMl].sort((a, b) => a.harga_per_ml - b.harga_per_ml);
          const cheapest = sorted[0];
          const mostExpensive = sorted[sorted.length - 1];
          const avg = withPerMl.reduce((s, h) => s + h.harga_per_ml, 0) / withPerMl.length;
          const maxPrice = mostExpensive.harga_per_ml;

          return (
            <div key={group.bahan_id} className="bg-card border border-border rounded-2xl shadow-sm overflow-hidden">
              {/* Bahan Header */}
              <div className="flex items-center justify-between px-5 py-4 bg-gradient-to-r from-primary/5 to-accent/5 border-b border-border">
                <div>
                  <h3 className="font-semibold text-sm text-foreground">{group.bahan_nama}</h3>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant="secondary" className="text-[10px]">{group.bahan_kategori || 'Umum'}</Badge>
                    <span className="text-xs text-muted-foreground">{hargaList.length} vendor</span>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xs text-muted-foreground">Rata-rata</p>
                  <p className="text-sm font-bold text-foreground">Rp {fmt(avg)}/ml</p>
                </div>
              </div>

              {/* Price comparison bars */}
              <div className="p-4 space-y-3">
                {sorted.map((h, idx) => {
                  const isCheapest = idx === 0;
                  const isExpensive = idx === sorted.length - 1 && sorted.length > 1;
                  const barWidth = maxPrice > 0 ? (h.harga_per_ml / maxPrice) * 100 : 0;
                  const vendorRating = h.vendor?.rating || 0;

                  return (
                    <div key={h.id}>
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center text-primary font-bold text-xs shrink-0">
                            {(h.vendor?.kode || h.vendor_nama.substring(0, 2)).toUpperCase().substring(0, 2)}
                          </div>
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span className="text-sm font-medium text-foreground">{h.vendor_nama}</span>
                              {isCheapest && (
                                <Badge className="text-[9px] px-1.5 py-0 bg-emerald-100 text-emerald-700 border-emerald-200">
                                  <TrendingDown className="w-2.5 h-2.5 mr-0.5" /> Termurah
                                </Badge>
                              )}
                              {isExpensive && (
                                <Badge className="text-[9px] px-1.5 py-0 bg-red-50 text-red-600 border-red-200">
                                  <TrendingUp className="w-2.5 h-2.5 mr-0.5" /> Termahal
                                </Badge>
                              )}
                            </div>
                            <div className="flex items-center gap-2 mt-0.5">
                              {vendorRating > 0 && (
                                <div className="flex items-center gap-0.5">
                                  {[1,2,3].map(i => (
                                    <Star key={i} className={`w-2.5 h-2.5 ${i <= Math.round(vendorRating/2) ? 'fill-amber-400 text-amber-400' : 'text-muted-foreground/30'}`} />
                                  ))}
                                </div>
                              )}
                              {h.min_order_qty > 0 && (
                                <span className="text-[10px] text-muted-foreground">
                                  Min: {h.min_order_qty} {h.min_order_satuan}
                                </span>
                              )}
                              {h.catatan && (
                                <span className="text-[10px] text-muted-foreground italic">{h.catatan}</span>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-sm font-bold text-foreground">Rp {fmt(h.harga_per_ml)}/ml</p>
                          <p className="text-[10px] text-muted-foreground">Rp {fmt(h.harga_rupiah)}/{h.satuan}</p>
                          {isCheapest && mostExpensive.harga_per_ml > cheapest.harga_per_ml && (
                            <p className="text-[10px] font-semibold text-emerald-600">
                              Hemat {(((mostExpensive.harga_per_ml - cheapest.harga_per_ml) / mostExpensive.harga_per_ml) * 100).toFixed(0)}% vs termahal
                            </p>
                          )}
                        </div>
                      </div>
                      {/* Bar chart */}
                      <div className="h-2 bg-muted rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${isCheapest ? 'bg-emerald-500' : isExpensive ? 'bg-red-400' : 'bg-primary/60'}`}
                          style={{ width: `${barWidth}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Summary footer */}
              {sorted.length > 1 && (
                <div className="px-4 pb-4">
                  <div className="bg-emerald-50 border border-emerald-100 rounded-xl px-4 py-2.5 flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                    <p className="text-xs text-emerald-700">
                      Pilih <strong>{cheapest.vendor_nama}</strong> untuk hemat{' '}
                      <strong>Rp {fmt(mostExpensive.harga_per_ml - cheapest.harga_per_ml)}/ml</strong>{' '}
                      dibanding <strong>{mostExpensive.vendor_nama}</strong>
                    </p>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}