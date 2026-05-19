import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { X, FileDown, CreditCard, Loader2, CheckSquare, Square, Percent } from 'lucide-react';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';
import { generateInvoicePDF } from '@/lib/pdfGenerator';

const fmt = (n) => n ? new Intl.NumberFormat('id-ID').format(Math.round(n)) : '0';

const generateInvoiceCode = (tanggal, singkatan, namaBrand) => {
  if (!tanggal) return '';
  const d = new Date(tanggal);
  const MM = String(d.getMonth() + 1).padStart(2, '0');
  const YY = String(d.getFullYear()).slice(-2);
  const DD = String(d.getDate()).padStart(3, '0');
  const brand = (namaBrand || '').toUpperCase().replace(/\s+/g, '').slice(0, 10);
  const xxx = (singkatan || '').toUpperCase();
  return `INV-${MM}${YY}/${xxx}${DD}-${brand}`;
};

export default function GenerateHppPdfModal({ record, onClose }) {
  const { data: bankList = [] } = useQuery({
    queryKey: ['bank-settings'],
    queryFn: () => base44.entities.BankSettings.list(),
  });

  const { data: companySettingsList = [] } = useQuery({
    queryKey: ['company-settings'],
    queryFn: () => base44.entities.CompanySettings.list(),
  });
  const companySettings = companySettingsList[0] || {};

  const activeBanks = bankList.filter(b => b.is_active !== false);

  const [selectedBankId, setSelectedBankId] = useState('');
  const [penanggungJawab, setPenanggungJawab] = useState(record.pic || '');
  const [paymentTerm, setPaymentTerm] = useState('CASH/TUNAI');
  const [selectedProducts, setSelectedProducts] = useState(() =>
    (record.products || []).map((_, i) => i)
  );
  // Keterangan per produk (input manual)
  const [keteranganMap, setKeteranganMap] = useState({});
  // Pilih legalitas
  const [selectedLegalitas, setSelectedLegalitas] = useState(() =>
    (record.legalitas || []).map((_, i) => i)
  );
  // Persen DP
  const [dpPersen, setDpPersen] = useState('100');
  const [generating, setGenerating] = useState(false);

  const selectedBank = activeBanks.find(b => b.id === selectedBankId);
  const invoiceCode = generateInvoiceCode(record.tanggal, selectedBank?.singkatan_invoice, record.nama_brand);

  const toggleProduct = (idx) => {
    setSelectedProducts(prev =>
      prev.includes(idx) ? prev.filter(i => i !== idx) : [...prev, idx]
    );
  };

  const filteredProducts = (record.products || []).filter((_, i) => selectedProducts.includes(i));
  const filteredLegalitas = (record.legalitas || []).filter((_, i) => selectedLegalitas.includes(i));
  const totalLegalitasSelected = filteredLegalitas.reduce((s, l) => s + ((l.harga_jual || l.nominal || 0) * (l.qty_variant || 1)), 0);
  const totalTagihan = filteredProducts.reduce((s, p) => s + (p.total_harga_jual || p.total_hpp_product || 0), 0) + totalLegalitasSelected;
  const dpNominal = Math.round(totalTagihan * (parseFloat(dpPersen) || 0) / 100);
  const sisaNominal = totalTagihan - dpNominal;

  const toggleLegalitas = (idx) => {
    setSelectedLegalitas(prev =>
      prev.includes(idx) ? prev.filter(i => i !== idx) : [...prev, idx]
    );
  };

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      const productsWithKeterangan = filteredProducts.map((p, i) => {
        const origIdx = selectedProducts[i];
        return { ...p, keterangan_custom: keteranganMap[origIdx] || '' };
      });
      await generateInvoicePDF({
        invoiceCode,
        record: { ...record, products: productsWithKeterangan, legalitas: filteredLegalitas },
        bank: selectedBank,
        penanggungJawab,
        paymentTerm,
        companySettings,
        dpPersen: parseFloat(dpPersen) || 100,
        dpNominal,
        sisaNominal,
        totalTagihan,
      });
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-lg max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-accent/10 rounded-xl flex items-center justify-center">
              <FileDown className="w-5 h-5 text-accent" />
            </div>
            <div>
              <h2 className="font-display font-bold text-base">Buat Invoice PDF</h2>
              <p className="text-xs text-muted-foreground">{record.nama_brand} • {record.tanggal ? format(new Date(record.tanggal), 'dd MMM yyyy', { locale: id }) : ''}</p>
            </div>
          </div>
          <Button variant="ghost" size="icon" className="w-8 h-8" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">

          {/* Kode Invoice Preview */}
          <div className="bg-primary/5 border border-primary/20 rounded-xl p-4">
            <p className="text-xs text-muted-foreground mb-1 font-medium">Kode Invoice (otomatis)</p>
            <p className="font-mono font-bold text-lg text-primary tracking-wide">
              {invoiceCode || <span className="text-muted-foreground text-sm font-normal italic">Pilih rekening bank untuk generate kode</span>}
            </p>
          </div>

          {/* Pilih Rekening Bank */}
          <div>
            <label className="text-xs font-semibold text-foreground mb-2 flex items-center gap-1.5">
              <CreditCard className="w-3.5 h-3.5 text-accent" /> Rekening Transfer Bank *
            </label>
            {activeBanks.length === 0 ? (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-700">
                Belum ada rekening bank. Tambahkan di halaman <strong>Stok HPP → tab Rekening</strong>.
              </div>
            ) : (
              <div className="space-y-2">
                {activeBanks.map(bank => (
                  <button
                    key={bank.id}
                    type="button"
                    onClick={() => setSelectedBankId(bank.id)}
                    className={`w-full text-left px-4 py-3 rounded-xl border transition-all ${selectedBankId === bank.id ? 'border-accent bg-accent/5' : 'border-border hover:border-muted-foreground/30'}`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-semibold text-sm">{bank.nama_pemilik}</p>
                        <p className="text-xs text-muted-foreground">{bank.nama_bank} • {bank.nomor_rekening}</p>
                      </div>
                      <Badge variant="outline" className="text-xs font-mono">{bank.singkatan_invoice}</Badge>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Detail Invoice */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-foreground mb-1.5 block">Penanggung Jawab</label>
              <Input value={penanggungJawab} onChange={e => setPenanggungJawab(e.target.value)} placeholder="Misal: Bpk Cielmora" className="h-9" />
            </div>
            <div>
              <label className="text-xs font-semibold text-foreground mb-1.5 block">Payment Term</label>
              <Input value={paymentTerm} onChange={e => setPaymentTerm(e.target.value)} placeholder="CASH/TUNAI" className="h-9" />
            </div>
          </div>

          {/* DP / Pembayaran % */}
          <div className="bg-muted/40 border border-border rounded-xl p-4 space-y-3">
            <div className="flex items-center gap-2">
              <Percent className="w-4 h-4 text-accent" />
              <p className="text-xs font-semibold text-foreground">Persentase Pembayaran (DP)</p>
            </div>
            <div className="flex items-center gap-3">
              <Input
                type="number"
                min="1"
                max="100"
                value={dpPersen}
                onChange={e => setDpPersen(e.target.value)}
                className="h-9 w-24 text-center font-bold"
              />
              <span className="text-sm font-bold text-accent">%</span>
              <div className="flex gap-1.5">
                {[25, 50, 75, 100].map(p => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setDpPersen(String(p))}
                    className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${parseFloat(dpPersen) === p ? 'bg-accent text-accent-foreground' : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'}`}
                  >
                    {p}%
                  </button>
                ))}
              </div>
            </div>
            {selectedProducts.length > 0 && (
              <div className="grid grid-cols-3 gap-2 pt-1">
                <div className="text-center bg-card rounded-lg p-2 border border-border">
                  <p className="text-[10px] text-muted-foreground">Total Tagihan</p>
                  <p className="text-xs font-bold">Rp {fmt(totalTagihan)}</p>
                </div>
                <div className="text-center bg-green-50 rounded-lg p-2 border border-green-200">
                  <p className="text-[10px] text-green-700">Dibayar ({dpPersen}%)</p>
                  <p className="text-xs font-bold text-green-700">Rp {fmt(dpNominal)}</p>
                </div>
                <div className="text-center bg-orange-50 rounded-lg p-2 border border-orange-200">
                  <p className="text-[10px] text-orange-700">Sisa ({100 - (parseFloat(dpPersen) || 0)}%)</p>
                  <p className="text-xs font-bold text-orange-700">Rp {fmt(sisaNominal)}</p>
                </div>
              </div>
            )}
          </div>

          {/* Pilih Produk + Keterangan */}
          <div>
            <label className="text-xs font-semibold text-foreground mb-2 block">Produk yang Disertakan & Keterangan</label>
            <div className="space-y-3">
              {(record.products || []).map((p, i) => (
                <div key={i} className={`rounded-xl border transition-all ${selectedProducts.includes(i) ? 'border-accent bg-accent/5' : 'border-border opacity-60'}`}>
                  <button
                    type="button"
                    onClick={() => toggleProduct(i)}
                    className="w-full text-left px-4 py-3 flex items-center gap-3"
                  >
                    {selectedProducts.includes(i)
                      ? <CheckSquare className="w-4 h-4 text-accent shrink-0" />
                      : <Square className="w-4 h-4 text-muted-foreground shrink-0" />
                    }
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm">{p.nama_product || `Produk ${i + 1}`}</p>
                      <p className="text-xs text-muted-foreground">
                        {p.qty} unit • Jual: Rp {fmt(p.harga_jual_per_pcs || p.hpp_per_pcs_digunakan || p.hpp_per_pcs_label)}
                      </p>
                    </div>
                  </button>
                  {selectedProducts.includes(i) && (
                    <div className="px-4 pb-3">
                      <Input
                        placeholder="Keterangan (opsional, kosongkan = '-')"
                        value={keteranganMap[i] || ''}
                        onChange={e => setKeteranganMap(prev => ({ ...prev, [i]: e.target.value }))}
                        className="h-8 text-xs"
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Pilih Legalitas */}
          {(record.legalitas || []).length > 0 && (
            <div>
              <label className="text-xs font-semibold text-foreground mb-2 block flex items-center gap-1.5">
                🛡️ Legalitas yang Disertakan
              </label>
              <div className="space-y-2">
                {(record.legalitas || []).map((l, i) => {
                  const subtotal = (l.harga_jual || l.nominal || 0) * (l.qty_variant || 1);
                  return (
                    <button
                      key={i}
                      type="button"
                      onClick={() => toggleLegalitas(i)}
                      className={`w-full text-left px-4 py-3 rounded-xl border transition-all flex items-center gap-3 ${selectedLegalitas.includes(i) ? 'border-blue-400 bg-blue-50' : 'border-border opacity-60'}`}
                    >
                      {selectedLegalitas.includes(i)
                        ? <CheckSquare className="w-4 h-4 text-blue-600 shrink-0" />
                        : <Square className="w-4 h-4 text-muted-foreground shrink-0" />
                      }
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm text-blue-900">
                          {l.nama}{l.qty_variant > 1 ? ` × ${l.qty_variant} variant` : ''}
                        </p>
                        <p className="text-xs text-blue-600">Rp {fmt(subtotal)}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Info */}
          <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 text-xs text-blue-700">
            <p className="font-semibold mb-0.5">🔒 Data Margin Tidak Ditampilkan di PDF</p>
            <p>Margin profit dan data internal lainnya tidak akan tercantum dalam invoice yang diterima customer.</p>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-border shrink-0 flex items-center justify-between gap-3">
          <p className="text-xs text-muted-foreground">
            {selectedProducts.length} produk{selectedLegalitas.length > 0 ? ` • ${selectedLegalitas.length} legalitas` : ''} dipilih
          </p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={onClose}>Batal</Button>
            <Button
              size="sm"
              disabled={!selectedBankId || selectedProducts.length === 0 || generating}
              onClick={handleGenerate}
              className="bg-accent hover:bg-accent/90 text-accent-foreground gap-2"
            >
              {generating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileDown className="w-3.5 h-3.5" />}
              {generating ? 'Membuat PDF...' : 'Unduh Invoice PDF'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}