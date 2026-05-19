import React, { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Pencil, Trash2 } from 'lucide-react';
import PicSelector from '@/components/shared/PicSelector';

export default function BarangMasukEditForm({ record, onClose, onSaved }) {
  const [form, setForm] = useState({
    nomor_referensi: record.nomor_referensi || '',
    tanggal: record.tanggal || '',
    supplier: record.supplier || '',
    ekspedisi: record.ekspedisi || '',
    ongkir: record.ongkir ?? '',
    ongkir_dibayar_oleh: record.ongkir_dibayar_oleh || 'Perusahaan',
    pic: record.pic || '',
    catatan: record.catatan || '',
    items: record.items ? [...record.items] : [],
  });

  const updateMutation = useMutation({
    mutationFn: (data) => base44.entities.BarangMasuk.update(record.id, {
      ...data,
      ongkir: data.ongkir !== '' ? Number(data.ongkir) : 0,
    }),
    onSuccess: onSaved,
  });

  const updateItemField = (idx, field, value) => {
    setForm(f => {
      const items = [...f.items];
      items[idx] = { ...items[idx], [field]: field === 'jumlah' ? Number(value) : value };
      return { ...f, items };
    });
  };

  const removeItem = (idx) => setForm(f => ({ ...f, items: f.items.filter((_, i) => i !== idx) }));

  const handleSubmit = (e) => {
    e.preventDefault();
    updateMutation.mutate(form);
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Pencil className="w-4 h-4" /> Edit Barang Masuk
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Info Pengiriman */}
          <div className="bg-muted/30 rounded-xl p-4 space-y-3">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Info Pengiriman</p>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Tanggal *</Label>
                <Input type="date" value={form.tanggal} onChange={e => setForm(f => ({ ...f, tanggal: e.target.value }))} required />
              </div>
              <div className="space-y-1">
                <Label>No. Referensi / DO</Label>
                <Input value={form.nomor_referensi} onChange={e => setForm(f => ({ ...f, nomor_referensi: e.target.value }))} placeholder="Opsional" />
              </div>
              <div className="space-y-1 col-span-2">
                <Label>Supplier / Pengirim</Label>
                <Input value={form.supplier} onChange={e => setForm(f => ({ ...f, supplier: e.target.value }))} placeholder="Nama supplier..." />
              </div>
              <div className="space-y-1">
                <Label>Ekspedisi</Label>
                <Input value={form.ekspedisi} onChange={e => setForm(f => ({ ...f, ekspedisi: e.target.value }))} placeholder="JNE, JT, SiCepat, dll..." />
              </div>
              <div className="space-y-1">
                <Label>Ongkir (Rp)</Label>
                <Input type="number" min="0" value={form.ongkir} onChange={e => setForm(f => ({ ...f, ongkir: e.target.value }))} placeholder="0" />
              </div>
              <div className="space-y-1 col-span-2">
                <Label className="text-xs">Ongkir Dibayar Oleh</Label>
                <div className="flex gap-2">
                  {['Supplier', 'Perusahaan', 'Split'].map(opt => (
                    <button key={opt} type="button" onClick={() => setForm(f => ({ ...f, ongkir_dibayar_oleh: opt }))}
                      className={`flex-1 py-1.5 rounded-lg border text-xs font-medium transition-all ${form.ongkir_dibayar_oleh === opt ? 'bg-primary text-primary-foreground border-primary' : 'border-border text-muted-foreground hover:border-primary/50'}`}>
                      {opt}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* PIC */}
          <PicSelector
            value={form.pic}
            onChange={v => setForm(f => ({ ...f, pic: v }))}
          />

          {/* Items */}
          <div className="space-y-2">
            <Label className="text-xs font-semibold uppercase text-muted-foreground">Item ({form.items.length})</Label>
            {form.items.length === 0 && (
              <p className="text-xs text-muted-foreground text-center py-3 bg-muted/20 rounded-lg">Tidak ada item</p>
            )}
            {form.items.map((item, idx) => (
              <div key={idx} className="flex items-center gap-2 p-3 border rounded-xl bg-muted/20">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold truncate">{item.nama_barang}</p>
                  <Badge variant="outline" className="text-xs mt-0.5">{item.kategori}</Badge>
                </div>
                <div className="flex items-center gap-1">
                  <Input type="number" min="0" value={item.jumlah} onChange={e => updateItemField(idx, 'jumlah', e.target.value)}
                    className="w-20 h-8 text-sm text-center" />
                  <span className="text-xs text-muted-foreground w-8">{item.satuan}</span>
                  <Button type="button" variant="ghost" size="icon" className="w-7 h-7 text-destructive/60 hover:text-destructive"
                    onClick={() => removeItem(idx)}>
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            ))}
          </div>

          <div className="space-y-1">
            <Label>Catatan</Label>
            <Textarea value={form.catatan} onChange={e => setForm(f => ({ ...f, catatan: e.target.value }))} rows={2} placeholder="Opsional..." />
          </div>

          <div className="flex gap-2 pt-1">
            <Button type="button" variant="outline" className="flex-1" onClick={onClose}>Batal</Button>
            <Button type="submit" className="flex-1" disabled={updateMutation.isPending}>
              {updateMutation.isPending ? 'Menyimpan...' : 'Simpan Perubahan'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}