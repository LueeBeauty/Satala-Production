import React, { useState, useCallback, useEffect } from 'react';
import { Plus, ChevronDown, ChevronUp, AlertCircle, CheckCircle2, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import SearchableSelect from './SearchableSelect';
import RacikanRow from './RacikanRow';
import AddNewItemModal from '@/components/shared/AddNewItemModal';
import JasaSection from './JasaSection';
import KomponenTambahanSection from './KomponenTambahanSection';
import { needsLiterConversion } from '@/lib/unitConverter';

const fmt = (n) => new Intl.NumberFormat('id-ID').format(Math.round(n));

export default function ProductHPPCard({ product, index, botolList, tutupList, sprayList, bahanList, onChange, onRemove, canRemove }) {
  const [expanded, setExpanded] = useState(true);
  const [addModal, setAddModal] = useState(null);

  const handleAddNewPackaging = (type, initialName) => {
    setAddModal({ type, initialName: initialName || '' });
  };

  const handlePackagingCreated = (newItem) => {
    const { type } = addModal;
    setAddModal(null);
    if (type === 'botol') onChange({ botol_id: newItem.id, ukuran_digunakan: 'label' });
    else if (type === 'tutup') onChange({ tutup_id: newItem.id });
    else if (type === 'spray') onChange({ spray_id: newItem.id });
  };

    const botolDariClient = product.botol_dari_client === true;
  const tutupDariClient = product.tutup_dari_client === true;
  const sprayDariClient = product.spray_dari_client === true;

  const botol = botolDariClient ? null : botolList.find(b => b.id === product.botol_id);
  const tutup = tutupDariClient ? null : tutupList.find(t => t.id === product.tutup_id);
  const spray = sprayDariClient ? null : sprayList.find(s => s.id === product.spray_id);

  // Ukuran botol: jika dari client, gunakan ukuran yang di-input manual
  const ukuranLabel = botolDariClient ? (product.botol_ukuran_client || 0) : (botol?.ukuran_label_ml ?? 0);
  const ukuranAktual = botolDariClient ? 0 : (botol?.ukuran_aktual_ml ?? 0);
  const hasAktual = ukuranAktual > 0 && ukuranAktual !== ukuranLabel;
  const ukuranDipakai = product.ukuran_digunakan === 'aktual' && hasAktual ? ukuranAktual : ukuranLabel;

  const totalPersen = (product.racikan || []).reduce((s, r) => s + (r.persentase || 0), 0);
  const isValid = Math.abs(totalPersen - 100) < 0.01;

  // Harga packaging: dari client = Rp 0, dari daftar = harga beli
  const hppPackaging = (botolDariClient ? 0 : (botol?.harga_rupiah ?? 0))
    + (tutupDariClient ? 0 : (tutup?.harga_rupiah ?? 0))
    + (sprayDariClient ? 0 : (spray?.harga_rupiah ?? 0));
  const hppJasa = product.jasa_nominal || 0;
  const hppKomponen = (product.komponen_tambahan || []).reduce((s, k) => s + (k.harga || 0), 0);

  // Gunakan hpp_bahan yang sudah dihitung benar di RacikanRow (termasuk konversi gram untuk alkohol/aqua des)
  const calcHPPRacikan = (ukuran) => {
    if (ukuran === ukuranDipakai || !hasAktual) {
      // Gunakan hpp_bahan tersimpan langsung (sudah benar)
      return (product.racikan || []).reduce((sum, r) => sum + (r.hpp_bahan || 0), 0);
    }
    // Fallback hitung manual untuk ukuran alternatif (label vs aktual)
    return (product.racikan || []).reduce((sum, r) => {
      if (!r.bahan_id || !r.persentase) return sum;
      const vol = (r.persentase / 100) * ukuran;
      const isLiter = r.satuan === 'g'; // 'g' = sudah dikonversi gram (alkohol/aqua des)
      if (isLiter) {
        const volumeGram = vol / 0.8;
        const hargaPerMl = (r.harga_per_satuan || 0) / 1000;
        const hargaPerGram = hargaPerMl * 0.8;
        return sum + volumeGram * hargaPerGram;
      }
      const satuan = r.satuan || 'kg';
      const harga = r.harga_per_satuan || 0;
      const perMl = (satuan === 'kg' || satuan === 'liter') ? harga / 1000 : harga;
      return sum + perMl * vol;
    }, 0);
  };

  const hppRacikanLabel = calcHPPRacikan(ukuranLabel);
  const hppRacikanAktual = hasAktual ? calcHPPRacikan(ukuranAktual) : 0;
  // HPP total (untuk display ringkasan) include jasa
  const hppTotalLabel = hppPackaging + hppRacikanLabel + hppJasa + hppKomponen;
  const hppTotalAktual = hasAktual ? hppPackaging + hppRacikanAktual + hppJasa + hppKomponen : 0;
  const hppDipakai = product.ukuran_digunakan === 'aktual' && hasAktual ? hppTotalAktual : hppTotalLabel;
  // HPP Beli = tanpa jasa (untuk margin — jasa langsung profit)
  const hppBeliLabel = hppPackaging + hppRacikanLabel + hppKomponen;
  const hppBeliAktual = hasAktual ? hppPackaging + hppRacikanAktual + hppKomponen : 0;
  const hppBeli = product.ukuran_digunakan === 'aktual' && hasAktual ? hppBeliAktual : hppBeliLabel;

  const hargaJual = product.harga_jual_per_pcs || 0;
  // Margin = harga jual - HPP beli (tanpa jasa) — jasa langsung masuk margin
  const marginNominal = hargaJual > 0 ? hargaJual - hppBeli : 0;
  const marginPersen = hargaJual > 0 && hppBeli > 0 ? ((marginNominal / hppBeli) * 100) : 0;

  // Breakdown margin per item (packaging /pcs, bahan /kg atau /liter)
  const hargaJualBotol = product.harga_jual_botol || 0;
  const hargaJualTutup = product.harga_jual_tutup || 0;
  const hargaJualSpray = product.harga_jual_spray || 0;

  useEffect(() => {
    const qty = product.qty || 1;
    onChange({
      hpp_per_pcs_label: hppTotalLabel,
      hpp_per_pcs_aktual: hppTotalAktual,
      hpp_per_pcs_digunakan: hppDipakai,
      total_hpp_product: hppDipakai * qty,
      total_harga_jual: hargaJual * qty,
      margin_nominal_per_pcs: marginNominal,
      margin_persen: marginPersen,
      botol_harga_beli: botolDariClient ? 0 : (botol?.harga_rupiah ?? 0),
      tutup_harga_beli: tutupDariClient ? 0 : (tutup?.harga_rupiah ?? 0),
      spray_harga_beli: sprayDariClient ? 0 : (spray?.harga_rupiah ?? 0),
    });
  }, [hppTotalLabel, hppTotalAktual, hppDipakai, hppBeli, product.qty, hargaJual, botol?.harga_rupiah, tutup?.harga_rupiah, spray?.harga_rupiah]);

  const addRacikan = () => {
    onChange({ racikan: [...(product.racikan || []), { kategori: 'Bibit', vendor: '', bahan_id: null, bahan_nama: '', persentase: 0, volume_ml: 0, hpp_bahan: 0, harga_per_satuan: 0, satuan: 'kg' }] });
  };

  const updateRacikan = useCallback((idx, data) => {
    const updated = [...(product.racikan || [])];
    updated[idx] = { ...updated[idx], ...data };
    onChange({ racikan: updated });
  }, [product.racikan, onChange]);

  const removeRacikan = (idx) => {
    onChange({ racikan: (product.racikan || []).filter((_, i) => i !== idx) });
  };

  return (
    <>
    {addModal && (
      <AddNewItemModal
        type={addModal.type}
        initialName={addModal.initialName}
        onClose={() => setAddModal(null)}
        onCreated={handlePackagingCreated}
      />
    )}
    <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 bg-gradient-to-r from-primary/5 to-accent/5 border-b border-border">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-accent/20 flex items-center justify-center text-accent font-bold text-sm">{index + 1}</div>
          <div>
            <Input
              value={product.nama_product}
              onChange={e => onChange({ nama_product: e.target.value })}
              placeholder="Contoh: Sun Zest, Glacier, Vanilla..."
              className="font-semibold text-base border-0 bg-transparent p-0 h-auto focus-visible:ring-0 w-56"
            />
            {isValid && (
              <div className="flex items-center gap-1 mt-0.5">
                <CheckCircle2 className="w-3 h-3 text-green-500" />
                <span className="text-xs text-green-600">Racikan valid 100%</span>
              </div>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {canRemove && (
            <Button variant="ghost" size="sm" onClick={onRemove} className="text-destructive/70 hover:text-destructive text-xs">Hapus</Button>
          )}
          <Button variant="ghost" size="icon" className="w-8 h-8" onClick={() => setExpanded(!expanded)}>
            {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </Button>
        </div>
      </div>

      {expanded && (
        <div className="p-5 space-y-5">
          {/* Info Produk */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Qty / Unit</label>
              <Input type="number" min="1" value={product.qty} onChange={e => onChange({ qty: parseInt(e.target.value) || 1 })} className="h-9" />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Catatan</label>
              <Input value={product.catatan || ''} onChange={e => onChange({ catatan: e.target.value })} placeholder="Opsional..." className="h-9" />
            </div>
          </div>

          {/* Packaging */}
          <div>
            <h4 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xs">P</span>
              Packaging
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {/* Botol */}
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Botol</label>
                {botolDariClient ? (
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2 bg-blue-50 border border-blue-200 rounded-lg px-3 py-2">
                      <span className="text-xs text-blue-700 font-semibold flex-1">👤 Dari Client — Rp 0</span>
                      <button type="button" onClick={() => onChange({ botol_dari_client: false, botol_ukuran_client: 0 })} className="text-[10px] text-blue-500 hover:text-blue-700 underline">Ubah</button>
                    </div>
                    <div>
                      <label className="text-[10px] text-muted-foreground mb-1 block">Ukuran botol (ml) *</label>
                      <Input
                        type="number" min="0" placeholder="Contoh: 100"
                        value={product.botol_ukuran_client || ''}
                        onChange={e => onChange({ botol_ukuran_client: parseFloat(e.target.value) || 0 })}
                        className="h-8 text-xs"
                      />
                    </div>
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    <SearchableSelect
                      options={botolList}
                      value={product.botol_id}
                      onChange={v => onChange({ botol_id: v, ukuran_digunakan: 'label' })}
                      placeholder="Pilih botol..."
                      displayKey="nama"
                      valueKey="id"
                      onAddNew={(name) => handleAddNewPackaging('botol', name)}
                      renderOption={(opt) => (
                        <div>
                          <div className="font-medium">{opt.nama}</div>
                          <div className="text-xs text-muted-foreground">{opt.ukuran_label_ml}ml • {opt.harga_rupiah > 0 ? `Rp ${fmt(opt.harga_rupiah)}` : <span className="text-amber-600">Harga belum diisi</span>}</div>
                        </div>
                      )}
                    />
                    <button
                      type="button"
                      onClick={() => onChange({ botol_dari_client: true, botol_id: null, botol_ukuran_client: 0, ukuran_digunakan: 'label' })}
                      className="w-full flex items-center justify-center gap-1 px-2 py-1 rounded-md text-[10px] font-semibold border border-dashed border-blue-300 text-blue-500 hover:bg-blue-50 hover:border-blue-500 transition-all"
                    >
                      👤 Dari Client
                    </button>
                  </div>
                )}
                {botol?.catatan_teknis && (
                  <div className="mt-1.5 flex items-start gap-1.5 bg-amber-50 border border-amber-200 rounded-lg px-2.5 py-1.5">
                    <Info className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
                    <p className="text-xs text-amber-700">{botol.catatan_teknis}</p>
                  </div>
                )}
                {hasAktual && (
                  <div className="mt-2">
                    <label className="text-xs font-medium text-muted-foreground mb-1 block">Hitung berdasarkan:</label>
                    <div className="flex gap-2">
                      {['label', 'aktual'].map(opt => (
                        <button
                          key={opt}
                          type="button"
                          onClick={() => onChange({ ukuran_digunakan: opt })}
                          className={`flex-1 text-xs py-1 rounded-md border transition-colors ${product.ukuran_digunakan === opt ? 'bg-accent text-accent-foreground border-accent' : 'border-border text-muted-foreground hover:border-accent/50'}`}
                        >
                          {opt === 'label' ? `Label (${ukuranLabel}ml)` : `Aktual (${ukuranAktual}ml)`}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Tutup */}
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Tutup</label>
                {tutupDariClient ? (
                  <div className="flex items-center gap-2 bg-blue-50 border border-blue-200 rounded-lg px-3 py-2">
                    <span className="text-xs text-blue-700 font-semibold flex-1">👤 Dari Client — Rp 0</span>
                    <button type="button" onClick={() => onChange({ tutup_dari_client: false })} className="text-[10px] text-blue-500 hover:text-blue-700 underline">Ubah</button>
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    <SearchableSelect
                      options={tutupList}
                      value={product.tutup_id}
                      onChange={v => onChange({ tutup_id: v })}
                      placeholder="Pilih tutup..."
                      displayKey="nama"
                      valueKey="id"
                      onAddNew={(name) => handleAddNewPackaging('tutup', name)}
                      renderOption={(opt) => (
                        <div>
                          <div className="font-medium">{opt.nama}</div>
                          <div className="text-xs text-muted-foreground">{opt.harga_rupiah > 0 ? `Rp ${fmt(opt.harga_rupiah)}` : <span className="text-amber-600">Harga belum diisi</span>}</div>
                        </div>
                      )}
                    />
                    <button
                      type="button"
                      onClick={() => onChange({ tutup_dari_client: true, tutup_id: null })}
                      className="w-full flex items-center justify-center gap-1 px-2 py-1 rounded-md text-[10px] font-semibold border border-dashed border-blue-300 text-blue-500 hover:bg-blue-50 hover:border-blue-500 transition-all"
                    >
                      👤 Dari Client
                    </button>
                  </div>
                )}
              </div>

              {/* Spray */}
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Spray</label>
                {sprayDariClient ? (
                  <div className="flex items-center gap-2 bg-blue-50 border border-blue-200 rounded-lg px-3 py-2">
                    <span className="text-xs text-blue-700 font-semibold flex-1">👤 Dari Client — Rp 0</span>
                    <button type="button" onClick={() => onChange({ spray_dari_client: false })} className="text-[10px] text-blue-500 hover:text-blue-700 underline">Ubah</button>
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    <SearchableSelect
                      options={sprayList}
                      value={product.spray_id}
                      onChange={v => onChange({ spray_id: v })}
                      placeholder="Pilih spray..."
                      displayKey="nama"
                      valueKey="id"
                      onAddNew={(name) => handleAddNewPackaging('spray', name)}
                      renderOption={(opt) => (
                        <div>
                          <div className="font-medium">{opt.nama}</div>
                          <div className="text-xs text-muted-foreground">{opt.tipe} • {opt.harga_rupiah > 0 ? `Rp ${fmt(opt.harga_rupiah)}` : <span className="text-amber-600">Harga belum diisi</span>}</div>
                        </div>
                      )}
                    />
                    <button
                      type="button"
                      onClick={() => onChange({ spray_dari_client: true, spray_id: null })}
                      className="w-full flex items-center justify-center gap-1 px-2 py-1 rounded-md text-[10px] font-semibold border border-dashed border-blue-300 text-blue-500 hover:bg-blue-50 hover:border-blue-500 transition-all"
                    >
                      👤 Dari Client
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Ringkasan packaging */}
            {(botol || tutup || spray || botolDariClient || tutupDariClient || sprayDariClient) && (
              <div className="mt-2 flex flex-wrap gap-2">
                {botolDariClient && <Badge variant="outline" className="text-xs border-blue-200 text-blue-700">👤 Botol Client: Rp 0 ({ukuranDipakai || '?'}ml)</Badge>}
                {botol && <Badge variant="outline" className="text-xs">Botol: Rp {fmt(botol.harga_rupiah)} ({ukuranDipakai}ml)</Badge>}
                {tutupDariClient && <Badge variant="outline" className="text-xs border-blue-200 text-blue-700">👤 Tutup Client: Rp 0</Badge>}
                {tutup && <Badge variant="outline" className="text-xs">Tutup: Rp {fmt(tutup.harga_rupiah)}</Badge>}
                {sprayDariClient && <Badge variant="outline" className="text-xs border-blue-200 text-blue-700">👤 Spray Client: Rp 0</Badge>}
                {spray && <Badge variant="outline" className="text-xs">Spray: Rp {fmt(spray.harga_rupiah)}</Badge>}
                <Badge className="text-xs bg-primary/10 text-primary border-primary/20">Packaging: Rp {fmt(hppPackaging)}</Badge>
              </div>
            )}
          </div>

          {/* Racikan */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <div>
                <h4 className="text-sm font-semibold flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-accent/10 flex items-center justify-center text-accent text-xs">R</span>
                  Racikan Bahan Cair
                  {botol && <Badge variant="outline" className="text-xs">Acuan: {ukuranDipakai}ml</Badge>}
                </h4>

              </div>
              <div className="flex items-center gap-2">
                <span className={`text-xs font-medium ${isValid ? 'text-green-600' : totalPersen > 100 ? 'text-destructive' : 'text-amber-600'}`}>
                  {totalPersen.toFixed(1)}%
                </span>
                <Button size="sm" variant="outline" onClick={addRacikan} className="h-7 text-xs gap-1">
                  <Plus className="w-3 h-3" /> Tambah
                </Button>
              </div>
            </div>


            {!botol && !botolDariClient && (
              <div className="flex items-center gap-2 text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 text-xs mb-3">
                <AlertCircle className="w-4 h-4 shrink-0" />
                Pilih botol terlebih dahulu untuk menentukan volume racikan
              </div>
            )}
            {botolDariClient && !ukuranDipakai && (
              <div className="flex items-center gap-2 text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 text-xs mb-3">
                <AlertCircle className="w-4 h-4 shrink-0" />
                Isi ukuran botol client (ml) terlebih dahulu
              </div>
            )}

            {(product.racikan || []).length > 0 && (
              <>
                <div className="grid grid-cols-12 gap-2 px-1 mb-1">
                  <div className="col-span-2 text-xs font-medium text-muted-foreground">Kategori</div>
                  <div className="col-span-2 text-xs font-medium text-muted-foreground">Vendor</div>
                  <div className="col-span-3 text-xs font-medium text-muted-foreground">Bahan</div>
                  <div className="col-span-2 text-xs font-medium text-muted-foreground">%</div>
                  <div className="col-span-2 text-xs font-medium text-muted-foreground text-center">Volume</div>
                  <div className="col-span-1"></div>
                </div>
                <div className="bg-muted/30 rounded-xl px-3">
                  {(product.racikan || []).map((row, i) => (
                    <RacikanRow
                      key={i}
                      row={row}
                      index={i}
                      bahanList={bahanList}
                      onUpdate={updateRacikan}
                      onRemove={removeRacikan}
                      ukuranMl={ukuranDipakai}
                    />
                  ))}
                </div>
              </>
            )}

            {!isValid && totalPersen > 0 && (
              <div className={`mt-2 flex items-center gap-2 text-xs rounded-lg px-3 py-2 ${totalPersen > 100 ? 'bg-destructive/10 text-destructive border border-destructive/20' : 'bg-amber-50 text-amber-700 border border-amber-200'}`}>
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                {totalPersen > 100 ? `Melebihi 100% (${totalPersen.toFixed(1)}%)` : `Kurang ${(100 - totalPersen).toFixed(1)}% lagi untuk mencapai 100%`}
              </div>
            )}
          </div>

          {/* Jasa — input manual */}
          <JasaSection
            jasaNominal={product.jasa_nominal || 0}
            onJasaChange={(val) => onChange({ jasa_nominal: val })}
          />

          {/* Komponen Tambahan */}
          <KomponenTambahanSection
            komponenList={product.komponen_tambahan || []}
            onKomponenChange={(list) => onChange({ komponen_tambahan: list })}
          />

          {/* HPP Summary — tampil dulu sebelum harga jual */}
          {isValid && (botol || (botolDariClient && ukuranDipakai > 0)) && (
            <div className="bg-gradient-to-br from-primary/5 to-accent/5 border border-primary/10 rounded-xl p-4">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Rincian HPP per pcs (Harga Beli)</p>

              {/* Breakdown per kategori dengan harga beli */}
              <div className="space-y-1.5 mb-3">
                {/* Packaging detail */}
                {botolDariClient ? (
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-blue-700 flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-blue-400 inline-block"></span>
                      Botol: <span className="font-medium">Dari Client</span>
                    </span>
                    <span className="font-medium text-blue-700">Rp 0/pcs</span>
                  </div>
                ) : botol && (
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-muted-foreground flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-primary/50 inline-block"></span>
                      Botol: <span className="text-foreground font-medium">{botol.nama}</span>
                    </span>
                    <span className="font-medium">Rp {fmt(botol.harga_rupiah)}/pcs</span>
                  </div>
                )}
                {tutupDariClient ? (
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-blue-700 flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-blue-400 inline-block"></span>
                      Tutup: <span className="font-medium">Dari Client</span>
                    </span>
                    <span className="font-medium text-blue-700">Rp 0/pcs</span>
                  </div>
                ) : tutup && (
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-muted-foreground flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-primary/50 inline-block"></span>
                      Tutup: <span className="text-foreground font-medium">{tutup.nama}</span>
                    </span>
                    <span className="font-medium">Rp {fmt(tutup.harga_rupiah)}/pcs</span>
                  </div>
                )}
                {sprayDariClient ? (
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-blue-700 flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-blue-400 inline-block"></span>
                      Spray: <span className="font-medium">Dari Client</span>
                    </span>
                    <span className="font-medium text-blue-700">Rp 0/pcs</span>
                  </div>
                ) : spray && (
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-muted-foreground flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-primary/50 inline-block"></span>
                      Spray: <span className="text-foreground font-medium">{spray.nama}</span>
                    </span>
                    <span className="font-medium">Rp {fmt(spray.harga_rupiah)}/pcs</span>
                  </div>
                )}
                {/* Bahan Cair detail */}
                {(product.racikan || []).filter(r => r.bahan_id && r.hpp_bahan > 0).map((r, i) => {
                  const isLiter = needsLiterConversion(r.satuan, r.kategori);
                  const displayVol = isLiter && r.volume_gram > 0
                    ? `${parseFloat(r.volume_gram.toFixed(2))}g/${r.volume_ml?.toFixed(2)}ml`
                    : `${r.volume_ml?.toFixed(2)}ml`;
                  return (
                    <div key={i} className="flex justify-between items-start text-xs gap-2">
                      <span className="text-muted-foreground flex items-center gap-1.5 flex-wrap flex-1">
                        <span className="w-2 h-2 rounded-full bg-accent/50 inline-block shrink-0"></span>
                        <span className="text-foreground font-medium">{r.bahan_nama}</span>
                        <span className="text-muted-foreground">({r.persentase}% → {displayVol})</span>
                      </span>
                      <span className="font-medium shrink-0">Rp {fmt(r.hpp_bahan)}</span>
                    </div>
                  );
                })}
                {(product.komponen_tambahan || []).map((k, i) => k.harga > 0 && (
                  <div key={i} className="flex justify-between items-center text-xs">
                    <span className="text-muted-foreground flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-pink-400 inline-block"></span>
                      {k.nama || k.kategori}
                    </span>
                    <span className="font-medium">Rp {fmt(k.harga)}</span>
                  </div>
                ))}
                {/* Jasa */}
                {hppJasa > 0 && (
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-emerald-700 flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block"></span>
                      <span className="font-medium">Jasa</span>
                    </span>
                    <span className="font-medium text-emerald-700">Rp {fmt(hppJasa)}/pcs</span>
                  </div>
                )}
              </div>

              <div className="border-t border-primary/10 pt-3 space-y-2">
                {hasAktual ? (
                  <>
                    <div className={`flex justify-between items-center ${product.ukuran_digunakan === 'label' ? 'font-semibold' : ''}`}>
                      <span className="text-sm text-muted-foreground">HPP per pcs (Label {ukuranLabel}ml)</span>
                      <span className={`text-sm font-bold ${product.ukuran_digunakan === 'label' ? 'text-accent text-base' : 'text-foreground'}`}>Rp {fmt(hppTotalLabel)}</span>
                    </div>
                    <div className={`flex justify-between items-center ${product.ukuran_digunakan === 'aktual' ? 'font-semibold' : ''}`}>
                      <span className="text-sm text-muted-foreground">HPP per pcs (Aktual {ukuranAktual}ml)</span>
                      <span className={`text-sm font-bold ${product.ukuran_digunakan === 'aktual' ? 'text-accent text-base' : 'text-foreground'}`}>Rp {fmt(hppTotalAktual)}</span>
                    </div>
                    <div className="border-t border-primary/10 pt-2 flex justify-between items-center">
                      <span className="text-sm font-semibold">HPP Beli (digunakan — {product.ukuran_digunakan})</span>
                      <span className="text-lg font-bold text-accent">Rp {fmt(hppDipakai)}</span>
                    </div>
                  </>
                ) : (
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-semibold">Total HPP Beli / pcs</span>
                    <span className="text-xl font-bold text-accent">Rp {fmt(hppTotalLabel)}</span>
                  </div>
                )}
                <div className="flex justify-between items-center pt-1">
                  <span className="text-xs text-muted-foreground">Total HPP (×{product.qty} unit)</span>
                  <span className="text-sm font-bold text-primary">Rp {fmt(hppDipakai * (product.qty || 1))}</span>
                </div>
              </div>
            </div>
          )}

          {/* === HARGA JUAL & MARGIN — tampil setelah HPP selesai === */}
          {isValid && (botol || (botolDariClient && ukuranDipakai > 0)) && (
            <div className="bg-gradient-to-br from-emerald-50 to-green-50 border border-emerald-200 rounded-xl p-4 space-y-3">
              <p className="text-xs font-semibold text-emerald-800 uppercase tracking-wider flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-emerald-200 flex items-center justify-center text-emerald-700 text-xs">💰</span>
                Harga Jual & Margin Profit
              </p>

              {/* Input harga jual */}
              <div className="flex items-center gap-3">
                <div className="flex-1">
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">Harga Jual ke Customer / pcs (Rp)</label>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground font-medium shrink-0">Rp</span>
                    <Input
                      type="number"
                      min="0"
                      value={hargaJual || ''}
                      onChange={e => onChange({ harga_jual_per_pcs: parseFloat(e.target.value) || 0 })}
                      placeholder={`Min. Rp ${fmt(hppDipakai)} (HPP)`}
                      className="h-10 text-base font-semibold"
                    />
                  </div>
                </div>
              </div>

              {/* Breakdown margin otomatis */}
              {hargaJual > 0 && (
                <div className="space-y-2">
                  {botolDariClient ? (
                    <div className="flex justify-between items-center text-xs bg-blue-50 rounded-lg px-3 py-1.5">
                      <span className="text-blue-700">👤 Botol: Dari Client</span>
                      <span className="font-semibold text-blue-700">Rp 0/pcs</span>
                    </div>
                  ) : botol && (
                    <div className="flex justify-between items-center text-xs bg-white/60 rounded-lg px-3 py-1.5">
                      <span className="text-muted-foreground">Botol: {botol.nama}</span>
                      <span className="font-semibold text-foreground">Rp {fmt(botol.harga_rupiah)}/pcs</span>
                    </div>
                  )}
                  {tutupDariClient ? (
                    <div className="flex justify-between items-center text-xs bg-blue-50 rounded-lg px-3 py-1.5">
                      <span className="text-blue-700">👤 Tutup: Dari Client</span>
                      <span className="font-semibold text-blue-700">Rp 0/pcs</span>
                    </div>
                  ) : tutup && (
                    <div className="flex justify-between items-center text-xs bg-white/60 rounded-lg px-3 py-1.5">
                      <span className="text-muted-foreground">Tutup: {tutup.nama}</span>
                      <span className="font-semibold text-foreground">Rp {fmt(tutup.harga_rupiah)}/pcs</span>
                    </div>
                  )}
                  {sprayDariClient ? (
                    <div className="flex justify-between items-center text-xs bg-blue-50 rounded-lg px-3 py-1.5">
                      <span className="text-blue-700">👤 Spray: Dari Client</span>
                      <span className="font-semibold text-blue-700">Rp 0/pcs</span>
                    </div>
                  ) : spray && (
                    <div className="flex justify-between items-center text-xs bg-white/60 rounded-lg px-3 py-1.5">
                      <span className="text-muted-foreground">Spray: {spray.nama}</span>
                      <span className="font-semibold text-foreground">Rp {fmt(spray.harga_rupiah)}/pcs</span>
                    </div>
                  )}
                  {(product.racikan || []).filter(r => r.bahan_id && r.hpp_bahan > 0).map((r, i) => {
                    const isLiter = needsLiterConversion(r.satuan, r.kategori);
                    const displayVol = isLiter && r.volume_gram > 0
                      ? `${parseFloat(r.volume_gram.toFixed(2))}g/${r.volume_ml?.toFixed(2)}ml`
                      : `${r.volume_ml?.toFixed(2)}ml`;
                    return (
                      <div key={i} className="flex justify-between items-center text-xs bg-white/60 rounded-lg px-3 py-1.5">
                        <span className="text-muted-foreground">
                          {r.bahan_nama} — {r.persentase}% → {displayVol}
                        </span>
                        <span className="font-semibold text-foreground">Rp {fmt(r.hpp_bahan)}</span>
                      </div>
                    );
                  })}
                  {hppJasa > 0 && (
                    <div className="flex justify-between items-center text-xs bg-emerald-100 border border-emerald-200 rounded-lg px-3 py-1.5">
                      <span className="text-emerald-700 font-medium">Jasa (pure profit — tidak ada harga beli)</span>
                      <span className="font-semibold text-emerald-700">+Rp {fmt(hppJasa)}/pcs</span>
                    </div>
                  )}

                  {/* Summary margin */}
                  <div className="border-t border-emerald-200 pt-2 grid grid-cols-3 gap-2">
                    <div className="bg-white/70 rounded-lg p-2 text-center border border-emerald-100">
                      <p className="text-[10px] text-muted-foreground">HPP Beli</p>
                      <p className="text-xs font-bold text-foreground">Rp {fmt(hppBeli)}</p>
                      <p className="text-[10px] text-muted-foreground">/pcs</p>
                    </div>
                    <div className="bg-blue-50 rounded-lg p-2 text-center border border-blue-200">
                      <p className="text-[10px] text-blue-600">Harga Jual</p>
                      <p className="text-xs font-bold text-blue-700">Rp {fmt(hargaJual)}</p>
                      <p className="text-[10px] text-blue-500">/pcs</p>
                    </div>
                    <div className={`rounded-lg p-2 text-center border ${marginNominal >= 0 ? 'bg-green-100 border-green-200' : 'bg-red-50 border-red-200'}`}>
                      <p className={`text-[10px] ${marginNominal >= 0 ? 'text-green-600' : 'text-red-500'}`}>Margin</p>
                      <p className={`text-xs font-bold ${marginNominal >= 0 ? 'text-green-700' : 'text-red-600'}`}>
                        {marginNominal >= 0 ? '+' : ''}Rp {fmt(marginNominal)}
                      </p>
                      <p className={`text-[10px] ${marginNominal >= 0 ? 'text-green-500' : 'text-red-400'}`}>/pcs ({marginPersen.toFixed(1)}%)</p>
                    </div>
                  </div>

                  {/* Total margin */}
                  <div className={`flex items-center justify-between rounded-lg px-3 py-2 ${marginNominal >= 0 ? 'bg-green-100 border border-green-300' : 'bg-red-50 border border-red-200'}`}>
                    <span className="text-xs font-medium text-muted-foreground">Total Margin × {product.qty} unit</span>
                    <span className={`font-bold text-sm ${marginNominal >= 0 ? 'text-green-700' : 'text-red-600'}`}>
                      {marginNominal >= 0 ? '+' : ''}Rp {fmt(marginNominal * (product.qty || 1))}
                    </span>
                  </div>
                </div>
              )}

              {!hargaJual && (
                <p className="text-xs text-muted-foreground italic">
                  💡 Masukkan harga jual untuk melihat margin otomatis. Jasa akan dihitung sebagai pure profit.
                </p>
              )}
            </div>
          )}

        </div>
      )}
    </div>
    </>
  );
}