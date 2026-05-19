import React, { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Save, RotateCcw, ChevronRight, Package2, AlertCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import KursBar from '@/components/hpp/KursBar';
import ProductHPPCard from '@/components/hpp/ProductHPPCard';
import LegalitasSection from '@/components/hpp/LegalitasSection';
import { useKurs } from '@/hooks/useKurs';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';
import PicSelector from '@/components/shared/PicSelector';
import { useSession } from '@/lib/SessionContext';
import { getPageAccess } from '@/lib/AuthSession';

const fmt = (n) => new Intl.NumberFormat('id-ID').format(Math.round(n));

const createEmptyProduct = () => ({
  nama_product: '',
  qty: 1,
  botol_id: null,
  tutup_id: null,
  spray_id: null,
  ukuran_digunakan: 'label',
  racikan: [],
  jasa_nominal: 0,
  komponen_tambahan: [],
  catatan: '',
  hpp_per_pcs_label: 0,
  hpp_per_pcs_aktual: 0,
  hpp_per_pcs_digunakan: 0,
  total_hpp_product: 0,
});

export default function KalkulatorHPP() {
  const queryClient = useQueryClient();
  const { kurs } = useKurs();

  const [namaBrand, setNamaBrand] = useState('');
  const [tanggal, setTanggal] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [pic, setPic] = useState('');
  const [products, setProducts] = useState([createEmptyProduct()]);
  const [legalitas, setLegalitas] = useState([]);
  const [saved, setSaved] = useState(false);

  const { member } = useSession();
  const canEdit = getPageAccess(member, 'kalkulator_hpp') === 'edit';

  const { data: botolList = [] } = useQuery({ queryKey: ['botol'], queryFn: () => base44.entities.Botol.list() });
  const { data: tutupList = [] } = useQuery({ queryKey: ['tutup'], queryFn: () => base44.entities.Tutup.list() });
  const { data: sprayList = [] } = useQuery({ queryKey: ['spray'], queryFn: () => base44.entities.Spray.list() });
  const { data: bahanList = [] } = useQuery({ queryKey: ['bahan-cair'], queryFn: () => base44.entities.BahanCair.list() });

  const saveMutation = useMutation({
    mutationFn: (data) => base44.entities.RiwayatProduksi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['riwayat-produksi'] });
      setSaved(true);
    },
  });

  const updateProduct = useCallback((idx, data) => {
    setProducts(prev => prev.map((p, i) => i === idx ? { ...p, ...data } : p));
  }, []);

  const addProduct = () => setProducts(prev => [...prev, createEmptyProduct()]);
  const removeProduct = (idx) => setProducts(prev => prev.filter((_, i) => i !== idx));

  const handleReset = () => {
    setNamaBrand('');
    setTanggal(format(new Date(), 'yyyy-MM-dd'));
    setPic('');
    setProducts([createEmptyProduct()]);
    setLegalitas([]);
    setSaved(false);
  };

  // HPP legalitas = harga_beli * qty; margin legalitas = (harga_jual - harga_beli) * qty
  const totalLegalitas = legalitas.reduce((s, l) => s + (l.harga_beli || l.nominal || 0) * (l.qty_variant || 1), 0);
  const totalLegalitasJual = legalitas.reduce((s, l) => s + (l.harga_jual || 0) * (l.qty_variant || 1), 0);
  const totalLegalitasMargin = totalLegalitasJual - totalLegalitas;
  const totalSemua = products.reduce((s, p) => s + (p.total_hpp_product || 0), 0);
  const canSave = namaBrand.trim() && products.every(p => {
    const totalPersen = (p.racikan || []).reduce((s, r) => s + (r.persentase || 0), 0);
    const hasBotol = p.botol_id || (p.botol_dari_client && (p.botol_ukuran_client || 0) > 0);
    return p.nama_product.trim() && Math.abs(totalPersen - 100) < 0.01 && hasBotol;
  });

  const totalHargaJual = products.reduce((s, p) => s + ((p.harga_jual_per_pcs || 0) * (p.qty || 1)), 0);
  const totalMarginNominal = products.reduce((s, p) => s + ((p.margin_nominal_per_pcs || 0) * (p.qty || 1)), 0);

  const handleSave = () => {
    if (!canSave) return;
    const sortedProducts = [...products].sort((a, b) =>
      (a.nama_product || '').localeCompare(b.nama_product || '', 'id')
    );
    saveMutation.mutate({
      nama_brand: namaBrand,
      tanggal,
      pic,
      status_bayar: 'Belum Bayar',
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
      products: sortedProducts.map(p => {
        const botol = p.botol_dari_client ? null : botolList.find(b => b.id === p.botol_id);
        const tutup = p.tutup_dari_client ? null : tutupList.find(t => t.id === p.tutup_id);
        const spray = p.spray_dari_client ? null : sprayList.find(s => s.id === p.spray_id);
        return {
          ...p,
          jasa_nominal: p.jasa_nominal || 0,
          botol_nama: p.botol_dari_client ? 'Dari Client' : (botol?.nama ?? ''),
          botol_ukuran_label: p.botol_dari_client ? (p.botol_ukuran_client || 0) : (botol?.ukuran_label_ml ?? 0),
          botol_ukuran_aktual: p.botol_dari_client ? 0 : (botol?.ukuran_aktual_ml ?? 0),
          botol_harga: p.botol_dari_client ? 0 : (botol?.harga_rupiah ?? 0),
          botol_harga_beli: p.botol_dari_client ? 0 : (botol?.harga_rupiah ?? 0),
          tutup_nama: p.tutup_dari_client ? 'Dari Client' : (tutup?.nama ?? ''),
          tutup_harga: p.tutup_dari_client ? 0 : (tutup?.harga_rupiah ?? 0),
          tutup_harga_beli: p.tutup_dari_client ? 0 : (tutup?.harga_rupiah ?? 0),
          spray_nama: p.spray_dari_client ? 'Dari Client' : (spray?.nama ?? ''),
          spray_harga: p.spray_dari_client ? 0 : (spray?.harga_rupiah ?? 0),
          spray_harga_beli: p.spray_dari_client ? 0 : (spray?.harga_rupiah ?? 0),
        };
      }),
    });
  };

  return (
    <div className="space-y-6 pb-20">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold text-foreground">Kalkulator HPP</h1>
          <p className="text-muted-foreground text-sm mt-1">Hitung Harga Pokok Produksi parfum secara akurat</p>
        </div>
        <KursBar />
      </div>

      {/* Info Batch */}
      <div className="bg-card border border-border rounded-2xl p-5 shadow-sm">
        <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
          <Package2 className="w-4 h-4 text-accent" />
          Informasi Produksi
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Nama Brand <span className="text-destructive">*</span></label>
            <Input value={namaBrand} onChange={e => setNamaBrand(e.target.value)} placeholder="Contoh: Cielmora" className="h-10" />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Tanggal Dibuat</label>
            <Input type="date" value={tanggal} onChange={e => setTanggal(e.target.value)} className="h-10" />
          </div>
          <div className="md:col-span-2">
            <PicSelector
              label="Penanggung Jawab (PIC)"
              value={pic}
              onChange={setPic}
              placeholder="Pilih PIC untuk HPP ini..."
            />
          </div>
        </div>
      </div>

      {/* Produk Cards */}
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
            onRemove={() => removeProduct(idx)}
            canRemove={products.length > 1}
          />
        ))}

        <Button variant="outline" onClick={addProduct} className="w-full border-dashed h-12 text-muted-foreground hover:text-foreground gap-2">
          <Plus className="w-4 h-4" /> Tambah Produk
        </Button>
      </div>

      {/* Legalitas */}
      <LegalitasSection legalitasList={legalitas} onLegalitasChange={setLegalitas} />

      {/* Ringkasan Semua Produk */}
      {products.length > 1 && (
        <div className="bg-gradient-to-br from-primary to-primary/80 text-primary-foreground rounded-2xl p-6 shadow-lg">
          <h3 className="text-sm font-semibold uppercase tracking-widest opacity-70 mb-4">Ringkasan HPP Semua Produk</h3>
          <div className="space-y-3">
            {products.map((p, i) => {
              const totalPersen = (p.racikan || []).reduce((s, r) => s + (r.persentase || 0), 0);
              const hasBotol = p.botol_id || (p.botol_dari_client && (p.botol_ukuran_client || 0) > 0);
              const isProductValid = Math.abs(totalPersen - 100) < 0.01 && hasBotol && p.nama_product;
              return (
                <div key={i} className="flex items-center gap-3 bg-white/10 rounded-xl px-4 py-3">
                  <div className="w-7 h-7 rounded-full bg-white/20 flex items-center justify-center text-xs font-bold">{i + 1}</div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm truncate">{p.nama_product || `Produk ${i + 1}`}</p>
                    {!isProductValid && (
                      <p className="text-xs opacity-60 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" />
                        {!hasBotol ? 'Botol belum dipilih / ukuran belum diisi' : !p.nama_product ? 'Nama produk kosong' : `Racikan ${totalPersen.toFixed(1)}%`}
                      </p>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="text-xs opacity-70">Rp {fmt(p.hpp_per_pcs_digunakan || p.hpp_per_pcs_label)} × {p.qty}</p>
                    {isProductValid ? (
                      <p className="font-bold">Rp {fmt(p.total_hpp_product)}</p>
                    ) : (
                      <p className="text-xs opacity-50">—</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
          {legalitas.length > 0 && (
            <div className="border-t border-white/20 mt-4 pt-4 space-y-2">
              {legalitas.map((l, i) => {
                const hargaJual = l.harga_jual || 0;
                const qty = l.qty_variant || 1;
                const subtotalJual = hargaJual * qty;
                return (
                  <div key={i} className="flex justify-between items-center text-sm bg-white/10 rounded-xl px-4 py-2">
                    <span className="opacity-80">
                      {l.nama}{qty > 1 ? ` × ${qty} variant` : ''}
                    </span>
                    <div className="text-right">
                      {hargaJual > 0 ? (
                        <span className="font-semibold">Rp {fmt(subtotalJual)}</span>
                      ) : (
                        <span className="text-xs opacity-50 italic">Harga jual belum diisi</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          <div className="border-t border-white/20 mt-4 pt-4 flex justify-between items-center">
            <span className="text-sm font-semibold opacity-80">Total Keseluruhan (Harga Jual)</span>
            <span className="text-2xl font-bold">Rp {fmt(totalSemua + totalLegalitasJual)}</span>
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex gap-3 sticky bottom-4">
        <Button variant="outline" onClick={handleReset} className="gap-2 bg-background">
          <RotateCcw className="w-4 h-4" /> Reset
        </Button>
        {canEdit && (
          <Button
            onClick={handleSave}
            disabled={!canSave || saveMutation.isPending || saved}
            className="flex-1 gap-2 bg-accent hover:bg-accent/90 text-accent-foreground h-12 text-base font-semibold shadow-lg"
          >
            <Save className="w-5 h-5" />
            {saved ? 'Tersimpan di Riwayat' : saveMutation.isPending ? 'Menyimpan...' : 'Simpan ke Riwayat Produksi'}
          </Button>
        )}
        {saved && (
          <Link to="/riwayat-produksi-hpp">
          <Button variant="outline" className="gap-2 bg-background">
            Lihat Riwayat <ChevronRight className="w-4 h-4" />
          </Button>
        </Link>
        )}
      </div>
    </div>
  );
}