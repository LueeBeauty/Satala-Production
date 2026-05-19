import React, { useState, useMemo, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import {
  Plus, Trash2, AlertTriangle, Package, BookOpen, Database,
  FlaskConical, ChevronDown, ChevronUp, CheckCircle2, Pencil, X
} from 'lucide-react';
import PicSelector from '@/components/shared/PicSelector';
import { needsLiterConversion } from '@/lib/unitConverter';

// ── Helpers ───────────────────────────────────────────────────────────────
function calcKebutuhan(persentase, ukuranMl, qty, kategori) {
  const ml = (persentase / 100) * ukuranMl * qty;
  const isLiter = needsLiterConversion('liter', kategori);
  if (isLiter) {
    // Untuk alkohol/aqua des: tampilkan gram (yang ditimbang) dan ml (volume aktual)
    const gram = ml / 0.8;
    return {
      nilai: +gram.toFixed(2),
      satuan: 'g',
      ml: +ml.toFixed(2),
      isLiter: true,
    };
  }
  if (ml >= 1000) return { nilai: +(ml / 1000).toFixed(3), satuan: 'L', isLiter: false };
  return { nilai: +ml.toFixed(2), satuan: 'ml', isLiter: false };
}

// ── Section Header ─────────────────────────────────────────────────────────
function SectionHeader({ icon: Icon, title, badge, color = 'blue' }) {
  const colors = {
    blue: 'bg-blue-50 text-blue-700 border-blue-200',
    purple: 'bg-purple-50 text-purple-700 border-purple-200',
    amber: 'bg-amber-50 text-amber-700 border-amber-200',
  };
  return (
    <div className={`flex items-center gap-2 px-3 py-2 rounded-xl border ${colors[color]}`}>
      <Icon className="w-4 h-4 shrink-0" />
      <span className="text-sm font-semibold">{title}</span>
      {badge !== undefined && (
        <Badge variant="secondary" className="ml-auto text-xs">{badge}</Badge>
      )}
    </div>
  );
}

// ── Racikan Section ────────────────────────────────────────────────────────
function RacikanSection({ racikanDb, ukuranMl, qty, racikanList, setRacikanList }) {
  const [mode, setMode] = useState('db'); // 'db' | 'manual'
  const [selectedDbId, setSelectedDbId] = useState('');
  const [expandedIdx, setExpandedIdx] = useState(null);

  // Manual bahan state
  const [manualBahan, setManualBahan] = useState({ nama_bahan: '', kategori_bahan: 'Bibit', persentase: '', vendor: '' });

  const selectedDb = racikanDb.find(r => r.id === selectedDbId);

  const loadFromDb = () => {
    if (!selectedDb) return;
    const mapped = (selectedDb.racikan || []).map(r => ({
      ...r,
      _source: 'db',
    }));
    setRacikanList(mapped);
    setSelectedDbId('');
  };

  const addManual = () => {
    if (!manualBahan.nama_bahan || !manualBahan.persentase) return;
    setRacikanList(prev => [...prev, { ...manualBahan, _source: 'manual', persentase: Number(manualBahan.persentase) }]);
    setManualBahan({ nama_bahan: '', kategori_bahan: 'Bibit', persentase: '', vendor: '' });
  };

  const removeItem = (idx) => setRacikanList(prev => prev.filter((_, i) => i !== idx));

  const totalPersen = racikanList.reduce((s, r) => s + (r.persentase || 0), 0);

  return (
    <div className="space-y-3">
      <SectionHeader icon={FlaskConical} title="Racikan / Formula" badge={`${racikanList.length} bahan`} color="purple" />

      {/* Mode toggle */}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setMode('db')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${mode === 'db' ? 'bg-purple-100 text-purple-700 border-purple-300' : 'border-border text-muted-foreground hover:border-purple-200'}`}>
          <BookOpen className="w-3.5 h-3.5" /> Dari Database Racikan
        </button>
        <button
          type="button"
          onClick={() => setMode('manual')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${mode === 'manual' ? 'bg-amber-100 text-amber-700 border-amber-300' : 'border-border text-muted-foreground hover:border-amber-200'}`}>
          <Pencil className="w-3.5 h-3.5" /> Input Manual
        </button>
      </div>

      {/* DB picker */}
      {mode === 'db' && (
        <div className="flex gap-2">
          <Select value={selectedDbId} onValueChange={setSelectedDbId}>
            <SelectTrigger className="flex-1 text-sm">
              <SelectValue placeholder="Pilih racikan dari database..." />
            </SelectTrigger>
            <SelectContent>
              {racikanDb.map(r => (
                <SelectItem key={r.id} value={r.id}>
                  <span className="flex items-center gap-2">
                    <BookOpen className="w-3 h-3 text-purple-500" />
                    <span>{r.nama_brand} — {r.nama_varian}</span>
                    {r.ukuran_ml && <Badge variant="outline" className="text-xs">{r.ukuran_ml}ml</Badge>}
                    <span className="text-muted-foreground text-xs">({r.racikan?.length || 0} bahan)</span>
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button type="button" variant="outline" onClick={loadFromDb} disabled={!selectedDbId} className="shrink-0 gap-1.5 text-xs">
            <Plus className="w-3.5 h-3.5" /> Muat
          </Button>
        </div>
      )}

      {/* Manual input */}
      {mode === 'manual' && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 space-y-2">
          <p className="text-xs font-semibold text-amber-700">Tambah Bahan Racikan Manual</p>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-xs">Nama Bahan *</Label>
              <Input
                className="h-8 text-xs"
                value={manualBahan.nama_bahan}
                onChange={e => setManualBahan(p => ({ ...p, nama_bahan: e.target.value }))}
                placeholder="Bibit Sun Zest..."
              />
            </div>
            <div>
              <Label className="text-xs">Kategori</Label>
              <Select value={manualBahan.kategori_bahan} onValueChange={v => setManualBahan(p => ({ ...p, kategori_bahan: v }))}>
                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {['Bibit', 'Alkohol', 'DPG', 'Isopropil', 'Air', 'Pewarna', 'Lainnya'].map(k => (
                    <SelectItem key={k} value={k} className="text-xs">{k}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Vendor / Supplier</Label>
              <Input
                className="h-8 text-xs"
                value={manualBahan.vendor}
                onChange={e => setManualBahan(p => ({ ...p, vendor: e.target.value }))}
                placeholder="Opsional..."
              />
            </div>
            <div>
              <Label className="text-xs">Persentase (%) *</Label>
              <Input
                type="number" min="0" max="100" step="0.1"
                className="h-8 text-xs"
                value={manualBahan.persentase}
                onChange={e => setManualBahan(p => ({ ...p, persentase: e.target.value }))}
                placeholder="30"
              />
            </div>
          </div>
          <Button type="button" size="sm" onClick={addManual} disabled={!manualBahan.nama_bahan || !manualBahan.persentase}
            className="w-full h-7 text-xs gap-1.5">
            <Plus className="w-3.5 h-3.5" /> Tambah ke Racikan
          </Button>
        </div>
      )}

      {/* Racikan list */}
      {racikanList.length > 0 && (
        <div className="rounded-xl border border-border overflow-hidden">
          <div className="bg-muted/50 px-3 py-2 grid grid-cols-12 gap-1 text-xs font-semibold text-muted-foreground">
            <span className="col-span-4">Bahan</span>
            <span className="col-span-2 text-center">%</span>
            <span className="col-span-3 text-center">Kebutuhan</span>
            <span className="col-span-2 text-center">Satuan</span>
            <span className="col-span-1"></span>
          </div>
          {racikanList.map((r, i) => {
            const kebutuhan = (ukuranMl > 0 && qty > 0)
              ? calcKebutuhan(r.persentase, ukuranMl, qty, r.kategori_bahan)
              : null;
            return (
              <div key={i} className="border-t border-border/50 px-3 py-2.5 grid grid-cols-12 gap-1 items-center hover:bg-muted/20 transition-colors">
                <div className="col-span-4">
                  <p className="text-xs font-medium">{r.nama_bahan}</p>
                  <div className="flex items-center gap-1 mt-0.5">
                    <Badge variant="outline" className="text-[10px] py-0">{r.kategori_bahan}</Badge>
                    {r._source === 'db' && <Badge className="text-[10px] py-0 bg-purple-100 text-purple-600">DB</Badge>}
                    {r._source === 'manual' && <Badge className="text-[10px] py-0 bg-amber-100 text-amber-600">Manual</Badge>}
                  </div>
                </div>
                <div className="col-span-2 text-center">
                  <span className="text-xs font-bold text-purple-700">{r.persentase}%</span>
                </div>
                <div className="col-span-3 text-center">
                  {kebutuhan ? (
                    kebutuhan.isLiter ? (
                      <span className="text-xs font-semibold text-blue-700 leading-tight">
                        {kebutuhan.nilai}g<span className="text-muted-foreground font-normal">/{kebutuhan.ml}ml</span>
                      </span>
                    ) : (
                      <span className="text-xs font-semibold text-blue-700">{kebutuhan.nilai}</span>
                    )
                  ) : <span className="text-xs text-muted-foreground">—</span>}
                </div>
                <div className="col-span-2 text-center">
                  <span className="text-xs text-muted-foreground">
                    {kebutuhan && !kebutuhan.isLiter ? kebutuhan.satuan : kebutuhan?.isLiter ? '' : '—'}
                  </span>
                </div>
                <div className="col-span-1 flex justify-end">
                  <button type="button" onClick={() => removeItem(i)} className="text-destructive/50 hover:text-destructive transition-colors">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
          <div className="border-t border-border bg-muted/30 px-3 py-2 grid grid-cols-12 gap-1">
            <span className="col-span-4 text-xs font-semibold text-muted-foreground">Total</span>
            <span className={`col-span-2 text-center text-xs font-bold ${Math.abs(totalPersen - 100) < 0.1 ? 'text-green-600' : 'text-amber-600'}`}>
              {totalPersen.toFixed(1)}%
            </span>
            <span className="col-span-6"></span>
          </div>
        </div>
      )}

      {ukuranMl > 0 && qty > 0 && racikanList.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 text-xs text-blue-700">
          <p className="font-semibold mb-1">📊 Kalkulasi Otomatis</p>
          <p>Ukuran botol: <strong>{ukuranMl}ml</strong> × Qty: <strong>{qty} pcs</strong> = Total: <strong>{(ukuranMl * qty / 1000).toFixed(2)} L</strong></p>
          {Math.abs(totalPersen - 100) > 0.1 && (
            <p className="mt-1 text-amber-600 flex items-center gap-1"><AlertTriangle className="w-3 h-3" /> Total persentase belum 100% ({totalPersen.toFixed(1)}%)</p>
          )}
        </div>
      )}
    </div>
  );
}

// ── Bahan Jadi Section ─────────────────────────────────────────────────────
function BahanJadiSection({ bahanDbList, inventoryItems, bahanJadi, setBahanJadi, qty }) {
  const [mode, setMode] = useState('db'); // 'db' | 'manual'
  const [selectedDbId, setSelectedDbId] = useState('');
  const [selectedManualId, setSelectedManualId] = useState('');
  const [jumlahInput, setJumlahInput] = useState('');

  const selectedDb = bahanDbList.find(r => r.id === selectedDbId);

  const loadFromDb = () => {
    if (!selectedDb) return;
    const newItems = [];
    // Botol
    if (selectedDb.botol_nama) {
      newItems.push({ nama_barang: selectedDb.botol_nama, kategori: 'botol', satuan: 'pcs', jumlah_digunakan: qty || 1, stok_tersedia: 0, _source: 'db' });
    }
    // Tutup
    if (selectedDb.tutup_nama) {
      newItems.push({ nama_barang: selectedDb.tutup_nama, kategori: 'tutup', satuan: 'pcs', jumlah_digunakan: qty || 1, stok_tersedia: 0, _source: 'db' });
    }
    // Spray
    if (selectedDb.spray_nama) {
      newItems.push({ nama_barang: selectedDb.spray_nama, kategori: 'spray', satuan: 'pcs', jumlah_digunakan: qty || 1, stok_tersedia: 0, _source: 'db' });
    }
    // Item tambahan
    (selectedDb.item_tambahan || []).forEach(it => {
      newItems.push({
        nama_barang: it.nama,
        kategori: it.kategori || 'item tambahan',
        satuan: 'pcs',
        jumlah_digunakan: (it.qty_per_pcs || 1) * (qty || 1),
        stok_tersedia: 0,
        _source: 'db',
      });
    });
    setBahanJadi(prev => {
      const existing = new Set(prev.map(b => b.nama_barang?.toLowerCase()));
      return [...prev, ...newItems.filter(n => !existing.has(n.nama_barang?.toLowerCase()))];
    });
    setSelectedDbId('');
  };

  const addManual = () => {
    const found = inventoryItems.find(s => s.id === selectedManualId);
    if (!found || !jumlahInput || Number(jumlahInput) <= 0) return;
    if (bahanJadi.find(b => b.nama_barang === found.item_name)) return;
    setBahanJadi(prev => [...prev, {
      inventory_item_id: found.id,
      nama_barang: found.item_name,
      kategori: found.category,
      satuan: found.unit || 'pcs',
      jumlah_digunakan: Number(jumlahInput),
      stok_tersedia: found.total_stock || 0,
      _source: 'manual',
    }]);
    setSelectedManualId('');
    setJumlahInput('');
  };

  const removeItem = (idx) => setBahanJadi(prev => prev.filter((_, i) => i !== idx));

  const available = inventoryItems.filter(s => !bahanJadi.find(b => b.nama_barang === s.item_name));

  return (
    <div className="space-y-3">
      <SectionHeader icon={Package} title="Bahan Jadi / Komponen" badge={`${bahanJadi.length} item`} color="blue" />

      {/* Mode toggle */}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setMode('db')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${mode === 'db' ? 'bg-blue-100 text-blue-700 border-blue-300' : 'border-border text-muted-foreground hover:border-blue-200'}`}>
          <Database className="w-3.5 h-3.5" /> Dari Database Bahan
        </button>
        <button
          type="button"
          onClick={() => setMode('manual')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${mode === 'manual' ? 'bg-amber-100 text-amber-700 border-amber-300' : 'border-border text-muted-foreground hover:border-amber-200'}`}>
          <Pencil className="w-3.5 h-3.5" /> Pilih dari Inventori
        </button>
      </div>

      {mode === 'db' && (
        <div className="flex gap-2">
          <Select value={selectedDbId} onValueChange={setSelectedDbId}>
            <SelectTrigger className="flex-1 text-sm">
              <SelectValue placeholder="Pilih dari database bahan..." />
            </SelectTrigger>
            <SelectContent>
              {bahanDbList.map(r => (
                <SelectItem key={r.id} value={r.id}>
                  <span className="flex items-center gap-2">
                    <Database className="w-3 h-3 text-blue-500" />
                    <span>{r.nama_brand} — {r.nama_varian}</span>
                    {r.botol_ukuran_label_ml && <Badge variant="outline" className="text-xs">{r.botol_ukuran_label_ml}ml</Badge>}
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button type="button" variant="outline" onClick={loadFromDb} disabled={!selectedDbId} className="shrink-0 gap-1.5 text-xs">
            <Plus className="w-3.5 h-3.5" /> Muat
          </Button>
        </div>
      )}

      {mode === 'manual' && (
        <div className="flex gap-2">
          <Select value={selectedManualId} onValueChange={setSelectedManualId}>
            <SelectTrigger className="flex-1 text-sm">
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
            className="w-20 text-sm"
          />
          <Button type="button" onClick={addManual} size="icon" disabled={!selectedManualId || !jumlahInput}>
            <Plus className="w-4 h-4" />
          </Button>
        </div>
      )}

      {bahanJadi.length > 0 && (
        <div className="rounded-xl border border-border overflow-hidden">
          <div className="bg-muted/50 px-3 py-2 grid grid-cols-12 gap-1 text-xs font-semibold text-muted-foreground">
            <span className="col-span-5">Item</span>
            <span className="col-span-3 text-center">Jumlah</span>
            <span className="col-span-3 text-center">Satuan</span>
            <span className="col-span-1"></span>
          </div>
          {bahanJadi.map((b, idx) => {
            const isOver = b.stok_tersedia > 0 && b.jumlah_digunakan > b.stok_tersedia;
            return (
              <div key={idx} className={`border-t border-border/50 px-3 py-2.5 grid grid-cols-12 gap-1 items-center ${isOver ? 'bg-red-50' : 'hover:bg-muted/20'} transition-colors`}>
                <div className="col-span-5">
                  <p className="text-xs font-medium">{b.nama_barang}</p>
                  <div className="flex items-center gap-1 mt-0.5">
                    <Badge variant="outline" className="text-[10px] py-0 capitalize">{b.kategori}</Badge>
                    {b._source === 'db' && <Badge className="text-[10px] py-0 bg-blue-100 text-blue-600">DB</Badge>}
                    {b.stok_tersedia > 0 && <span className="text-[10px] text-muted-foreground">Stok: {b.stok_tersedia}</span>}
                  </div>
                </div>
                <div className="col-span-3 text-center">
                  <Input
                    type="number" min="1"
                    value={b.jumlah_digunakan}
                    onChange={e => setBahanJadi(prev => prev.map((item, i) => i === idx ? { ...item, jumlah_digunakan: Number(e.target.value) } : item))}
                    className={`h-7 text-xs text-center ${isOver ? 'border-destructive' : ''}`}
                  />
                </div>
                <div className="col-span-3 text-center">
                  <span className="text-xs text-muted-foreground">{b.satuan}</span>
                </div>
                <div className="col-span-1 flex justify-end">
                  <button type="button" onClick={() => removeItem(idx)} className="text-destructive/50 hover:text-destructive transition-colors">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Main Form ──────────────────────────────────────────────────────────────
export default function ProduksiFormBaru({ onClose, onSaved }) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({
    tanggal: new Date().toISOString().split('T')[0],
    tipe: 'Produksi',
    nama_produk: '',
    jumlah_produk: '',
    ukuran_botol_ml: '',
    satuan_produk: 'pcs',
    catatan: '',
    operator: '',
    pic: '',
  });

  const [racikanList, setRacikanList] = useState([]);
  const [bahanJadi, setBahanJadi] = useState([]);

  const qty = Number(form.jumlah_produk) || 0;
  const ukuranMl = Number(form.ukuran_botol_ml) || 0;

  // Fetch databases
  const { data: racikanDb = [] } = useQuery({
    queryKey: ['racikan-database'],
    queryFn: () => base44.entities.RacikanDatabase.list('nama_brand'),
  });
  const { data: bahanDbList = [] } = useQuery({
    queryKey: ['database-bahan'],
    queryFn: () => base44.entities.DatabaseBahan.list('nama_brand'),
  });
  const { data: botolList = [] } = useQuery({ queryKey: ['botol'], queryFn: () => base44.entities.Botol.list() });
  const { data: tutupList = [] } = useQuery({ queryKey: ['tutup'], queryFn: () => base44.entities.Tutup.list() });
  const { data: sprayList = [] } = useQuery({ queryKey: ['spray'], queryFn: () => base44.entities.Spray.list() });
  const { data: bahanCairList = [] } = useQuery({ queryKey: ['bahan-cair'], queryFn: () => base44.entities.BahanCair.list() });
  const { data: rawInventory = [] } = useQuery({ queryKey: ['inventory'], queryFn: () => base44.entities.InventoryItem.list('item_name') });

  const inventoryItems = useMemo(() => {
    const fromStok = [
      ...botolList.map(i => ({ id: `botol-${i.id}`, _stokId: i.id, _entity: 'Botol', item_name: i.nama, category: 'botol', total_stock: i.stok ?? 0, unit: 'pcs' })),
      ...tutupList.map(i => ({ id: `tutup-${i.id}`, _stokId: i.id, _entity: 'Tutup', item_name: i.nama, category: 'tutup', total_stock: i.stok ?? 0, unit: 'pcs' })),
      ...sprayList.map(i => ({ id: `spray-${i.id}`, _stokId: i.id, _entity: 'Spray', item_name: i.nama, category: 'spray', total_stock: i.stok ?? 0, unit: 'pcs' })),
      ...bahanCairList.map(i => ({ id: `bahan-${i.id}`, _stokId: i.id, _entity: 'BahanCair', item_name: i.nama, category: i.kategori || 'Bibit', total_stock: i.stok ?? 0, unit: i.satuan || 'kg', vendor: i.vendor || '' })),
    ];
    const stokIds = new Set(fromStok.map(i => i.item_name?.toLowerCase()));
    return [...fromStok, ...rawInventory.filter(i => !stokIds.has(i.item_name?.toLowerCase()))];
  }, [botolList, tutupList, sprayList, bahanCairList, rawInventory]);

  const saveMutation = useMutation({
    mutationFn: async (data) => {
      const me = await base44.auth.me();

      // Build racikan data with calculated kebutuhan
      const racikanWithCalc = racikanList.map(r => {
        const kebutuhan = (ukuranMl > 0 && qty > 0) ? calcKebutuhan(r.persentase, ukuranMl, qty, r.kategori_bahan) : null;
        return {
          nama_bahan: r.nama_bahan,
          kategori_bahan: r.kategori_bahan,
          persentase: r.persentase,
          vendor: r.vendor || '',
          kebutuhan_nilai: kebutuhan?.nilai,
          kebutuhan_satuan: kebutuhan?.satuan,
          kebutuhan_ml: kebutuhan?.isLiter ? kebutuhan.ml : null,
        };
      });

      // Build bahan jadi (clean)
      const bahanJadiClean = bahanJadi.map(({ stok_tersedia, _source, inventory_item_id, ...rest }) => ({
        ...rest,
        stock_item_id: inventory_item_id || null,
      }));

      // All bahan combined for backward compat
      const allBahan = [
        ...bahanJadi.map(({ stok_tersedia, _source, ...rest }) => ({
          nama_barang: rest.nama_barang,
          kategori: rest.kategori,
          jumlah_digunakan: rest.jumlah_digunakan,
          satuan: rest.satuan,
          stock_item_id: rest.inventory_item_id || null,
        })),
      ];

      await base44.entities.Produksi.create({
        ...data,
        bahan_digunakan: allBahan,
        racikan_digunakan: racikanWithCalc,
        operator: me.email,
        jumlah_produk: data.jumlah_produk ? Number(data.jumlah_produk) : undefined,
        ukuran_botol_ml: ukuranMl || undefined,
      });

      // Kurangi stok bahan jadi yang ada di inventori
      for (const b of bahanJadi) {
        if (!b.inventory_item_id) continue;
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

  const hasStockWarning = bahanJadi.some(b => b.stok_tersedia > 0 && b.jumlah_digunakan > b.stok_tersedia);

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FlaskConical className="w-5 h-5 text-primary" />
            Catat Produksi / Sample
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* === Info Dasar === */}
          <div className="space-y-3">
            <SectionHeader icon={Package} title="Informasi Produksi" color="amber" />
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Tanggal *</Label>
                <Input type="date" value={form.tanggal} onChange={e => setForm(p => ({ ...p, tanggal: e.target.value }))} required />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Tipe *</Label>
                <Select value={form.tipe} onValueChange={v => setForm(p => ({ ...p, tipe: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Produksi">Produksi</SelectItem>
                    <SelectItem value="Sample">Sample</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1 col-span-2">
                <Label className="text-xs">Nama Produk *</Label>
                <Input
                  value={form.nama_produk}
                  onChange={e => setForm(p => ({ ...p, nama_produk: e.target.value }))}
                  placeholder="Contoh: Cielmora Sun Zest"
                  required
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Qty / Jumlah Produk *</Label>
                <Input
                  type="number" min="1"
                  value={form.jumlah_produk}
                  onChange={e => setForm(p => ({ ...p, jumlah_produk: e.target.value }))}
                  placeholder="1000"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Ukuran Botol (ml)</Label>
                <Input
                  type="number" min="1"
                  value={form.ukuran_botol_ml}
                  onChange={e => setForm(p => ({ ...p, ukuran_botol_ml: e.target.value }))}
                  placeholder="30"
                />
              </div>
            </div>

            {qty > 0 && ukuranMl > 0 && (
              <div className="bg-primary/5 border border-primary/20 rounded-xl px-4 py-2.5 flex items-center gap-3">
                <CheckCircle2 className="w-4 h-4 text-primary shrink-0" />
                <span className="text-xs text-primary font-medium">
                  Total volume produksi: <strong>{(ukuranMl * qty / 1000).toFixed(2)} L</strong>
                  &nbsp;({qty.toLocaleString()} pcs × {ukuranMl}ml)
                </span>
              </div>
            )}
          </div>

          {/* === Racikan === */}
          <RacikanSection
            racikanDb={racikanDb}
            ukuranMl={ukuranMl}
            qty={qty}
            racikanList={racikanList}
            setRacikanList={setRacikanList}
          />

          {/* === Bahan Jadi === */}
          <BahanJadiSection
            bahanDbList={bahanDbList}
            inventoryItems={inventoryItems}
            bahanJadi={bahanJadi}
            setBahanJadi={setBahanJadi}
            qty={qty}
          />

          {hasStockWarning && (
            <div className="flex items-center gap-2 text-sm text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              Beberapa item melebihi stok yang tersedia!
            </div>
          )}

          {/* PIC */}
          <PicSelector
            label="Penanggung Jawab (PIC)"
            value={form.pic}
            onChange={v => setForm(p => ({ ...p, pic: v }))}
            placeholder="Pilih PIC produksi ini..."
          />

          <div className="space-y-1">
            <Label className="text-xs">Catatan</Label>
            <Textarea
              value={form.catatan}
              onChange={e => setForm(p => ({ ...p, catatan: e.target.value }))}
              rows={2}
              placeholder="Opsional..."
            />
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t">
            <Button type="button" variant="outline" onClick={onClose}>Batal</Button>
            <Button type="submit" disabled={saveMutation.isPending} className="gap-2">
              {saveMutation.isPending ? 'Menyimpan...' : 'Simpan Produksi'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}