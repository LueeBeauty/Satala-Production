import React, { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

export default function StockItemForm({ item, onClose, onSaved }) {
  const isEdit = !!item;
  const [form, setForm] = useState({
    nama: item?.nama || '',
    kode: item?.kode || '',
    kategori: item?.kategori || 'Bahan',
    satuan: item?.satuan || '',
    stok_saat_ini: item?.stok_saat_ini ?? 0,
    stok_minimum: item?.stok_minimum ?? 0,
    deskripsi: item?.deskripsi || '',
  });

  const mutation = useMutation({
    mutationFn: (data) => isEdit
      ? base44.entities.StockItem.update(item.id, data)
      : base44.entities.StockItem.create(data),
    onSuccess: onSaved,
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    mutation.mutate({ ...form, stok_saat_ini: Number(form.stok_saat_ini), stok_minimum: Number(form.stok_minimum) });
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit Barang' : 'Tambah Barang Baru'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1 col-span-2">
              <Label>Nama Barang *</Label>
              <Input value={form.nama} onChange={e => setForm(p => ({ ...p, nama: e.target.value }))} required />
            </div>
            <div className="space-y-1">
              <Label>Kode</Label>
              <Input value={form.kode} onChange={e => setForm(p => ({ ...p, kode: e.target.value }))} placeholder="Opsional" />
            </div>
            <div className="space-y-1">
              <Label>Kategori *</Label>
              <Select value={form.kategori} onValueChange={v => setForm(p => ({ ...p, kategori: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Bahan">Bahan</SelectItem>
                  <SelectItem value="Kemasan">Kemasan</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Satuan *</Label>
              <Input value={form.satuan} onChange={e => setForm(p => ({ ...p, satuan: e.target.value }))} placeholder="pcs, kg, liter..." required />
            </div>
            <div className="space-y-1">
              <Label>Stok Awal</Label>
              <Input type="number" min="0" value={form.stok_saat_ini} onChange={e => setForm(p => ({ ...p, stok_saat_ini: e.target.value }))} />
            </div>
            <div className="space-y-1 col-span-2">
              <Label>Stok Minimum (untuk warning)</Label>
              <Input type="number" min="0" value={form.stok_minimum} onChange={e => setForm(p => ({ ...p, stok_minimum: e.target.value }))} />
            </div>
            <div className="space-y-1 col-span-2">
              <Label>Deskripsi</Label>
              <Textarea value={form.deskripsi} onChange={e => setForm(p => ({ ...p, deskripsi: e.target.value }))} rows={2} placeholder="Opsional..." />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={onClose}>Batal</Button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? 'Menyimpan...' : isEdit ? 'Simpan Perubahan' : 'Tambah Barang'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}