import React, { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Plus, Trash2, Wrench } from 'lucide-react';

const fmt = (n) => new Intl.NumberFormat('id-ID').format(Math.round(n || 0));

const emptyTier = () => ({ qty_min: 0, qty_max: null, harga: 0, label: '' });

export default function JasaForm({ item, onClose, onSaved }) {
  const queryClient = useQueryClient();

  const [form, setForm] = useState({
    nama: '',
    deskripsi: '',
    tiers: [emptyTier()],
  });

  useEffect(() => {
    if (item) {
      setForm({
        nama: item.nama || '',
        deskripsi: item.deskripsi || '',
        tiers: item.tiers?.length ? item.tiers : [emptyTier()],
      });
    }
  }, [item]);

  const mutation = useMutation({
    mutationFn: (data) => item
      ? base44.entities.Jasa.update(item.id, data)
      : base44.entities.Jasa.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['jasa'] });
      onSaved();
    },
  });

  const updateTier = (idx, field, val) => {
    setForm(prev => {
      const tiers = [...prev.tiers];
      tiers[idx] = { ...tiers[idx], [field]: val };
      return { ...prev, tiers };
    });
  };

  const addTier = () => setForm(prev => ({ ...prev, tiers: [...prev.tiers, emptyTier()] }));
  const removeTier = (idx) => setForm(prev => ({ ...prev, tiers: prev.tiers.filter((_, i) => i !== idx) }));

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.nama.trim() || form.tiers.length === 0) return;
    mutation.mutate(form);
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wrench className="w-5 h-5" />
            {item ? 'Edit Jasa' : 'Tambah Jasa'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-3">
            <div className="space-y-1">
              <Label>Nama Jasa <span className="text-destructive">*</span></Label>
              <Input
                value={form.nama}
                onChange={e => setForm(p => ({ ...p, nama: e.target.value }))}
                placeholder="Contoh: Jasa Proses 30ml"
                required
              />
            </div>
            <div className="space-y-1">
              <Label>Deskripsi</Label>
              <Input
                value={form.deskripsi}
                onChange={e => setForm(p => ({ ...p, deskripsi: e.target.value }))}
                placeholder="Opsional..."
              />
            </div>
          </div>

          {/* Tiers */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <Label className="text-sm font-semibold">Tier Harga (Berdasarkan Qty)</Label>
              <Button type="button" size="sm" variant="outline" onClick={addTier} className="h-7 text-xs gap-1">
                <Plus className="w-3 h-3" /> Tambah Tier
              </Button>
            </div>

            <div className="space-y-3">
              {form.tiers.map((tier, idx) => (
                <div key={idx} className="bg-muted/40 rounded-xl p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-muted-foreground">Tier {idx + 1}</span>
                    {form.tiers.length > 1 && (
                      <Button type="button" variant="ghost" size="icon" className="h-6 w-6 text-destructive/60 hover:text-destructive" onClick={() => removeTier(idx)}>
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    )}
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <div className="space-y-1">
                      <label className="text-[10px] text-muted-foreground font-medium">Qty Min</label>
                      <Input
                        type="number"
                        min="0"
                        value={tier.qty_min}
                        onChange={e => updateTier(idx, 'qty_min', Number(e.target.value))}
                        className="h-8 text-sm"
                        placeholder="0"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] text-muted-foreground font-medium">Qty Max (kosong = ∞)</label>
                      <Input
                        type="number"
                        min="0"
                        value={tier.qty_max ?? ''}
                        onChange={e => updateTier(idx, 'qty_max', e.target.value === '' ? null : Number(e.target.value))}
                        className="h-8 text-sm"
                        placeholder="∞"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] text-muted-foreground font-medium">Harga / pcs (Rp)</label>
                      <Input
                        type="number"
                        min="0"
                        value={tier.harga}
                        onChange={e => updateTier(idx, 'harga', Number(e.target.value))}
                        className="h-8 text-sm"
                        placeholder="0"
                      />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] text-muted-foreground font-medium">Label (opsional)</label>
                    <Input
                      value={tier.label}
                      onChange={e => updateTier(idx, 'label', e.target.value)}
                      className="h-7 text-xs"
                      placeholder={`Contoh: ${tier.qty_min === 0 ? '< 500 pcs' : `≥ ${tier.qty_min} pcs`}`}
                    />
                  </div>
                  <p className="text-[11px] text-accent font-semibold">
                    Harga: Rp {fmt(tier.harga)} / pcs
                    {tier.qty_max ? ` (qty ${tier.qty_min}–${tier.qty_max})` : ` (qty ≥ ${tier.qty_min})`}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t">
            <Button type="button" variant="outline" onClick={onClose}>Batal</Button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? 'Menyimpan...' : 'Simpan'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}