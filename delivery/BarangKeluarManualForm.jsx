import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import {
  Plus, X, PackageMinus, Search, ChevronRight, Package,
  Box, Wind, Lock, Bookmark, Archive, ShoppingBag, Leaf, Microscope,
  Pipette, Sparkles, FlaskConical, Tag, Droplets, PackageOpen
} from 'lucide-react';
import PicSelector from '@/components/shared/PicSelector';

const ALASAN = ['Produksi (PO)', 'Penjualan', 'Retur ke Supplier', 'Pemakaian Internal', 'Rusak/Dispose', 'Lainnya'];

// ─── Definisi tipe & kategori (sama dengan barang masuk) ─────────────────────
const TIPE_BARANG = [
  { id: 'packaging', label: 'Packaging', Icon: PackageOpen, desc: 'Botol, spray, tutup, segel, dll', bg: 'bg-slate-50 hover:bg-slate-100 border-slate-200', iconColor: 'text-slate-600', text: 'text-slate-700' },
  { id: 'bahan_cair', label: 'Bahan Cair', Icon: FlaskConical, desc: 'Bibit, alkohol, bahan campuran, dll', bg: 'bg-teal-50 hover:bg-teal-100 border-teal-200', iconColor: 'text-teal-600', text: 'text-teal-700' },
  { id: 'item_tambahan', label: 'Item Tambahan', Icon: Tag, desc: 'Stiker, dus, gift card, dll', bg: 'bg-rose-50 hover:bg-rose-100 border-rose-200', iconColor: 'text-rose-500', text: 'text-rose-700' },
];

const KATEGORI_MAP = {
  packaging: [
    { id: 'botol', label: 'Botol', Icon: Box },
    { id: 'spray', label: 'Spray', Icon: Wind },
    { id: 'tutup', label: 'Tutup', Icon: Lock },
    { id: 'segel', label: 'Segel', Icon: Bookmark },
    { id: 'kardus', label: 'Kardus', Icon: Archive },
    { id: 'plastik', label: 'Plastik', Icon: ShoppingBag },
    { id: 'lainnya_packaging', label: 'Lainnya', Icon: Plus },
  ],
  bahan_cair: [
    { id: 'bibit', label: 'Bibit', Icon: Leaf },
    { id: 'alkohol', label: 'Alkohol', Icon: Pipette },
    { id: 'air', label: 'Air / Solvent', Icon: Droplets },
    { id: 'bahan_aktif', label: 'Bahan Aktif', Icon: FlaskConical },
    { id: 'pewangi', label: 'Pewangi', Icon: Sparkles },
    { id: 'pengencer', label: 'Pengencer', Icon: Microscope },
    { id: 'lainnya_bahan', label: 'Lainnya', Icon: Plus },
  ],
  item_tambahan: [
    { id: 'Stiker', label: 'Stiker', Icon: Tag },
    { id: 'Dus', label: 'Dus', Icon: Package },
    { id: 'Gift Card', label: 'Gift Card', Icon: Bookmark },
    { id: 'Lainnya', label: 'Lainnya', Icon: Plus },
  ],
};

const KATEGORI_ALIAS = { lainnya_packaging: 'lainnya', lainnya_bahan: 'lainnya' };

