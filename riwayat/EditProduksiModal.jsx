import React, { useState, useCallback } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { X, Save, Package2 } from 'lucide-react';
import KursBar from '@/components/hpp/KursBar';
import ProductHPPCard from '@/components/hpp/ProductHPPCard';
import LegalitasSection from '@/components/hpp/LegalitasSection';
import { useKurs } from '@/hooks/useKurs';

const fmt = (n) => new Intl.NumberFormat('id-ID').format(Math.round(n || 0));

const mapRecordToProduct = (p) => ({
  nama_product: p.nama_product ?? '',
  qty: p.qty ?? 1,
  botol_id: p.botol_id ?? null,
  tutup_id: p.tutup_id ?? null,
  spray_id: p.spray_id ?? null,
  ukuran_digunakan: p.ukuran_digunakan ?? 'label',
  racikan: (p.racikan ?? []).map(r => ({ ...r })),
  jasa_nominal: p.jasa_nominal ?? 0,
  komponen_tambahan: (p.komponen_tambahan ?? []).map(k => ({ ...k })),
  catatan: p.catatan ?? '',
  hpp_per_pcs_label: p.hpp_per_pcs_label ?? 0,
  hpp_per_pcs_aktual: p.hpp_per_pcs_aktual ?? 0,
  hpp_per_pcs_digunakan: p.hpp_per_pcs_digunakan ?? 0,
  total_hpp_product: p.total_hpp_product ?? 0,
  harga_jual_per_pcs: p.harga_jual_per_pcs ?? 0,
  margin_nominal_per_pcs: p.margin_nominal_per_pcs ?? 0,
  margin_persen: p.margin_persen ?? 0,
  botol_nama: p.botol_nama ?? '',
  botol_harga_beli: p.botol_harga_beli ?? p.botol_harga ?? 0,
  tutup_nama: p.tutup_nama ?? '',
  tutup_harga_beli: p.tutup_harga_beli ?? p.tutup_harga ?? 0,
  spray_nama: p.spray_nama ?? '',
  spray_harga_beli: p.spray_harga_beli ?? p.spray_harga ?? 0,
});

