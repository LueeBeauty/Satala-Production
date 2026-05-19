import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Truck, X, Package, AlertCircle } from 'lucide-react';
import PicSelector from '@/components/shared/PicSelector';

const SHIPPING_VIA_OPTIONS = [
  'JNE', 'JT Express', 'SiCepat', 'TIKI', 'Anteraja', 'Gosend',
  'Grab Express', 'Lalamove', 'Lion Parcel', 'RPX', 'Wahana', 'Lainnya'
];

export default function SelesaiKirimModal({ order, onConfirm, onCancel, isLoading }) {
  const [form, setForm] = useState({
    shipping_via: '',
    ongkir_payer: 'customer',
    ongkir_amount: '',
    pic: '',
  });

  const handleSubmit = () => {
    onConfirm({
      shipping_via: form.shipping_via,
      ongkir_payer: form.ongkir_payer,
      ongkir_amount: form.ongkir_payer === 'pabrik' ? (Number(form.ongkir_amount) || 0) : 0,
      pic: form.pic,
    });
  };

  const qty = order?.final_qty || order?.target_qty || 0;
  const botolComp = (order?.components || []).find(c => c.category === 'botol');
  const ukuran = order?.ukuran_botol_ml
    ? `${order.ukuran_botol_ml} ml`
    : botolComp?.item_name || '-';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-background rounded-2xl shadow-2xl w-full max-w-md border border-border">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-green-100 flex items-center justify-center">
              <Truck className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <h2 className="font-display font-bold text-lg">Konfirmasi Selesai Kirim</h2>
              <p className="text-xs text-muted-foreground">{order?.brand_name}</p>
            </div>
          </div>
          <button onClick={onCancel} className="w-8 h-8 rounded-lg hover:bg-muted flex items-center justify-center text-muted-foreground">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Summary */}
        <div className="px-6 pt-4 pb-2">
          <div className="bg-muted/40 rounded-xl p-4 flex items-center gap-4">
            <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
              <Package className="w-4 h-4 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm truncate">{order?.product_name || order?.brand_name}</p>
              <p className="text-xs text-muted-foreground">{ukuran} · {qty > 0 ? `${qty.toLocaleString()} pcs` : 'Qty belum ditentukan'}</p>
            </div>
          </div>
        </div>

        {/* Form */}
        <div className="px-6 pb-4 space-y-4 pt-3">
          {/* Via Pengiriman */}
          <div>
            <Label className="text-xs font-semibold mb-1.5 block">Via Pengiriman</Label>
            <Select value={form.shipping_via} onValueChange={v => setForm(f => ({ ...f, shipping_via: v }))}>
              <SelectTrigger>
                <SelectValue placeholder="Pilih ekspedisi / kurir..." />
              </SelectTrigger>
              <SelectContent>
                {SHIPPING_VIA_OPTIONS.map(opt => (
                  <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Ongkir Payer */}
          <div>
            <Label className="text-xs font-semibold mb-1.5 block">Ongkir Ditanggung</Label>
            <div className="grid grid-cols-2 gap-2">
              {[
                { value: 'customer', label: 'Customer', desc: 'Tidak perlu input nilai' },
                { value: 'pabrik', label: 'Pabrik', desc: 'Input nilai ongkir' },
              ].map(opt => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setForm(f => ({ ...f, ongkir_payer: opt.value }))}
                  className={`p-3 rounded-xl border text-left transition-all ${
                    form.ongkir_payer === opt.value
                      ? 'border-primary bg-primary/5 ring-1 ring-primary/20'
                      : 'border-border hover:border-primary/40'
                  }`}
                >
                  <p className="font-semibold text-sm">{opt.label}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{opt.desc}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Nominal Ongkir (hanya jika pabrik) */}
          {form.ongkir_payer === 'pabrik' && (
            <div>
              <Label className="text-xs font-semibold mb-1.5 block">Nominal Ongkir (Rp)</Label>
              <Input
                type="number"
                placeholder="Contoh: 25000"
                value={form.ongkir_amount}
                onChange={e => setForm(f => ({ ...f, ongkir_amount: e.target.value }))}
                className="font-mono"
              />
            </div>
          )}

          {/* PIC */}
          <PicSelector
            label="PIC Penanggung Jawab"
            value={form.pic}
            onChange={v => setForm(f => ({ ...f, pic: v }))}
            placeholder="Pilih PIC pengiriman..."
          />

          {/* Warning */}
          <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2.5">
            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div className="text-xs text-amber-700 space-y-0.5">
              <p>Setelah dikonfirmasi, PO akan dipindahkan ke halaman <strong>Arsip Selesai</strong>.</p>
              {order?.stock_deducted ? (
                <p className="text-green-700 font-medium">✓ Stok sudah dikurangi sebelumnya (saat status In Progress). Tidak akan dikurangi lagi.</p>
              ) : (
                <p><strong>Stok akan otomatis dikurangi:</strong> packaging (botol, tutup, spray) dan bahan cair (racikan) sesuai kebutuhan PO ini.</p>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex gap-2 p-6 pt-0">
          <Button variant="outline" className="flex-1" onClick={onCancel} disabled={isLoading}>
            Batal
          </Button>
          <Button
            className="flex-1 bg-green-600 hover:bg-green-700 gap-2"
            onClick={handleSubmit}
            disabled={isLoading}
          >
            <Truck className="w-4 h-4" />
            {isLoading ? 'Memproses...' : 'Konfirmasi Selesai'}
          </Button>
        </div>
      </div>
    </div>
  );
}