// ─── Panel Pilih Item step-by-step ──────────────────────────────────────────
function PilihItemPanel({ inventoryItems, onItemAdded, onCancel }) {
  const [step, setStep] = useState('tipe');
  const [selectedTipe, setSelectedTipe] = useState(null);
  const [selectedKategori, setSelectedKategori] = useState(null);
  const [selectedItem, setSelectedItem] = useState(null);
  const [jumlah, setJumlah] = useState('');
  const [search, setSearch] = useState('');

  const tipeInfo = TIPE_BARANG.find(t => t.id === selectedTipe);
  const kategoriInfo = KATEGORI_MAP[selectedTipe]?.find(k => k.id === selectedKategori);

  const inventoriTerfilter = useMemo(() => {
    if (!selectedKategori) return [];
    if (selectedTipe === 'item_tambahan') {
      if (selectedKategori === 'Lainnya') return inventoryItems.filter(i => !['Stiker', 'Dus', 'Gift Card'].includes(i.category));
      return inventoryItems.filter(i => i.category === selectedKategori);
    }
    const normalizedKat = KATEGORI_ALIAS[selectedKategori] || selectedKategori;
    const knowCats = KATEGORI_MAP[selectedTipe]?.map(k => KATEGORI_ALIAS[k.id] || k.id).filter(k => !k.startsWith('lainnya')) || [];
    return inventoryItems.filter(item => {
      const cat = (item.category || '').toLowerCase();
      if (cat === normalizedKat || cat === selectedKategori) return true;
      if (selectedKategori.startsWith('lainnya') && !knowCats.includes(cat)) return true;
      return false;
    });
  }, [inventoryItems, selectedKategori, selectedTipe]);

  const filteredSearch = useMemo(() => {
    if (!search.trim()) return inventoriTerfilter.slice(0, 60);
    const q = search.toLowerCase();
    return inventoriTerfilter.filter(i => i.item_name?.toLowerCase().includes(q) || i.kode?.toLowerCase().includes(q)).slice(0, 60);
  }, [inventoriTerfilter, search]);

  const handleTambahkan = () => {
    if (!selectedItem || !jumlah || Number(jumlah) <= 0) return;
    const qty = Number(jumlah);
    if (qty > (selectedItem.total_stock ?? 0)) {
      if (!confirm(`Jumlah (${qty}) melebihi stok tersedia (${selectedItem.total_stock ?? 0} ${selectedItem.unit}). Lanjutkan?`)) return;
    }
    onItemAdded({
      inventory_item_id: selectedItem.id,
      _stokId: selectedItem._stokId,
      _entity: selectedItem._entity,
      nama_barang: selectedItem.item_name,
      kode: selectedItem.kode || '',
      kategori: selectedItem.category,
      tipe: selectedTipe,
      satuan: selectedItem.unit || 'pcs',
      jumlah: qty,
      vendor: selectedItem.vendor || '',
    });
    setStep('tipe');
    setSelectedTipe(null);
    setSelectedKategori(null);
    setSelectedItem(null);
    setJumlah('');
    setSearch('');
  };

  const breadcrumb = (
    <div className="flex items-center gap-1.5 text-xs flex-wrap mb-3">
      <button onClick={() => { setStep('tipe'); setSelectedTipe(null); setSelectedKategori(null); setSelectedItem(null); }}
        className={`font-medium ${step === 'tipe' ? 'text-foreground' : 'text-muted-foreground hover:text-foreground'}`}>Tipe</button>
      {selectedTipe && (<>
        <ChevronRight className="w-3 h-3 text-muted-foreground" />
        <button onClick={() => { setStep('kategori'); setSelectedKategori(null); setSelectedItem(null); }}
          className={`font-medium ${step === 'kategori' ? 'text-foreground' : 'text-muted-foreground hover:text-foreground'}`}>{tipeInfo?.label}</button>
      </>)}
      {selectedKategori && (<>
        <ChevronRight className="w-3 h-3 text-muted-foreground" />
        <button onClick={() => { setStep('item'); setSelectedItem(null); }}
          className={`font-medium ${step === 'item' ? 'text-foreground' : 'text-muted-foreground hover:text-foreground'}`}>{kategoriInfo?.label || selectedKategori}</button>
      </>)}
      {selectedItem && (<>
        <ChevronRight className="w-3 h-3 text-muted-foreground" />
        <span className="font-semibold text-foreground truncate max-w-[140px]">{selectedItem.item_name}</span>
      </>)}
    </div>
  );

  return (
    <div className="border-2 border-dashed border-red-300 rounded-xl p-4 bg-red-50/30 space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-red-700">− Tambah Item Keluar</p>
        <Button type="button" variant="ghost" size="sm" className="h-7 w-7 p-0 text-muted-foreground" onClick={onCancel}>
          <X className="w-4 h-4" />
        </Button>
      </div>

      {step !== 'tipe' && breadcrumb}

      {step === 'tipe' && (
        <div className="space-y-3">
          <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Langkah 1 — Jenis Barang</p>
          <div className="grid grid-cols-2 gap-3">
            {TIPE_BARANG.map(t => {
              const TIcon = t.Icon;
              return (
                <button key={t.id} type="button" onClick={() => { setSelectedTipe(t.id); setStep('kategori'); }}
                  className={`flex flex-col items-center gap-2.5 p-5 rounded-xl border-2 transition-all hover:scale-[1.02] ${t.bg} ${t.text}`}>
                  <TIcon className={`w-7 h-7 ${t.iconColor}`} />
                  <span className="font-semibold text-sm">{t.label}</span>
                  <span className="text-[11px] opacity-70 text-center leading-tight">{t.desc}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {step === 'kategori' && selectedTipe && (
        <div className="space-y-3">
          <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Langkah 2 — Kategori {tipeInfo?.label}</p>
          <div className="grid grid-cols-3 gap-2">
            {KATEGORI_MAP[selectedTipe].map(k => {
              const KIcon = k.Icon;
              return (
                <button key={k.id} type="button" onClick={() => { setSelectedKategori(k.id); setStep('item'); }}
                  className="flex flex-col items-center gap-1.5 p-3 rounded-xl border border-border hover:border-red-400 hover:bg-red-50 transition-all text-sm font-medium group">
                  <KIcon className="w-5 h-5 text-muted-foreground group-hover:text-red-600 transition-colors" />
                  <span className="text-xs text-center leading-tight">{k.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {step === 'item' && (
        <div className="space-y-3">
          <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Langkah 3 — Pilih Item dari Stok</p>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input autoFocus placeholder="Cari item..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
          </div>
          {filteredSearch.length === 0 ? (
            <div className="text-xs text-muted-foreground text-center py-4 bg-muted/30 rounded-lg">
              <Package className="w-6 h-6 mx-auto mb-1.5 opacity-30" />
              <p>Tidak ada item <strong>{kategoriInfo?.label}</strong> di stok</p>
            </div>
          ) : (
            <div className="space-y-1 max-h-52 overflow-y-auto">
              {filteredSearch.map(item => (
                <button key={item.id} type="button" onClick={() => { setSelectedItem(item); setStep('jumlah'); }}
                  className="w-full text-left flex items-center gap-2 px-3 py-2.5 rounded-lg hover:bg-muted/60 border border-transparent hover:border-border/40 transition-all text-sm">
                  <Package className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                  <span className="font-medium flex-1 truncate">{item.item_name}</span>
                  <span className={`text-xs shrink-0 font-semibold ${(item.total_stock ?? 0) <= 0 ? 'text-destructive' : 'text-muted-foreground'}`}>
                    Stok: {item.total_stock ?? 0} {item.unit}
                  </span>
                  <ChevronRight className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {step === 'jumlah' && selectedItem && (
        <div className="space-y-3">
          <div className="bg-white rounded-xl border p-3 flex items-center gap-3 shadow-sm">
            <div className="w-9 h-9 bg-red-100 rounded-lg flex items-center justify-center shrink-0">
              <Package className="w-4 h-4 text-red-600" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold truncate">{selectedItem.item_name}</p>
              <p className="text-xs text-muted-foreground">
                Stok tersedia: <strong className={(selectedItem.total_stock ?? 0) <= 0 ? 'text-destructive' : ''}>{selectedItem.total_stock ?? 0} {selectedItem.unit}</strong>
              </p>
            </div>
            <button type="button" onClick={() => setStep('item')} className="text-xs text-muted-foreground hover:text-primary shrink-0">Ganti</button>
          </div>

          <div className="space-y-1">
            <Label className="text-sm font-semibold">Jumlah yang Keluar *</Label>
            <div className="flex gap-2">
              <Input
                type="number"
                min="1"
                value={jumlah}
                onChange={e => setJumlah(e.target.value)}
                placeholder="0"
                className="flex-1"
                autoFocus
              />
              <span className="flex items-center text-sm text-muted-foreground px-2 border rounded-lg bg-muted/30">{selectedItem.unit || 'pcs'}</span>
            </div>
          </div>

          <Button type="button" onClick={handleTambahkan} disabled={!jumlah || Number(jumlah) <= 0} className="w-full gap-2 bg-red-600 hover:bg-red-700 text-white">
            <X className="w-4 h-4" />
            Tambahkan Item Keluar
          </Button>
        </div>
      )}
    </div>
  );
}

// ─── Form Utama Barang Keluar ─────────────────────────────────────────────────
export default function BarangKeluarManualForm({ onClose, onSaved }) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({
    nomor_referensi: '',
    tanggal: new Date().toISOString().split('T')[0],
    tujuan: '',
    alasan: '',
    ekspedisi: '',
    ongkir: '',
    ongkir_dibayar_oleh: 'Perusahaan',
    catatan: '',
    pic: '',
  });
  const [items, setItems] = useState([]);
  const [showAddPanel, setShowAddPanel] = useState(true);

  const { data: botolList = [] } = useQuery({ queryKey: ['botol'], queryFn: () => base44.entities.Botol.list() });
  const { data: tutupList = [] } = useQuery({ queryKey: ['tutup'], queryFn: () => base44.entities.Tutup.list() });
  const { data: sprayList = [] } = useQuery({ queryKey: ['spray'], queryFn: () => base44.entities.Spray.list() });
  const { data: bahanList = [] } = useQuery({ queryKey: ['bahan-cair'], queryFn: () => base44.entities.BahanCair.list() });
  const { data: itemTambahanList = [] } = useQuery({ queryKey: ['item-tambahan'], queryFn: () => base44.entities.ItemTambahan.list() });

  const inventoryItems = useMemo(() => [
    ...botolList.map(i => ({ id: `botol-${i.id}`, _stokId: i.id, _entity: 'Botol', item_name: i.nama, category: 'botol', total_stock: i.stok ?? 0, unit: 'pcs', vendor: i.vendor || '' })),
    ...tutupList.map(i => ({ id: `tutup-${i.id}`, _stokId: i.id, _entity: 'Tutup', item_name: i.nama, category: 'tutup', total_stock: i.stok ?? 0, unit: 'pcs', vendor: i.vendor || '' })),
    ...sprayList.map(i => ({ id: `spray-${i.id}`, _stokId: i.id, _entity: 'Spray', item_name: i.nama, category: 'spray', total_stock: i.stok ?? 0, unit: 'pcs', vendor: i.vendor || '' })),
    ...bahanList.map(i => ({ id: `bahan-${i.id}`, _stokId: i.id, _entity: 'BahanCair', item_name: i.nama, category: i.kategori === 'Bibit' ? 'bibit' : (i.kategori?.toLowerCase() || 'bahan'), total_stock: i.stok ?? 0, unit: i.satuan || 'kg', vendor: i.vendor || '' })),
    ...itemTambahanList.map(i => ({ id: `item-${i.id}`, _stokId: i.id, _entity: 'ItemTambahan', item_name: i.nama, category: i.kategori, total_stock: i.stok ?? 0, unit: 'pcs', vendor: i.vendor || '' })),
  ], [botolList, tutupList, sprayList, bahanList, itemTambahanList]);

  // Map stok untuk update setelah save
  const stokMap = useMemo(() => {
    const map = {};
    botolList.forEach(i => { map[`botol-${i.id}`] = { entity: 'Botol', stokId: i.id, stok: i.stok ?? 0 }; });
    tutupList.forEach(i => { map[`tutup-${i.id}`] = { entity: 'Tutup', stokId: i.id, stok: i.stok ?? 0 }; });
    sprayList.forEach(i => { map[`spray-${i.id}`] = { entity: 'Spray', stokId: i.id, stok: i.stok ?? 0 }; });
    bahanList.forEach(i => { map[`bahan-${i.id}`] = { entity: 'BahanCair', stokId: i.id, stok: i.stok ?? 0 }; });
    itemTambahanList.forEach(i => { map[`item-${i.id}`] = { entity: 'ItemTambahan', stokId: i.id, stok: i.stok ?? 0 }; });
    return map;
  }, [botolList, tutupList, sprayList, bahanList, itemTambahanList]);

  const handleItemAdded = (item) => {
    setItems(prev => {
      const existing = prev.find(i => i.inventory_item_id === item.inventory_item_id);
      if (existing) {
        return prev.map(i => i.inventory_item_id === item.inventory_item_id ? { ...i, jumlah: i.jumlah + item.jumlah } : i);
      }
      return [...prev, item];
    });
    setShowAddPanel(false);
  };

  const removeItem = (idx) => setItems(prev => prev.filter((_, i) => i !== idx));

  const createMutation = useMutation({
    mutationFn: async (data) => {
      await base44.entities.BarangKeluar.create({
        ...data,
        ongkir: data.ongkir ? Number(data.ongkir) : 0,
        items: items.map(({ tipe, _stokId, _entity, ...rest }) => rest),
      });
      // Kurangi stok otomatis
      for (const item of items) {
        const entry = stokMap[item.inventory_item_id];
        if (!entry) continue;
        const newStok = Math.max(0, (entry.stok || 0) - item.jumlah);
        if (entry.entity === 'Botol') await base44.entities.Botol.update(entry.stokId, { stok: newStok });
        else if (entry.entity === 'Tutup') await base44.entities.Tutup.update(entry.stokId, { stok: newStok });
        else if (entry.entity === 'Spray') await base44.entities.Spray.update(entry.stokId, { stok: newStok });
        else if (entry.entity === 'BahanCair') await base44.entities.BahanCair.update(entry.stokId, { stok: newStok });
        else if (entry.entity === 'ItemTambahan') await base44.entities.ItemTambahan.update(entry.stokId, { stok: newStok });
      }
      queryClient.invalidateQueries({ queryKey: ['botol'] });
      queryClient.invalidateQueries({ queryKey: ['tutup'] });
      queryClient.invalidateQueries({ queryKey: ['spray'] });
      queryClient.invalidateQueries({ queryKey: ['bahan-cair'] });
      queryClient.invalidateQueries({ queryKey: ['item-tambahan'] });
    },
    onSuccess: onSaved,
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (items.length === 0) return alert('Tambahkan minimal 1 item terlebih dahulu.');
    createMutation.mutate(form);
  };

  const tipeColorMap = { packaging: 'bg-blue-100 text-blue-700', bahan_cair: 'bg-emerald-100 text-emerald-700', item_tambahan: 'bg-pink-100 text-pink-700' };
  const tipeLabelMap = { packaging: 'Packaging', bahan_cair: 'Bahan Cair', item_tambahan: 'Item Tambahan' };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[94vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <PackageMinus className="w-5 h-5 text-red-600" />
            Input Barang Keluar
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5">

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
                <Input placeholder="Opsional" value={form.nomor_referensi} onChange={e => setForm(f => ({ ...f, nomor_referensi: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <Label>Tujuan / Customer</Label>
                <Input placeholder="Nama tujuan..." value={form.tujuan} onChange={e => setForm(f => ({ ...f, tujuan: e.target.value }))} />
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
                <Input placeholder="JNE, JT, SiCepat, dll..." value={form.ekspedisi} onChange={e => setForm(f => ({ ...f, ekspedisi: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <Label>Ongkir (Rp)</Label>
                <Input type="number" min="0" placeholder="0" value={form.ongkir} onChange={e => setForm(f => ({ ...f, ongkir: e.target.value }))} />
              </div>
              <div className="space-y-1 col-span-2">
                <Label className="text-xs">Ongkir Dibayar Oleh</Label>
                <div className="flex gap-2">
                  {['Perusahaan', 'Customer', 'Split'].map(opt => (
                    <button key={opt} type="button" onClick={() => setForm(f => ({ ...f, ongkir_dibayar_oleh: opt }))}
                      className={`flex-1 py-2 rounded-lg border text-xs font-medium transition-all ${form.ongkir_dibayar_oleh === opt ? 'bg-primary text-primary-foreground border-primary' : 'border-border text-muted-foreground hover:border-primary/50'}`}>
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

          {/* Daftar Item */}
          {items.length > 0 && (
            <div className="border rounded-xl overflow-hidden">
              <div className="bg-muted/50 px-4 py-2.5 flex items-center justify-between">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Item Keluar</span>
                <Badge variant="outline" className="text-xs">{items.length} item</Badge>
              </div>
              {items.map((item, idx) => (
                <div key={idx} className="px-4 py-3 border-t flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate">{item.nama_barang}</p>
                    <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                      <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${tipeColorMap[item.tipe] || 'bg-gray-100 text-gray-600'}`}>
                        {tipeLabelMap[item.tipe] || item.tipe}
                      </span>
                      <Badge variant="outline" className="text-[10px] capitalize">{item.kategori}</Badge>
                    </div>
                  </div>
                  <p className="text-sm font-bold text-red-600 shrink-0">-{item.jumlah} {item.satuan}</p>
                  <Button type="button" variant="ghost" size="icon" className="w-7 h-7 text-destructive/60 hover:text-destructive shrink-0" onClick={() => removeItem(idx)}>
                    <X className="w-3.5 h-3.5" />
                  </Button>
                </div>
              ))}
            </div>
          )}

          {/* Panel tambah item */}
          {showAddPanel ? (
            <PilihItemPanel
              inventoryItems={inventoryItems}
              onItemAdded={handleItemAdded}
              onCancel={() => { if (items.length > 0) setShowAddPanel(false); }}
            />
          ) : (
            <Button type="button" variant="outline" className="w-full gap-2 border-dashed h-12 text-muted-foreground hover:text-foreground border-red-300 hover:border-red-400"
              onClick={() => setShowAddPanel(true)}>
              <Plus className="w-4 h-4" />
              Tambah Item Barang Keluar Lagi
            </Button>
          )}

          {/* Catatan */}
          <div className="space-y-1">
            <Label>Catatan</Label>
            <Textarea value={form.catatan} onChange={e => setForm(f => ({ ...f, catatan: e.target.value }))} rows={2} placeholder="Opsional..." />
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t">
            <Button type="button" variant="outline" onClick={onClose}>Batal</Button>
            <Button type="submit" disabled={createMutation.isPending || items.length === 0} className="gap-2 min-w-[160px]">
              {createMutation.isPending ? 'Menyimpan...' : `Konfirmasi (${items.length} item)`}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}