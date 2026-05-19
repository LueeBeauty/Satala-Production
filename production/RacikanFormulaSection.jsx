import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FlaskConical, Plus, Trash2, Save, Database, AlertTriangle, X, CheckCircle2, ChevronDown } from 'lucide-react';
import { toast } from 'sonner';
import { needsLiterConversion, formatGramMl } from '@/lib/unitConverter';

const BAHAN_KATEGORI = ['Bibit', 'Alkohol', 'Aqua Des', 'DPG', 'Peg', 'Sustain', 'Lainnya'];

// Format angka dengan titik ribuan (ID locale)
const fmtN = (n) => n != null ? new Intl.NumberFormat('id-ID').format(Math.round(n)) : '—';
// Format desimal ID (titik ribuan, koma desimal)
const fmtD = (n, dec = 2) => n != null ? new Intl.NumberFormat('id-ID', { minimumFractionDigits: 0, maximumFractionDigits: dec }).format(n) : '—';

// Format satuan bahan cair dengan titik ribuan + auto konversi 1000+ → kg/L
function formatKebutuhan(nilai, satuan) {
  if (!nilai || !satuan) return `— ${satuan || ''}`;
  const s = satuan.toLowerCase();
  if (s === 'kg' || s === 'l' || s === 'liter') {
    const gram = nilai * 1000;
    return `${fmtN(gram)}g / ${fmtD(nilai, 3)}${s === 'kg' ? 'kg' : 'L'}`;
  }
  if (s === 'ml') {
    if (nilai >= 1000) {
      const liter = nilai / 1000;
      return `${fmtN(nilai)}ml / ${fmtD(liter, 2)}L`;
    }
    return `${fmtN(nilai)}ml`;
  }
  if (s === 'g') {
    if (nilai >= 1000) {
      const kg = nilai / 1000;
      return `${fmtN(nilai)}g / ${fmtD(kg, 3)}kg`;
    }
    return `${fmtN(nilai)}g`;
  }
  return `${fmtN(nilai)} ${satuan}`;
}

