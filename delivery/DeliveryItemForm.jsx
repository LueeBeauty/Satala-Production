import React, { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import {
  Plus, Trash2, Package, Search, ChevronRight, Box,
  Building2, CheckCircle2, X, ArrowDownCircle, ArrowUpCircle
} from 'lucide-react';

// ─── Definisi ────────────────────────────────────────────────────────────

const TIPE_BARANG = [
  {
    id: 'packaging',
    label: 'Packaging',
    icon: '📦',
    desc: 'Botol, spray, tutup, segel, dll',
    bg: 'bg-blue-50 hover:bg-blue-100 border-blue-200',
    text: 'text-blue-700',
  },
  {
    id: 'bahan_cair',
    label: 'Bahan Cair',
    icon: '🧪',
    desc: 'Bibit, alkohol, bahan campuran, dll',
    bg: 'bg-emerald-50 hover:bg-emerald-100 border-emerald-200',
    text: 'text-emerald-700',
  },
];

const KATEGORI_MAP = {
  packaging: [
    { id: 'botol',             label: 'Botol',        icon: '🧴' },
    { id: 'spray',             label: 'Spray',        icon: '💨' },
    { id: 'tutup',             label: 'Tutup',        icon: '🔒' },
    { id: 'segel',             label: 'Segel',        icon: '🏷️' },
    { id: 'kardus',            label: 'Kardus',       icon: '📦' },
    { id: 'plastik',           label: 'Plastik',      icon: '🛍️' },
    { id: 'lainnya_packaging', label: 'Lainnya',      icon: '➕' },
  ],
  bahan_cair: [
    { id: 'bibit',         label: 'Bibit',        icon: '🌿', requiresVendor: true },
    { id: 'alkohol',       label: 'Alkohol',      icon: '🧪' },
    { id: 'air',           label: 'Air / Solvent',icon: '💧' },
    { id: 'bahan_aktif',   label: 'Bahan Aktif',  icon: '⚗️' },
    { id: 'pewangi',       label: 'Pewangi',      icon: '🌸' },
    { id: 'pengencer',     label: 'Pengencer',    icon: '🔬' },
    { id: 'lainnya_bahan', label: 'Lainnya',      icon: '➕' },
  ],
};

const KATEGORI_ALIAS = { lainnya_packaging: 'lainnya', lainnya_bahan: 'lainnya' };
const SATUAN_OPTIONS = ['pcs', 'kg', 'liter', 'gram', 'ml', 'lusin', 'dus'];

// ─── Modal Tambah Vendor ──────────────────────────────────────────────────

function TambahVendorModal({ onClose, onAdded }) {
  const [nama, setNama] = useState('');
  const [kontak, setKontak] = useState('');

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-sm z-[70]">
        <DialogHeader><DialogTitle>Tambah Vendor Baru</DialogTitle></DialogHeader>
        <form onSubmit={e => { e.preventDefault(); if (nama.trim()) onAdded(nama.trim()); }} className="space-y-3">
          <div>
            <Label>Nama Vendor *</Label>
            <Input value={nama} onChange={e => setNama(e.target.value)} placeholder="Nama vendor / supplier" autoFocus required />
          </div>
          <div>
            <Label>Kontak</Label>
            <Input value={kontak} onChange={e => setKontak(e.target.value)} placeholder="No. HP / email (opsional)" />
          </div>
          <div className="flex gap-2 pt-1">
            <Button type="button" variant="outline" className="flex-1" onClick={onClose}>Batal</Button>
            <Button type="submit" className="flex-1" disabled={!nama.trim()}>Simpan</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ─── Modal Pilih Inventori ────────────────────────────────────────────────

function PilihInventoriModal({ items, onSelect, onClose }) {
  const [search, setSearch] = useState('');
  const filtered = useMemo(() => {
    if (!search.trim()) return items.slice(0, 60);
    const q = search.toLowerCase();
    return items.filter(i => i.nama?.toLowerCase().includes(q) || i.kategori?.toLowerCase().includes(q)).slice(0, 60);
  }, [items, search]);

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-md max-h-[85vh] flex flex-col z-[70]">
        <DialogHeader><DialogTitle>Pilih Item dari Inventori</DialogTitle></DialogHeader>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input autoFocus placeholder="Cari nama item..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>
        <div className="flex-1 overflow-y-auto space-y-1 min-h-0 max-h-80 mt-1">
          {filtered.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground text-sm">
              <Package className="w-8 h-8 mx-auto mb-2 opacity-30" />
              <p>Tidak ada item ditemukan</p>
            </div>
          ) : filtered.map(item => (
            <button key={item.id} onClick={() => onSelect(item)}
              className="w-full text-left flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-muted/70 transition-colors border border-transparent hover:border-border/40">
              <Package className="w-4 h-4 text-muted-foreground shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{item.nama}</p>
                <div className="flex items-center gap-2 mt-0.5">
                  <Badge variant="outline" className="text-xs capitalize">{item.kategori}</Badge>
                  <span className="text-xs text-muted-foreground">Stok: {item.stok ?? 0} {item.satuan}</span>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
            </button>
          ))}
        </div>
        <Button variant="outline" className="mt-1" onClick={onClose}>Tutup</Button>
      </DialogContent>
    </Dialog>
  );
}

