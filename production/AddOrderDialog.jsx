import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Plus, AlertCircle, Package } from 'lucide-react';
import PicSelector from '@/components/shared/PicSelector';
import ProductItemForm, { makeComp } from './ProductItemForm';

const CORE_CATEGORIES = ['botol', 'bibit', 'tutup', 'spray'];

const makeProduct = (idx) => ({
  _id: Date.now() + idx,
  product_name: '',
  target_qty: '',
  ukuran_botol_ml: '',
  is_dynamic_qty: false,
  racikanList: [],
  coreComponents: CORE_CATEGORIES.map(cat => [makeComp(cat)]),
});

export default function AddOrderDialog({ onSave, trigger }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    order_number: '',
    brand_name: '',
    deadline: '',
    notes: '',
    pic_marketing: '',
  });
  const [products, setProducts] = useState([makeProduct(0)]);

  // Fetch semua inventory sources
  const { data: rawInventory = [] } = useQuery({ queryKey: ['inventory'], queryFn: () => base44.entities.InventoryItem.list('item_name') });
  const { data: botolList = [] } = useQuery({ queryKey: ['botol'], queryFn: () => base44.entities.Botol.list() });
  const { data: tutupList = [] } = useQuery({ queryKey: ['tutup'], queryFn: () => base44.entities.Tutup.list() });
  const { data: sprayList = [] } = useQuery({ queryKey: ['spray'], queryFn: () => base44.entities.Spray.list() });
  const { data: bahanList = [] } = useQuery({ queryKey: ['bahan-cair'], queryFn: () => base44.entities.BahanCair.list() });

  const inventoryItems = useMemo(() => {
    const fromStok = [
      ...botolList.map(i => ({ id: `botol-${i.id}`, item_name: i.nama, category: 'botol', total_stock: i.stok ?? 0, unit: 'pcs', vendor: i.catatan_teknis || '', minimum_stock: 10 })),
      ...tutupList.map(i => ({ id: `tutup-${i.id}`, item_name: i.nama, category: 'tutup', total_stock: i.stok ?? 0, unit: 'pcs', vendor: i.catatan || '', minimum_stock: 10 })),
      ...sprayList.map(i => ({ id: `spray-${i.id}`, item_name: i.nama, category: 'spray', total_stock: i.stok ?? 0, unit: 'pcs', vendor: i.tipe || '', minimum_stock: 10 })),
      ...bahanList.map(i => ({ id: `bahan-${i.id}`, item_name: i.nama, category: i.kategori === 'Bibit' ? 'bibit' : 'bahan', total_stock: i.stok ?? 0, unit: i.satuan || 'kg', vendor: i.vendor || '', minimum_stock: 0.5 })),
    ];
    const stokNames = new Set(fromStok.map(i => i.item_name?.toLowerCase()));
    const onlyRaw = rawInventory.filter(i => !stokNames.has(i.item_name?.toLowerCase()));
    return [...fromStok, ...onlyRaw];
  }, [botolList, tutupList, sprayList, bahanList, rawInventory]);

  // Cari item inventory berdasarkan kategori + nama
  const findInv = (category, nama) => {
    if (!nama) return null;
    const nameLower = nama.toLowerCase().trim();
    const items = inventoryItems.filter(i => i.category === category);

    // 1. Exact match
    const exact = items.find(i => i.item_name?.toLowerCase().trim() === nameLower);
    if (exact) return exact;

    // 2. Semua kata cocok
    const words = nameLower.split(/\s+/).filter(w => w.length > 1);
    const allMatch = items.find(i => {
      const invName = i.item_name?.toLowerCase() || '';
      return words.every(w => invName.includes(w));
    });
    if (allMatch) return allMatch;

    // 3. Kata panjang (>4 char) cocok, hanya 1 hasil
    const longWords = words.filter(w => w.length > 4);
    if (longWords.length > 0) {
      const matches = items.filter(i => {
        const invName = i.item_name?.toLowerCase() || '';
        return longWords.every(w => invName.includes(w));
      });
      if (matches.length === 1) return matches[0];
    }
    return null;
  };

  const updateProduct = (idx, updated) => {
    setProducts(prev => prev.map((p, i) => i === idx ? updated : p));
  };

  const removeProduct = (idx) => {
    setProducts(prev => prev.length > 1 ? prev.filter((_, i) => i !== idx) : prev);
  };

  const addProduct = () => {
    setProducts(prev => [...prev, makeProduct(prev.length)]);
  };

  const resetForm = () => {
    setForm({ order_number: '', brand_name: '', deadline: '', notes: '', pic_marketing: '' });
    setProducts([makeProduct(0)]);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.order_number || !form.brand_name) return;

    // Simpan sebagai satu PO per product (atau satu PO dengan product pertama + notes untuk multi)
    // Untuk kompatibilitas existing: simpan product pertama sebagai PO utama
    // Jika multi-product, simpan masing-masing sebagai PO terpisah dengan order_number yang sama
    const savedOrders = [];

    for (let pidx = 0; pidx < products.length; pidx++) {
      const p = products[pidx];
      const qty = Number(p.target_qty) || 0;
      const ukuranMl = Number(p.ukuran_botol_ml) || 0;

      // Build components
      const allComponents = [];
      CORE_CATEGORIES.forEach((cat, catIdx) => {
        p.coreComponents[catIdx].forEach(comp => {
          if (!comp.inventory_item_id) return;
          allComponents.push({
            name: comp.item_name || cat,
            category: cat,
            inventory_item_id: comp.inventory_item_id,
            item_name: comp.item_name,
            vendor: comp.vendor,
            qty_needed: comp.qty_needed || 0,
            stock_available: comp.stock_available || 0,
            unit: comp.unit || 'pcs',
            status: comp.status || 'pending',
            item_notes: comp.item_notes || '',
            is_integrated: true,
            color_code: '',
            target_qty: comp.qty_needed || 0,
            current_qty: 0,
          });
        });
      });

      // Build racikan
      const racikanWithCalc = p.racikanList.map(r => {
        const ml = (r.persentase / 100) * ukuranMl * qty;
        const kebutuhan = ml >= 1000
          ? { nilai: +(ml / 1000).toFixed(3), satuan: 'L' }
          : { nilai: +ml.toFixed(2), satuan: 'ml' };
        return {
          nama_bahan: r.nama_bahan,
          kategori_bahan: r.kategori_bahan,
          persentase: r.persentase,
          vendor: r.vendor || '',
          kebutuhan_nilai: ukuranMl > 0 && qty > 0 ? kebutuhan.nilai : undefined,
          kebutuhan_satuan: ukuranMl > 0 && qty > 0 ? kebutuhan.satuan : undefined,
        };
      });

      savedOrders.push({
        order_number: Number(form.order_number),
        brand_name: form.brand_name,
        deadline: form.deadline,
        notes: form.notes,
        pic_marketing: form.pic_marketing,
        product_name: p.product_name,
        target_qty: qty,
        ukuran_botol_ml: ukuranMl || undefined,
        is_dynamic_qty: p.is_dynamic_qty,
        racikan_digunakan: racikanWithCalc,
        status: 'pending',
        components: allComponents,
      });
    }

    // onSave dipanggil untuk setiap produk
    for (const order of savedOrders) {
      await onSave(order);
    }

    setOpen(false);
    resetForm();
  };

  const totalNeedBuy = products.reduce((sum, p) =>
    sum + p.coreComponents.flat().filter(c => c.status === 'need_buy').length, 0
  );
  const totalLinked = products.reduce((sum, p) =>
    sum + p.coreComponents.flat().filter(c => c.inventory_item_id).length, 0
  );

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) resetForm(); }}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display text-xl">Tambah PO Baru</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* ===== Info PO Header ===== */}
          <div className="space-y-3 p-4 bg-muted/30 rounded-xl border border-border">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Info PO</h3>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">No. Urut *</Label>
                <Input type="number" value={form.order_number}
                  onChange={e => setForm(f => ({ ...f, order_number: e.target.value }))}
                  required className="mt-1 h-9" />
              </div>
              <div>
                <Label className="text-xs">Nama Brand *</Label>
                <Input value={form.brand_name}
                  onChange={e => setForm(f => ({ ...f, brand_name: e.target.value }))}
                  required placeholder="D'BLURE, SEVNOV..." className="mt-1 h-9" />
              </div>
              <div>
                <Label className="text-xs">Deadline</Label>
                <Input type="date" value={form.deadline}
                  onChange={e => setForm(f => ({ ...f, deadline: e.target.value }))}
                  className="mt-1 h-9" />
              </div>
              <div>
                <Label className="text-xs">Catatan Umum</Label>
                <Input value={form.notes}
                  onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                  placeholder="Keterangan..." className="mt-1 h-9" />
              </div>
            </div>
            <PicSelector
              value={form.pic_marketing}
              onChange={v => setForm(f => ({ ...f, pic_marketing: v }))}
              label="PIC Marketing (Penanggung Jawab Order)"
              placeholder="Pilih marketing yang handle PO ini..."
              allowedRoles={['admin', 'marketing', 'supervisor', 'supervisor_office', 'user']}
            />
          </div>

          {/* ===== Status summary ===== */}
          {totalLinked > 0 && (
            <div className={`flex items-center gap-3 p-3 rounded-xl border text-sm ${totalNeedBuy > 0 ? 'bg-red-50 border-red-200' : 'bg-green-50 border-green-200'}`}>
              <AlertCircle className={`w-4 h-4 shrink-0 ${totalNeedBuy > 0 ? 'text-red-600' : 'text-green-600'}`} />
              {totalNeedBuy > 0
                ? <p className="text-red-700 font-medium">{totalNeedBuy} item perlu dibeli — stok tidak cukup</p>
                : <p className="text-green-700 font-medium">Semua {totalLinked} item siap (stok mencukupi)</p>
              }
            </div>
          )}

          {/* ===== Daftar Produk ===== */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Produk ({products.length})
              </h3>
            </div>

            {products.map((product, idx) => (
              <ProductItemForm
                key={product._id}
                index={idx}
                product={product}
                onChange={(updated) => updateProduct(idx, updated)}
                onRemove={() => removeProduct(idx)}
                inventoryItems={inventoryItems}
                findInv={findInv}
              />
            ))}

            <Button type="button" variant="outline" onClick={addProduct}
              className="w-full h-9 text-sm gap-2 border-dashed">
              <Plus className="w-4 h-4" />
              Tambah Produk
            </Button>
          </div>

          <Button type="submit" className="w-full h-11 text-base font-semibold">
            Simpan PO ({products.length} Produk)
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}