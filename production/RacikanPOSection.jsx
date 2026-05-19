import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { BookOpen, Plus, X, FlaskConical, Pencil, AlertTriangle, CheckCircle2, Database, AlertCircle } from 'lucide-react';
import SearchableDropdown from './SearchableDropdown';

function calcKebutuhan(persentase, ukuranMl, qty) {
  const ml = (persentase / 100) * ukuranMl * qty;
  if (ml >= 1000) return { nilai: +(ml / 1000).toFixed(3), satuan: 'L' };
  return { nilai: +ml.toFixed(2), satuan: 'ml' };
}

export default function RacikanPOSection({ ukuranMl, qty, racikanList, setRacikanList, onAutoFillComponents, onProductNameChange, onUkuranChange }) {
  const [mode, setMode] = useState('db');
  const [manualBahan, setManualBahan] = useState({ nama_bahan: '', kategori_bahan: 'Bibit', persentase: '', vendor: '' });

  const [racikanBrand, setRacikanBrand] = useState('');
  const [racikanVarianId, setRacikanVarianId] = useState('');
  const [bahanBrand, setBahanBrand] = useState('');
  const [bahanVarianId, setBahanVarianId] = useState('');

  // Track pilihan aktif untuk cross-validation
  const [activeRacikanId, setActiveRacikanId] = useState('');
  const [activeBahanId, setActiveBahanId] = useState('');

  const { data: racikanDb = [] } = useQuery({
    queryKey: ['racikan-database'],
    queryFn: () => base44.entities.RacikanDatabase.list('nama_brand'),
  });
  const { data: bahanDb = [] } = useQuery({
    queryKey: ['database-bahan'],
    queryFn: () => base44.entities.DatabaseBahan.list('nama_brand'),
  });

  const racikanBrands = useMemo(() => [...new Set(racikanDb.map(r => r.nama_brand).filter(Boolean))].sort(), [racikanDb]);
  const bahanBrands = useMemo(() => [...new Set(bahanDb.map(r => r.nama_brand).filter(Boolean))].sort(), [bahanDb]);
  const racikanVarians = useMemo(() => racikanDb.filter(r => r.nama_brand === racikanBrand), [racikanDb, racikanBrand]);
  const bahanVarians = useMemo(() => bahanDb.filter(r => r.nama_brand === bahanBrand), [bahanDb, bahanBrand]);

  const selectedRacikan = racikanDb.find(r => r.id === racikanVarianId);
  const selectedBahan = bahanDb.find(r => r.id === bahanVarianId);

  // Ambil data aktif (yang sudah di-muat) untuk cross-check
  const loadedRacikan = racikanDb.find(r => r.id === activeRacikanId);
  const loadedBahan = bahanDb.find(r => r.id === activeBahanId);

  // Cek mismatch brand antara racikan & bahan yang sedang aktif
  const brandMismatch = useMemo(() => {
    if (!loadedRacikan || !loadedBahan) return null;
    const brandR = (loadedRacikan.nama_brand || '').toLowerCase().trim();
    const brandB = (loadedBahan.nama_brand || '').toLowerCase().trim();
    if (brandR && brandB && brandR !== brandB) {
      return `Brand tidak sesuai: Database Racikan (${loadedRacikan.nama_brand}) ≠ Database Bahan (${loadedBahan.nama_brand})`;
    }
    return null;
  }, [loadedRacikan, loadedBahan]);

  // Cek mismatch ukuran antara racikan & bahan yang sedang aktif
  const ukuranMismatch = useMemo(() => {
    if (!loadedRacikan || !loadedBahan) return null;
    const ukuranR = Number(loadedRacikan.ukuran_ml) || 0;
    const ukuranB = Number(loadedBahan.botol_ukuran_label_ml) || 0;
    if (ukuranR > 0 && ukuranB > 0 && ukuranR !== ukuranB) {
      return `Ukuran tidak sesuai: Racikan (${ukuranR}ml) ≠ Bahan (${ukuranB}ml)`;
    }
    return null;
  }, [loadedRacikan, loadedBahan]);

  const loadFromRacikanDb = () => {
    if (!selectedRacikan) return;
    const mapped = (selectedRacikan.racikan || []).map(r => ({ ...r, _source: 'db' }));
    setRacikanList(mapped);
    setActiveRacikanId(selectedRacikan.id);
    if (onAutoFillComponents) onAutoFillComponents(null, mapped);
    // Auto-fill nama produk dari varian
    if (onProductNameChange && selectedRacikan.nama_varian) {
      onProductNameChange(selectedRacikan.nama_varian);
    }
    // Auto-fill ukuran botol jika tersedia
    if (onUkuranChange && selectedRacikan.ukuran_ml) {
      onUkuranChange(selectedRacikan.ukuran_ml);
    }
  };

  const loadFromBahanDb = () => {
    if (!selectedBahan) return;
    const mapped = (selectedBahan.racikan || []).map(r => ({
      nama_bahan: r.nama_bahan || r.nama,
      kategori_bahan: r.kategori_bahan || r.kategori || 'Lainnya',
      persentase: r.persentase || 0,
      vendor: r.vendor || '',
      _source: 'bahandb',
    }));
    // Ganti racikan sepenuhnya dari db bahan
    setRacikanList(mapped);
    setActiveBahanId(selectedBahan.id);
    // Auto-fill komponen botol/tutup/spray + bibit
    if (onAutoFillComponents) onAutoFillComponents(selectedBahan, mapped);
    // Auto-fill nama produk dari varian
    if (onProductNameChange && selectedBahan.nama_varian) {
      onProductNameChange(selectedBahan.nama_varian);
    }
    // Auto-fill ukuran botol dari db bahan
    if (onUkuranChange && selectedBahan.botol_ukuran_label_ml) {
      onUkuranChange(selectedBahan.botol_ukuran_label_ml);
    }
  };

  const addManual = () => {
    if (!manualBahan.nama_bahan || !manualBahan.persentase) return;
    setRacikanList(prev => [...prev, { ...manualBahan, _source: 'manual', persentase: Number(manualBahan.persentase) }]);
    setManualBahan({ nama_bahan: '', kategori_bahan: 'Bibit', persentase: '', vendor: '' });
  };

  const totalPersen = racikanList.reduce((s, r) => s + (r.persentase || 0), 0);

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 px-3 py-2 rounded-xl border bg-purple-50 text-purple-700 border-purple-200">
        <FlaskConical className="w-4 h-4 shrink-0" />
        <span className="text-sm font-semibold">Racikan / Formula</span>
        <Badge variant="secondary" className="ml-auto text-xs">{racikanList.length} bahan</Badge>
      </div>

      {/* Mode toggle */}
      <div className="flex gap-2 flex-wrap">
        {[
          { key: 'db', label: 'Database Racikan', icon: BookOpen, active: 'bg-purple-100 text-purple-700 border-purple-300' },
          { key: 'bahandb', label: 'Database Bahan', icon: Database, active: 'bg-blue-100 text-blue-700 border-blue-300' },
          { key: 'manual', label: 'Input Manual', icon: Pencil, active: 'bg-amber-100 text-amber-700 border-amber-300' },
        ].map(({ key, label, icon: Icon, active }) => (
          <button key={key} type="button" onClick={() => setMode(key)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${mode === key ? active : 'border-border text-muted-foreground hover:bg-muted/50'}`}>
            <Icon className="w-3.5 h-3.5" /> {label}
          </button>
        ))}
      </div>

      {/* ===== Mismatch warnings ===== */}
      {brandMismatch && (
        <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-300 rounded-xl text-xs text-red-700 animate-in fade-in">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-600" />
          <div>
            <p className="font-semibold">⚠️ Peringatan Brand</p>
            <p>{brandMismatch}</p>
          </div>
        </div>
      )}
      {ukuranMismatch && (
        <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-300 rounded-xl text-xs text-amber-700 animate-in fade-in">
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-amber-600" />
          <div>
            <p className="font-semibold">⚠️ Peringatan Ukuran</p>
            <p>{ukuranMismatch}</p>
          </div>
        </div>
      )}

      {/* ===== Database Racikan ===== */}
      {mode === 'db' && (
        <div className="bg-purple-50 border border-purple-200 rounded-xl p-3 space-y-3">
          <p className="text-xs text-purple-700 font-medium">Pilih brand → varian → klik Muat</p>

          <div>
            <Label className="text-xs text-muted-foreground mb-1 block">Brand</Label>
            <SearchableDropdown
              options={racikanBrands.map(b => ({ value: b, label: b }))}
              value={racikanBrand}
              onChange={v => { setRacikanBrand(v); setRacikanVarianId(''); }}
              placeholder="Pilih brand..." searchPlaceholder="Cari brand..."
            />
          </div>

          {racikanBrand && (
            <div>
              <Label className="text-xs text-muted-foreground mb-1 block">Varian / Produk</Label>
              <SearchableDropdown
                options={racikanVarians.map(r => ({
                  value: r.id, label: r.nama_varian,
                  sublabel: r.ukuran_ml ? `${r.ukuran_ml}ml · ${r.racikan?.length || 0} bahan` : `${r.racikan?.length || 0} bahan`
                }))}
                value={racikanVarianId}
                onChange={setRacikanVarianId}
                placeholder="Pilih varian..." searchPlaceholder="Cari varian..."
              />
            </div>
          )}

          {selectedRacikan && (
            <div className="bg-white rounded-lg border border-purple-200 p-3 space-y-2">
              {/* Preview warning cross-check dengan DB Bahan yang aktif */}
              {loadedBahan && (() => {
                const brandR = (selectedRacikan.nama_brand || '').toLowerCase().trim();
                const brandB = (loadedBahan.nama_brand || '').toLowerCase().trim();
                const ukuranR = Number(selectedRacikan.ukuran_ml) || 0;
                const ukuranB = Number(loadedBahan.botol_ukuran_label_ml) || 0;
                const bMismatch = brandR && brandB && brandR !== brandB;
                const uMismatch = ukuranR > 0 && ukuranB > 0 && ukuranR !== ukuranB;
                return (bMismatch || uMismatch) ? (
                  <div className="space-y-1">
                    {bMismatch && <p className="text-[11px] text-red-600 bg-red-50 rounded px-2 py-1">⚠️ Brand berbeda dengan DB Bahan aktif ({loadedBahan.nama_brand})</p>}
                    {uMismatch && <p className="text-[11px] text-amber-600 bg-amber-50 rounded px-2 py-1">⚠️ Ukuran berbeda: Racikan {ukuranR}ml ≠ Bahan {ukuranB}ml</p>}
                  </div>
                ) : null;
              })()}
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-purple-700">{selectedRacikan.nama_brand} — {selectedRacikan.nama_varian}</p>
                  {selectedRacikan.ukuran_ml && <p className="text-xs text-muted-foreground">{selectedRacikan.ukuran_ml}ml · {selectedRacikan.racikan?.length || 0} bahan</p>}
                </div>
                <Button type="button" size="sm" onClick={loadFromRacikanDb}
                  className="h-7 text-xs gap-1 bg-purple-600 hover:bg-purple-700">
                  <Plus className="w-3 h-3" /> Muat
                </Button>
              </div>
              {(selectedRacikan.racikan || []).map((r, i) => (
                <div key={i} className="flex items-center justify-between text-xs py-0.5">
                  <span className="font-medium">{r.nama_bahan}</span>
                  <div className="flex items-center gap-2">
                    {r.vendor && <span className="text-muted-foreground">{r.vendor}</span>}
                    <Badge variant="outline" className="text-[10px] py-0">{r.kategori_bahan}</Badge>
                    <span className="font-bold text-purple-700 w-10 text-right">{r.persentase}%</span>
                    {ukuranMl > 0 && qty > 0 && (
                      <span className="text-blue-600 font-semibold w-16 text-right">
                        {(() => { const k = calcKebutuhan(r.persentase, ukuranMl, qty); return `${k.nilai}${k.satuan}`; })()}
                      </span>
                    )}
                  </div>
                </div>
              ))}
              {selectedRacikan.catatan && <p className="text-xs text-muted-foreground italic">📝 {selectedRacikan.catatan}</p>}
            </div>
          )}

              {racikanBrands.length === 0 && <p className="text-xs text-muted-foreground text-center py-2">Belum ada data di Database Racikan</p>}
        </div>
      )}

      {/* ===== Database Bahan ===== */}
      {mode === 'bahandb' && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 space-y-3">
          <p className="text-xs text-blue-700 font-medium">Pilih brand → varian → klik Muat (mengisi komponen + racikan)</p>

          <div>
            <Label className="text-xs text-muted-foreground mb-1 block">Brand</Label>
            <SearchableDropdown
              options={bahanBrands.map(b => ({ value: b, label: b }))}
              value={bahanBrand}
              onChange={v => { setBahanBrand(v); setBahanVarianId(''); }}
              placeholder="Pilih brand..." searchPlaceholder="Cari brand..."
            />
          </div>

          {bahanBrand && (
            <div>
              <Label className="text-xs text-muted-foreground mb-1 block">Varian / Produk</Label>
              <SearchableDropdown
                options={bahanVarians.map(r => ({
                  value: r.id, label: r.nama_varian,
                  sublabel: r.botol_ukuran_label_ml ? `${r.botol_ukuran_label_ml}ml` : undefined
                }))}
                value={bahanVarianId}
                onChange={setBahanVarianId}
                placeholder="Pilih varian..." searchPlaceholder="Cari varian..."
              />
            </div>
          )}

          {selectedBahan && (
            <div className="bg-white rounded-lg border border-blue-200 p-3 space-y-2">
              {/* Preview warning cross-check dengan DB Racikan yang aktif */}
              {loadedRacikan && (() => {
                const brandR = (loadedRacikan.nama_brand || '').toLowerCase().trim();
                const brandB = (selectedBahan.nama_brand || '').toLowerCase().trim();
                const ukuranR = Number(loadedRacikan.ukuran_ml) || 0;
                const ukuranB = Number(selectedBahan.botol_ukuran_label_ml) || 0;
                const bMismatch = brandR && brandB && brandR !== brandB;
                const uMismatch = ukuranR > 0 && ukuranB > 0 && ukuranR !== ukuranB;
                return (bMismatch || uMismatch) ? (
                  <div className="space-y-1">
                    {bMismatch && <p className="text-[11px] text-red-600 bg-red-50 rounded px-2 py-1">⚠️ Brand berbeda dengan DB Racikan aktif ({loadedRacikan.nama_brand})</p>}
                    {uMismatch && <p className="text-[11px] text-amber-600 bg-amber-50 rounded px-2 py-1">⚠️ Ukuran berbeda: Racikan {ukuranR}ml ≠ Bahan {ukuranB}ml</p>}
                  </div>
                ) : null;
              })()}
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-blue-700">{selectedBahan.nama_brand} — {selectedBahan.nama_varian}</p>
                  {selectedBahan.botol_ukuran_label_ml && <p className="text-xs text-muted-foreground">{selectedBahan.botol_ukuran_label_ml}ml</p>}
                </div>
                <Button type="button" size="sm" onClick={loadFromBahanDb}
                  className="h-7 text-xs gap-1 bg-blue-600 hover:bg-blue-700">
                  <Plus className="w-3 h-3" /> Muat
                </Button>
              </div>

              {/* Komponen kemasan */}
              <div className="space-y-1 pb-1">
                {selectedBahan.botol_nama && (
                  <div className="flex items-center gap-2 text-xs">
                    <span>🧴</span><span className="font-medium">{selectedBahan.botol_nama}</span>
                    {selectedBahan.botol_ukuran_aktual_ml && <span className="text-muted-foreground">(aktual {selectedBahan.botol_ukuran_aktual_ml}ml)</span>}
                  </div>
                )}
                {selectedBahan.tutup_nama && (
                  <div className="flex items-center gap-2 text-xs">
                    <span>🔒</span><span className="font-medium">{selectedBahan.tutup_nama}</span>
                  </div>
                )}
                {selectedBahan.spray_nama && (
                  <div className="flex items-center gap-2 text-xs">
                    <span>💨</span><span className="font-medium">{selectedBahan.spray_nama}</span>
                  </div>
                )}
              </div>

              {/* Racikan */}
              {(selectedBahan.racikan || []).length > 0 && (
                <div className="border-t border-blue-100 pt-2 space-y-1">
                  <p className="text-[10px] font-semibold text-muted-foreground uppercase mb-1">Komposisi Racikan</p>
                  {selectedBahan.racikan.map((r, i) => (
                    <div key={i} className="flex items-center justify-between text-xs py-0.5">
                      <span className="font-medium">{r.nama_bahan}</span>
                      <div className="flex items-center gap-2">
                        {r.vendor && <span className="text-muted-foreground">{r.vendor}</span>}
                        <Badge variant="outline" className="text-[10px] py-0">{r.kategori_bahan}</Badge>
                        <span className="font-bold text-blue-700 w-10 text-right">{r.persentase}%</span>
                        {ukuranMl > 0 && qty > 0 && (
                          <span className="text-blue-600 font-semibold w-16 text-right">
                            {(() => { const k = calcKebutuhan(r.persentase, ukuranMl, qty); return `${k.nilai}${k.satuan}`; })()}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {selectedBahan.catatan && <p className="text-xs text-muted-foreground italic pt-1">📝 {selectedBahan.catatan}</p>}
            </div>
          )}

          {bahanBrands.length === 0 && <p className="text-xs text-muted-foreground text-center py-2">Belum ada data di Database Bahan</p>}
        </div>
      )}

      {/* ===== Manual ===== */}
      {mode === 'manual' && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 space-y-2">
          <p className="text-xs font-semibold text-amber-700">Tambah Bahan Racikan Manual</p>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-xs">Nama Bahan *</Label>
              <Input className="h-8 text-xs" value={manualBahan.nama_bahan}
                onChange={e => setManualBahan(p => ({ ...p, nama_bahan: e.target.value }))} placeholder="Bibit Sun Zest..." />
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
              <Label className="text-xs">Vendor</Label>
              <Input className="h-8 text-xs" value={manualBahan.vendor}
                onChange={e => setManualBahan(p => ({ ...p, vendor: e.target.value }))} placeholder="Opsional..." />
            </div>
            <div>
              <Label className="text-xs">Persentase (%) *</Label>
              <Input type="number" min="0" max="100" step="0.1" className="h-8 text-xs"
                value={manualBahan.persentase}
                onChange={e => setManualBahan(p => ({ ...p, persentase: e.target.value }))} placeholder="30" />
            </div>
          </div>
          <Button type="button" size="sm" onClick={addManual}
            disabled={!manualBahan.nama_bahan || !manualBahan.persentase}
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
            <span className="col-span-4 text-center">Kebutuhan</span>
            <span className="col-span-2"></span>
          </div>
          {racikanList.map((r, i) => {
            const kebutuhan = (ukuranMl > 0 && qty > 0) ? calcKebutuhan(r.persentase, ukuranMl, qty) : null;
            return (
              <div key={i} className="border-t border-border/50 px-3 py-2 grid grid-cols-12 gap-1 items-center hover:bg-muted/20">
                <div className="col-span-4">
                  <p className="text-xs font-medium leading-tight">{r.nama_bahan}</p>
                  <div className="flex items-center gap-1 mt-0.5 flex-wrap">
                    <Badge variant="outline" className="text-[10px] py-0">{r.kategori_bahan}</Badge>
                    {r.vendor && <span className="text-[10px] text-muted-foreground">{r.vendor}</span>}
                  </div>
                </div>
                <div className="col-span-2 text-center">
                  <span className="text-xs font-bold text-purple-700">{r.persentase}%</span>
                </div>
                <div className="col-span-4 text-center">
                  {kebutuhan
                    ? <span className="text-xs font-semibold text-blue-700">{kebutuhan.nilai} {kebutuhan.satuan}</span>
                    : <span className="text-xs text-muted-foreground">isi qty & ml</span>}
                </div>
                <div className="col-span-2 flex justify-end">
                  <button type="button" onClick={() => setRacikanList(prev => prev.filter((_, idx) => idx !== i))}
                    className="text-destructive/50 hover:text-destructive transition-colors">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
          <div className="border-t border-border bg-muted/30 px-3 py-2 flex items-center gap-2">
            <span className="text-xs font-semibold text-muted-foreground">Total</span>
            <span className={`text-xs font-bold ml-2 ${Math.abs(totalPersen - 100) < 0.1 ? 'text-green-600' : 'text-amber-600'}`}>
              {totalPersen.toFixed(1)}%
            </span>
          </div>
        </div>
      )}

      {ukuranMl > 0 && qty > 0 && racikanList.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 text-xs text-blue-700 flex items-start gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold">Kalkulasi Otomatis Aktif</p>
            <p>Botol <strong>{ukuranMl}ml</strong> × <strong>{qty} pcs</strong> = <strong>{(ukuranMl * qty / 1000).toFixed(2)} L</strong> total volume</p>
            {Math.abs(totalPersen - 100) > 0.1 && (
              <p className="mt-1 text-amber-600 flex items-center gap-1">
                <AlertTriangle className="w-3 h-3" /> Total % belum 100% ({totalPersen.toFixed(1)}%)
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}