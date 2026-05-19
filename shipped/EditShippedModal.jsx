import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { X, Save } from 'lucide-react';

const SHIPPING_VIA_OPTIONS = [
  'JNE', 'JT Express', 'SiCepat', 'TIKI', 'Anteraja', 'Gosend',
  'Grab Express', 'Lalamove', 'Lion Parcel', 'RPX', 'Wahana', 'Lainnya'
];

export default function EditShippedModal({ order, onSave, onCancel, isSaving }) {
  const [form, setForm] = useState({
    brand_name: order.brand_name || '',
    product_name: order.product_name || '',
    final_qty: order.final_qty || order.target_qty || '',
    ukuran_botol_ml: order.ukuran_botol_ml || '',
    shipped_at: order.shipped_at || '',
    shipping_via: order.shipping_via || order.courier || '',
    tracking_number: order.tracking_number || '',
    shipping_address: order.shipping_address || '',
    ongkir_payer: order.ongkir_payer || 'customer',
    ongkir_amount: order.ongkir_amount || '',
    notes: order.notes || '',
  });

  const handleSubmit = () => {
    onSave({
      brand_name: form.brand_name,
      product_name: form.product_name,
      final_qty: Number(form.final_qty) || 0,
      ukuran_botol_ml: Number(form.ukuran_botol_ml) || undefined,
      shipped_at: form.shipped_at,
      shipping_via: form.shipping_via,
      courier: form.shipping_via,
      tracking_number: form.tracking_number,
      shipping_address: form.shipping_address,
      ongkir_payer: form.ongkir_payer,
      ongkir_amount: form.ongkir_payer === 'pabrik' ? (Number(form.ongkir_amount) || 0) : 0,
      notes: form.notes,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-background rounded-2xl shadow-2xl w-full max-w-lg border border-border max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border shrink-0">
          <h2 className="font-display font-bold text-lg">Edit Data Pengiriman</h2>
          <button onClick={onCancel} className="w-8 h-8 rounded-lg hover:bg-muted flex items-center justify-center">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="overflow-auto flex-1 px-6 py-5 space-y-4">
          {/* Brand & Product */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs font-semibold mb-1.5 block">Brand</Label>
              <Input value={form.brand_name} onChange={e => setForm(f => ({...f, brand_name: e.target.value}))} />
            </div>
            <div>
              <Label className="text-xs font-semibold mb-1.5 block">Nama Produk</Label>
              <Input value={form.product_name} onChange={e => setForm(f => ({...f, product_name: e.target.value}))} />
            </div>
          </div>

          {/* Qty & Ukuran */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs font-semibold mb-1.5 block">Final Qty (pcs)</Label>
              <Input type="number" value={form.final_qty} onChange={e => setForm(f => ({...f, final_qty: e.target.value}))} />
            </div>
            <div>
              <Label className="text-xs font-semibold mb-1.5 block">Ukuran Botol (ml)</Label>
              <Input type="number" value={form.ukuran_botol_ml} onChange={e => setForm(f => ({...f, ukuran_botol_ml: e.target.value}))} placeholder="Contoh: 60" />
            </div>
          </div>

          {/* Tanggal */}
          <div>
            <Label className="text-xs font-semibold mb-1.5 block">Tanggal Kirim</Label>
            <Input type="date" value={form.shipped_at} onChange={e => setForm(f => ({...f, shipped_at: e.target.value}))} />
          </div>

          {/* Via & Resi */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs font-semibold mb-1.5 block">Via Pengiriman</Label>
              <Select value={form.shipping_via} onValueChange={v => setForm(f => ({...f, shipping_via: v}))}>
                <SelectTrigger><SelectValue placeholder="Pilih..." /></SelectTrigger>
                <SelectContent>
                  {SHIPPING_VIA_OPTIONS.map(opt => (
                    <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs font-semibold mb-1.5 block">No. Resi</Label>
              <Input value={form.tracking_number} onChange={e => setForm(f => ({...f, tracking_number: e.target.value}))} placeholder="Opsional" />
            </div>
          </div>

          {/* Alamat */}
          <div>
            <Label className="text-xs font-semibold mb-1.5 block">Alamat Pengiriman</Label>
            <Input value={form.shipping_address} onChange={e => setForm(f => ({...f, shipping_address: e.target.value}))} placeholder="Opsional" />
          </div>

          {/* Ongkir */}
          <div>
            <Label className="text-xs font-semibold mb-1.5 block">Ongkir Ditanggung</Label>
            <div className="grid grid-cols-2 gap-2">
              {[
                { value: 'customer', label: 'Customer' },
                { value: 'pabrik', label: 'Pabrik' },
              ].map(opt => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setForm(f => ({...f, ongkir_payer: opt.value}))}
                  className={`p-2.5 rounded-xl border text-sm font-medium transition-all ${
                    form.ongkir_payer === opt.value
                      ? 'border-primary bg-primary/5 ring-1 ring-primary/20 text-primary'
                      : 'border-border hover:border-primary/40 text-muted-foreground'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {form.ongkir_payer === 'pabrik' && (
            <div>
              <Label className="text-xs font-semibold mb-1.5 block">Nominal Ongkir (Rp)</Label>
              <Input
                type="number"
                value={form.ongkir_amount}
                onChange={e => setForm(f => ({...f, ongkir_amount: e.target.value}))}
                placeholder="Contoh: 25000"
                className="font-mono"
              />
            </div>
          )}

          {/* Catatan */}
          <div>
            <Label className="text-xs font-semibold mb-1.5 block">Catatan</Label>
            <Textarea value={form.notes} onChange={e => setForm(f => ({...f, notes: e.target.value}))} placeholder="Opsional" rows={2} className="resize-none" />
          </div>
        </div>

        <div className="flex gap-2 px-6 py-4 border-t border-border shrink-0">
          <Button variant="outline" className="flex-1" onClick={onCancel} disabled={isSaving}>Batal</Button>
          <Button className="flex-1 gap-2" onClick={handleSubmit} disabled={isSaving}>
            <Save className="w-4 h-4" />
            {isSaving ? 'Menyimpan...' : 'Simpan'}
          </Button>
        </div>
      </div>
    </div>
  );
}