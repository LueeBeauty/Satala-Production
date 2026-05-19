import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import SmartQtyInput from '@/components/ui/SmartQtyInput';
import { smartDisplayQty } from '@/lib/unitConverter';
import {
  Plus, Trash2, Package, Search, ChevronRight, Box, Building2,
  CheckCircle2, ArrowLeft, X, Droplets, FlaskConical, Tag,
  PackageOpen, Wind, Lock, Bookmark, Archive, ShoppingBag,
  Leaf, Microscope, Pipette, Sparkles
} from 'lucide-react';
import AddNewItemModal from '@/components/shared/AddNewItemModal';
import PicSelector from '@/components/shared/PicSelector';

// ─── Definisi tipe & kategori ──────────────────────────────────────────────

const TIPE_BARANG = [
  {
    id: 'packaging',
    label: 'Packaging',
    Icon: PackageOpen,
    desc: 'Botol, spray, tutup, segel, dll',
    bg: 'bg-slate-50 hover:bg-slate-100 border-slate-200',
    iconColor: 'text-slate-600',
    text: 'text-slate-700',
  },
  {
    id: 'bahan_cair',
    label: 'Bahan Cair',
    Icon: FlaskConical,
    desc: 'Bibit, alkohol, bahan campuran, dll',
    bg: 'bg-teal-50 hover:bg-teal-100 border-teal-200',
    iconColor: 'text-teal-600',
    text: 'text-teal-700',
  },
  {
    id: 'item_tambahan',
    label: 'Item Tambahan',
    Icon: Tag,
    desc: 'Stiker, dus, gift card, dll',
    bg: 'bg-rose-50 hover:bg-rose-100 border-rose-200',
    iconColor: 'text-rose-500',
    text: 'text-rose-700',
  },
];

const KATEGORI_MAP = {
  packaging: [
    { id: 'botol',              label: 'Botol',       Icon: Box },
    { id: 'spray',              label: 'Spray',       Icon: Wind },
    { id: 'tutup',              label: 'Tutup',       Icon: Lock },
    { id: 'segel',              label: 'Segel',       Icon: Bookmark },
    { id: 'kardus',             label: 'Kardus',      Icon: Archive },
    { id: 'plastik',            label: 'Plastik',     Icon: ShoppingBag },
    { id: 'lainnya_packaging',  label: 'Lainnya',     Icon: Plus },
  ],
  bahan_cair: [
    { id: 'bibit',          label: 'Bibit',        Icon: Leaf,        requiresVendor: true },
    { id: 'alkohol',        label: 'Alkohol',      Icon: Pipette },
    { id: 'air',            label: 'Air / Solvent', Icon: Droplets },
    { id: 'bahan_aktif',    label: 'Bahan Aktif',  Icon: FlaskConical },
    { id: 'pewangi',        label: 'Pewangi',      Icon: Sparkles },
    { id: 'pengencer',      label: 'Pengencer',    Icon: Microscope },
    { id: 'lainnya_bahan',  label: 'Lainnya',      Icon: Plus },
  ],
  item_tambahan: [
    { id: 'Stiker',     label: 'Stiker',    Icon: Tag },
    { id: 'Dus',        label: 'Dus',       Icon: Package },
    { id: 'Gift Card',  label: 'Gift Card', Icon: Bookmark },
    { id: 'Lainnya',    label: 'Lainnya',   Icon: Plus },
  ],
};

const KATEGORI_ALIAS = {
  lainnya_packaging: 'lainnya',
  lainnya_bahan: 'lainnya',
};

// ─── Modal Tambah Vendor Baru ─────────────────────────────────────────────

