import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { X, Database, Loader2, AlertCircle, CheckCircle2, AlertTriangle, Info } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

const fmt = (n) => n ? new Intl.NumberFormat('id-ID').format(Math.round(n)) : '0';

export default function SimpanDatabaseModal({ record, onClose }) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Fetch existing DatabaseBahan
  const { data: existingDb = [], isLoading } = useQuery({
    queryKey: ['database-bahan'],
    queryFn: () => base44.entities.DatabaseBahan.list(),
  });

  // Build list of products to save — each product from HPP record = 1 entry in DatabaseBahan
  const products = useMemo(() => {
    return (record.products || []).map(p => ({
      nama_brand: record.nama_brand,
      nama_varian: p.nama_product || '—',
      botol_nama: p.botol_nama || '',
      botol_ukuran_label_ml: p.botol_ukuran_label || p.botol_ukuran_label_ml || 0,
      botol_ukuran_aktual_ml: p.botol_ukuran_aktual || p.botol_ukuran_aktual_ml || 0,
      tutup_nama: p.tutup_nama || '',
      spray_nama: p.spray_nama || '',
      item_tambahan: (p.komponen_tambahan || []).map(kt => ({
        nama: kt.nama || '',
        kategori: kt.kategori || 'Lainnya',
        qty_per_pcs: 1,
        catatan: '',
      })),
      catatan: '',
      status: 'aktif',
    }));
  }, [record]);

  // Find duplicates — same brand + varian
  const getDuplicate = (prod) =>
    existingDb.find(
      d =>
        d.nama_brand?.toLowerCase() === prod.nama_brand?.toLowerCase() &&
        d.nama_varian?.toLowerCase() === prod.nama_varian?.toLowerCase()
    );

  // State: per-product selection & confirmation
  const [selected, setSelected] = useState(() => {
    const init = {};
    products.forEach((p, i) => { init[i] = true; });
    return init;
  });

  // Confirmation dialog state — when user hits save & there are duplicates
  const [confirmMode, setConfirmMode] = useState(false);
  const [overwriteDecision, setOverwriteDecision] = useState({}); // index -> true (overwrite) | false (skip)
  const [saving, setSaving] = useState(false);

  const selectedProducts = products.filter((_, i) => selected[i]);
  const duplicates = selectedProducts.filter(p => getDuplicate(p));
  const nonDuplicates = selectedProducts.filter(p => !getDuplicate(p));

  const toggleSelect = (i) => setSelected(prev => ({ ...prev, [i]: !prev[i] }));

  const handleSaveClick = () => {
    if (duplicates.length > 0) {
      // Enter confirmation mode
      const init = {};
      duplicates.forEach((p, i) => { init[products.indexOf(p)] = null; }); // null = belum dipilih
      setOverwriteDecision({});
      setConfirmMode(true);
    } else {
      executeSave({});
    }
  };

  const allDuplicatesDecided = duplicates.every(p => {
    const idx = products.indexOf(p);
    return overwriteDecision[idx] !== undefined && overwriteDecision[idx] !== null;
  });

  const executeSave = async (decisions) => {
    setSaving(true);
    let saved = 0;
    let skipped = 0;
    try {
      for (let i = 0; i < products.length; i++) {
        if (!selected[i]) continue;
        const prod = products[i];
        const dup = getDuplicate(prod);
        if (dup) {
          if (decisions[i] === true) {
            await base44.entities.DatabaseBahan.update(dup.id, prod);
            saved++;
          } else {
            skipped++;
          }
        } else {
          await base44.entities.DatabaseBahan.create(prod);
          saved++;
        }
      }
      queryClient.invalidateQueries({ queryKey: ['database-bahan'] });
      toast({
        title: `${saved} varian berhasil disimpan ke Database Bahan`,
        description: skipped > 0 ? `${skipped} varian dilewati (tidak ditimpa)` : 'Data kini tersedia di Sample & Racikan → Database Bahan.',
      });
      onClose();
    } catch (e) {
      toast({ title: 'Gagal menyimpan', variant: 'destructive' });
    }
    setSaving(false);
  };

  const confirmAndSave = () => {
    executeSave(overwriteDecision);
  };

  // Hitung status pembayaran untuk ditampilkan di modal
  const totalTagihan = record.total_harga_jual_semua || record.total_hpp_semua || 0;
  const jumlahDibayar = record.jumlah_dibayar || 0;
  const persen = totalTagihan > 0 ? Math.min(100, Math.round(jumlahDibayar / totalTagihan * 100)) : 0;
  const statusBayar = record.status_bayar || 'Belum Bayar';

  if (isLoading) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
        <Loader2 className="w-8 h-8 text-white animate-spin" />
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-accent/10 rounded-xl flex items-center justify-center">
              <Database className="w-5 h-5 text-accent" />
            </div>
            <div>
              <h2 className="font-display font-bold text-foreground text-base">Simpan ke Database Bahan</h2>
              <p className="text-xs text-muted-foreground">
                {confirmMode ? 'Konfirmasi data yang sudah ada' : `dari riwayat ${record.nama_brand}`}
              </p>
            </div>
          </div>
          <Button variant="ghost" size="icon" className="w-8 h-8" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-3">

          {/* Info pembayaran — selalu tampil */}
          {statusBayar !== 'Sudah Lunas' && (
            <div className={`flex items-start gap-2 rounded-xl p-3 border ${
              statusBayar === 'Belum Bayar'
                ? 'bg-red-50 border-red-200'
                : 'bg-orange-50 border-orange-200'
            }`}>
              <Info className={`w-4 h-4 mt-0.5 shrink-0 ${statusBayar === 'Belum Bayar' ? 'text-red-500' : 'text-orange-500'}`} />
              <div className="text-xs">
                <p className={`font-semibold ${statusBayar === 'Belum Bayar' ? 'text-red-700' : 'text-orange-700'}`}>
                  {statusBayar === 'Belum Bayar' ? 'Belum ada pembayaran' : `Baru terbayar ${persen}% (Rp ${fmt(jumlahDibayar)})`}
                </p>
                <p className={`mt-0.5 ${statusBayar === 'Belum Bayar' ? 'text-red-600' : 'text-orange-600'}`}>
                  Kamu tetap bisa menyimpan data bahan ke database meski belum lunas.
                </p>
              </div>
            </div>
          )}

          {/* CONFIRM MODE — show duplicates to decide */}
          {confirmMode ? (
            <>
              <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-xl p-3">
                <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
                <p className="text-xs text-amber-700">
                  Beberapa varian sudah ada di Database Bahan. Pilih tindakan untuk setiap varian:
                </p>
              </div>

              {duplicates.map((prod) => {
                const idx = products.indexOf(prod);
                const dup = getDuplicate(prod);
                const decision = overwriteDecision[idx];
                return (
                  <div key={idx} className="border border-amber-200 bg-amber-50/50 rounded-xl p-4 space-y-2">
                    <div>
                      <p className="font-semibold text-sm">{prod.nama_varian}</p>
                      <p className="text-xs text-muted-foreground">{prod.nama_brand}</p>
                      {dup && (
                        <p className="text-xs text-amber-600 mt-1">
                          Data lama: Botol {dup.botol_nama || '—'} · Tutup {dup.tutup_nama || '—'} · Spray {dup.spray_nama || '—'}
                        </p>
                      )}
                      <p className="text-xs text-blue-600 mt-0.5">
                        Data baru: Botol {prod.botol_nama || '—'} · Tutup {prod.tutup_nama || '—'} · Spray {prod.spray_nama || '—'}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setOverwriteDecision(prev => ({ ...prev, [idx]: true }))}
                        className={`flex-1 py-2 rounded-lg border text-xs font-medium transition-all ${decision === true ? 'bg-accent text-accent-foreground border-accent' : 'border-border text-muted-foreground hover:border-accent/50'}`}
                      >
                        ✅ Timpa data lama
                      </button>
                      <button
                        onClick={() => setOverwriteDecision(prev => ({ ...prev, [idx]: false }))}
                        className={`flex-1 py-2 rounded-lg border text-xs font-medium transition-all ${decision === false ? 'bg-slate-200 text-slate-700 border-slate-300' : 'border-border text-muted-foreground hover:border-slate-300'}`}
                      >
                        ❌ Lewati, jangan timpa
                      </button>
                    </div>
                  </div>
                );
              })}

              {nonDuplicates.length > 0 && (
                <div className="bg-green-50 border border-green-200 rounded-xl p-3">
                  <p className="text-xs text-green-700 font-medium">
                    ✅ {nonDuplicates.length} varian baru akan langsung disimpan:
                  </p>
                  <div className="flex flex-wrap gap-1 mt-1.5">
                    {nonDuplicates.map((p, i) => (
                      <Badge key={i} className="text-xs bg-green-100 text-green-700">{p.nama_varian}</Badge>
                    ))}
                  </div>
                </div>
              )}
            </>
          ) : (
            /* NORMAL MODE — show product list to select */
            <>
              {products.length === 0 ? (
                <div className="text-center py-10 text-muted-foreground">
                  <AlertCircle className="w-8 h-8 mx-auto mb-2 opacity-40" />
                  <p className="text-sm">Tidak ada produk ditemukan di riwayat ini.</p>
                </div>
              ) : (
                <>
                  <p className="text-xs text-muted-foreground">
                    Pilih varian produk yang ingin disimpan ke <strong>Database Bahan</strong> di halaman Sample & Racikan. Data yang sudah ada akan ditandai.
                  </p>
                  {products.map((prod, i) => {
                    const dup = getDuplicate(prod);
                    const isSelected = selected[i];
                    return (
                      <div
                        key={i}
                        onClick={() => toggleSelect(i)}
                        className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                          isSelected
                            ? dup
                              ? 'border-amber-300 bg-amber-50/60'
                              : 'border-accent bg-accent/5'
                            : 'border-border bg-card hover:border-muted-foreground/30'
                        }`}
                      >
                        {/* Checkbox */}
                        <div
                          className="mt-0.5 rounded-md border-2 flex items-center justify-center shrink-0 transition-all"
                          style={{ width: 18, height: 18, borderColor: isSelected ? (dup ? '#f59e0b' : 'hsl(var(--accent))') : 'hsl(var(--muted-foreground)/40)', background: isSelected ? (dup ? '#f59e0b' : 'hsl(var(--accent))') : 'transparent' }}
                        >
                          {isSelected && <CheckCircle2 className="w-3 h-3 text-white" />}
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-medium text-sm">{prod.nama_varian}</span>
                            {dup && (
                              <Badge className="text-xs bg-amber-100 text-amber-700 border-amber-200 gap-1">
                                <AlertTriangle className="w-2.5 h-2.5" />
                                Sudah ada
                              </Badge>
                            )}
                          </div>
                          <div className="text-xs text-muted-foreground mt-0.5 space-y-0.5">
                            {prod.botol_nama && <p>Botol: {prod.botol_nama}{prod.botol_ukuran_label_ml ? ` (${prod.botol_ukuran_label_ml}ml)` : ''}</p>}
                            <div className="flex gap-3 flex-wrap">
                              {prod.tutup_nama && <span>Tutup: {prod.tutup_nama}</span>}
                              {prod.spray_nama && <span>Spray: {prod.spray_nama}</span>}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-border flex items-center justify-between gap-3">
          {!confirmMode ? (
            <>
              <p className="text-xs text-muted-foreground">
                {Object.values(selected).filter(Boolean).length} varian dipilih
                {duplicates.length > 0 && ` · ${duplicates.length} sudah ada`}
              </p>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={onClose}>Batal</Button>
                <Button
                  size="sm"
                  disabled={Object.values(selected).filter(Boolean).length === 0}
                  onClick={handleSaveClick}
                  className="bg-accent hover:bg-accent/90 text-accent-foreground gap-2"
                >
                  <Database className="w-3.5 h-3.5" />
                  Simpan {Object.values(selected).filter(Boolean).length} Varian
                </Button>
              </div>
            </>
          ) : (
            <>
              <Button variant="outline" size="sm" onClick={() => setConfirmMode(false)}>← Kembali</Button>
              <Button
                size="sm"
                disabled={!allDuplicatesDecided || saving}
                onClick={confirmAndSave}
                className="bg-accent hover:bg-accent/90 text-accent-foreground gap-2"
              >
                {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Database className="w-3.5 h-3.5" />}
                {saving ? 'Menyimpan...' : 'Konfirmasi & Simpan'}
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}