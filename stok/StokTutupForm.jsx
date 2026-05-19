import React, { useState, useEffect } from 'react';
import { useMutation } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { X } from 'lucide-react';

export default function StokTutupForm({ item, kurs, onClose, onSaved }) {
  const [form, setForm] = useState({ nama: '', harga_rupiah: '', harga_dollar: '', catatan: '', stok: '' });

  useEffect(() => {
    if (item) setForm({ nama: item.nama ?? '', harga_rupiah: item.harga_rupiah ?? '', harga_dollar: item.harga_dollar ?? '', catatan: item.catatan ?? '', stok: item.stok ?? '' });
  }, [item]);

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  useEffect(() => {
    if (form.harga_dollar && kurs) set('harga_rupiah', (parseFloat(form.harga_dollar) * kurs).toFixed(0));
  }, [form.harga_dollar, kurs]);

  const mutation = useMutation({
    mutationFn: (data) => item ? base44.entities.Tutup.update(item.id, data) : base44.entities.Tutup.create(data),
    onSuccess: onSaved,
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    mutation.mutate({ nama: form.nama, harga_rupiah: parseFloat(form.harga_rupiah), harga_dollar: form.harga_dollar ? parseFloat(form.harga_dollar) : undefined, catatan: form.catatan || undefined, stok: form.stok ? parseInt(form.stok) : undefined });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between p-5 border-b border-border">
          <h3 className="font-display font-semibold text-lg">{item ? 'Edit' : 'Tambah'} Tutup</h3>
          <Button variant="ghost" size="icon" onClick={onClose}><X className="w-4 h-4" /></Button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Nama Tutup *</label>
            <Input value={form.nama} onChange={e => set('nama', e.target.value)} placeholder="Contoh: Tutup Gold Magnetic" required />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Harga USD ($)</label>
              <Input type="number" step="0.01" value={form.harga_dollar} onChange={e => { set('harga_dollar', e.target.value); }} placeholder="0.00" />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Harga Rupiah (Rp) *</label>
              <Input type="number" value={form.harga_rupiah} onChange={e => { set('harga_rupiah', e.target.value); set('harga_dollar', ''); }} placeholder="0" required />
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Catatan</label>
            <Input value={form.catatan} onChange={e => set('catatan', e.target.value)} placeholder="Opsional" />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Stok (pcs)</label>
            <Input type="number" value={form.stok} onChange={e => set('stok', e.target.value)} placeholder="0" />
          </div>
          <div className="flex gap-2 pt-2">
            <Button type="button" variant="outline" onClick={onClose} className="flex-1">Batal</Button>
            <Button type="submit" disabled={mutation.isPending} className="flex-1 bg-accent hover:bg-accent/90 text-accent-foreground">{mutation.isPending ? 'Menyimpan...' : 'Simpan'}</Button>
          </div>
        </form>
      </div>
    </div>
  );
}