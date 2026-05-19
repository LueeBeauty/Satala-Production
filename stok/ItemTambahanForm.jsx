import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { X } from 'lucide-react';

const KATEGORI_LIST = ['Stiker', 'Dus', 'Gift Card', 'Lainnya'];

export default function ItemTambahanForm({ item, onClose, onSaved }) {
  const qc = useQueryClient();
  const isEdit = !!item?.id;

  const [form, setForm] = useState({
    nama: item?.nama || '',
    kategori: item?.kategori || 'Stiker',
    brand: item?.brand || '',
    harga_rupiah: item?.harga_rupiah || 0,
    stok: item?.stok ?? 0,
    vendor: item?.vendor || '',
    catatan: item?.catatan || '',
  });

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const saveMut = useMutation({
    mutationFn: (data) =>
      isEdit
        ? base44.entities.ItemTambahan.update(item.id, data)
        : base44.entities.ItemTambahan.create(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['item-tambahan'] });
      onSaved?.();
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    saveMut.mutate({
      ...form,
      harga_rupiah: Number(form.harga_rupiah) || 0,
      stok: Number(form.stok) || 0,
    });
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
      <div className="bg-card rounded-2xl shadow-2xl w-full max-w-md p-6">
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-lg font-semibold">{isEdit ? 'Edit' : 'Tambah'} Item Tambahan</h3>
          <Button variant="ghost" size="icon" onClick={onClose}><X className="w-4 h-4" /></Button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Nama Item *</label>
            <Input value={form.nama} onChange={e => set('nama', e.target.value)} placeholder="Misal: Stiker Logo 5x5cm" required />
          </div>

          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Kategori *</label>
            <div className="flex flex-wrap gap-2">
              {KATEGORI_LIST.map(k => (
                <button
                  key={k}
                  type="button"
                  onClick={() => set('kategori', k)}
                  className={`px-3 py-1.5 rounded-lg border text-sm font-medium transition-all ${form.kategori === k ? 'bg-accent text-accent-foreground border-accent' : 'border-border text-muted-foreground hover:border-accent/50'}`}
                >
                  {k}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Brand</label>
            <Input value={form.brand} onChange={e => set('brand', e.target.value)} placeholder="Nama brand (misal: Cielmora)" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Harga / pcs (Rp)</label>
              <Input type="number" min="0" value={form.harga_rupiah} onChange={e => set('harga_rupiah', e.target.value)} placeholder="0" />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Stok (pcs)</label>
              <Input type="number" min="0" value={form.stok} onChange={e => set('stok', e.target.value)} placeholder="0" />
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Vendor / Supplier</label>
            <Input value={form.vendor} onChange={e => set('vendor', e.target.value)} placeholder="Nama supplier (opsional)" />
          </div>

          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Catatan</label>
            <Input value={form.catatan} onChange={e => set('catatan', e.target.value)} placeholder="Catatan tambahan (opsional)" />
          </div>

          <div className="flex gap-3 pt-2">
            <Button type="button" variant="outline" onClick={onClose} className="flex-1">Batal</Button>
            <Button type="submit" disabled={saveMut.isPending || !form.nama.trim()} className="flex-1">
              {saveMut.isPending ? 'Menyimpan...' : isEdit ? 'Simpan Perubahan' : 'Tambah Item'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}