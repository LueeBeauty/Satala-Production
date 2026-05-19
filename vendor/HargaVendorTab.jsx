import React, { useState } from 'react';
import { useQueryClient, useMutation } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Plus, Pencil, Trash2, Search, DollarSign, Calendar } from 'lucide-react';
import HargaVendorForm from './HargaVendorForm';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';

const fmt = (n) => new Intl.NumberFormat('id-ID').format(Math.round(n));

export default function HargaVendorTab({ vendorList, bahanList, hargaVendorList, isLoading }) {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editingHarga, setEditingHarga] = useState(null);
  const [search, setSearch] = useState('');
  const [filterVendor, setFilterVendor] = useState('Semua');

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.HargaVendor.create(data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['harga-vendor'] }); setShowForm(false); setEditingHarga(null); },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.HargaVendor.update(id, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['harga-vendor'] }); setShowForm(false); setEditingHarga(null); },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.HargaVendor.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['harga-vendor'] }),
  });

  const handleSave = (formData) => {
    if (editingHarga) {
      updateMutation.mutate({ id: editingHarga.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const filtered = hargaVendorList.filter(h => {
    const matchSearch = !search || h.bahan_nama.toLowerCase().includes(search.toLowerCase()) || h.vendor_nama.toLowerCase().includes(search.toLowerCase());
    const matchVendor = filterVendor === 'Semua' || h.vendor_nama === filterVendor;
    return matchSearch && matchVendor;
  });

  const vendorNames = [...new Set(hargaVendorList.map(h => h.vendor_nama))].sort();

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Cari bahan atau vendor..." className="pl-9 h-9 w-full sm:w-64" />
          </div>
          <select
            value={filterVendor}
            onChange={e => setFilterVendor(e.target.value)}
            className="text-xs border border-border rounded-lg px-3 h-9 bg-background focus:ring-1 focus:ring-accent/50 outline-none"
          >
            <option value="Semua">Semua Vendor</option>
            {vendorNames.map(v => <option key={v} value={v}>{v}</option>)}
          </select>
        </div>
        <Button onClick={() => { setEditingHarga(null); setShowForm(true); }} className="gap-2 bg-accent hover:bg-accent/90 text-accent-foreground shrink-0">
          <Plus className="w-4 h-4" /> Tambah Harga
        </Button>
      </div>

      {showForm && (
        <HargaVendorForm
          harga={editingHarga}
          vendorList={vendorList}
          bahanList={bahanList}
          onSave={handleSave}
          onCancel={() => { setShowForm(false); setEditingHarga(null); }}
          isSaving={createMutation.isPending || updateMutation.isPending}
        />
      )}

      {isLoading ? (
        <div className="space-y-2">
          {[1,2,3].map(i => <div key={i} className="h-16 bg-muted animate-pulse rounded-xl" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <DollarSign className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="font-medium">Belum ada data harga vendor</p>
          <p className="text-sm mt-1">Tambahkan harga bahan dari masing-masing vendor</p>
        </div>
      ) : (
        <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
          {/* Header */}
          <div className="grid grid-cols-12 gap-2 px-4 py-3 bg-muted/30 border-b border-border">
            <div className="col-span-3 text-xs font-semibold text-muted-foreground">BAHAN</div>
            <div className="col-span-2 text-xs font-semibold text-muted-foreground">VENDOR</div>
            <div className="col-span-2 text-xs font-semibold text-muted-foreground">KATEGORI</div>
            <div className="col-span-2 text-xs font-semibold text-muted-foreground text-right">HARGA</div>
            <div className="col-span-1 text-xs font-semibold text-muted-foreground text-right">HARGA/ml</div>
            <div className="col-span-1 text-xs font-semibold text-muted-foreground text-center">UPDATE</div>
            <div className="col-span-1"></div>
          </div>
          <div className="divide-y divide-border/50">
            {filtered.map(h => {
              const hargaPerMl = (h.satuan === 'kg' || h.satuan === 'liter') ? h.harga_rupiah / 1000 : h.harga_rupiah;
              return (
                <div key={h.id} className="grid grid-cols-12 gap-2 px-4 py-3 hover:bg-muted/20 transition-colors items-center">
                  <div className="col-span-3">
                    <p className="text-sm font-medium text-foreground">{h.bahan_nama}</p>
                    {h.catatan && <p className="text-xs text-muted-foreground">{h.catatan}</p>}
                  </div>
                  <div className="col-span-2">
                    <Badge variant="outline" className="text-xs">{h.vendor_nama}</Badge>
                  </div>
                  <div className="col-span-2">
                    <span className="text-xs text-muted-foreground">{h.bahan_kategori || '—'}</span>
                  </div>
                  <div className="col-span-2 text-right">
                    <p className="text-sm font-semibold text-foreground">Rp {fmt(h.harga_rupiah)}</p>
                    <p className="text-xs text-muted-foreground">/{h.satuan}</p>
                  </div>
                  <div className="col-span-1 text-right">
                    <p className="text-xs font-semibold text-accent">Rp {fmt(hargaPerMl)}/ml</p>
                  </div>
                  <div className="col-span-1 text-center">
                    {h.tanggal_update ? (
                      <span className="text-[10px] text-muted-foreground">{format(new Date(h.tanggal_update), 'd MMM', { locale: id })}</span>
                    ) : <span className="text-xs text-muted-foreground">—</span>}
                  </div>
                  <div className="col-span-1 flex justify-end gap-0.5">
                    <Button variant="ghost" size="icon" className="w-6 h-6 text-muted-foreground hover:text-foreground"
                      onClick={() => { setEditingHarga(h); setShowForm(true); }}>
                      <Pencil className="w-3 h-3" />
                    </Button>
                    <Button variant="ghost" size="icon" className="w-6 h-6 text-muted-foreground hover:text-destructive"
                      onClick={() => deleteMutation.mutate(h.id)}>
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}