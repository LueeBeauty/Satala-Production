import React, { useEffect, useState } from 'react';
import { Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import SearchableSelect from './SearchableSelect';
import AddNewItemModal from '@/components/shared/AddNewItemModal';
import { needsLiterConversion, formatGramMl, mlToGram } from '@/lib/unitConverter';

const fmt = (n) => new Intl.NumberFormat('id-ID').format(Math.round(n));
const fmtDes = (n, d = 2) => parseFloat(n.toFixed(d));

// Harga per ml (untuk info display dan HPP bahan non-liter)
const getHargaPerMl = (bahan) => {
  if (!bahan) return 0;
  const satuan = bahan.satuan ?? 'kg';
  const harga = bahan.harga_rupiah ?? 0;
  if (satuan === 'kg' || satuan === 'liter') return harga / 1000;
  if (satuan === 'gram' || satuan === 'ml') return harga;
  return harga / 1000;
};

// Harga per gram:
// Alkohol/liter: harga/gram = harga_liter / 1000 (harga per liter dibagi 1000 unit gram)
// Bibit/kg: harga/gram = harga_kg / 1000
// Catatan: konversi ml→gram (÷0.8) hanya untuk menghitung BERAT yang dibutuhkan, bukan untuk harga
const getHargaPerGram = (bahan) => {
  if (!bahan) return 0;
  const satuan = bahan.satuan ?? 'kg';
  const harga = bahan.harga_rupiah ?? 0;
  if (satuan === 'liter' || satuan === 'kg') return harga / 1000;
  if (satuan === 'gram') return harga;
  return harga / 1000;
};

export default function RacikanRow({ row, index, bahanList, onUpdate, onRemove, ukuranMl }) {
  const kategoriOptions = ['Bibit', 'Alkohol', 'Aqua Des', 'DPG', 'Peg', 'Sustain', 'Lainnya'];
  const PARFAROME_GRADE = ['Deluxe', 'Premium', 'Exclusive'];
  const isParfarome = (row.vendor || '').toLowerCase().includes('parfarome');
  const [addModal, setAddModal] = useState(null); // { initialName, initialVendor }
  const isDariClient = row.dari_client === true;

  // Filter bahan sesuai kategori
  const bahanByKategori = bahanList.filter(b =>
    (b.kategori ?? '').trim().toLowerCase() === (row.kategori ?? '').trim().toLowerCase()
  );

  // Vendor unik untuk kategori yang dipilih
  const vendorList = [...new Set(
    bahanByKategori
      .filter(b => b.vendor && b.vendor.trim() !== '')
      .map(b => b.vendor.trim())
  )];

  const isBibit = (row.kategori ?? '').trim().toLowerCase() === 'bibit';

  // Bibit: wajib pilih vendor dulu → filter bahan berdasarkan vendor
  // Parfarome: juga filter berdasarkan grade setelah vendor dipilih
  const filteredBahan = bahanByKategori.filter(b => {
    const vendorMatch = row.vendor && row.vendor.trim() !== ''
      ? (b.vendor ?? '').trim() === row.vendor.trim()
      : true;
    const gradeMatch = isParfarome && row.grade
      ? (b.grade ?? '').trim() === row.grade.trim()
      : true;
    return vendorMatch && gradeMatch;
  });

  // Bibit: disable pilih bahan sebelum vendor dipilih
  // Parfarome: disable bahan sebelum grade dipilih
  const bahanDisabled = isBibit && (!row.vendor || row.vendor.trim() === '')
    || (isParfarome && (!row.grade || row.grade.trim() === ''));

  const selectedBahan = bahanList.find(b => b.id === row.bahan_id);
  const hargaPerMl = getHargaPerMl(selectedBahan);
  const volumeMl = ukuranMl > 0 && row.persentase > 0 ? (row.persentase / 100) * ukuranMl : 0;

  // Alkohol/Aqua Des: HPP dihitung dari gram (bukan ml), tampilkan gram
  const isLiterBahan = needsLiterConversion(selectedBahan?.satuan, selectedBahan?.kategori);
  const volumeGram = isLiterBahan && volumeMl > 0 ? volumeMl / 0.8 : 0; // ml → gram
  // Jika dari client, HPP bahan = 0 (tidak ada biaya bahan)
  const hppBahanRaw = isLiterBahan
    ? volumeGram * getHargaPerGram(selectedBahan)  // HPP dari gram
    : volumeMl > 0 ? hargaPerMl * volumeMl : 0;   // HPP dari ml (bahan lain)
  const hppBahan = isDariClient ? 0 : hppBahanRaw;

  useEffect(() => {
    onUpdate(index, {
      volume_ml: volumeMl,
      volume_gram: isLiterBahan ? volumeGram : null,
      hpp_bahan: hppBahan,
      harga_per_satuan: selectedBahan?.harga_rupiah ?? 0,
      satuan: isLiterBahan ? 'g' : (selectedBahan?.satuan ?? 'kg'),
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [volumeMl, hppBahan, selectedBahan?.id, index]);

  const handleAddNew = (searchText) => {
    setAddModal({ initialName: searchText || '', initialVendor: row.vendor || '' });
  };

  const handleCreated = (newItem) => {
    setAddModal(null);
    onUpdate(index, { bahan_id: newItem.id, bahan_nama: newItem.nama, vendor: row.vendor || (newItem.vendor ?? '') });
  };

  return (
    <>
    {addModal && (
      <AddNewItemModal
        type="bahan"
        initialName={addModal.initialName}
        initialVendor={addModal.initialVendor}
        initialKategori={row.kategori || 'Bibit'}
        onClose={() => setAddModal(null)}
        onCreated={handleCreated}
      />
    )}
    <div className={`py-2.5 border-b border-border/50 last:border-0 space-y-1.5 ${isDariClient ? 'bg-blue-50/50 rounded-xl px-2 -mx-2' : ''}`}>
      <div className="grid grid-cols-12 gap-2 items-center">
        {/* Kategori */}
        <div className="col-span-2">
          <select
            value={row.kategori}
            onChange={e => onUpdate(index, { kategori: e.target.value, bahan_id: null, bahan_nama: '', vendor: '' })}
            className="w-full text-xs border border-border rounded-md px-2 py-1.5 bg-background focus:ring-1 focus:ring-accent/50 outline-none"
          >
            {kategoriOptions.map(k => <option key={k} value={k}>{k}</option>)}
          </select>
        </div>

        {/* Vendor + Dari Client toggle */}
        <div className="col-span-2 space-y-1">
          {vendorList.length > 0 && !isDariClient ? (
            <SearchableSelect
              options={vendorList}
              value={row.vendor}
              onChange={v => onUpdate(index, { vendor: v, bahan_id: null, bahan_nama: '', grade: '' })}
              placeholder={isBibit ? 'Pilih vendor *' : 'Semua'}
            />
          ) : !isDariClient ? (
            <span className="text-xs text-muted-foreground px-2 italic">—</span>
          ) : null}
          <button
            type="button"
            onClick={() => onUpdate(index, { dari_client: !isDariClient, bahan_id: isDariClient ? null : row.bahan_id, bahan_nama: isDariClient ? '' : row.bahan_nama, vendor: isDariClient ? '' : 'Client' })}
            className={`w-full flex items-center justify-center gap-1 px-2 py-1 rounded-md text-[10px] font-semibold border transition-all ${
              isDariClient
                ? 'bg-blue-500 text-white border-blue-500 shadow-sm'
                : 'border-dashed border-blue-300 text-blue-500 hover:bg-blue-50 hover:border-blue-500'
            }`}
          >
            👤 {isDariClient ? '✓ Dari Client' : 'Dari Client'}
          </button>
        </div>

        {/* Grade Parfarome — tampil di kolom vendor saat vendor sudah dipilih */}
        {/* (handled below in sub-row) */}

        {/* Nama Bahan */}
        <div className="col-span-3">
          {isDariClient ? (
            <Input
              value={row.bahan_nama || ''}
              onChange={e => onUpdate(index, { bahan_nama: e.target.value })}
              placeholder="Nama bahan (opsional)..."
              className="h-8 text-xs border-blue-200 bg-blue-50 focus-visible:ring-blue-300"
            />
          ) : bahanDisabled ? (
            <div className="w-full flex items-center px-3 py-2 text-xs border border-dashed border-border rounded-lg text-muted-foreground bg-muted/30 cursor-not-allowed">
              {!row.vendor ? '← Pilih vendor dulu' : isParfarome && !row.grade ? '← Pilih grade dulu' : '← Pilih vendor dulu'}
            </div>
          ) : (
            <SearchableSelect
              options={filteredBahan}
              value={row.bahan_id}
              onChange={v => {
                const b = bahanList.find(x => x.id === v);
                onUpdate(index, { bahan_id: v, bahan_nama: b?.nama ?? '', vendor: row.vendor || (b?.vendor ?? '') });
              }}
              placeholder="Pilih bahan"
              displayKey="nama"
              valueKey="id"
              onAddNew={handleAddNew}
              renderOption={(opt) => {
                return (
                  <div>
                    <div className="font-medium text-sm">{opt.nama}</div>
                    <div className="flex items-center gap-2 mt-0.5">
                      {opt.vendor && <span className="text-xs text-muted-foreground">{opt.vendor}</span>}
                      {opt.harga_rupiah > 0 ? (
                        <span className="text-xs font-semibold text-accent">Rp {fmt(opt.harga_rupiah)}/{opt.satuan || 'kg'}</span>
                      ) : (
                        <span className="text-xs text-amber-600 font-medium">Harga belum diisi</span>
                      )}
                    </div>
                  </div>
                );
              }}
            />
          )}
        </div>

        {/* Persentase */}
        <div className="col-span-2">
          <div className="relative">
            <Input
              type="number"
              min="0"
              max="100"
              step="0.1"
              value={row.persentase}
              onChange={e => onUpdate(index, { persentase: parseFloat(e.target.value) || 0 })}
              className="pr-6 text-sm h-8"
            />
            <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">%</span>
          </div>
        </div>

        {/* Volume */}
        <div className="col-span-2 text-center">
          {volumeMl > 0 ? (
            isLiterBahan ? (
              <span className="text-xs font-medium text-accent leading-tight">
                {parseFloat(volumeGram.toFixed(2))}g<span className="text-muted-foreground font-normal">/{volumeMl.toFixed(2)}ml</span>
              </span>
            ) : (
              <span className="text-xs font-medium text-accent">{volumeMl.toFixed(2)} ml</span>
            )
          ) : (
            <span className="text-xs text-muted-foreground">—</span>
          )}
        </div>

        {/* Hapus */}
        <div className="col-span-1 flex justify-end">
          <Button variant="ghost" size="icon" className="w-7 h-7 text-destructive/60 hover:text-destructive" onClick={() => onRemove(index)}>
            <Trash2 className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>

      {/* Info bahan terpilih: harga/satuan + harga turunan + HPP bahan */}
      {selectedBahan && (
        <div className="ml-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted-foreground pl-1">
          <span className="font-medium text-foreground">{selectedBahan.nama}</span>
          {isDariClient ? (
            <span className="bg-blue-100 text-blue-700 border border-blue-200 px-2 py-0.5 rounded-full text-[10px] font-semibold">
              👤 Bahan dari client — HPP = Rp 0
            </span>
          ) : (
            <>
              <span>Rp {fmt(selectedBahan.harga_rupiah)}/{selectedBahan.satuan}</span>
              <span className="text-muted-foreground/60">→</span>
              {isLiterBahan ? (
                <>
                  <span>Rp {fmt(getHargaPerMl(selectedBahan))}/ml</span>
                  <span className="text-muted-foreground/60">·</span>
                  <span>Rp {fmt(getHargaPerGram(selectedBahan))}/g</span>
                </>
              ) : (
                <span>Rp {fmt(getHargaPerGram(selectedBahan))}/g</span>
              )}
              {hppBahan > 0 && (
                <span className="text-primary font-semibold">
                  = HPP: Rp {fmt(hppBahan)}
                </span>
              )}
            </>
          )}
        </div>
      )}

      {/* Peringatan bibit belum pilih vendor */}
      {isBibit && !row.vendor && (
        <p className="text-[10px] text-amber-600 pl-1">⚠ Pilih vendor terlebih dahulu untuk melihat daftar bibit</p>
      )}

      {/* Grade selector khusus Parfarome — muncul setelah vendor dipilih, sebelum bahan */}
      {isBibit && isParfarome && row.vendor && (
        <div className="pl-1 flex items-center gap-2 flex-wrap">
          <span className="text-[10px] text-amber-600 font-semibold">Grade:</span>
          <div className="flex gap-1.5">
            {PARFAROME_GRADE.map(g => (
              <button
                key={g}
                type="button"
                onClick={() => onUpdate(index, { grade: g, bahan_id: null, bahan_nama: '' })}
                className={`px-3 py-1 rounded-lg border text-xs font-semibold transition-all ${row.grade === g ? 'bg-amber-500 text-white border-amber-500' : 'border-amber-300 text-amber-700 hover:border-amber-500'}`}
              >
                {g}
              </button>
            ))}
          </div>
          {!row.grade && <p className="text-[10px] text-red-500">⚠ Wajib pilih grade</p>}
        </div>
      )}
    </div>
    </>
  );
}