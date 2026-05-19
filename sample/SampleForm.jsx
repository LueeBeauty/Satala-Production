import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { X, Plus, Trash2, AlertCircle, CheckCircle2 } from 'lucide-react';
import { needsLiterConversion } from '@/lib/unitConverter';
import PicSelector from '@/components/shared/PicSelector';

const KATEGORI_BAHAN = ['Bibit', 'Alkohol', 'Aqua Des', 'DPG', 'Peg', 'Sustain', 'Lainnya'];
const PARFAROME_GRADE = ['Deluxe', 'Premium', 'Exclusive'];
const UKURAN_OPTIONS = [5, 10, 20];
const KATEGORI_SAMPLE = ['SPL', 'Tes Aroma', 'Lainnya'];
const LABEL_OPTIONS = ['A', 'B', 'C', 'D', 'E', 'F'];

const emptyBahan = () => ({ kategori_bahan: 'Bibit', vendor: '', nama_bahan: '', persentase: 0, volume_ml: 0 });

export default function SampleForm({ item, onClose, onSaved }) {
  const qc = useQueryClient();
  const isEdit = !!item?.id;

  const [form, setForm] = useState({
    nama_brand: item?.nama_brand || '',
    nama_produk: item?.nama_produk || '',
    ukuran_ml: item?.ukuran_ml || 10,
    kategori: item?.kategori || 'SPL',
    label: item?.label || 'A',
    pic: item?.pic || '',
    catatan: item?.catatan || '',
    racikan: item?.racikan || [],
    status: item?.status || 'pending',
    catatan_review: item?.catatan_review || '',
  });

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const addBahan = () => set('racikan', [...form.racikan, emptyBahan()]);
  const removeBahan = (i) => set('racikan', form.racikan.filter((_, idx) => idx !== i));
  const updateBahan = (i, k, v) => {
    const updated = form.racikan.map((r, idx) => {
      if (idx !== i) return r;
      const next = { ...r, [k]: v };
      if (k === 'persentase') {
        next.volume_ml = parseFloat(((Number(v) / 100) * form.ukuran_ml).toFixed(2));
      }
      return next;
    });
    set('racikan', updated);
  };

  // Recalc volumes when ukuran_ml changes
  const handleUkuran = (ml) => {
    const updatedRacikan = form.racikan.map(r => ({
      ...r,
      volume_ml: parseFloat(((r.persentase / 100) * ml).toFixed(2)),
    }));
    setForm(p => ({ ...p, ukuran_ml: ml, racikan: updatedRacikan }));
  };

  const totalPersen = form.racikan.reduce((s, r) => s + (Number(r.persentase) || 0), 0);
  const isValid = Math.abs(totalPersen - 100) < 0.01;

  const saveMut = useMutation({
    mutationFn: (data) =>
      isEdit
        ? base44.entities.SampleRacikan.update(item.id, data)
        : base44.entities.SampleRacikan.create(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['sample-racikan'] });
      onSaved?.();
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!isValid && form.racikan.length > 0) return;
    saveMut.mutate(form);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-start justify-center p-4 overflow-y-auto">
      <div className="bg-card rounded-2xl shadow-2xl w-full max-w-2xl my-8">
        <div className="flex items-center justify-between p-6 border-b border-border">
          <h3 className="text-lg font-semibold">{isEdit ? 'Edit' : 'Tambah'} Sample</h3>
          <Button variant="ghost" size="icon" onClick={onClose}><X className="w-4 h-4" /></Button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Info Dasar */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Nama Brand *</label>
              <Input value={form.nama_brand} onChange={e => set('nama_brand', e.target.value)} placeholder="Misal: Cielmora" required />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Nama Produk *</label>
              <Input value={form.nama_produk} onChange={e => set('nama_produk', e.target.value)} placeholder="Misal: Sun Zest" required />
            </div>
          </div>

          {/* Ukuran + Kategori + Label */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Ukuran Sample</label>
              <div className="flex gap-2">
                {UKURAN_OPTIONS.map(ml => (
                  <button key={ml} type="button" onClick={() => handleUkuran(ml)}
                    className={`flex-1 py-1.5 rounded-lg border text-sm font-medium transition-all ${form.ukuran_ml === ml ? 'bg-accent text-accent-foreground border-accent' : 'border-border text-muted-foreground hover:border-accent/50'}`}>
                    {ml}ml
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Kategori</label>
              <div className="flex flex-wrap gap-1.5">
                {KATEGORI_SAMPLE.map(k => (
                  <button key={k} type="button" onClick={() => set('kategori', k)}
                    className={`px-2.5 py-1 rounded-lg border text-xs font-medium transition-all ${form.kategori === k ? 'bg-accent text-accent-foreground border-accent' : 'border-border text-muted-foreground hover:border-accent/50'}`}>
                    {k}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Label Sample</label>
              <div className="flex flex-wrap gap-1.5">
                {LABEL_OPTIONS.map(l => (
                  <button key={l} type="button" onClick={() => set('label', l)}
                    className={`w-8 h-8 rounded-lg border text-sm font-bold transition-all ${form.label === l ? 'bg-primary text-primary-foreground border-primary' : 'border-border text-muted-foreground hover:border-primary/50'}`}>
                    {l}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Racikan */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <div>
                <h4 className="text-sm font-semibold">Racikan Bahan</h4>
                <p className="text-xs text-muted-foreground">Acuan: {form.ukuran_ml}ml</p>
              </div>
              <div className="flex items-center gap-2">
                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${isValid ? 'bg-green-100 text-green-700' : totalPersen > 100 ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>
                  {totalPersen.toFixed(1)}% / 100%
                </span>
                <Button type="button" size="sm" variant="outline" onClick={addBahan} className="h-7 text-xs gap-1">
                  <Plus className="w-3 h-3" /> Tambah Bahan
                </Button>
              </div>
            </div>

            {form.racikan.length === 0 && (
              <div className="text-center py-6 border border-dashed border-border rounded-xl text-muted-foreground text-sm">
                Belum ada bahan. Klik "Tambah Bahan" untuk memulai.
              </div>
            )}

            <div className="space-y-3">
              {form.racikan.map((row, i) => (
                <div key={i} className="bg-muted/30 rounded-xl p-3 space-y-2">
                  {/* Row 1: kategori */}
                  <div className="flex gap-2 flex-wrap">
                    {KATEGORI_BAHAN.map(k => (
                      <button key={k} type="button" onClick={() => updateBahan(i, 'kategori_bahan', k)}
                        className={`px-2.5 py-1 rounded-lg border text-xs font-medium transition-all ${row.kategori_bahan === k ? 'bg-accent text-accent-foreground border-accent' : 'border-border text-muted-foreground hover:border-accent/50'}`}>
                        {k}
                      </button>
                    ))}
                    <Button type="button" variant="ghost" size="icon" className="w-7 h-7 text-destructive/60 hover:text-destructive ml-auto" onClick={() => removeBahan(i)}>
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                  {/* Row 2: vendor (khusus bibit) + nama bahan + persen */}
                  <div className="grid grid-cols-12 gap-2">
                    {row.kategori_bahan === 'Bibit' && (
                      <div className="col-span-3">
                        <label className="text-[10px] text-muted-foreground block mb-0.5">Vendor *</label>
                        <Input
                          value={row.vendor}
                          onChange={e => updateBahan(i, 'vendor', e.target.value)}
                          placeholder="Nama vendor"
                          className="h-8 text-xs"
                        />
                      </div>
                    )}
                    {row.kategori_bahan === 'Bibit' && row.vendor?.toLowerCase().includes('parfarome') && (
                      <div className="col-span-12">
                        <label className="text-[10px] text-amber-600 font-semibold block mb-0.5">Grade Parfarome * (wajib pilih)</label>
                        <div className="flex gap-1.5">
                          {PARFAROME_GRADE.map(g => (
                            <button key={g} type="button" onClick={() => updateBahan(i, 'grade', g)}
                              className={`px-3 py-1 rounded-lg border text-xs font-semibold transition-all ${row.grade === g ? 'bg-amber-500 text-white border-amber-500' : 'border-amber-300 text-amber-700 hover:border-amber-500'}`}>
                              {g}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                    <div className={row.kategori_bahan === 'Bibit' ? 'col-span-5' : 'col-span-8'}>
                      <label className="text-[10px] text-muted-foreground block mb-0.5">Nama Bahan *</label>
                      <Input
                        value={row.nama_bahan}
                        onChange={e => updateBahan(i, 'nama_bahan', e.target.value)}
                        placeholder="Nama bahan"
                        className="h-8 text-xs"
                      />
                    </div>
                    <div className="col-span-2">
                      <label className="text-[10px] text-muted-foreground block mb-0.5">% *</label>
                      <Input
                        type="number" min="0" max="100" step="0.1"
                        value={row.persentase}
                        onChange={e => updateBahan(i, 'persentase', parseFloat(e.target.value) || 0)}
                        className="h-8 text-xs"
                      />
                    </div>
                    <div className="col-span-2">
                      <label className="text-[10px] text-muted-foreground block mb-0.5">Volume</label>
                      {(() => {
                        const isLiter = needsLiterConversion('', row.kategori_bahan);
                        const volGram = isLiter && row.volume_ml > 0 ? row.volume_ml / 0.8 : null;
                        return (
                          <div className="h-8 flex items-center px-2 bg-muted rounded-md text-xs text-muted-foreground font-medium">
                            {volGram !== null
                              ? <span><span className="text-accent font-semibold">{parseFloat(volGram.toFixed(2))}g</span><span className="font-normal">/{row.volume_ml}ml</span></span>
                              : `${row.volume_ml || 0} ml`}
                          </div>
                        );
                      })()}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {form.racikan.length > 0 && !isValid && (
              <div className={`mt-2 flex items-center gap-2 text-xs rounded-lg px-3 py-2 ${totalPersen > 100 ? 'bg-red-50 text-red-700 border border-red-200' : 'bg-amber-50 text-amber-700 border border-amber-200'}`}>
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                {totalPersen > 100 ? `Melebihi 100% (${totalPersen.toFixed(1)}%)` : `Kurang ${(100 - totalPersen).toFixed(1)}% lagi`}
              </div>
            )}
            {isValid && form.racikan.length > 0 && (
              <div className="mt-2 flex items-center gap-2 text-xs text-green-700 bg-green-50 border border-green-200 rounded-lg px-3 py-2">
                <CheckCircle2 className="w-3.5 h-3.5" /> Racikan valid 100%
              </div>
            )}
          </div>

          {/* PIC */}
          <PicSelector
            label="Penanggung Jawab (PIC)"
            value={form.pic}
            onChange={v => set('pic', v)}
          />

          {/* Catatan */}
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Catatan</label>
            <Input value={form.catatan} onChange={e => set('catatan', e.target.value)} placeholder="Catatan tambahan (opsional)" />
          </div>

          <div className="flex gap-3 pt-2 border-t border-border">
            <Button type="button" variant="outline" onClick={onClose} className="flex-1">Batal</Button>
            <Button
              type="submit"
              disabled={saveMut.isPending || !form.nama_brand.trim() || !form.nama_produk.trim() || (form.racikan.length > 0 && !isValid)}
              className="flex-1"
            >
              {saveMut.isPending ? 'Menyimpan...' : isEdit ? 'Simpan Perubahan' : 'Buat Sample'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}