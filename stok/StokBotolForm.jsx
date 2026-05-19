import React, { useState, useEffect } from 'react';
import { useMutation } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { X } from 'lucide-react';

export default function StokBotolForm({ item, kurs, onClose, onSaved }) {
  const [form, setForm] = useState({ nama: '', ukuran_label_ml: '', ukuran_aktual_ml: '', harga_rupiah: '', harga_dollar: '', catatan_teknis: '', stok: '' });

  useEffect(() => {
    if (item) setForm({ nama: item.nama ?? '', ukuran_label_ml: item.ukuran_label_ml ?? '', ukuran_aktual_ml: item.ukuran_aktual_ml ?? '', harga_rupiah: item.harga_rupiah ?? '', harga_dollar: item.harga_dollar ?? '', catatan_teknis: item.catatan_teknis ?? '', stok: item.stok ?? '' });
  }, [item]);

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  // Auto-convert dollar to rupiah
  useEffect(() => {
    if (form.harga_dollar && kurs) set('harga_rupiah', (parseFloat(form.harga_dollar) * kurs).toFixed(0));
  }, [form.harga_dollar, kurs]);

  const mutation = useMutation({
    mutationFn: (data) => item ? base44.entities.Botol.update(item.id, data) : base44.entities.Botol.create(data),
    onSuccess: onSaved,
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    mutation.mutate({ nama: form.nama, ukuran_label_ml: parseFloat(form.ukuran_label_ml), ukuran_aktual_ml: form.ukuran_aktual_ml ? parseFloat(form.ukuran_aktual_ml) : undefined, harga_rupiah: parseFloat(form.harga_rupiah), harga_dollar: form.harga_dollar ? parseFloat(form.harga_dollar) : undefined, catatan_teknis: form.catatan_teknis || undefined, stok: form.stok ? parseInt(form.stok) : undefined });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between p-5 border-b border-border">
          <h3 className="font-display font-semibold text-lg">{item ? 'Edit' : 'Tambah'} Botol</h3>
          <Button variant="ghost" size="icon" onClick={onClose}><X className="w-4 h-4" /></Button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Nama Botol *</label>
            <Input value={form.nama} onChange={e => set('nama', e.target.value)} placeholder="Contoh: Botol Kaca 30ml Slim" required />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Ukuran Label (ml) *</label>
              <Input type="number" value={form.ukuran_label_ml} onChange={e => set('ukuran_label_ml', e.target.value)} placeholder="30" required />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Ukuran Aktual (ml)</label>
              <Input type="number" value={form.ukuran_aktual_ml} onChange={e => set('ukuran_aktual_ml', e.target.value)} placeholder="33 (opsional)" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Harga USD ($)</label>
              <Input type="number" step="0.01" value={form.harga_dollar} onChange={e => set('harga_dollar', e.target.value)} placeholder="0.00" />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Harga Rupiah (Rp) *</label>
              <Input type="number" value={form.harga_rupiah} onChange={e => { set('harga_rupiah', e.target.value); set('harga_dollar', ''); }} placeholder="0" required />
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Catatan Teknis</label>
            <Input value={form.catatan_teknis} onChange={e => set('catatan_teknis', e.target.value)} placeholder="Contoh: Isi asli 33ml, rawan rembes jika full" />
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