function TambahVendorModal({ onClose, onAdded }) {
  const [nama, setNama] = useState('');
  const [kontak, setKontak] = useState('');
  const [alamat, setAlamat] = useState('');

  const handleSubmit = () => {
    if (!nama.trim()) return;
    onAdded({ nama, kontak, alamat });
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-sm z-[60]">
        <DialogHeader>
          <DialogTitle>Tambah Vendor Baru</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Nama Vendor *</Label>
            <Input
              value={nama}
              onChange={e => setNama(e.target.value)}
              placeholder="Nama perusahaan / supplier"
              autoFocus
            />
          </div>
          <div>
            <Label>Kontak</Label>
            <Input
              value={kontak}
              onChange={e => setKontak(e.target.value)}
              placeholder="No. HP / email"
            />
          </div>
          <div>
            <Label>Alamat</Label>
            <Input
              value={alamat}
              onChange={e => setAlamat(e.target.value)}
              placeholder="Opsional"
            />
          </div>
          <div className="flex gap-2 pt-1">
            <Button type="button" variant="outline" className="flex-1" onClick={onClose}>Batal</Button>
            <Button type="button" className="flex-1" disabled={!nama.trim()} onClick={handleSubmit}>Simpan Vendor</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Modal Pilih Item dari Inventori ─────────────────────────────────────

function PilihInventoriModal({ items, onSelect, onClose }) {
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    if (!search.trim()) return items.slice(0, 60);
    const q = search.toLowerCase();
    return items.filter(
      i =>
        i.item_name?.toLowerCase().includes(q) ||
        i.kode?.toLowerCase().includes(q)
    ).slice(0, 60);
  }, [items, search]);

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-md max-h-[85vh] flex flex-col z-[60]">
        <DialogHeader>
          <DialogTitle>Pilih Item dari Inventori</DialogTitle>
        </DialogHeader>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            autoFocus
            placeholder="Cari nama item atau kode..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto space-y-1 min-h-0 max-h-96">
          {filtered.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground text-sm">
              <Package className="w-8 h-8 mx-auto mb-2 opacity-30" />
              <p>Tidak ada item ditemukan</p>
              <p className="text-xs mt-1">Coba kata kunci lain</p>
            </div>
          ) : (
            filtered.map(item => (
              <button
                key={item.id}
                onClick={() => onSelect(item)}
                className="w-full text-left flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-muted/70 transition-colors border border-transparent hover:border-border/40"
              >
                <Package className="w-4 h-4 text-muted-foreground shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{item.item_name}</p>
                  <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                    {item.kode && (
                      <span className="text-xs text-muted-foreground">[{item.kode}]</span>
                    )}
                    <Badge variant="outline" className="text-xs capitalize">{item.category}</Badge>
                    <span className="text-xs text-muted-foreground">
                      Stok: {item.total_stock ?? 0} {item.unit}
                    </span>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
              </button>
            ))
          )}
          {items.length > 60 && !search && (
            <p className="text-center text-xs text-muted-foreground py-2">
              Gunakan search untuk menemukan item lainnya
            </p>
          )}
        </div>

        <Button variant="outline" className="mt-1" onClick={onClose}>Tutup</Button>
      </DialogContent>
    </Dialog>
  );
}

// ─── Panel Tambah Item (step-by-step) ────────────────────────────────────

// Map kategori barang masuk → type untuk AddNewItemModal
const KATEGORI_TO_TYPE = {
  botol: 'botol',
  spray: 'spray',
  tutup: 'tutup',
  segel: 'botol',
  kardus: 'botol',
  plastik: 'botol',
  lainnya_packaging: 'botol',
  bibit: 'bahan',
  alkohol: 'bahan',
  air: 'bahan',
  bahan_aktif: 'bahan',
  pewangi: 'bahan',
  pengencer: 'bahan',
  lainnya_bahan: 'bahan',
};