// Modal simpan ke database racikan
function SaveToDbModal({ racikan, ukuranMl, onClose, onSaved }) {
  const qc = useQueryClient();
  const [brand, setBrand] = useState('');
  const [varian, setVarian] = useState('');
  const [ukuran, setUkuran] = useState(ukuranMl || '');
  const [dupNotif, setDupNotif] = useState(null);
  const [saving, setSaving] = useState(false);

  const { data: racikanDbList = [] } = useQuery({
    queryKey: ['racikan-database'],
    queryFn: () => base44.entities.RacikanDatabase.list('nama_brand'),
  });

  const createMut = useMutation({
    mutationFn: (data) => base44.entities.RacikanDatabase.create(data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['racikan-database'] }); onSaved(); },
  });
  const updateMut = useMutation({
    mutationFn: ({ id, data }) => base44.entities.RacikanDatabase.update(id, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['racikan-database'] }); onSaved(); },
  });

  const doSave = async (overwriteId = null) => {
    if (!brand.trim() || !varian.trim() || !ukuran) {
      toast.error('Lengkapi nama brand, varian, dan ukuran');
      return;
    }
    setSaving(true);
    const payload = {
      nama_brand: brand.trim(),
      nama_varian: varian.trim(),
      ukuran_ml: Number(ukuran),
      racikan: racikan.map(r => ({
        nama_bahan: r.nama_bahan,
        kategori_bahan: r.kategori_bahan,
        vendor: r.vendor || '',
        persentase: r.persentase,
        volume_ml: r.kebutuhan_satuan === 'ml' ? r.kebutuhan_nilai : (r.kebutuhan_nilai || 0) * (r.kebutuhan_satuan === 'L' || r.kebutuhan_satuan === 'l' ? 1000 : 1),
      })),
      status: 'aktif',
    };
    if (overwriteId) {
      await updateMut.mutateAsync({ id: overwriteId, data: payload });
    } else {
      await createMut.mutateAsync(payload);
    }
    setSaving(false);
    toast.success('Racikan berhasil disimpan ke database!');
  };

  const handleSubmit = () => {
    const existing = racikanDbList.find(
      r => r.nama_brand?.toLowerCase() === brand.toLowerCase().trim() &&
        r.nama_varian?.toLowerCase() === varian.toLowerCase().trim()
    );
    if (existing) {
      setDupNotif(existing);
    } else {
      doSave();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-card border border-border rounded-2xl shadow-2xl w-full max-w-sm">
        <div className="flex items-center gap-3 px-5 py-4 border-b border-border">
          <Database className="w-4 h-4 text-purple-600" />
          <h2 className="font-semibold text-sm flex-1">Simpan ke Database Racikan</h2>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onClose}><X className="w-4 h-4" /></Button>
        </div>
        <div className="p-5 space-y-4">
          {dupNotif && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3">
              <div className="flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-semibold text-amber-800">Data sudah ada di database!</p>
                  <p className="text-xs text-amber-700 mt-0.5">
                    <strong>{dupNotif.nama_brand} — {dupNotif.nama_varian}</strong> sudah terdaftar.
                    Apakah ingin menimpa?
                  </p>
                  <div className="flex gap-2 mt-2">
                    <Button size="sm" className="bg-amber-600 hover:bg-amber-700 text-white text-xs h-7"
                      disabled={saving} onClick={() => doSave(dupNotif.id)}>
                      Ya, timpa
                    </Button>
                    <Button size="sm" variant="outline" className="text-xs h-7" onClick={() => setDupNotif(null)}>
                      Batal
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}
          <div className="space-y-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Nama Brand *</label>
              <Input placeholder="Contoh: D'BLURE" value={brand} onChange={e => setBrand(e.target.value)} />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Nama Varian *</label>
              <Input placeholder="Contoh: Rose Elégante" value={varian} onChange={e => setVarian(e.target.value)} />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Ukuran (ml) *</label>
              <Input type="number" placeholder="30" value={ukuran} onChange={e => setUkuran(e.target.value)} />
            </div>
          </div>
          <div className="bg-muted/40 rounded-xl p-3">
            <p className="text-xs font-semibold text-muted-foreground mb-1">Racikan yang akan disimpan ({racikan.length} bahan):</p>
            {racikan.map((r, i) => (
              <div key={i} className="flex justify-between text-xs py-0.5">
                <span>{r.nama_bahan}</span>
                <span className="font-semibold text-purple-700">{r.persentase}%</span>
              </div>
            ))}
          </div>
          {!dupNotif && (
            <Button className="w-full gap-2 bg-purple-600 hover:bg-purple-700" onClick={handleSubmit} disabled={saving}>
              <Database className="w-4 h-4" />
              {saving ? 'Menyimpan...' : 'Simpan ke Database'}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

// Row bahan racikan (edit mode)
function BahanRow({ bahan, index, targetQty, ukuranMl, bahanList, onChange, onRemove }) {
  const totalVolume = (ukuranMl || 0) * (targetQty || 0); // ml

  const kebutuhanMl = totalVolume * (bahan.persentase || 0) / 100;
  const kebutuhanL = kebutuhanMl / 1000;
  const isLiterBahan = needsLiterConversion('', bahan.kategori_bahan);
  const gramMlBahan = isLiterBahan && kebutuhanMl > 0 ? formatGramMl(kebutuhanMl) : null;

  const displayKeb = gramMlBahan
    ? null // akan dirender JSX
    : kebutuhanMl > 0
      ? kebutuhanMl >= 1000
        ? `${fmtN(kebutuhanMl)}ml / ${fmtD(kebutuhanL, 2)}L`
        : `${fmtN(kebutuhanMl)}ml`
      : '—';

  return (
    <div className="grid grid-cols-12 gap-1 items-center border-t border-purple-100 px-3 py-2 hover:bg-purple-50/40 transition-colors">
      {/* Bahan + kategori badge */}
      <div className="col-span-4 space-y-1">
        <Input
          value={bahan.nama_bahan || ''}
          onChange={e => onChange({ ...bahan, nama_bahan: e.target.value })}
          placeholder="Nama bahan"
          className="h-7 text-xs border-0 bg-transparent px-0 focus-visible:ring-0 font-medium"
        />
        <Select value={bahan.kategori_bahan || 'Bibit'} onValueChange={v => onChange({ ...bahan, kategori_bahan: v })}>
          <SelectTrigger className="h-5 text-[10px] border-0 bg-purple-100 text-purple-700 rounded px-1.5 w-fit focus:ring-0">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {BAHAN_KATEGORI.map(k => (
              <SelectItem key={k} value={k} className="text-xs">{k}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      {/* % */}
      <div className="col-span-2 flex items-center gap-1">
        <Input
          type="number"
          value={bahan.persentase || ''}
          onChange={e => onChange({ ...bahan, persentase: parseFloat(e.target.value) || 0 })}
          className="h-7 text-xs text-center"
          min={0}
          max={100}
          step={0.5}
        />
        <span className="text-xs text-muted-foreground">%</span>
      </div>
      {/* Kebutuhan (auto-kalkulasi) */}
      <div className="col-span-3 text-center">
        {gramMlBahan ? (
          <span className="text-xs font-semibold text-orange-600 leading-tight">
            {gramMlBahan.gramLabel} / {gramMlBahan.mlLabel}
          </span>
        ) : (
          <span className="text-xs font-semibold text-blue-700">{displayKeb}</span>
        )}
      </div>
      {/* Vendor */}
      <div className="col-span-2">
        <Input
          value={bahan.vendor || ''}
          onChange={e => onChange({ ...bahan, vendor: e.target.value })}
          placeholder="Vendor"
          className="h-7 text-xs"
        />
      </div>
      {/* Hapus */}
      <div className="col-span-1 flex justify-end">
        <Button variant="ghost" size="icon" className="w-6 h-6 text-destructive/60 hover:text-destructive"
          onClick={onRemove}>
          <Trash2 className="w-3 h-3" />
        </Button>
      </div>
    </div>
  );
}

export default function RacikanFormulaSection({ order, onSave, isSaving }) {
  const [editing, setEditing] = useState(false);
  const [localRacikan, setLocalRacikan] = useState(null);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [showDbPicker, setShowDbPicker] = useState(false);
  const [dbSearch, setDbSearch] = useState('');

  const racikan = order.racikan_digunakan || [];
  const ukuranMl = order.ukuran_botol_ml;
  const targetQty = order.target_qty;
  const totalVolume = (ukuranMl || 0) * (targetQty || 0);

  const { data: bahanList = [] } = useQuery({
    queryKey: ['bahan-cair'],
    queryFn: () => base44.entities.BahanCair.list(),
  });

  // Load racikan database untuk auto-fill
  const { data: racikanDbList = [] } = useQuery({
    queryKey: ['racikan-database'],
    queryFn: () => base44.entities.RacikanDatabase.list('nama_brand'),
  });

  // Cari database racikan yang cocok dengan brand + varian PO
  const matchedDb = useMemo(() => {
    if (!racikanDbList.length) return null;
    const brandLower = (order.brand_name || '').toLowerCase().trim();
    const varianLower = (order.product_name || '').toLowerCase().trim();
    // Exact match dulu
    let match = racikanDbList.find(db =>
      db.nama_brand?.toLowerCase() === brandLower &&
      db.nama_varian?.toLowerCase() === varianLower &&
      db.status === 'aktif'
    );
    // Kalau tidak ada, coba partial match brand
    if (!match) {
      match = racikanDbList.find(db =>
        db.nama_brand?.toLowerCase() === brandLower && db.status === 'aktif'
      );
    }
    return match || null;
  }, [racikanDbList, order.brand_name, order.product_name]);

  const filteredDb = useMemo(() => {
    const q = dbSearch.toLowerCase();
    return racikanDbList.filter(db =>
      db.status === 'aktif' &&
      (db.nama_brand?.toLowerCase().includes(q) || db.nama_varian?.toLowerCase().includes(q))
    );
  }, [racikanDbList, dbSearch]);

  // Fungsi load racikan dari database, konversi ke format PO
  // autoSave: true = langsung simpan ke DB (dipakai dari view mode), false = hanya load ke edit mode
  const loadFromDb = async (dbItem, autoSave = false) => {
    if (!dbItem?.racikan?.length) return;
    const vol = totalVolume || (dbItem.ukuran_ml || 30) * (targetQty || 1);
    const converted = dbItem.racikan.map(r => {
      const kebutuhanMl = vol * (r.persentase || 0) / 100;
      const kebutuhanL = kebutuhanMl / 1000;
      return {
        nama_bahan: r.nama_bahan,
        kategori_bahan: r.kategori_bahan || 'Bibit',
        vendor: r.vendor || '',
        persentase: r.persentase || 0,
        kebutuhan_nilai: kebutuhanMl >= 1000 ? parseFloat(kebutuhanL.toFixed(3)) : Math.round(kebutuhanMl),
        kebutuhan_satuan: kebutuhanMl >= 1000 ? 'L' : 'ml',
      };
    });
    setLocalRacikan(converted);
    setShowDbPicker(false);
    setDbSearch('');
    if (autoSave) {
      // Langsung simpan ke PO tanpa perlu klik Simpan lagi
      await onSave(converted);
      setLocalRacikan(null);
      toast.success(`Racikan dari database "${dbItem.nama_brand} — ${dbItem.nama_varian}" berhasil dimuat!`);
    } else {
      setEditing(true);
    }
  };

  const startEdit = () => {
    // Jika sudah ada racikan, edit yang ada. Jika belum ada tapi ada di DB, tawarkan auto-load
    setLocalRacikan(racikan.length > 0 ? [...racikan] : []);
    setEditing(true);
  };

  const cancelEdit = () => {
    setEditing(false);
    setLocalRacikan(null);
  };

  const addBahan = () => {
    setLocalRacikan(prev => [
      ...prev,
      { nama_bahan: '', kategori_bahan: 'Bibit', persentase: 0, vendor: '', kebutuhan_nilai: 0, kebutuhan_satuan: 'ml' }
    ]);
  };

  const updateBahan = (i, updated) => {
    // Auto-kalkulasi kebutuhan_nilai & kebutuhan_satuan
    const kebutuhanMl = totalVolume * (updated.persentase || 0) / 100;
    const kebutuhanL = kebutuhanMl / 1000;
    const updatedWithKeb = {
      ...updated,
      kebutuhan_nilai: kebutuhanMl >= 1000 ? parseFloat(kebutuhanL.toFixed(3)) : Math.round(kebutuhanMl),
      kebutuhan_satuan: kebutuhanMl >= 1000 ? 'L' : 'ml',
    };
    setLocalRacikan(prev => prev.map((b, idx) => idx === i ? updatedWithKeb : b));
  };

  const removeBahan = (i) => {
    setLocalRacikan(prev => prev.filter((_, idx) => idx !== i));
  };

  const saveRacikan = async () => {
    // Recalculate semua kebutuhan sebelum simpan
    const final = (localRacikan || []).filter(r => r.nama_bahan).map(r => {
      const kebutuhanMl = totalVolume * (r.persentase || 0) / 100;
      const kebutuhanL = kebutuhanMl / 1000;
      return {
        ...r,
        kebutuhan_nilai: kebutuhanMl >= 1000 ? parseFloat(kebutuhanL.toFixed(3)) : Math.round(kebutuhanMl),
        kebutuhan_satuan: kebutuhanMl >= 1000 ? 'L' : 'ml',
      };
    });
    await onSave(final);
    setEditing(false);
    setLocalRacikan(null);
    toast.success('Racikan/formula berhasil disimpan');
  };

  const totalPersen = (editing ? localRacikan : racikan)?.reduce((s, r) => s + (r.persentase || 0), 0) || 0;
  const isValid = totalPersen > 0;

  return (
    <>
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2 flex-wrap">
            <FlaskConical className="w-4 h-4 text-purple-600" />
            <CardTitle className="font-display text-lg text-purple-700">Racikan / Formula</CardTitle>
            {ukuranMl && targetQty ? (
              <span className="ml-auto text-xs text-muted-foreground">
                {ukuranMl}ml × {targetQty} pcs = <strong>{(totalVolume / 1000).toFixed(2)} L</strong>
              </span>
            ) : null}
          </div>
        </CardHeader>
        <CardContent>
          {/* VIEW MODE */}
          {!editing && (
            <>
              {racikan.length === 0 ? (
                <div className="text-center py-8">
                  <FlaskConical className="w-8 h-8 mx-auto mb-2 opacity-30 text-purple-400" />
                  <p className="text-sm text-muted-foreground">Belum ada racikan/formula.</p>
                  
                  {/* Auto-suggest dari database */}
                  {matchedDb && (
                    <div className="mt-3 mx-auto max-w-xs bg-purple-50 border border-purple-200 rounded-xl p-3 text-left">
                      <div className="flex items-center gap-2 mb-2">
                        <CheckCircle2 className="w-4 h-4 text-purple-600 shrink-0" />
                        <p className="text-xs font-semibold text-purple-700">Ditemukan di database!</p>
                      </div>
                      <p className="text-xs text-purple-600 mb-2">
                        <strong>{matchedDb.nama_brand} — {matchedDb.nama_varian}</strong>
                        <br />{matchedDb.racikan?.length || 0} bahan tersimpan
                      </p>
                      <Button
                        size="sm"
                        className="w-full bg-purple-600 hover:bg-purple-700 text-white text-xs gap-1.5"
                        onClick={() => loadFromDb(matchedDb, true)}
                        disabled={isSaving}
                      >
                        <Database className="w-3.5 h-3.5" /> Muat & Simpan Otomatis
                      </Button>
                    </div>
                  )}

                  <div className="flex gap-2 justify-center mt-3">
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-1.5 border-purple-300 text-purple-700 hover:bg-purple-50"
                      onClick={startEdit}
                    >
                      <Plus className="w-3.5 h-3.5" /> Input Manual
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-1.5 border-blue-300 text-blue-700 hover:bg-blue-50"
                      onClick={() => setShowDbPicker(true)}
                    >
                      <Database className="w-3.5 h-3.5" /> Pilih dari Database
                    </Button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="rounded-xl border border-purple-200 overflow-hidden">
                    <div className="bg-purple-50 px-3 py-2 grid grid-cols-12 gap-1 text-xs font-semibold text-purple-700">
                      <span className="col-span-4">Bahan</span>
                      <span className="col-span-2 text-center">%</span>
                      <span className="col-span-3 text-center">Kebutuhan</span>
                      <span className="col-span-3">Vendor</span>
                    </div>
                    {racikan.map((r, i) => {
                    // Hitung ulang dari % untuk format
                    const kebutuhanMl = totalVolume * (r.persentase || 0) / 100;
                    const isLiter = needsLiterConversion('', r.kategori_bahan);
                    const gramMl = isLiter && kebutuhanMl > 0 ? formatGramMl(kebutuhanMl) : null;

                    // Format dengan titik ribuan + auto konversi 1000+
                    let dispKeb;
                    if (gramMl) {
                      dispKeb = null; // JSX
                    } else if (kebutuhanMl > 0) {
                      if (kebutuhanMl >= 1000) {
                        const L = kebutuhanMl / 1000;
                        dispKeb = `${fmtN(kebutuhanMl)}ml / ${fmtD(L, 2)}L`;
                      } else {
                        dispKeb = `${fmtN(kebutuhanMl)}ml`;
                      }
                    } else if (r.kebutuhan_nilai) {
                      dispKeb = formatKebutuhan(r.kebutuhan_nilai, r.kebutuhan_satuan);
                    } else {
                      dispKeb = '—';
                    }
                    return (
                      <div key={i} className="border-t border-purple-100 px-3 py-2 grid grid-cols-12 gap-1 items-center hover:bg-purple-50/50">
                        <div className="col-span-4">
                          <p className="text-sm font-medium leading-tight">{r.nama_bahan}</p>
                          <Badge variant="outline" className="text-[10px] py-0 mt-0.5">{r.kategori_bahan}</Badge>
                        </div>
                        <div className="col-span-2 text-center">
                          <span className="text-sm font-bold text-purple-700">{r.persentase}%</span>
                        </div>
                        <div className="col-span-3 text-center">
                          {gramMl ? (
                            <span className="text-sm font-semibold text-orange-600">
                              {gramMl.gramLabel} / {gramMl.mlLabel}
                            </span>
                          ) : (
                            <span className="text-sm font-semibold text-blue-700">{dispKeb}</span>
                          )}
                        </div>
                        <div className="col-span-3 text-xs text-muted-foreground">{r.vendor || '—'}</div>
                      </div>
                    );
                    })}
                    <div className="border-t border-purple-200 bg-purple-50/50 px-3 py-2 flex justify-between items-center">
                      <span className={`text-xs font-semibold ${Math.abs(totalPersen - 100) > 0.5 ? 'text-red-600' : 'text-purple-700'}`}>
                        Total: {totalPersen.toFixed(1)}%
                        {Math.abs(totalPersen - 100) > 0.5 && ' ⚠️ belum 100%'}
                      </span>
                    </div>
                  </div>
                  <div className="flex gap-2 mt-3 justify-end flex-wrap">
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-1.5 border-purple-300 text-purple-700 hover:bg-purple-50 text-xs h-8"
                      onClick={startEdit}
                    >
                      <Plus className="w-3 h-3" /> Edit Racikan
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-1.5 border-blue-300 text-blue-700 hover:bg-blue-50 text-xs h-8"
                      onClick={() => setShowDbPicker(true)}
                    >
                      <Database className="w-3 h-3" /> Ganti dari Database
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-1.5 border-blue-300 text-blue-700 hover:bg-blue-50 text-xs h-8"
                      onClick={() => setShowSaveModal(true)}
                    >
                      <Database className="w-3 h-3" /> Simpan ke Database
                    </Button>
                  </div>
                </>
              )}
            </>
          )}

          {/* EDIT MODE */}
          {editing && (
            <div className="space-y-3">
              {/* Quick load from database */}
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="gap-1.5 text-xs h-7 border-blue-300 text-blue-700 hover:bg-blue-50"
                  onClick={() => setShowDbPicker(true)}
                >
                  <Database className="w-3 h-3" /> Muat dari Database
                </Button>
                {matchedDb && (
                  <button
                    type="button"
                    className="text-xs text-purple-700 hover:underline"
                    onClick={() => loadFromDb(matchedDb, false)}
                  >
                    ✓ Gunakan: {matchedDb.nama_brand} — {matchedDb.nama_varian}
                  </button>
                )}
              </div>
              <div className="rounded-xl border border-purple-200 overflow-hidden">
                <div className="bg-purple-50 px-3 py-2 grid grid-cols-12 gap-1 text-xs font-semibold text-purple-700">
                  <span className="col-span-4">Bahan</span>
                  <span className="col-span-2 text-center">%</span>
                  <span className="col-span-3 text-center">Kebutuhan (auto)</span>
                  <span className="col-span-2">Vendor</span>
                  <span className="col-span-1"></span>
                </div>
                {(localRacikan || []).map((bahan, i) => (
                  <BahanRow
                    key={i}
                    bahan={bahan}
                    index={i}
                    targetQty={targetQty}
                    ukuranMl={ukuranMl}
                    bahanList={bahanList}
                    onChange={(updated) => updateBahan(i, updated)}
                    onRemove={() => removeBahan(i)}
                  />
                ))}
                <div className="border-t border-purple-100 px-3 py-2 flex justify-between items-center">
                  <span className={`text-xs font-semibold ${Math.abs(totalPersen - 100) > 0.5 && totalPersen > 0 ? 'text-red-600' : 'text-purple-700'}`}>
                    Total: {totalPersen.toFixed(1)}%
                    {Math.abs(totalPersen - 100) > 0.5 && totalPersen > 0 && ' ⚠️ belum 100%'}
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="gap-1 text-xs text-purple-700 hover:bg-purple-50 h-7"
                    onClick={addBahan}
                  >
                    <Plus className="w-3 h-3" /> Tambah Bahan
                  </Button>
                </div>
              </div>

              <div className="flex gap-2 justify-end">
                <Button variant="ghost" size="sm" className="text-xs h-8" onClick={cancelEdit}>Batal</Button>
                <Button
                  size="sm"
                  className="gap-1.5 bg-green-600 hover:bg-green-700 text-xs h-8"
                  onClick={saveRacikan}
                  disabled={isSaving}
                >
                  <Save className="w-3 h-3" /> Simpan Racikan
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {showSaveModal && (
        <SaveToDbModal
          racikan={racikan}
          ukuranMl={ukuranMl}
          onClose={() => setShowSaveModal(false)}
          onSaved={() => setShowSaveModal(false)}
        />
      )}

      {/* DB Picker Modal */}
      {showDbPicker && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/40" onClick={() => { setShowDbPicker(false); setDbSearch(''); }} />
          <div className="relative bg-card border border-border rounded-2xl shadow-2xl w-full max-w-md max-h-[80vh] flex flex-col">
            <div className="flex items-center gap-3 px-5 py-4 border-b border-border">
              <Database className="w-4 h-4 text-blue-600" />
              <h2 className="font-semibold text-sm flex-1">Pilih Racikan dari Database</h2>
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setShowDbPicker(false); setDbSearch(''); }}>
                <X className="w-4 h-4" />
              </Button>
            </div>
            <div className="p-4 border-b border-border">
              <div className="relative">
                <ChevronDown className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  autoFocus
                  className="w-full pl-9 pr-3 py-2 text-sm border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/30"
                  placeholder="Cari brand atau varian..."
                  value={dbSearch}
                  onChange={e => setDbSearch(e.target.value)}
                />
              </div>
            </div>
            <div className="overflow-y-auto flex-1 p-3 space-y-1.5">
              {filteredDb.length === 0 ? (
                <p className="text-center text-sm text-muted-foreground py-8">Tidak ada data ditemukan</p>
              ) : filteredDb.map(db => (
                <button
                  key={db.id}
                  onClick={() => loadFromDb(db, racikan.length === 0)}
                  className="w-full text-left px-4 py-3 rounded-xl border border-border hover:border-blue-300 hover:bg-blue-50/50 transition-all"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold">{db.nama_brand}</p>
                      <p className="text-xs text-muted-foreground">{db.nama_varian} · {db.racikan?.length || 0} bahan</p>
                    </div>
                    {db.ukuran_ml && (
                      <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full">{db.ukuran_ml}ml</span>
                    )}
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}