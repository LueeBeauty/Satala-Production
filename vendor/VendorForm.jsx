import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { X, Save, Building2 } from 'lucide-react';

const KATEGORI_OPTIONS = ['Bibit', 'Alkohol', 'Aqua Des', 'DPG', 'Peg', 'Sustain', 'Botol', 'Tutup', 'Spray', 'Lainnya'];

export default function VendorForm({ vendor, onSave, onCancel, isSaving }) {
  const [form, setForm] = useState({
    nama: '',
    kode: '',
    kategori_bahan: [],
    kontak_person: '',
    nomor_hp: '',
    email: '',
    kota: '',
    min_order: '',
    waktu_pengiriman: '',
    rating: 5,
    catatan: '',
    aktif: true,
  });

  useEffect(() => {
    if (vendor) {
      setForm({
        nama: vendor.nama || '',
        kode: vendor.kode || '',
        kategori_bahan: vendor.kategori_bahan || [],
        kontak_person: vendor.kontak_person || '',
        nomor_hp: vendor.nomor_hp || '',
        email: vendor.email || '',
        kota: vendor.kota || '',
        min_order: vendor.min_order || '',
        waktu_pengiriman: vendor.waktu_pengiriman || '',
        rating: vendor.rating ?? 5,
        catatan: vendor.catatan || '',
        aktif: vendor.aktif !== false,
      });
    }
  }, [vendor]);

  const toggleKategori = (k) => {
    setForm(f => ({
      ...f,
      kategori_bahan: f.kategori_bahan.includes(k)
        ? f.kategori_bahan.filter(x => x !== k)
        : [...f.kategori_bahan, k],
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(form);
  };

  return (
    <div className="bg-card border border-border rounded-2xl shadow-lg overflow-hidden">
      <div className="flex items-center justify-between px-5 py-4 bg-gradient-to-r from-primary/5 to-accent/5 border-b border-border">
        <div className="flex items-center gap-2">
          <Building2 className="w-4 h-4 text-accent" />
          <h3 className="font-semibold text-sm">{vendor ? 'Edit Vendor' : 'Tambah Vendor Baru'}</h3>
        </div>
        <Button variant="ghost" size="icon" className="w-8 h-8" onClick={onCancel}>
          <X className="w-4 h-4" />
        </Button>
      </div>

      <form onSubmit={handleSubmit} className="p-5 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Nama Vendor <span className="text-destructive">*</span></label>
            <Input value={form.nama} onChange={e => setForm(f => ({ ...f, nama: e.target.value }))} placeholder="Contoh: Parfarome, Aromatic Indonesia" required className="h-9" />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Kode Singkat</label>
            <Input value={form.kode} onChange={e => setForm(f => ({ ...f, kode: e.target.value.toUpperCase() }))} placeholder="Contoh: PRF, ARO" className="h-9 uppercase" maxLength={6} />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Kontak Person</label>
            <Input value={form.kontak_person} onChange={e => setForm(f => ({ ...f, kontak_person: e.target.value }))} placeholder="Nama PIC" className="h-9" />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Nomor WhatsApp</label>
            <Input value={form.nomor_hp} onChange={e => setForm(f => ({ ...f, nomor_hp: e.target.value }))} placeholder="628XXXXXXXXX" className="h-9" />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Kota</label>
            <Input value={form.kota} onChange={e => setForm(f => ({ ...f, kota: e.target.value }))} placeholder="Jakarta, Surabaya, dll" className="h-9" />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Min. Order</label>
            <Input value={form.min_order} onChange={e => setForm(f => ({ ...f, min_order: e.target.value }))} placeholder="Contoh: 1 kg, 100 ml" className="h-9" />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Estimasi Pengiriman</label>
            <Input value={form.waktu_pengiriman} onChange={e => setForm(f => ({ ...f, waktu_pengiriman: e.target.value }))} placeholder="Contoh: 2-3 hari kerja" className="h-9" />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Rating (1–5)</label>
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map(r => (
                <button key={r} type="button"
                  onClick={() => setForm(f => ({ ...f, rating: r }))}
                  className={`w-8 h-8 rounded-full text-sm font-bold transition-all ${form.rating >= r ? 'bg-amber-400 text-white' : 'bg-muted text-muted-foreground hover:bg-amber-100'}`}>
                  {r}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Kategori Bahan */}
        <div>
          <label className="text-xs font-medium text-muted-foreground mb-2 block">Kategori Bahan yang Disuplai</label>
          <div className="flex flex-wrap gap-2">
            {KATEGORI_OPTIONS.map(k => (
              <button key={k} type="button" onClick={() => toggleKategori(k)}
                className={`px-3 py-1 rounded-full text-xs font-medium border transition-all ${
                  form.kategori_bahan.includes(k)
                    ? 'bg-accent text-accent-foreground border-accent'
                    : 'border-border text-muted-foreground hover:border-accent/50 hover:text-foreground'
                }`}>
                {k}
              </button>
            ))}
          </div>
        </div>

        {/* Catatan */}
        <div>
          <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Catatan</label>
          <Input value={form.catatan} onChange={e => setForm(f => ({ ...f, catatan: e.target.value }))} placeholder="Informasi tambahan tentang vendor..." className="h-9" />
        </div>

        {/* Status Aktif */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setForm(f => ({ ...f, aktif: !f.aktif }))}
            className={`relative w-10 h-5 rounded-full transition-colors ${form.aktif ? 'bg-accent' : 'bg-muted-foreground/30'}`}
          >
            <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${form.aktif ? 'translate-x-5' : 'translate-x-0.5'}`} />
          </button>
          <span className="text-sm text-foreground">Vendor {form.aktif ? 'Aktif' : 'Tidak Aktif'}</span>
        </div>

        <div className="flex gap-3 pt-2">
          <Button type="button" variant="outline" onClick={onCancel} className="flex-1">Batal</Button>
          <Button type="submit" disabled={isSaving || !form.nama} className="flex-1 gap-2 bg-accent hover:bg-accent/90 text-accent-foreground">
            <Save className="w-4 h-4" /> {isSaving ? 'Menyimpan...' : 'Simpan Vendor'}
          </Button>
        </div>
      </form>
    </div>
  );
}