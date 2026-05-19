import React, { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Pencil, Trash2, Search, Phone, MapPin, Clock, Star, Package } from 'lucide-react';

export default function VendorList({ vendorList, hargaVendorList, isLoading, onEdit, onDelete }) {
  const [search, setSearch] = useState('');
  const [filterKategori, setFilterKategori] = useState('Semua');

  const kategoriSet = new Set();
  vendorList.forEach(v => (v.kategori_bahan || []).forEach(k => kategoriSet.add(k)));
  const kategoriList = ['Semua', ...Array.from(kategoriSet).sort()];

  const filtered = vendorList.filter(v => {
    const matchSearch = !search || v.nama.toLowerCase().includes(search.toLowerCase()) || (v.kota || '').toLowerCase().includes(search.toLowerCase());
    const matchKategori = filterKategori === 'Semua' || (v.kategori_bahan || []).includes(filterKategori);
    return matchSearch && matchKategori;
  });

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {[1, 2, 3].map(i => <div key={i} className="h-48 bg-muted animate-pulse rounded-2xl" />)}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Cari nama / kota vendor..." className="pl-9 h-9" />
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
        <div className="text-center py-16 text-muted-foreground">
          <Package className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="font-medium">Tidak ada vendor ditemukan</p>
          <p className="text-sm mt-1">Coba ubah filter atau tambahkan vendor baru</p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filtered.map(vendor => {
          const hargaCount = hargaVendorList.filter(h => h.vendor_id === vendor.id).length;
          const stars = Math.round(vendor.rating ?? 0);
          return (
            <div key={vendor.id} className={`bg-card border rounded-2xl p-4 shadow-sm hover:shadow-md transition-all ${vendor.aktif === false ? 'opacity-60 border-border' : 'border-border hover:border-accent/30'}`}>
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center text-primary font-bold text-sm shrink-0">
                    {(vendor.kode || vendor.nama.substring(0, 2)).toUpperCase().substring(0, 2)}
                  </div>
                  <div>
                    <h3 className="font-semibold text-sm text-foreground">{vendor.nama}</h3>
                    {vendor.aktif === false && <Badge variant="outline" className="text-[10px] text-muted-foreground">Tidak Aktif</Badge>}
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <Button variant="ghost" size="icon" className="w-7 h-7 text-muted-foreground hover:text-foreground" onClick={() => onEdit(vendor)}>
                    <Pencil className="w-3.5 h-3.5" />
                  </Button>
                  <Button variant="ghost" size="icon" className="w-7 h-7 text-muted-foreground hover:text-destructive" onClick={() => onDelete(vendor.id)}>
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>

              {/* Rating */}
              {stars > 0 && (
                <div className="flex items-center gap-0.5 mb-3">
                  {[1,2,3,4,5].map(i => (
                    <Star key={i} className={`w-3 h-3 ${i <= stars ? 'fill-amber-400 text-amber-400' : 'text-muted-foreground/30'}`} />
                  ))}
                  <span className="text-xs text-muted-foreground ml-1">{vendor.rating}/5</span>
                </div>
              )}

              {/* Info grid */}
              <div className="space-y-1.5 mb-3">
                {vendor.kota && (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <MapPin className="w-3 h-3 shrink-0" />
                    <span>{vendor.kota}</span>
                  </div>
                )}
                {vendor.nomor_hp && (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Phone className="w-3 h-3 shrink-0" />
                    <span>{vendor.nomor_hp}</span>
                  </div>
                )}
                {vendor.waktu_pengiriman && (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Clock className="w-3 h-3 shrink-0" />
                    <span>{vendor.waktu_pengiriman}</span>
                  </div>
                )}
                {vendor.min_order && (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Package className="w-3 h-3 shrink-0" />
                    <span>Min order: {vendor.min_order}</span>
                  </div>
                )}
              </div>

              {/* Kategori */}
              {(vendor.kategori_bahan || []).length > 0 && (
                <div className="flex flex-wrap gap-1 mb-3">
                  {vendor.kategori_bahan.map(k => (
                    <Badge key={k} variant="secondary" className="text-[10px] px-2 py-0">{k}</Badge>
                  ))}
                </div>
              )}

              <div className="border-t border-border/50 pt-2 flex items-center justify-between">
                <span className="text-xs text-muted-foreground">{hargaCount} data harga tercatat</span>
                {vendor.catatan && <span className="text-xs text-muted-foreground italic truncate max-w-[140px]">{vendor.catatan}</span>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}