import React, { useState, useEffect } from 'react';
import { useMutation } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { X } from 'lucide-react';

const TIPE_OPTIONS = [
  { value: 'botol', label: 'Botol' },
  { value: 'tutup', label: 'Tutup' },
  { value: 'spray', label: 'Spray' },
];

const SPRAY_TYPES = ['Biasa', 'Continuous'];

const ENTITY_MAP = {
  botol: base44.entities.Botol,
  tutup: base44.entities.Tutup,
  spray: base44.entities.Spray,
};

export default function PackagingForm({ item, tipeAwal = 'botol', kurs, onClose, onSaved }) {
  const [tipe, setTipe] = useState(item?.tipe_packaging ?? tipeAwal);

  const defaultForm = {
    nama: '',
    ukuran_label_ml: '',
    ukuran_aktual_ml: '',
    harga_rupiah: '',
    harga_dollar: '',
    catatan_teknis: '',
    catatan: '',
    stok: '',
    tipe_spray: 'Biasa',
  };

  const [form, setForm] = useState(defaultForm);

  useEffect(() => {
    if (item) {
      setForm({
        nama: item.nama ?? '',
        ukuran_label_ml: item.ukuran_label_ml ?? '',
        ukuran_aktual_ml: item.ukuran_aktual_ml ?? '',
        harga_rupiah: item.harga_rupiah ?? '',
        harga_dollar: item.harga_dollar ?? '',
        catatan_teknis: item.catatan_teknis ?? '',
        catatan: item.catatan ?? '',
        stok: item.stok ?? '',
        tipe_spray: item.tipe ?? 'Biasa',
      });
    }
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

  const entity = ENTITY_MAP[tipe];

  const mutation = useMutation({
    mutationFn: (data) => item ? entity.update(item.id, data) : entity.create(data),
    onSuccess: onSaved,
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    const base = {
      nama: form.nama,
      harga_rupiah: parseFloat(form.harga_rupiah),
      harga_dollar: form.harga_dollar ? parseFloat(form.harga_dollar) : undefined,
      stok: form.stok ? parseInt(form.stok) : undefined,
    };

    if (tipe === 'botol') {
      mutation.mutate({
        ...base,
        ukuran_label_ml: parseFloat(form.ukuran_label_ml),
        ukuran_aktual_ml: form.ukuran_aktual_ml ? parseFloat(form.ukuran_aktual_ml) : undefined,
        catatan_teknis: form.catatan_teknis || undefined,
      });
    } else if (tipe === 'tutup') {
      mutation.mutate({ ...base, catatan: form.catatan || undefined });
    } else if (tipe === 'spray') {
      mutation.mutate({ ...base, tipe: form.tipe_spray });
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b border-border">
          <h3 className="font-display font-semibold text-lg">{item ? 'Edit' : 'Tambah'} Packaging</h3>
          <Button variant="ghost" size="icon" onClick={onClose}><X className="w-4 h-4" /></Button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {/* Tipe selector — hanya untuk tambah baru */}
          {!item && (
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-2 block">Tipe Packaging *</label>
              <div className="flex gap-2">
                {TIPE_OPTIONS.map(t => (
                  <button key={t.value} type="button" onClick={() => setTipe(t.value)}
                    className={`flex-1 py-2.5 rounded-xl border text-sm font-medium transition-all ${tipe === t.value ? 'bg-accent text-accent-foreground border-accent' : 'border-border text-muted-foreground hover:border-accent/50'}`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Nama *</label>
            <Input value={form.nama} onChange={e => set('nama', e.target.value)} placeholder={tipe === 'botol' ? 'Contoh: Botol Kaca Slim 30ml' : tipe === 'tutup' ? 'Contoh: Tutup Gold Magnetic' : 'Contoh: Spray Aluminium'} required />
          </div>

          {/* Field khusus Botol */}
          {tipe === 'botol' && (
            <>
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
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Catatan Teknis</label>
                <Input value={form.catatan_teknis} onChange={e => set('catatan_teknis', e.target.value)} placeholder="Contoh: rawan rembes jika diisi full" />
              </div>
            </>
          )}

          {/* Field khusus Spray */}
          {tipe === 'spray' && (
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-2 block">Tipe Spray *</label>
              <div className="flex gap-2">
                {SPRAY_TYPES.map(t => (
                  <button key={t} type="button" onClick={() => set('tipe_spray', t)}
                    className={`flex-1 py-2.5 rounded-xl border text-sm font-medium transition-all ${form.tipe_spray === t ? 'bg-accent text-accent-foreground border-accent' : 'border-border text-muted-foreground hover:border-accent/50'}`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Field khusus Tutup */}
          {tipe === 'tutup' && (
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Catatan</label>
              <Input value={form.catatan} onChange={e => set('catatan', e.target.value)} placeholder="Opsional" />
            </div>
          )}

          {/* Harga */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Harga USD ($)</label>
              <Input type="number" step="0.01" value={form.harga_dollar} onChange={e => setForm(p => ({ ...p, harga_dollar: e.target.value, _lastEdited: 'dollar' }))} placeholder="0.00" />
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
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Stok (pcs)</label>
            <Input type="number" value={form.stok} onChange={e => set('stok', e.target.value)} placeholder="0" />
          </div>

          <div className="flex gap-2 pt-2">
            <Button type="button" variant="outline" onClick={onClose} className="flex-1">Batal</Button>
            <Button type="submit" disabled={mutation.isPending} className="flex-1 bg-accent hover:bg-accent/90 text-accent-foreground">
              {mutation.isPending ? 'Menyimpan...' : 'Simpan'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}