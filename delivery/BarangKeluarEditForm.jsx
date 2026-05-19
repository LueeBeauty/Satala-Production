import React, { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Pencil, Trash2 } from 'lucide-react';
import PicSelector from '@/components/shared/PicSelector';

const ALASAN = ['Produksi (PO)', 'Penjualan', 'Retur ke Supplier', 'Pemakaian Internal', 'Rusak/Dispose', 'Lainnya'];

export default function BarangKeluarEditForm({ record, onClose, onSaved }) {
  const [form, setForm] = useState({
    nomor_referensi: record.nomor_referensi || '',
    tanggal: record.tanggal || '',
    tujuan: record.tujuan || '',
    alasan: record.alasan || '',
    ekspedisi: record.ekspedisi || '',
    ongkir: record.ongkir ?? '',
    ongkir_dibayar_oleh: record.ongkir_dibayar_oleh || 'Perusahaan',
    pic: record.pic || '',
    catatan: record.catatan || '',
    items: record.items ? [...record.items] : [],
  });

  const updateMutation = useMutation({
    mutationFn: (data) => base44.entities.BarangKeluar.update(record.id, {
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
            <Pencil className="w-4 h-4" /> Edit Barang Keluar
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
                <Label>No. Referensi</Label>
                <Input value={form.nomor_referensi} onChange={e => setForm(f => ({ ...f, nomor_referensi: e.target.value }))} placeholder="Opsional" />
              </div>
              <div className="space-y-1">
                <Label>Tujuan / Customer</Label>
                <Input value={form.tujuan} onChange={e => setForm(f => ({ ...f, tujuan: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <Label>Alasan</Label>
                <Select value={form.alasan} onValueChange={v => setForm(f => ({ ...f, alasan: v }))}>
                  <SelectTrigger><SelectValue placeholder="Pilih alasan" /></SelectTrigger>
                  <SelectContent>{ALASAN.map(a => <SelectItem key={a} value={a}>{a}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Ekspedisi</Label>
                <Input value={form.ekspedisi} onChange={e => setForm(f => ({ ...f, ekspedisi: e.target.value }))} placeholder="JNE, JT, SiCepat..." />
              </div>
              <div className="space-y-1">
                <Label>Ongkir (Rp)</Label>
                <Input type="number" min="0" value={form.ongkir} onChange={e => setForm(f => ({ ...f, ongkir: e.target.value }))} placeholder="0" />
              </div>
              <div className="space-y-1 col-span-2">
                <Label className="text-xs">Ongkir Dibayar Oleh</Label>
                <div className="flex gap-2">
                  {['Perusahaan', 'Customer', 'Split'].map(opt => (
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

          {/* Edit Items */}
          <div className="space-y-2">
            <Label className="text-xs font-semibold uppercase text-muted-foreground">Item ({form.items.length})</Label>
            {form.items.map((item, idx) => (
              <div key={idx} className="border rounded-xl p-3 bg-muted/10 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-semibold">{item.nama_barang}</span>
                    <Badge variant="outline" className="text-xs">{item.kategori}</Badge>
                  </div>
                  <Button type="button" variant="ghost" size="icon" className="w-7 h-7 text-destructive/60 hover:text-destructive"
                    onClick={() => removeItem(idx)}>
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <Input placeholder="Vendor" value={item.vendor || ''} onChange={e => updateItemField(idx, 'vendor', e.target.value)} className="h-8 text-sm" />
                  <Input type="number" min="0" value={item.jumlah} onChange={e => updateItemField(idx, 'jumlah', e.target.value)} className="h-8 text-sm text-center" />
                  <Input placeholder="Satuan" value={item.satuan || ''} onChange={e => updateItemField(idx, 'satuan', e.target.value)} className="h-8 text-sm" />
                </div>
              </div>
            ))}
          </div>

          <div className="space-y-1">
            <Label>Catatan</Label>
            <Textarea rows={2} value={form.catatan} onChange={e => setForm(f => ({ ...f, catatan: e.target.value }))} placeholder="Opsional..." />
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