function TambahItemPanel({ inventoryItems, onItemAdded, onCancel, onNewItemCreated }) {
  // Step: 'tipe' → 'kategori' → 'vendor' (bibit only) → 'item' → 'jumlah'
  const [step, setStep] = useState('tipe'); // tipe | kategori | vendor | item | jumlah
  const [selectedTipe, setSelectedTipe] = useState(null);
  const [selectedKategori, setSelectedKategori] = useState(null);
  const [selectedVendor, setSelectedVendor] = useState('');
  const [selectedItem, setSelectedItem] = useState(null);
  const [jumlah, setJumlah] = useState('');
  const [showInventoriModal, setShowInventoriModal] = useState(false);
  const [showTambahVendor, setShowTambahVendor] = useState(false);
  const [showTambahItemBaru, setShowTambahItemBaru] = useState(false);
  const [localVendors, setLocalVendors] = useState([]);

  const kategoriInfo = KATEGORI_MAP[selectedTipe]?.find(k => k.id === selectedKategori);
  const requiresVendor = kategoriInfo?.requiresVendor;

  // Vendor list dari bibit yang ada di inventori + yg ditambah lokal
  const existingVendors = useMemo(() => {
    const bibitItems = inventoryItems.filter(i => i.category === 'bibit');
    const set = new Set();
    bibitItems.forEach(i => { if (i.vendor) set.add(i.vendor); });
    return Array.from(set);
  }, [inventoryItems]);

  const allVendors = useMemo(() => {
    const combined = new Set([...existingVendors, ...localVendors.map(v => v.nama)]);
    return Array.from(combined);
  }, [existingVendors, localVendors]);

  // Filter inventori sesuai tipe + kategori (+ vendor untuk bibit)
  const inventoriTerfilter = useMemo(() => {
    if (!selectedKategori) return [];

    // Item tambahan: filter by kategori langsung (case-insensitive match)
    if (selectedTipe === 'item_tambahan') {
      let filtered = inventoryItems.filter(item => {
        if (selectedKategori === 'Lainnya') {
          return item.category && !['Stiker', 'Dus', 'Gift Card'].includes(item.category);
        }
        return item.category === selectedKategori;
      });
      return filtered;
    }

    const normalizedKat = KATEGORI_ALIAS[selectedKategori] || selectedKategori;
    const knowCats = KATEGORI_MAP[selectedTipe]
      ?.map(k => KATEGORI_ALIAS[k.id] || k.id)
      .filter(k => !k.startsWith('lainnya')) || [];

    let filtered = inventoryItems.filter(item => {
      const cat = (item.category || '').toLowerCase();
      if (cat === normalizedKat || cat === selectedKategori) return true;
      if (selectedKategori.startsWith('lainnya') && !knowCats.includes(cat)) return true;
      return false;
    });

    if (requiresVendor && selectedVendor) {
      filtered = filtered.filter(i => i.vendor === selectedVendor);
    }

    return filtered;
  }, [inventoryItems, selectedKategori, selectedTipe, requiresVendor, selectedVendor]);

  const handleTipeSelect = (tipeId) => {
    setSelectedTipe(tipeId);
    setStep('kategori');
  };

  const handleKategoriSelect = (katId) => {
    setSelectedKategori(katId);
    const isReqVendor = KATEGORI_MAP[selectedTipe]?.find(k => k.id === katId)?.requiresVendor;
    setStep(isReqVendor ? 'vendor' : 'item');
  };

  const handleVendorSelect = (vendor) => {
    setSelectedVendor(vendor);
    setStep('item');
  };

  const handleItemSelect = (item) => {
    setSelectedItem(item);
    setShowInventoriModal(false);
    setStep('jumlah');
  };

  // Dipanggil setelah item baru berhasil dibuat di inventori
  const handleNewItemCreated = (newItem, entity) => {
    setShowTambahItemBaru(false);
    // Bangun virtual inventory item dari data baru
    const prefix = entity === 'Botol' ? 'botol'
      : entity === 'Tutup' ? 'tutup'
      : entity === 'Spray' ? 'spray'
      : entity === 'BahanCair' ? 'bahan'
      : 'item';
    const virtualItem = {
      id: `${prefix}-${newItem.id}`,
      _stokId: newItem.id,
      _entity: entity,
      item_name: newItem.nama,
      category: selectedKategori,
      total_stock: 0,
      unit: newItem.satuan || (entity === 'BahanCair' ? newItem.satuan || 'kg' : 'pcs'),
      vendor: newItem.vendor || newItem.catatan || '',
    };
    // Panggil onNewItemCreated tanpa setTimeout untuk menghindari race condition
    if (onNewItemCreated) {
      onNewItemCreated();
    }
    // Langsung set item tanpa menutup panel
    setSelectedItem(virtualItem);
    setShowInventoriModal(false);
    setStep('jumlah');
  };

  const handleTambahkan = () => {
    if (!selectedItem || !jumlah || Number(jumlah) <= 0 || isNaN(Number(jumlah))) return;
    // jumlah sudah dalam stockUnit (konversi dilakukan oleh SmartQtyInput)
    onItemAdded({
      inventory_item_id: selectedItem.id,
      _stokId: selectedItem._stokId,
      _entity: selectedItem._entity,
      nama_barang: selectedItem.item_name,
      kode: selectedItem.kode || '',
      kategori: selectedItem.category,
      tipe: selectedTipe,
      satuan: selectedItem.unit || 'pcs',
      jumlah: Number(jumlah),
      vendor: selectedVendor || selectedItem.vendor || '',
    });
    // Reset untuk tambah item berikutnya
    setStep('tipe');
    setSelectedTipe(null);
    setSelectedKategori(null);
    setSelectedVendor('');
    setSelectedItem(null);
    setJumlah('');
  };

  const tipeInfo = TIPE_BARANG.find(t => t.id === selectedTipe);

  // ── Breadcrumb ──
  const breadcrumb = (
    <div className="flex items-center gap-1.5 text-xs flex-wrap mb-3">
      <button
        onClick={() => { setStep('tipe'); setSelectedTipe(null); setSelectedKategori(null); setSelectedVendor(''); setSelectedItem(null); }}
        className={`font-medium ${step === 'tipe' ? 'text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
      >
        Tipe
      </button>
      {selectedTipe && (
        <>
          <ChevronRight className="w-3 h-3 text-muted-foreground" />
          <button
            onClick={() => { setStep('kategori'); setSelectedKategori(null); setSelectedVendor(''); setSelectedItem(null); }}
            className={`font-medium ${step === 'kategori' ? 'text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
          >
            {tipeInfo?.label}
          </button>
        </>
      )}
      {selectedKategori && (
        <>
          <ChevronRight className="w-3 h-3 text-muted-foreground" />
          <button
            onClick={() => {
              const isReqVendor = requiresVendor;
              setStep(isReqVendor ? 'vendor' : 'item');
              setSelectedVendor('');
              setSelectedItem(null);
            }}
            className={`font-medium ${(step === 'vendor' || step === 'item') ? 'text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
          >
            {kategoriInfo?.label || selectedKategori}
          </button>
        </>
      )}
      {selectedVendor && (
        <>
          <ChevronRight className="w-3 h-3 text-muted-foreground" />
          <button
            onClick={() => { setStep('item'); setSelectedItem(null); }}
            className={`font-medium ${step === 'item' ? 'text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
          >
            {selectedVendor}
          </button>
        </>
      )}
      {selectedItem && (
        <>
          <ChevronRight className="w-3 h-3 text-muted-foreground" />
          <span className="font-semibold text-foreground truncate max-w-[140px]">{selectedItem.item_name}</span>
        </>
      )}
    </div>
  );

  return (
    <div className="border-2 border-dashed border-primary/30 rounded-xl p-4 bg-primary/[0.02] space-y-4">
      {/* Header panel */}
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-primary">+ Tambah Item Baru</p>
        <Button type="button" variant="ghost" size="sm" className="h-7 w-7 p-0 text-muted-foreground" onClick={onCancel}>
          <X className="w-4 h-4" />
        </Button>
      </div>

      {step !== 'tipe' && breadcrumb}

      {/* ── Step: Pilih Tipe ── */}
      {step === 'tipe' && (
        <div className="space-y-3">
          <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Langkah 1 — Jenis Barang</p>
          <div className="grid grid-cols-2 gap-3">
            {TIPE_BARANG.map(t => {
              const TIcon = t.Icon;
              return (
              <button
                key={t.id}
                type="button"
                onClick={() => handleTipeSelect(t.id)}
                className={`flex flex-col items-center gap-2.5 p-5 rounded-xl border-2 transition-all hover:scale-[1.02] ${t.bg} ${t.text}`}
              >
                <TIcon className={`w-7 h-7 ${t.iconColor}`} />
                <span className="font-semibold text-sm">{t.label}</span>
                <span className="text-[11px] opacity-70 text-center leading-tight">{t.desc}</span>
              </button>
            );})}
          </div>
        </div>
      )}

      {/* ── Step: Pilih Kategori ── */}
      {step === 'kategori' && selectedTipe && (
        <div className="space-y-3">
          <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">
            Langkah 2 — Kategori {tipeInfo?.label}
          </p>
          <div className="grid grid-cols-3 gap-2">
            {KATEGORI_MAP[selectedTipe].map(k => {
              const KIcon = k.Icon;
              return (
              <button
                key={k.id}
                type="button"
                onClick={() => handleKategoriSelect(k.id)}
                className="flex flex-col items-center gap-1.5 p-3 rounded-xl border border-border hover:border-primary hover:bg-primary/5 transition-all text-sm font-medium group"
              >
                <KIcon className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
                <span className="text-xs text-center leading-tight">{k.label}</span>
                {k.requiresVendor && (
                  <span className="text-[9px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full">wajib vendor</span>
                )}
              </button>
            );})}

          </div>
        </div>
      )}

      {/* ── Step: Pilih Vendor (bibit) ── */}
      {step === 'vendor' && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Building2 className="w-4 h-4 text-amber-600" />
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">
              Langkah 3 — Pilih Vendor Bibit
            </p>
          </div>
          <p className="text-xs text-muted-foreground -mt-1">
            Pilih vendor terlebih dahulu untuk memfilter bibit yang tersedia
          </p>
          <div className="space-y-2 max-h-52 overflow-y-auto">
            {allVendors.length === 0 && (
              <p className="text-xs text-muted-foreground text-center py-3">Belum ada vendor — tambahkan vendor baru</p>
            )}
            {allVendors.map(v => (
              <button
                key={v}
                type="button"
                onClick={() => handleVendorSelect(v)}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg border border-border hover:border-primary hover:bg-primary/5 transition-all text-left"
              >
                <Building2 className="w-4 h-4 text-muted-foreground shrink-0" />
                <span className="text-sm font-medium">{v}</span>
              </button>
            ))}
            <button
              type="button"
              onClick={() => setShowTambahVendor(true)}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg border-2 border-dashed border-amber-300 bg-amber-50 hover:bg-amber-100 transition-all text-left"
            >
              <Plus className="w-4 h-4 text-amber-600 shrink-0" />
              <span className="text-sm font-medium text-amber-700">+ Tambah Vendor Baru</span>
            </button>
          </div>
        </div>
      )}

      {/* ── Step: Pilih Item dari Inventori ── */}
      {step === 'item' && (
        <div className="space-y-3">
          <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">
            Langkah {requiresVendor ? '4' : '3'} — Pilih Item dari Inventori
            {selectedVendor && <span className="normal-case font-normal ml-1">· Vendor: <strong>{selectedVendor}</strong></span>}
          </p>

          {/* Tombol search utama */}
          <Button
            type="button"
            variant="outline"
            className="w-full gap-2 justify-start text-muted-foreground"
            onClick={() => setShowInventoriModal(true)}
          >
            <Search className="w-4 h-4" />
            <span>Cari & pilih item dari inventori...</span>
          </Button>

          {/* Preview item tersedia (max 5) */}
          <div className="space-y-1">
            {inventoriTerfilter.length === 0 ? (
              <div className="text-xs text-muted-foreground text-center py-3 bg-muted/30 rounded-lg space-y-2">
                <p>Belum ada item <strong>{kategoriInfo?.label}</strong>
                {selectedVendor ? ` dari vendor ${selectedVendor}` : ''} di inventori</p>
                <button
                  type="button"
                  onClick={() => setShowTambahItemBaru(true)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 transition-colors"
                >
                  <Plus className="w-3 h-3" /> Tambah Item Baru ke Inventori
                </button>
              </div>
            ) : (
              <>
                {inventoriTerfilter.slice(0, 5).map(item => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleItemSelect(item)}
                    className="w-full text-left flex items-center gap-2 px-3 py-2.5 rounded-lg hover:bg-muted/60 border border-transparent hover:border-border/40 transition-all text-sm"
                  >
                    <Package className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                    <span className="font-medium flex-1 truncate">{item.item_name}</span>
                    <span className="text-xs text-muted-foreground shrink-0">
                      Stok: {item.total_stock ?? 0} {item.unit}
                    </span>
                  </button>
                ))}
                {inventoriTerfilter.length > 5 && (
                  <button
                    type="button"
                    onClick={() => setShowInventoriModal(true)}
                    className="text-xs text-primary hover:underline w-full text-center py-1.5"
                  >
                    Lihat semua {inventoriTerfilter.length} item →
                  </button>
                )}
                {/* Opsi tambah item baru meski sudah ada item lain */}
                <button
                  type="button"
                  onClick={() => setShowTambahItemBaru(true)}
                  className="w-full flex items-center gap-2 px-3 py-2 rounded-lg border-2 border-dashed border-primary/30 hover:border-primary/60 hover:bg-primary/5 transition-all text-xs text-primary font-medium"
                >
                  <Plus className="w-3.5 h-3.5 shrink-0" />
                  Item tidak ada? Tambah ke inventori dulu
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* ── Step: Input Jumlah ── */}
      {step === 'jumlah' && selectedItem && (
        <div className="space-y-3">
          {/* Item terpilih */}
          <div className="bg-white rounded-xl border p-3 flex items-center gap-3 shadow-sm">
            <div className="w-9 h-9 bg-primary/10 rounded-lg flex items-center justify-center shrink-0">
              <Package className="w-4 h-4 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold truncate">{selectedItem.item_name}</p>
              <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                {selectedItem.kode && (
                  <span className="text-xs text-muted-foreground">[{selectedItem.kode}]</span>
                )}
                <span className="text-xs text-muted-foreground">
                  Stok saat ini: <strong>{selectedItem.total_stock ?? 0} {selectedItem.unit}</strong>
                </span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setStep('item')}
              className="text-xs text-muted-foreground hover:text-primary transition-colors shrink-0"
            >
              Ganti
            </button>
          </div>

          {selectedVendor && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
              <Building2 className="w-3.5 h-3.5 text-amber-600" />
              <span>Vendor: <strong className="text-amber-800">{selectedVendor}</strong></span>
              <button
                type="button"
                onClick={() => { setSelectedVendor(''); setStep('vendor'); setSelectedItem(null); }}
                className="text-amber-600 hover:text-red-600 ml-auto transition-colors"
              >
                Ganti
              </button>
            </div>
          )}

          <div className="space-y-1">
            <Label className="text-sm font-semibold">Jumlah yang Masuk *</Label>
            <SmartQtyInput
              value={typeof jumlah === 'number' ? jumlah : 0}
              onChange={val => setJumlah(val)}
              stockUnit={selectedItem.unit || 'pcs'}
            />
            <p className="text-xs text-muted-foreground">
              Stok saat ini: <strong>{selectedItem.total_stock ?? 0} {selectedItem.unit}</strong>
            </p>
          </div>

          <div className="flex gap-2">
            <Button
              type="button"
              onClick={handleTambahkan}
              disabled={!jumlah || Number(jumlah) <= 0}
              className="flex-1 gap-2"
            >
              <CheckCircle2 className="w-4 h-4" />
              Tambahkan Item
            </Button>
          </div>
        </div>
      )}

      {/* Modal inventori */}
      {showInventoriModal && (
        <PilihInventoriModal
          items={inventoriTerfilter}
          onSelect={handleItemSelect}
          onClose={() => setShowInventoriModal(false)}
        />
      )}

      {/* Modal tambah vendor */}
      {showTambahVendor && (
        <TambahVendorModal
          onClose={() => setShowTambahVendor(false)}
          onAdded={(vendor) => {
            setLocalVendors(prev => [...prev, vendor]);
            setShowTambahVendor(false);
            handleVendorSelect(vendor.nama);
          }}
        />
      )}

      {/* Modal tambah item baru ke inventori */}
      {showTambahItemBaru && selectedKategori && (
        <AddNewItemModal
          type={KATEGORI_TO_TYPE[selectedKategori] || 'botol'}
          initialName=""
          initialKategori={
            selectedKategori === 'bibit' ? 'Bibit'
            : selectedKategori === 'alkohol' ? 'Alkohol'
            : 'Lainnya'
          }
          initialVendor={selectedVendor || ''}
          onClose={() => setShowTambahItemBaru(false)}
          onCreated={(newItem) => {
            const entity =
              KATEGORI_TO_TYPE[selectedKategori] === 'botol' ? (
                selectedKategori === 'tutup' ? 'Tutup'
                : selectedKategori === 'spray' ? 'Spray'
                : 'Botol'
              )
              : KATEGORI_TO_TYPE[selectedKategori] === 'bahan' ? 'BahanCair'
              : 'Botol';
            handleNewItemCreated(newItem, entity);
          }}
        />
      )}
    </div>
  );
}

// ─── Form Utama ───────────────────────────────────────────────────────────

export default function BarangMasukForm({ onClose, onSaved }) {
  const queryClient = useQueryClient();

  const [form, setForm] = useState({
    nomor_referensi: '',
    tanggal: new Date().toISOString().split('T')[0],
    supplier: '',
    ekspedisi: '',
    ongkir: '',
    ongkir_dibayar_oleh: 'Perusahaan',
    catatan: '',
    pic: '',
  });

  const [items, setItems] = useState([]);
  const [showAddPanel, setShowAddPanel] = useState(true); // langsung tampilkan panel pertama

  const { data: rawInventoryItems = [] } = useQuery({
    queryKey: ['inventory'],
    queryFn: () => base44.entities.InventoryItem.list('item_name'),
  });

  // Fetch entitas stok utama supaya bisa update stok yang tepat
  const { data: botolList = [] } = useQuery({ queryKey: ['botol'], queryFn: () => base44.entities.Botol.list() });
  const { data: tutupList = [] } = useQuery({ queryKey: ['tutup'], queryFn: () => base44.entities.Tutup.list() });
  const { data: sprayList = [] } = useQuery({ queryKey: ['spray'], queryFn: () => base44.entities.Spray.list() });
  const { data: bahanList = [] } = useQuery({ queryKey: ['bahan-cair'], queryFn: () => base44.entities.BahanCair.list() });
  const { data: itemTambahanList = [] } = useQuery({ queryKey: ['item-tambahan'], queryFn: () => base44.entities.ItemTambahan.list() });

  // Gabungkan dengan stok utama supaya id mengacu ke entitas yg benar
  const inventoryItems = useMemo(() => {
    const combined = [
      ...botolList.map(i => ({ id: `botol-${i.id}`, _stokId: i.id, _entity: 'Botol', item_name: i.nama, category: 'botol', total_stock: i.stok ?? 0, unit: 'pcs', vendor: i.vendor || i.catatan || '' })),
      ...tutupList.map(i => ({ id: `tutup-${i.id}`, _stokId: i.id, _entity: 'Tutup', item_name: i.nama, category: 'tutup', total_stock: i.stok ?? 0, unit: 'pcs', vendor: i.vendor || '' })),
      ...sprayList.map(i => ({ id: `spray-${i.id}`, _stokId: i.id, _entity: 'Spray', item_name: i.nama, category: 'spray', total_stock: i.stok ?? 0, unit: 'pcs', vendor: i.vendor || i.tipe || '' })),
      ...bahanList.map(i => ({ id: `bahan-${i.id}`, _stokId: i.id, _entity: 'BahanCair', item_name: i.nama, category: i.kategori === 'Bibit' ? 'bibit' : 'bahan', total_stock: i.stok ?? 0, unit: i.satuan || 'kg', vendor: i.vendor || '' })),
      ...itemTambahanList.map(i => ({ id: `item-${i.id}`, _stokId: i.id, _entity: 'ItemTambahan', item_name: i.nama, category: i.kategori, total_stock: i.stok ?? 0, unit: 'pcs', vendor: i.vendor || '' })),
    ];
    const combinedNames = new Set(combined.map(i => i.item_name?.toLowerCase()));
    const onlyRaw = rawInventoryItems.filter(i => !combinedNames.has(i.item_name?.toLowerCase()));
    return [...combined, ...onlyRaw];
  }, [botolList, tutupList, sprayList, bahanList, itemTambahanList, rawInventoryItems]);

  const handleItemAdded = (item) => {
    setItems(prev => {
      const existing = prev.find(i => i.inventory_item_id === item.inventory_item_id);
      if (existing) {
        return prev.map(i =>
          i.inventory_item_id === item.inventory_item_id
            ? { ...i, jumlah: i.jumlah + item.jumlah }
            : i
        );
      }
      return [...prev, item];
    });
    setShowAddPanel(false); // tutup panel setelah item ditambahkan
  };

  const removeItem = (idx) => setItems(prev => prev.filter((_, i) => i !== idx));

  // Buat map gabungan untuk cari entitas dari id inventori
  const stokMap = useMemo(() => {
    const map = {};
    botolList.forEach(i => { map[`botol-${i.id}`] = { entity: 'Botol', stokId: i.id, stok: i.stok ?? 0 }; });
    tutupList.forEach(i => { map[`tutup-${i.id}`] = { entity: 'Tutup', stokId: i.id, stok: i.stok ?? 0 }; });
    sprayList.forEach(i => { map[`spray-${i.id}`] = { entity: 'Spray', stokId: i.id, stok: i.stok ?? 0 }; });
    bahanList.forEach(i => { map[`bahan-${i.id}`] = { entity: 'BahanCair', stokId: i.id, stok: i.stok ?? 0 }; });
    itemTambahanList.forEach(i => { map[`item-${i.id}`] = { entity: 'ItemTambahan', stokId: i.id, stok: i.stok ?? 0 }; });
    rawInventoryItems.forEach(i => { map[i.id] = { entity: 'InventoryItem', stokId: i.id, stok: i.total_stock ?? 0 }; });
    return map;
  }, [botolList, tutupList, sprayList, bahanList, itemTambahanList, rawInventoryItems]);

  const saveMutation = useMutation({
    mutationFn: async (data) => {
      const me = await base44.auth.me();
      await base44.entities.BarangMasuk.create({
        ...data,
        ongkir: data.ongkir ? Number(data.ongkir) : 0,
        pic: data.pic || '',
        items: items.map(({ tipe, _stokId, _entity, ...rest }) => rest),
        input_by: me.email,
      });
      // Update stok ke entitas yang tepat
      for (const item of items) {
        const entry = stokMap[item.inventory_item_id];
        if (!entry) continue;
        const newStok = (entry.stok || 0) + item.jumlah;
        if (entry.entity === 'Botol') await base44.entities.Botol.update(entry.stokId, { stok: newStok });
        else if (entry.entity === 'Tutup') await base44.entities.Tutup.update(entry.stokId, { stok: newStok });
        else if (entry.entity === 'Spray') await base44.entities.Spray.update(entry.stokId, { stok: newStok });
        else if (entry.entity === 'BahanCair') await base44.entities.BahanCair.update(entry.stokId, { stok: newStok });
        else if (entry.entity === 'ItemTambahan') await base44.entities.ItemTambahan.update(entry.stokId, { stok: newStok });
        else await base44.entities.InventoryItem.update(entry.stokId, { total_stock: newStok });
      }
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
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
    saveMutation.mutate(form);
  };

  const tipeColorMap = {
    packaging:      'bg-blue-100 text-blue-700',
    bahan_cair:     'bg-emerald-100 text-emerald-700',
    item_tambahan:  'bg-pink-100 text-pink-700',
  };
  const tipeLabelMap = {
    packaging:      'Packaging',
    bahan_cair:     'Bahan Cair',
    item_tambahan:  'Item Tambahan',
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[94vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Box className="w-5 h-5" />
            Input Barang Masuk
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5">

          {/* ── Info Pengiriman ── */}
          <div className="bg-muted/30 rounded-xl p-4 space-y-3">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              Info Pengiriman
            </p>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Tanggal *</Label>
                <Input
                  type="date"
                  value={form.tanggal}
                  onChange={e => setForm(p => ({ ...p, tanggal: e.target.value }))}
                  required
                />
              </div>
              <div className="space-y-1">
                <Label>No. Referensi / DO</Label>
                <Input
                  value={form.nomor_referensi}
                  onChange={e => setForm(p => ({ ...p, nomor_referensi: e.target.value }))}
                  placeholder="Opsional"
                />
              </div>
              <div className="space-y-1 col-span-2">
                <Label>Supplier / Pengirim</Label>
                <Input
                  value={form.supplier}
                  onChange={e => setForm(p => ({ ...p, supplier: e.target.value }))}
                  placeholder="Nama supplier..."
                />
              </div>
              <div className="space-y-1">
                <Label>Ekspedisi</Label>
                <Input
                  value={form.ekspedisi}
                  onChange={e => setForm(p => ({ ...p, ekspedisi: e.target.value }))}
                  placeholder="JNE, JT, SiCepat, dll..."
                />
              </div>
              <div className="space-y-1">
                <Label>Ongkir (Rp)</Label>
                <Input
                  type="number"
                  min="0"
                  value={form.ongkir}
                  onChange={e => setForm(p => ({ ...p, ongkir: e.target.value }))}
                  placeholder="0"
                />
              </div>
              <div className="space-y-1 col-span-2">
                <Label className="text-xs">Ongkir Dibayar Oleh</Label>
                <div className="flex gap-2">
                  {['Supplier', 'Perusahaan', 'Split'].map(opt => (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => setForm(p => ({ ...p, ongkir_dibayar_oleh: opt }))}
                      className={`flex-1 py-2 rounded-lg border text-xs font-medium transition-all ${form.ongkir_dibayar_oleh === opt ? 'bg-primary text-primary-foreground border-primary' : 'border-border text-muted-foreground hover:border-primary/50'}`}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* ── Daftar Item ── */}
          {items.length > 0 && (
            <div className="border rounded-xl overflow-hidden">
              <div className="bg-muted/50 px-4 py-2.5 flex items-center justify-between">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  Item Ditambahkan
                </span>
                <Badge variant="outline" className="text-xs">
                  {items.length} item
                </Badge>
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
                      {item.vendor && (
                        <span className="text-[10px] text-muted-foreground">Vendor: {item.vendor}</span>
                      )}
                    </div>
                  </div>
                  <p className="text-sm font-bold text-green-600 shrink-0">
                    {(() => {
                      const { display, unit: du } = smartDisplayQty(item.jumlah, item.satuan);
                      return `+${display} ${du}`;
                    })()}
                  </p>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="w-7 h-7 text-destructive/60 hover:text-destructive shrink-0"
                    onClick={() => removeItem(idx)}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              ))}
            </div>
          )}

          {/* ── PIC ── */}
          <PicSelector
            value={form.pic}
            onChange={v => setForm(p => ({ ...p, pic: v }))}
          />

          {/* ── Panel Tambah Item ── */}
          {showAddPanel ? (
            <TambahItemPanel
              inventoryItems={inventoryItems}
              onItemAdded={handleItemAdded}
              onCancel={() => {
                if (items.length > 0) setShowAddPanel(false);
              }}
              onNewItemCreated={() => {
                queryClient.invalidateQueries({ queryKey: ['botol'] });
                queryClient.invalidateQueries({ queryKey: ['tutup'] });
                queryClient.invalidateQueries({ queryKey: ['spray'] });
                queryClient.invalidateQueries({ queryKey: ['bahan-cair'] });
                queryClient.invalidateQueries({ queryKey: ['inventory'] });
              }}
            />
          ) : (
            <Button
              type="button"
              variant="outline"
              className="w-full gap-2 border-dashed h-12 text-muted-foreground hover:text-foreground"
              onClick={() => setShowAddPanel(true)}
            >
              <Plus className="w-4 h-4" />
              Tambah Item Barang Lagi
            </Button>
          )}

          {/* ── Catatan ── */}
          <div className="space-y-1">
            <Label>Catatan</Label>
            <Textarea
              value={form.catatan}
              onChange={e => setForm(p => ({ ...p, catatan: e.target.value }))}
              rows={2}
              placeholder="Opsional..."
            />
          </div>

          {/* ── Actions ── */}
          <div className="flex justify-end gap-2 pt-2 border-t">
            <Button type="button" variant="outline" onClick={onClose}>
              Batal
            </Button>
            <Button
              type="submit"
              disabled={saveMutation.isPending || items.length === 0}
              className="gap-2 min-w-[140px]"
            >
              {saveMutation.isPending
                ? 'Menyimpan...'
                : `Konfirmasi (${items.length} item)`}
            </Button>
          </div>

        </form>
      </DialogContent>
    </Dialog>
  );
}