export default function EditProduksiModal({ record, onClose, onSaved }) {
  const { kurs } = useKurs();

  const [namaBrand, setNamaBrand] = useState(record.nama_brand ?? '');
  const [tanggal, setTanggal] = useState(record.tanggal ?? '');
  const [catatanGlobal, setCatatanGlobal] = useState(record.catatan_global ?? '');
  const [products, setProducts] = useState((record.products ?? []).map(mapRecordToProduct));
  const [legalitas, setLegalitas] = useState((record.legalitas ?? []).map(l => ({ ...l })));

  const { data: botolList = [] } = useQuery({ queryKey: ['botol'], queryFn: () => base44.entities.Botol.list() });
  const { data: tutupList = [] } = useQuery({ queryKey: ['tutup'], queryFn: () => base44.entities.Tutup.list() });
  const { data: sprayList = [] } = useQuery({ queryKey: ['spray'], queryFn: () => base44.entities.Spray.list() });
  const { data: bahanList = [] } = useQuery({ queryKey: ['bahan-cair'], queryFn: () => base44.entities.BahanCair.list() });

  const mutation = useMutation({
    mutationFn: (data) => base44.entities.RiwayatProduksi.update(record.id, data),
    onSuccess: onSaved,
  });

  const updateProduct = useCallback((idx, data) => {
    setProducts(prev => prev.map((p, i) => i === idx ? { ...p, ...data } : p));
  }, []);

  const totalLegalitas = legalitas.reduce((s, l) => s + (l.harga_beli || l.nominal || 0) * (l.qty_variant || 1), 0);
  const totalLegalitasJual = legalitas.reduce((s, l) => s + (l.harga_jual || 0) * (l.qty_variant || 1), 0);
  const totalLegalitasMargin = totalLegalitasJual - totalLegalitas;
  const totalSemua = products.reduce((s, p) => s + (p.total_hpp_product || 0), 0);
  const totalHargaJual = products.reduce((s, p) => s + ((p.harga_jual_per_pcs || 0) * (p.qty || 1)), 0);
  const totalMarginNominal = products.reduce((s, p) => s + ((p.margin_nominal_per_pcs || 0) * (p.qty || 1)), 0);

  const handleSave = () => {
    const sortedProducts = [...products].sort((a, b) =>
      (a.nama_product || '').localeCompare(b.nama_product || '', 'id')
    );
    const savedProducts = sortedProducts.map(p => {
      const botol = botolList.find(b => b.id === p.botol_id);
      const tutup = tutupList.find(t => t.id === p.tutup_id);
      const spray = sprayList.find(s => s.id === p.spray_id);
      return {
        ...p,
        jasa_nominal: p.jasa_nominal || 0,
        botol_nama: botol?.nama ?? p.botol_nama ?? '',
        botol_ukuran_label: botol?.ukuran_label_ml ?? 0,
        botol_ukuran_aktual: botol?.ukuran_aktual_ml ?? 0,
        botol_harga: botol?.harga_rupiah ?? p.botol_harga_beli ?? 0,
        botol_harga_beli: botol?.harga_rupiah ?? p.botol_harga_beli ?? 0,
        tutup_nama: tutup?.nama ?? p.tutup_nama ?? '',
        tutup_harga: tutup?.harga_rupiah ?? p.tutup_harga_beli ?? 0,
        tutup_harga_beli: tutup?.harga_rupiah ?? p.tutup_harga_beli ?? 0,
        spray_nama: spray?.nama ?? p.spray_nama ?? '',
        spray_harga: spray?.harga_rupiah ?? p.spray_harga_beli ?? 0,
        spray_harga_beli: spray?.harga_rupiah ?? p.spray_harga_beli ?? 0,
      };
    });

    mutation.mutate({
      nama_brand: namaBrand,
      tanggal,
      catatan_global: catatanGlobal,
      total_hpp_semua: totalSemua + totalLegalitas,
      total_harga_jual_semua: totalHargaJual + totalLegalitasJual,
      total_margin_nominal_semua: totalMarginNominal + totalLegalitasMargin,
      legalitas: legalitas.map(l => ({
        nama: l.nama,
        nominal: l.harga_beli || 0,
        harga_beli: l.harga_beli || 0,
        harga_jual: l.harga_jual || 0,
        qty_variant: l.qty_variant || 1,
      })),
      products: savedProducts,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/60 backdrop-blur-sm">
      <div className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-3xl max-h-[95vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-accent/10 flex items-center justify-center">
              <Package2 className="w-5 h-5 text-accent" />
            </div>
            <div>
              <h3 className="font-display font-bold text-base">Edit Riwayat Produksi</h3>
              <p className="text-xs text-muted-foreground">Edit lengkap seperti kalkulator HPP</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {/* kurs info */}
            <Button variant="ghost" size="icon" onClick={onClose}><X className="w-4 h-4" /></Button>
          </div>
        </div>

        {/* Scrollable Body */}
        <div className="overflow-y-auto flex-1 p-5 space-y-5">
          {/* Info Batch */}
          <div className="bg-muted/30 border border-border rounded-xl p-4">
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-2">
              <Package2 className="w-3.5 h-3.5" /> Informasi Produksi
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Nama Brand <span className="text-destructive">*</span></label>
                <Input value={namaBrand} onChange={e => setNamaBrand(e.target.value)} placeholder="Contoh: Cielmora" className="h-10" />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Tanggal</label>
                <Input type="date" value={tanggal} onChange={e => setTanggal(e.target.value)} className="h-10" />
              </div>
            </div>
          </div>

          {/* Produk Cards — full kalkulator */}
          <div className="space-y-4">
            {products.map((product, idx) => (
              <ProductHPPCard
                key={idx}
                product={product}
                index={idx}
                botolList={botolList}
                tutupList={tutupList}
                sprayList={sprayList}
                bahanList={bahanList}
                onChange={(data) => updateProduct(idx, data)}
                onRemove={() => setProducts(prev => prev.filter((_, i) => i !== idx))}
                canRemove={products.length > 1}
              />
            ))}

            <Button
              variant="outline"
              onClick={() => setProducts(prev => [...prev, {
                nama_product: '', qty: 1, botol_id: null, tutup_id: null, spray_id: null,
                ukuran_digunakan: 'label', racikan: [], jasa_nominal: 0, komponen_tambahan: [],
                catatan: '', hpp_per_pcs_label: 0, hpp_per_pcs_aktual: 0, hpp_per_pcs_digunakan: 0, total_hpp_product: 0,
              }])}
              className="w-full border-dashed h-11 text-muted-foreground hover:text-foreground gap-2 text-sm"
            >
              + Tambah Produk
            </Button>
          </div>

          {/* Legalitas */}
          <LegalitasSection legalitasList={legalitas} onLegalitasChange={setLegalitas} />

          {/* Ringkasan */}
          {products.length > 0 && (
            <div className="bg-gradient-to-br from-primary/5 to-accent/5 border border-primary/10 rounded-xl p-4 space-y-2">
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">Ringkasan</p>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Total HPP Semua</span>
                <span className="font-bold">Rp {fmt(totalSemua + totalLegalitas)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Total Harga Jual</span>
                <span className="font-bold text-accent">Rp {fmt(totalHargaJual + totalLegalitasJual)}</span>
              </div>
              <div className="flex justify-between text-sm border-t border-primary/10 pt-2">
                <span className="text-muted-foreground">Total Margin</span>
                <span className={`font-bold ${(totalMarginNominal + totalLegalitasMargin) >= 0 ? 'text-green-700' : 'text-red-600'}`}>
                  {(totalMarginNominal + totalLegalitasMargin) >= 0 ? '+' : ''}Rp {fmt(totalMarginNominal + totalLegalitasMargin)}
                </span>
              </div>
            </div>
          )}

          {/* Catatan Global */}
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Catatan Global</label>
            <Input value={catatanGlobal} onChange={e => setCatatanGlobal(e.target.value)} placeholder="Catatan untuk batch produksi ini..." className="h-10" />
          </div>
        </div>

        {/* Footer */}
        <div className="p-5 border-t border-border flex gap-3 shrink-0">
          <Button variant="outline" onClick={onClose} className="flex-1">Batal</Button>
          <Button
            onClick={handleSave}
            disabled={mutation.isPending || !namaBrand.trim()}
            className="flex-1 bg-accent hover:bg-accent/90 text-accent-foreground gap-2 font-semibold"
          >
            <Save className="w-4 h-4" />
            {mutation.isPending ? 'Menyimpan...' : 'Simpan Perubahan'}
          </Button>
        </div>
      </div>
    </div>
  );
}