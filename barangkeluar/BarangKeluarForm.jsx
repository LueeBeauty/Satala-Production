import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { X, Plus, PackageMinus } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

const ALASAN_OPTIONS = ['Penjualan', 'Retur ke Supplier', 'Pemakaian Internal', 'Rusak/Dispose', 'Lainnya'];

export default function BarangKeluarForm({ onClose, onSaved }) {
  const queryClient = useQueryClient();

  const [form, setForm] = useState({
    nomor_referensi: '',
    tanggal: new Date().toISOString().split('T')[0],
    tujuan: '',
    alasan: '',
    catatan: '',
    items: [],
  });

  const [newItem, setNewItem] = useState({ nama_barang: '', kategori: '', jumlah: '', satuan: 'pcs', item_id: '', item_tipe: '' });

  // Load stok options
  const { data: botolList = [] } = useQuery({ queryKey: ['botol'], queryFn: () => base44.entities.Botol.list() });
  const { data: tutupList = [] } = useQuery({ queryKey: ['tutup'], queryFn: () => base44.entities.Tutup.list() });
  const { data: sprayList = [] } = useQuery({ queryKey: ['spray'], queryFn: () => base44.entities.Spray.list() });
  const { data: bahanList = [] } = useQuery({ queryKey: ['bahan-cair'], queryFn: () => base44.entities.BahanCair.list() });
  const { data: itemList = [] } = useQuery({ queryKey: ['item-tambahan'], queryFn: () => base44.entities.ItemTambahan.list() });

  const allItems = [
    ...botolList.map(i => ({ ...i, _tipe: 'botol', _kat: 'Botol', _sat: 'pcs' })),
    ...tutupList.map(i => ({ ...i, _tipe: 'tutup', _kat: 'Tutup', _sat: 'pcs' })),
    ...sprayList.map(i => ({ ...i, _tipe: 'spray', _kat: 'Spray', _sat: 'pcs' })),
    ...bahanList.map(i => ({ ...i, _tipe: 'bahan', _kat: 'Bahan Cair', _sat: i.satuan || 'kg' })),
    ...itemList.map(i => ({ ...i, _tipe: 'item-tambahan', _kat: 'Item Tambahan', _sat: 'pcs' })),
  ];

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.BarangKeluar.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['barang-keluar'] });
      onSaved?.();
    },
  });

  const handleSelectItem = (id) => {
    const found = allItems.find(i => i.id === id);
    if (!found) return;
    setNewItem(prev => ({
      ...prev,
      nama_barang: found.nama,
      kategori: found._kat,
      satuan: found._sat,
      item_id: found.id,
      item_tipe: found._tipe,
    }));
  };

  const addItem = () => {
    if (!newItem.nama_barang || !newItem.jumlah) return;
    setForm(f => ({ ...f, items: [...f.items, { ...newItem, jumlah: Number(newItem.jumlah) }] }));
    setNewItem({ nama_barang: '', kategori: '', jumlah: '', satuan: 'pcs', item_id: '', item_tipe: '' });
  };

  const removeItem = (idx) => {
    setForm(f => ({ ...f, items: f.items.filter((_, i) => i !== idx) }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (form.items.length === 0) return alert('Tambahkan minimal 1 item');
    createMutation.mutate(form);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-card rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b">
          <div className="flex items-center gap-2">
            <PackageMinus className="w-5 h-5 text-red-600" />
            <h2 className="font-semibold text-lg">Input Barang Keluar</h2>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}><X className="w-4 h-4" /></Button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Nomor Referensi</Label>
              <Input
                placeholder="BK-001"
                value={form.nomor_referensi}
                onChange={e => setForm(f => ({ ...f, nomor_referensi: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Tanggal *</Label>
              <Input
                type="date"
                value={form.tanggal}
                onChange={e => setForm(f => ({ ...f, tanggal: e.target.value }))}
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Tujuan</Label>
              <Input
                placeholder="Nama pelanggan / tujuan"
                value={form.tujuan}
                onChange={e => setForm(f => ({ ...f, tujuan: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Alasan</Label>
              <Select value={form.alasan} onValueChange={v => setForm(f => ({ ...f, alasan: v }))}>
                <SelectTrigger><SelectValue placeholder="Pilih alasan" /></SelectTrigger>
                <SelectContent>
                  {ALASAN_OPTIONS.map(a => <SelectItem key={a} value={a}>{a}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Tambah Item */}
          <div className="space-y-2 border rounded-xl p-3 bg-muted/30">
            <Label className="text-xs font-semibold uppercase text-muted-foreground">Tambah Item</Label>
            <div className="space-y-2">
              <Select onValueChange={handleSelectItem}>
                <SelectTrigger><SelectValue placeholder="Pilih dari stok..." /></SelectTrigger>
                <SelectContent>
                  {allItems.map(i => (
                    <SelectItem key={i.id} value={i.id}>
                      [{i._kat}] {i.nama} (stok: {i.stok ?? '?'})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="grid grid-cols-3 gap-2">
                <Input
                  placeholder="Nama barang"
                  value={newItem.nama_barang}
                  onChange={e => setNewItem(p => ({ ...p, nama_barang: e.target.value }))}
                />
                <Input
                  type="number"
                  min="0"
                  placeholder="Jumlah"
                  value={newItem.jumlah}
                  onChange={e => setNewItem(p => ({ ...p, jumlah: e.target.value }))}
                />
                <Input
                  placeholder="Satuan"
                  value={newItem.satuan}
                  onChange={e => setNewItem(p => ({ ...p, satuan: e.target.value }))}
                />
              </div>
              <Button type="button" variant="outline" size="sm" className="gap-1" onClick={addItem}>
                <Plus className="w-3.5 h-3.5" /> Tambah
              </Button>
            </div>

            {form.items.length > 0 && (
              <div className="mt-2 space-y-1.5">
                {form.items.map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between bg-background rounded-lg px-3 py-2">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs">{item.kategori}</Badge>
                      <span className="text-sm font-medium">{item.nama_barang}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-red-600 font-semibold">-{item.jumlah} {item.satuan}</span>
                      <Button variant="ghost" size="icon" className="w-6 h-6" onClick={() => removeItem(idx)}>
                        <X className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-1.5">
            <Label>Catatan</Label>
            <Textarea
              placeholder="Catatan tambahan (opsional)"
              rows={2}
              value={form.catatan}
              onChange={e => setForm(f => ({ ...f, catatan: e.target.value }))}
            />
          </div>

          <div className="flex gap-2 pt-2">
            <Button type="button" variant="outline" className="flex-1" onClick={onClose}>Batal</Button>
            <Button type="submit" className="flex-1" disabled={createMutation.isPending}>
              {createMutation.isPending ? 'Menyimpan...' : 'Simpan Barang Keluar'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}