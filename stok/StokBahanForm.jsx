import React, { useState, useEffect } from 'react';
import { useMutation } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { X } from 'lucide-react';

const KATEGORI = ['Bibit', 'Alkohol', 'Aqua Des', 'DPG', 'Peg', 'Sustain', 'Lainnya'];
const PARFAROME_GRADE = ['Deluxe', 'Premium', 'Exclusive'];
const SATUAN = ['kg', 'liter', 'gram', 'ml'];

export default function StokBahanForm({ item, kurs, onClose, onSaved }) {
  const [form, setForm] = useState({ nama: '', kategori: 'Bibit', vendor: '', grade: '', harga_rupiah: '', harga_dollar: '', satuan: 'kg', stok: '', catatan: '' });

  useEffect(() => {
    if (item) setForm({ nama: item.nama ?? '', kategori: item.kategori ?? 'Bibit', vendor: item.vendor ?? '', grade: item.grade ?? '', harga_rupiah: item.harga_rupiah ?? '', harga_dollar: item.harga_dollar ?? '', satuan: item.satuan ?? 'kg', stok: item.stok ?? '', catatan: item.catatan ?? '' });
  }, [item]);

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  // USD → Rupiah otomatis
  useEffect(() => {
    if (form._lastEdited === 'dollar' && form.harga_dollar && kurs) {
      setForm(p => ({ ...p, harga_rupiah: (parseFloat(p.harga_dollar) * kurs).toFixed(0) }));
    }
  }, [form.harga_dollar, kurs]);

  // Rupiah → USD otomatis
  useEffect(() => {
    if (form._lastEdited === 'rupiah' && form.harga_rupiah && kurs) {
      setForm(p => ({ ...p, harga_dollar: (parseFloat(p.harga_rupiah) / kurs).toFixed(4) }));
    }
  }, [form.harga_rupiah, kurs]);

  const mutation = useMutation({
    mutationFn: (data) => item ? base44.entities.BahanCair.update(item.id, data) : base44.entities.BahanCair.create(data),
    onSuccess: onSaved,
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    mutation.mutate({ nama: form.nama, kategori: form.kategori, vendor: form.vendor || undefined, grade: form.grade || undefined, harga_rupiah: parseFloat(form.harga_rupiah), harga_dollar: form.harga_dollar ? parseFloat(form.harga_dollar) : undefined, satuan: form.satuan, stok: form.stok ? parseFloat(form.stok) : undefined, catatan: form.catatan || undefined });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b border-border">
          <h3 className="font-display font-semibold text-lg">{item ? 'Edit' : 'Tambah'} Bahan Cair</h3>
          <Button variant="ghost" size="icon" onClick={onClose}><X className="w-4 h-4" /></Button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Kategori *</label>
            <div className="flex flex-wrap gap-2">
              {KATEGORI.map(k => (
                <button key={k} type="button" onClick={() => set('kategori', k)}
                  className={`px-3 py-1.5 rounded-lg border text-xs font-medium transition-all ${form.kategori === k ? 'bg-accent text-accent-foreground border-accent' : 'border-border text-muted-foreground hover:border-accent/50'}`}
                >{k}</button>
              ))}
            </div>
          </div>
          <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Vendor / Supplier</label>
              <Input value={form.vendor} onChange={e => { set('vendor', e.target.value); if (!e.target.value.toLowerCase().includes('parfarome')) set('grade', ''); }} placeholder="Contoh: LUZI, Superfine, Iberchem" />
            </div>
          {form.kategori === 'Bibit' && form.vendor?.toLowerCase().includes('parfarome') && (
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Grade Parfarome <span className="text-destructive">*</span></label>
              <div className="flex gap-2">
                {PARFAROME_GRADE.map(g => (
                  <button key={g} type="button" onClick={() => set('grade', g)}
                    className={`flex-1 py-2 rounded-lg border text-xs font-semibold transition-all ${form.grade === g ? 'bg-accent text-accent-foreground border-accent' : 'border-border text-muted-foreground hover:border-accent/50'}`}
                  >{g}</button>
                ))}
              </div>
              {!form.grade && <p className="text-xs text-amber-600 mt-1">⚠ Wajib pilih grade untuk bibit Parfarome</p>}
            </div>
          )}
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Nama Bahan *</label>
            <Input value={form.nama} onChange={e => set('nama', e.target.value)} placeholder="Contoh: 9PM, Baccarat Rouge 540" required />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Harga USD ($)</label>
              <Input type="number" step="0.01" value={form.harga_dollar} onChange={e => setForm(p => ({ ...p, harga_dollar: e.target.value, _lastEdited: 'dollar' }))} placeholder="35.00" />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Harga Rupiah (Rp) *</label>
              <Input type="number" value={form.harga_rupiah} onChange={e => setForm(p => ({ ...p, harga_rupiah: e.target.value, _lastEdited: 'rupiah' }))} placeholder="0" required />
            </div>
          </div>
          {form.harga_dollar && form.harga_rupiah && (
            <p className="text-xs text-green-600 bg-green-50 border border-green-200 rounded-lg px-3 py-2">
              💱 ${parseFloat(form.harga_dollar).toFixed(2)} × Rp {kurs.toLocaleString('id-ID')} = Rp {(parseFloat(form.harga_dollar) * kurs).toLocaleString('id-ID')}
            </p>
          )}
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Satuan *</label>
            <div className="flex gap-2">
              {SATUAN.map(s => (
                <button key={s} type="button" onClick={() => set('satuan', s)}
                  className={`flex-1 py-2 rounded-lg border text-xs font-medium transition-all ${form.satuan === s ? 'bg-accent text-accent-foreground border-accent' : 'border-border text-muted-foreground hover:border-accent/50'}`}
                >{s}</button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Stok ({form.satuan})</label>
            <Input type="number" step="0.001" value={form.stok} onChange={e => set('stok', e.target.value)} placeholder="0" />
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