// ─── Panel Tambah Item (step-by-step) ────────────────────────────────────

function TambahItemPanel({ inventoryOptions, onItemAdded, onCancel, canCancel }) {
  const [step, setStep] = useState('tipe');
  const [selectedTipe, setSelectedTipe] = useState(null);
  const [selectedKategori, setSelectedKategori] = useState(null);
  const [selectedVendor, setSelectedVendor] = useState('');
  const [selectedItem, setSelectedItem] = useState(null);
  const [jumlah, setJumlah] = useState('');
  const [satuan, setSatuan] = useState('pcs');
  const [showInventoriModal, setShowInventoriModal] = useState(false);
  const [showTambahVendor, setShowTambahVendor] = useState(false);
  const [localVendors, setLocalVendors] = useState([]);

  const kategoriInfo = KATEGORI_MAP[selectedTipe]?.find(k => k.id === selectedKategori);
  const requiresVendor = kategoriInfo?.requiresVendor;
  const tipeInfo = TIPE_BARANG.find(t => t.id === selectedTipe);

  // Vendors dari inventori bibit
  const existingVendors = useMemo(() => {
    const set = new Set();
    inventoryOptions.filter(i => i.kategori === 'bibit' || i.kategori?.includes('bibit')).forEach(i => { if (i.vendor) set.add(i.vendor); });
    return Array.from(set);
  }, [inventoryOptions]);

  const allVendors = useMemo(() => {
    const combined = new Set([...existingVendors, ...localVendors]);
    return Array.from(combined);
  }, [existingVendors, localVendors]);

  // Filter inventori berdasarkan tipe + kategori + vendor
  const inventoriTerfilter = useMemo(() => {
    if (!selectedKategori) return [];
    const normalizedKat = KATEGORI_ALIAS[selectedKategori] || selectedKategori;
    const knowCats = KATEGORI_MAP[selectedTipe]?.map(k => KATEGORI_ALIAS[k.id] || k.id).filter(k => !k.startsWith('lainnya')) || [];

    let filtered = inventoryOptions.filter(item => {
      const cat = (item.kategori || '').toLowerCase();
      if (cat === normalizedKat || cat === selectedKategori) return true;
      if (selectedKategori.startsWith('lainnya') && !knowCats.includes(cat)) return true;
      return false;
    });

    if (requiresVendor && selectedVendor) {
      filtered = filtered.filter(i => i.vendor === selectedVendor);
    }
    return filtered;
  }, [inventoryOptions, selectedKategori, selectedTipe, requiresVendor, selectedVendor]);

  const handleItemSelect = (item) => {
    setSelectedItem(item);
    setSatuan(item.satuan || 'pcs');
    setShowInventoriModal(false);
    setStep('jumlah');
  };

  const handleTambahkan = () => {
    if (!selectedItem || !jumlah || Number(jumlah) <= 0) return;
    onItemAdded({
      inventory_item_id: selectedItem.id,
      _stokId: selectedItem._stokId,
      _entity: selectedItem._entity,
      nama_item: selectedItem.nama,
      kategori: selectedItem.kategori,
      tipe: selectedTipe,
      satuan,
      jumlah: Number(jumlah),
      vendor: selectedVendor || selectedItem.vendor || '',
      stok_saat_ini: selectedItem.stok,
    });
    // reset untuk tambah lagi
    setStep('tipe');
    setSelectedTipe(null);
    setSelectedKategori(null);
    setSelectedVendor('');
    setSelectedItem(null);
    setJumlah('');
  };

  return (
    <div className="border-2 border-dashed border-primary/30 rounded-xl p-4 bg-primary/[0.02] space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-primary">+ Tambah Item</p>
        {canCancel && (
          <Button type="button" variant="ghost" size="sm" className="h-7 w-7 p-0 text-muted-foreground" onClick={onCancel}>
            <X className="w-4 h-4" />
          </Button>
        )}
      </div>

      {/* Breadcrumb */}
      {step !== 'tipe' && (
        <div className="flex items-center gap-1.5 text-xs flex-wrap">
          <button onClick={() => { setStep('tipe'); setSelectedTipe(null); setSelectedKategori(null); setSelectedVendor(''); setSelectedItem(null); }}
            className="text-muted-foreground hover:text-foreground font-medium">Tipe</button>
          {selectedTipe && (
            <><ChevronRight className="w-3 h-3 text-muted-foreground" />
            <button onClick={() => { setStep('kategori'); setSelectedKategori(null); setSelectedVendor(''); setSelectedItem(null); }}
              className="text-muted-foreground hover:text-foreground font-medium">{tipeInfo?.label}</button></>
          )}
          {selectedKategori && (
            <><ChevronRight className="w-3 h-3 text-muted-foreground" />
            <button onClick={() => { setStep(requiresVendor ? 'vendor' : 'item'); setSelectedVendor(''); setSelectedItem(null); }}
              className="text-muted-foreground hover:text-foreground font-medium">{kategoriInfo?.label}</button></>
          )}
          {selectedVendor && (
            <><ChevronRight className="w-3 h-3 text-muted-foreground" />
            <button onClick={() => { setStep('item'); setSelectedItem(null); }}
              className="text-muted-foreground hover:text-foreground font-medium">{selectedVendor}</button></>
          )}
          {selectedItem && (
            <><ChevronRight className="w-3 h-3 text-muted-foreground" />
            <span className="font-semibold text-foreground truncate max-w-[120px]">{selectedItem.nama}</span></>
          )}
        </div>
      )}

      {/* Step: Tipe */}
      {step === 'tipe' && (
        <div className="space-y-3">
          <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Langkah 1 — Jenis Barang</p>
          <div className="grid grid-cols-2 gap-3">
            {TIPE_BARANG.map(t => (
              <button key={t.id} type="button"
                onClick={() => { setSelectedTipe(t.id); setStep('kategori'); }}
                className={`flex flex-col items-center gap-2 p-5 rounded-xl border-2 transition-all hover:scale-[1.02] ${t.bg} ${t.text}`}>
                <span className="text-3xl">{t.icon}</span>
                <span className="font-bold text-sm">{t.label}</span>
                <span className="text-[11px] opacity-70 text-center leading-tight">{t.desc}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Step: Kategori */}
      {step === 'kategori' && selectedTipe && (
        <div className="space-y-3">
          <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">
            Langkah 2 — Kategori {tipeInfo?.label}
          </p>
          <div className="grid grid-cols-3 gap-2">
            {KATEGORI_MAP[selectedTipe].map(k => (
              <button key={k.id} type="button"
                onClick={() => { setSelectedKategori(k.id); setStep(k.requiresVendor ? 'vendor' : 'item'); }}
                className="flex flex-col items-center gap-1.5 p-3 rounded-xl border border-border hover:border-primary hover:bg-primary/5 transition-all">
                <span className="text-2xl">{k.icon}</span>
                <span className="text-xs text-center leading-tight font-medium">{k.label}</span>
                {k.requiresVendor && <span className="text-[9px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full">wajib vendor</span>}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Step: Vendor (bibit) */}
      {step === 'vendor' && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Building2 className="w-4 h-4 text-amber-600" />
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">
              Langkah 3 — Pilih Vendor Bibit
            </p>
          </div>
          <p className="text-xs text-muted-foreground -mt-1">Pilih vendor untuk memfilter bibit yang tersedia</p>
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {allVendors.length === 0 && (
              <p className="text-xs text-muted-foreground text-center py-3 bg-muted/30 rounded-lg">Belum ada vendor — tambahkan vendor baru</p>
            )}
            {allVendors.map(v => (
              <button key={v} type="button"
                onClick={() => { setSelectedVendor(v); setStep('item'); }}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg border border-border hover:border-primary hover:bg-primary/5 transition-all text-left">
                <Building2 className="w-4 h-4 text-muted-foreground shrink-0" />
                <span className="text-sm font-medium">{v}</span>
              </button>
            ))}
            <button type="button" onClick={() => setShowTambahVendor(true)}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg border-2 border-dashed border-amber-300 bg-amber-50 hover:bg-amber-100 transition-all text-left">
              <Plus className="w-4 h-4 text-amber-600 shrink-0" />
              <span className="text-sm font-medium text-amber-700">+ Tambah Vendor Baru</span>
            </button>
          </div>
        </div>
      )}

      {/* Step: Pilih Item Inventori */}
      {step === 'item' && (
        <div className="space-y-3">
          <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">
            Langkah {requiresVendor ? '4' : '3'} — Pilih Item dari Inventori
            {selectedVendor && <span className="normal-case font-normal ml-1">· Vendor: <strong>{selectedVendor}</strong></span>}
          </p>
          <Button type="button" variant="outline" className="w-full gap-2 justify-start text-muted-foreground"
            onClick={() => setShowInventoriModal(true)}>
            <Search className="w-4 h-4" />
            <span>Cari & pilih item dari inventori...</span>
          </Button>
          <div className="space-y-1">
            {inventoriTerfilter.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-3 bg-muted/30 rounded-lg">
                Belum ada item <strong>{kategoriInfo?.label}</strong>
                {selectedVendor ? ` dari vendor ${selectedVendor}` : ''} di inventori
              </p>
            ) : (
              <>
                {inventoriTerfilter.slice(0, 5).map(item => (
                  <button key={item.id} type="button" onClick={() => handleItemSelect(item)}
                    className="w-full text-left flex items-center gap-2 px-3 py-2.5 rounded-lg hover:bg-muted/60 border border-transparent hover:border-border/40 transition-all text-sm">
                    <Package className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                    <span className="font-medium flex-1 truncate">{item.nama}</span>
                    <span className="text-xs text-muted-foreground shrink-0">Stok: {item.stok ?? 0} {item.satuan}</span>
                  </button>
                ))}
                {inventoriTerfilter.length > 5 && (
                  <button type="button" onClick={() => setShowInventoriModal(true)}
                    className="text-xs text-primary hover:underline w-full text-center py-1.5">
                    Lihat semua {inventoriTerfilter.length} item →
                  </button>
                )}
              </>
            )}
          </div>
        </div>
      )}

      {/* Step: Jumlah */}
      {step === 'jumlah' && selectedItem && (
        <div className="space-y-3">
          <div className="bg-white rounded-xl border p-3 flex items-center gap-3 shadow-sm">
            <div className="w-9 h-9 bg-primary/10 rounded-lg flex items-center justify-center shrink-0">
              <Package className="w-4 h-4 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold truncate">{selectedItem.nama}</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Stok saat ini: <strong>{selectedItem.stok ?? 0} {selectedItem.satuan}</strong>
              </p>
            </div>
            <button type="button" onClick={() => setStep('item')} className="text-xs text-muted-foreground hover:text-primary">Ganti</button>
          </div>

          {selectedVendor && (
            <div className="flex items-center gap-2 text-xs bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
              <Building2 className="w-3.5 h-3.5 text-amber-600" />
              <span className="text-muted-foreground">Vendor: <strong className="text-amber-800">{selectedVendor}</strong></span>
              <button type="button" onClick={() => { setSelectedVendor(''); setStep('vendor'); setSelectedItem(null); }}
                className="text-amber-600 hover:text-red-600 ml-auto">Ganti</button>
            </div>
          )}

          <div className="flex gap-2">
            <div className="flex-1 space-y-1">
              <Label className="text-sm font-semibold">Jumlah *</Label>
              <Input type="number" min="1" value={jumlah} onChange={e => setJumlah(e.target.value)}
                placeholder={`Jumlah (${satuan})`} autoFocus
                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleTambahkan(); } }} />
            </div>
            <div className="w-24 space-y-1">
              <Label className="text-sm font-semibold">Satuan</Label>
              <select value={satuan} onChange={e => setSatuan(e.target.value)}
                className="w-full h-10 rounded-md border border-input bg-background px-2 text-sm">
                {SATUAN_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>

          <Button type="button" onClick={handleTambahkan}
            disabled={!jumlah || Number(jumlah) <= 0}
            className="w-full gap-2">
            <CheckCircle2 className="w-4 h-4" />
            Tambahkan Item
          </Button>
        </div>
      )}

      {showInventoriModal && (
        <PilihInventoriModal items={inventoriTerfilter} onSelect={handleItemSelect} onClose={() => setShowInventoriModal(false)} />
      )}
      {showTambahVendor && (
        <TambahVendorModal
          onClose={() => setShowTambahVendor(false)}
          onAdded={(nama) => { setLocalVendors(prev => [...prev, nama]); setShowTambahVendor(false); setSelectedVendor(nama); setStep('item'); }}
        />
      )}
    </div>
  );
}

// ─── Form Utama ───────────────────────────────────────────────────────────

export default function DeliveryItemForm({ jenis, inventoryOptions, onSave, onClose, isPending }) {
  const [tanggal, setTanggal] = useState(new Date().toISOString().split('T')[0]);
  const [noPO, setNoPO] = useState('');
  const [catatan, setCatatan] = useState('');
  const [status, setStatus] = useState('sudah_sampai');
  const [items, setItems] = useState([]);
  const [showAddPanel, setShowAddPanel] = useState(true);

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

  const handleSave = () => {
    if (items.length === 0) return alert('Tambahkan minimal 1 item.');
    onSave({ tanggal, no_po: noPO, catatan, status, items });
  };

  const tipeColor = { packaging: 'bg-blue-100 text-blue-700', bahan_cair: 'bg-emerald-100 text-emerald-700' };
  const tipeLabel = { packaging: 'Packaging', bahan_cair: 'Bahan Cair' };

  return (
    <div className="space-y-5">
      {/* Header info */}
      <div className="bg-muted/30 rounded-xl p-4 space-y-3">
        <div className="flex items-center gap-2">
          {jenis === 'masuk'
            ? <ArrowDownCircle className="w-4 h-4 text-green-600" />
            : <ArrowUpCircle className="w-4 h-4 text-red-500" />}
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
            Info {jenis === 'masuk' ? 'Penerimaan' : 'Pengeluaran'}
          </p>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label className="text-xs">Tanggal *</Label>
            <Input type="date" value={tanggal} onChange={e => setTanggal(e.target.value)} required />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Status</Label>
            <select value={status} onChange={e => setStatus(e.target.value)}
              className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm">
              <option value="sedang_po">Sedang PO</option>
              <option value="dalam_perjalanan">Dalam Perjalanan</option>
              <option value="sudah_sampai">Sudah Sampai</option>
            </select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">No. PO / Referensi</Label>
            <Input value={noPO} onChange={e => setNoPO(e.target.value)} placeholder="PO-001 (opsional)" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Catatan</Label>
            <Input value={catatan} onChange={e => setCatatan(e.target.value)} placeholder="Opsional..." />
          </div>
        </div>
      </div>

      {/* Daftar item */}
      {items.length > 0 && (
        <div className="border rounded-xl overflow-hidden">
          <div className="bg-muted/50 px-4 py-2.5 flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Item Ditambahkan</span>
            <Badge variant="outline" className="text-xs">{items.length} item</Badge>
          </div>
          {items.map((item, idx) => (
            <div key={idx} className="px-4 py-3 border-t flex items-center gap-3">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold truncate">{item.nama_item}</p>
                <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                  {item.tipe && <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${tipeColor[item.tipe] || 'bg-gray-100 text-gray-600'}`}>{tipeLabel[item.tipe] || item.tipe}</span>}
                  <Badge variant="outline" className="text-[10px] capitalize">{item.kategori}</Badge>
                  {item.vendor && <span className="text-[10px] text-muted-foreground">Vendor: {item.vendor}</span>}
                </div>
              </div>
              <p className={`text-sm font-bold shrink-0 ${jenis === 'masuk' ? 'text-green-600' : 'text-red-500'}`}>
                {jenis === 'masuk' ? '+' : '-'}{item.jumlah} {item.satuan}
              </p>
              <Button type="button" variant="ghost" size="icon" className="w-7 h-7 text-destructive/60 hover:text-destructive shrink-0" onClick={() => removeItem(idx)}>
                <Trash2 className="w-3.5 h-3.5" />
              </Button>
            </div>
          ))}
        </div>
      )}

      {/* Panel tambah item */}
      {showAddPanel ? (
        <TambahItemPanel
          inventoryOptions={inventoryOptions}
          onItemAdded={handleItemAdded}
          onCancel={() => { if (items.length > 0) setShowAddPanel(false); }}
          canCancel={items.length > 0}
        />
      ) : (
        <Button type="button" variant="outline" className="w-full gap-2 border-dashed h-12 text-muted-foreground hover:text-foreground"
          onClick={() => setShowAddPanel(true)}>
          <Plus className="w-4 h-4" />
          Tambah Item Lagi
        </Button>
      )}

      {/* Actions */}
      <div className="flex justify-end gap-2 pt-2 border-t">
        <Button type="button" variant="outline" onClick={onClose}>Batal</Button>
        <Button onClick={handleSave} disabled={isPending || items.length === 0} className="min-w-[140px]">
          {isPending ? 'Menyimpan...' : `Konfirmasi (${items.length} item)`}
        </Button>
      </div>
    </div>
  );
}