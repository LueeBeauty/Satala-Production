import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Plus, Trash2, AlertTriangle, Package } from 'lucide-react';

export default function ProduksiForm({ onClose, onSaved }) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({
    tanggal: new Date().toISOString().split('T')[0],
    tipe: 'Produksi',
    nama_produk: '',
    jumlah_produk: '',
    satuan_produk: '',
    catatan: '',
    operator: '',
  });
  const [bahan, setBahan] = useState([]);
  const [selectedItemId, setSelectedItemId] = useState('');
  const [jumlahInput, setJumlahInput] = useState('');

  const { data: rawInventory = [] } = useQuery({ queryKey: ['inventory'], queryFn: () => base44.entities.InventoryItem.list('item_name') });
  const { data: botolList = [] } = useQuery({ queryKey: ['botol'], queryFn: () => base44.entities.Botol.list() });
  const { data: tutupList = [] } = useQuery({ queryKey: ['tutup'], queryFn: () => base44.entities.Tutup.list() });
  const { data: sprayList = [] } = useQuery({ queryKey: ['spray'], queryFn: () => base44.entities.Spray.list() });
  const { data: bahanList = [] } = useQuery({ queryKey: ['bahan-cair'], queryFn: () => base44.entities.BahanCair.list() });

  const inventoryItems = useMemo(() => {
    const fromStok = [
      ...botolList.map(i => ({ id: `botol-${i.id}`, _stokId: i.id, _entity: 'Botol', item_name: i.nama, category: 'botol', total_stock: i.stok ?? 0, unit: 'pcs' })),
      ...tutupList.map(i => ({ id: `tutup-${i.id}`, _stokId: i.id, _entity: 'Tutup', item_name: i.nama, category: 'tutup', total_stock: i.stok ?? 0, unit: 'pcs' })),
      ...sprayList.map(i => ({ id: `spray-${i.id}`, _stokId: i.id, _entity: 'Spray', item_name: i.nama, category: 'spray', total_stock: i.stok ?? 0, unit: 'pcs' })),
      ...bahanList.map(i => ({ id: `bahan-${i.id}`, _stokId: i.id, _entity: 'BahanCair', item_name: i.nama, category: i.kategori || 'Bibit', total_stock: i.stok ?? 0, unit: i.satuan || 'kg', vendor: i.vendor || '' })),
    ];
    const stokIds = new Set(fromStok.map(i => i.item_name?.toLowerCase()));
    return [...fromStok, ...rawInventory.filter(i => !stokIds.has(i.item_name?.toLowerCase()))];
  }, [botolList, tutupList, sprayList, bahanList, rawInventory]);

  const addBahan = () => {
    const found = inventoryItems.find(s => s.id === selectedItemId);
    if (!found || !jumlahInput || Number(jumlahInput) <= 0) return;
    if (bahan.find(b => b.inventory_item_id === selectedItemId)) return;

    setBahan(prev => [...prev, {
      inventory_item_id: found.id,
      nama_barang: found.item_name,
      kategori: found.category,
      satuan: found.unit || 'pcs',
      jumlah_digunakan: Number(jumlahInput),
      stok_tersedia: found.total_stock || 0,
    }]);
    setSelectedItemId('');
    setJumlahInput('');
  };

  const removeBahan = (idx) => setBahan(prev => prev.filter((_, i) => i !== idx));

  const saveMutation = useMutation({
    mutationFn: async (data) => {
      const me = await base44.auth.me();
      const bahanClean = bahan.map(({ stok_tersedia, inventory_item_id, ...rest }) => ({
        ...rest,
        stock_item_id: inventory_item_id,
      }));
      await base44.entities.Produksi.create({
        ...data,
        bahan_digunakan: bahanClean,
        operator: me.email,
        jumlah_produk: data.jumlah_produk ? Number(data.jumlah_produk) : undefined,
      });
      // Kurangi stok di entity yang sesuai
      for (const b of bahan) {
        const existing = inventoryItems.find(s => s.id === b.inventory_item_id);
        if (existing) {
          const newStok = Math.max(0, (existing.total_stock || 0) - b.jumlah_digunakan);
          if (existing._entity === 'Botol') await base44.entities.Botol.update(existing._stokId, { stok: newStok });
          else if (existing._entity === 'Tutup') await base44.entities.Tutup.update(existing._stokId, { stok: newStok });
          else if (existing._entity === 'Spray') await base44.entities.Spray.update(existing._stokId, { stok: newStok });
          else if (existing._entity === 'BahanCair') await base44.entities.BahanCair.update(existing._stokId, { stok: newStok });
          else await base44.entities.InventoryItem.update(b.inventory_item_id, { total_stock: newStok });
        }
      }
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
      queryClient.invalidateQueries({ queryKey: ['botol'] });
      queryClient.invalidateQueries({ queryKey: ['tutup'] });
      queryClient.invalidateQueries({ queryKey: ['spray'] });
      queryClient.invalidateQueries({ queryKey: ['bahan-cair'] });
    },
    onSuccess: onSaved,
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    saveMutation.mutate(form);
  };

  const available = inventoryItems.filter(s => !bahan.find(b => b.inventory_item_id === s.id));
  const hasStockWarning = bahan.some(b => b.jumlah_digunakan > b.stok_tersedia);

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Catat Produksi / Sample</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Tanggal *</Label>
              <Input type="date" value={form.tanggal} onChange={e => setForm(p => ({ ...p, tanggal: e.target.value }))} required />
            </div>
            <div className="space-y-1">
              <Label>Tipe *</Label>
              <Select value={form.tipe} onValueChange={v => setForm(p => ({ ...p, tipe: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Produksi">Produksi</SelectItem>
                  <SelectItem value="Sample">Sample</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1 col-span-2">
              <Label>Nama Produk *</Label>
              <Input value={form.nama_produk} onChange={e => setForm(p => ({ ...p, nama_produk: e.target.value }))} placeholder="Contoh: Laliq 30ml" required />
            </div>
            <div className="space-y-1">
              <Label>Jumlah Dihasilkan</Label>
              <Input type="number" min="0" value={form.jumlah_produk} onChange={e => setForm(p => ({ ...p, jumlah_produk: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <Label>Satuan</Label>
              <Input value={form.satuan_produk} onChange={e => setForm(p => ({ ...p, satuan_produk: e.target.value }))} placeholder="pcs, botol, dll..." />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Bahan / Komponen yang Digunakan</Label>
            <div className="flex gap-2">
              <Select value={selectedItemId} onValueChange={setSelectedItemId}>
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder="Pilih dari inventori..." />
                </SelectTrigger>
                <SelectContent>
                  {available.map(s => (
                    <SelectItem key={s.id} value={s.id}>
                      <span className="flex items-center gap-1.5">
                        <Package className="w-3 h-3 text-amber-500" />
                        {s.item_name}
                        <span className="text-muted-foreground text-xs capitalize">({s.category})</span>
                        <span className="text-muted-foreground text-xs">Stok: {s.total_stock || 0} {s.unit}</span>
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input
                type="number" min="1"
                value={jumlahInput}
                onChange={e => setJumlahInput(e.target.value)}
                placeholder="Jml"
                className="w-20"
              />
              <Button type="button" onClick={addBahan} size="icon" disabled={!selectedItemId || !jumlahInput}>
                <Plus className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {hasStockWarning && (
            <div className="flex items-center gap-2 text-sm text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              Beberapa bahan melebihi stok yang tersedia!
            </div>
          )}

          {bahan.length > 0 && (
            <div className="border rounded-lg overflow-hidden">
              <div className="bg-muted px-3 py-2 text-xs font-semibold text-muted-foreground grid grid-cols-4">
                <span className="col-span-2">Bahan</span>
                <span className="text-center">Digunakan</span>
                <span></span>
              </div>
              {bahan.map((b, idx) => {
                const isOver = b.jumlah_digunakan > b.stok_tersedia;
                return (
                  <div key={idx} className={`px-3 py-2.5 grid grid-cols-4 items-center border-t ${isOver ? 'bg-red-50' : ''}`}>
                    <div className="col-span-2">
                      <p className="text-sm font-medium">{b.nama_barang}</p>
                      <p className="text-xs text-muted-foreground capitalize">{b.kategori} • Stok: {b.stok_tersedia} {b.satuan}</p>
                    </div>
                    <div className="text-center">
                      <p className={`text-sm font-semibold ${isOver ? 'text-destructive' : 'text-foreground'}`}>
                        -{b.jumlah_digunakan} {b.satuan}
                      </p>
                      {isOver && <AlertTriangle className="w-3 h-3 text-destructive mx-auto" />}
                    </div>
                    <div className="flex justify-end">
                      <Button type="button" variant="ghost" size="icon" className="w-7 h-7 text-destructive" onClick={() => removeBahan(idx)}>
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <div className="space-y-1">
            <Label>Catatan</Label>
            <Textarea value={form.catatan} onChange={e => setForm(p => ({ ...p, catatan: e.target.value }))} rows={2} placeholder="Opsional..." />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={onClose}>Batal</Button>
            <Button type="submit" disabled={saveMutation.isPending}>
              {saveMutation.isPending ? 'Menyimpan...' : 'Simpan'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}