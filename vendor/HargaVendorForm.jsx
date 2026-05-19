import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Save, X, DollarSign } from 'lucide-react';
import { format } from 'date-fns';

export default function HargaVendorForm({ harga, vendorList, bahanList, onSave, onCancel, isSaving }) {
  const [form, setForm] = useState({
    vendor_id: '',
    vendor_nama: '',
    bahan_id: '',
    bahan_nama: '',
    bahan_kategori: '',
    harga_rupiah: '',
    satuan: 'kg',
    min_order_qty: '',
    min_order_satuan: 'kg',
    catatan: '',
    tanggal_update: format(new Date(), 'yyyy-MM-dd'),
  });

  useEffect(() => {
    if (harga) {
      setForm({
        vendor_id: harga.vendor_id || '',
        vendor_nama: harga.vendor_nama || '',
        bahan_id: harga.bahan_id || '',
        bahan_nama: harga.bahan_nama || '',
        bahan_kategori: harga.bahan_kategori || '',
        harga_rupiah: harga.harga_rupiah || '',
        satuan: harga.satuan || 'kg',
        min_order_qty: harga.min_order_qty || '',
        min_order_satuan: harga.min_order_satuan || 'kg',
        catatan: harga.catatan || '',
        tanggal_update: harga.tanggal_update || format(new Date(), 'yyyy-MM-dd'),
      });
    }
  }, [harga]);

  const handleVendorChange = (vendorId) => {
    const vendor = vendorList.find(v => v.id === vendorId);
    setForm(f => ({ ...f, vendor_id: vendorId, vendor_nama: vendor?.nama || '' }));
  };

  const handleBahanChange = (bahanId) => {
    const bahan = bahanList.find(b => b.id === bahanId);
    setForm(f => ({
      ...f,
      bahan_id: bahanId,
      bahan_nama: bahan?.nama || '',
      bahan_kategori: bahan?.kategori || '',
      satuan: bahan?.satuan || 'kg',
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave({
      ...form,
      harga_rupiah: parseFloat(form.harga_rupiah) || 0,
      min_order_qty: parseFloat(form.min_order_qty) || 0,
    });
  };

  const fmt = (n) => new Intl.NumberFormat('id-ID').format(Math.round(n));
  const hargaNum = parseFloat(form.harga_rupiah) || 0;
  const hargaPerMl = (form.satuan === 'kg' || form.satuan === 'liter') ? hargaNum / 1000 : hargaNum;

  return (
    <div className="bg-card border border-accent/20 rounded-2xl shadow-lg overflow-hidden">
      <div className="flex items-center justify-between px-5 py-4 bg-gradient-to-r from-accent/5 to-primary/5 border-b border-border">
        <div className="flex items-center gap-2">
          <DollarSign className="w-4 h-4 text-accent" />
          <h3 className="font-semibold text-sm">{harga ? 'Edit Harga Vendor' : 'Tambah Harga Vendor'}</h3>
        </div>
        <Button variant="ghost" size="icon" className="w-8 h-8" onClick={onCancel}>
          <X className="w-4 h-4" />
        </Button>
      </div>

      <form onSubmit={handleSubmit} className="p-5 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Vendor */}
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Vendor <span className="text-destructive">*</span></label>
            <select
              value={form.vendor_id}
              onChange={e => handleVendorChange(e.target.value)}
              className="w-full text-sm border border-border rounded-lg px-3 h-9 bg-background focus:ring-1 focus:ring-accent/50 outline-none"
              required
            >
              <option value="">-- Pilih Vendor --</option>
              {vendorList.map(v => <option key={v.id} value={v.id}>{v.nama}</option>)}
            </select>
          </div>

          {/* Bahan */}
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Bahan Cair <span className="text-destructive">*</span></label>
            <select
              value={form.bahan_id}
              onChange={e => handleBahanChange(e.target.value)}
              className="w-full text-sm border border-border rounded-lg px-3 h-9 bg-background focus:ring-1 focus:ring-accent/50 outline-none"
              required
            >
              <option value="">-- Pilih Bahan --</option>
              {bahanList.map(b => <option key={b.id} value={b.id}>{b.nama} ({b.kategori})</option>)}
            </select>
          </div>

          {/* Harga */}
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Harga per Satuan <span className="text-destructive">*</span></label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">Rp</span>
                <Input
                  type="number"
                  min="0"
                  value={form.harga_rupiah}
                  onChange={e => setForm(f => ({ ...f, harga_rupiah: e.target.value }))}
                  placeholder="0"
                  className="pl-8 h-9"
                  required
                />
              </div>
              <select
                value={form.satuan}
                onChange={e => setForm(f => ({ ...f, satuan: e.target.value }))}
                className="text-xs border border-border rounded-lg px-2 h-9 bg-background focus:ring-1 focus:ring-accent/50 outline-none w-20"
              >
                {['kg', 'liter', 'gram', 'ml'].map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            {hargaPerMl > 0 && (
              <p className="text-xs text-accent font-semibold mt-1">≈ Rp {fmt(hargaPerMl)}/ml</p>
            )}
          </div>

          {/* Min Order */}
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Min. Order (opsional)</label>
            <div className="flex gap-2">
              <Input
                type="number"
                min="0"
                value={form.min_order_qty}
                onChange={e => setForm(f => ({ ...f, min_order_qty: e.target.value }))}
                placeholder="Qty"
                className="h-9"
              />
              <select
                value={form.min_order_satuan}
                onChange={e => setForm(f => ({ ...f, min_order_satuan: e.target.value }))}
                className="text-xs border border-border rounded-lg px-2 h-9 bg-background focus:ring-1 focus:ring-accent/50 outline-none w-20"
              >
                {['kg', 'liter', 'gram', 'ml', 'pcs'].map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>

          {/* Tanggal Update */}
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Tanggal Harga</label>
            <Input
              type="date"
              value={form.tanggal_update}
              onChange={e => setForm(f => ({ ...f, tanggal_update: e.target.value }))}
              className="h-9"
            />
          </div>

          {/* Catatan */}
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Catatan</label>
            <Input
              value={form.catatan}
              onChange={e => setForm(f => ({ ...f, catatan: e.target.value }))}
              placeholder="Harga promo, syarat, dll"
              className="h-9"
            />
          </div>
        </div>

        <div className="flex gap-3 pt-2">
          <Button type="button" variant="outline" onClick={onCancel} className="flex-1">Batal</Button>
          <Button type="submit" disabled={isSaving || !form.vendor_id || !form.bahan_id || !form.harga_rupiah}
            className="flex-1 gap-2 bg-accent hover:bg-accent/90 text-accent-foreground">
            <Save className="w-4 h-4" /> {isSaving ? 'Menyimpan...' : 'Simpan Harga'}
          </Button>
        </div>
      </form>
    </div>
  );
}