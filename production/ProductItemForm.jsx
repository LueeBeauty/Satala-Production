import React, { useState, useMemo, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Plus, Trash2, ChevronDown, ChevronUp, Package } from 'lucide-react';
import POComponentItem from './POComponentItem';
import RacikanPOSection from './RacikanPOSection';
import MissingItemsAlert from './MissingItemsAlert';
import { toast } from 'sonner';

const CORE_CATEGORIES = ['botol', 'bibit', 'tutup', 'spray'];

export const makeComp = (category) => ({
  category,
  inventory_item_id: '',
  item_name: '',
  vendor: '',
  qty_needed: 0,
  stock_available: 0,
  unit: 'pcs',
  status: 'pending',
  item_notes: '',
  is_integrated: true,
});

const calcStatus = (stok, needed) => {
  if (!needed || needed <= 0) return 'pending';
  return stok >= needed ? 'ready' : 'need_buy';
};

/**
 * ProductItemForm — satu card product dalam PO
 * Props: product, onChange, onRemove, inventoryItems, findInv, index
 */
export default function ProductItemForm({ product, onChange, onRemove, inventoryItems, findInv, index }) {
  const [collapsed, setCollapsed] = useState(false);
  const [missingItems, setMissingItems] = useState([]);

  const qty = Number(product.target_qty) || 0;
  const ukuranMl = Number(product.ukuran_botol_ml) || 0;

  const calcBibitQty = (persentase) => {
    if (!ukuranMl || !qty) return 0;
    return +((persentase / 100) * ukuranMl * qty / 1000).toFixed(3);
  };

  // Auto-fill dari database (dipanggil dari RacikanPOSection)
  const handleAutoFill = (dbBahan, racikanItems) => {
    const updated = { ...product };
    updated.coreComponents = [...product.coreComponents.map(arr => [...arr])];

    // Bibit dari racikan
    const bibitItems = racikanItems.filter(r => r.kategori_bahan === 'Bibit');
    if (bibitItems.length > 0) {
      updated.coreComponents[1] = bibitItems.map(bibit => {
        const inv = findInv('bibit', bibit.nama_bahan) || findInv('bahan', bibit.nama_bahan);
        const qtyNeeded = calcBibitQty(bibit.persentase);
        const stok = inv?.total_stock || 0;
        return {
          ...makeComp('bibit'),
          item_name: bibit.nama_bahan,
          vendor: bibit.vendor || '',
          inventory_item_id: inv?.id || '',
          stock_available: stok,
          unit: inv?.unit || 'kg',
          qty_needed: qtyNeeded,
          status: inv ? calcStatus(stok, qtyNeeded) : 'pending',
        };
      });
    }

    // Botol/Tutup/Spray dari DatabaseBahan
    if (dbBahan) {
      if (dbBahan.botol_nama) {
        const inv = findInv('botol', dbBahan.botol_nama);
        const stok = inv?.total_stock || 0;
        updated.coreComponents[0] = [{
          ...makeComp('botol'),
          item_name: dbBahan.botol_nama,
          inventory_item_id: inv?.id || '',
          stock_available: stok,
          unit: 'pcs',
          qty_needed: qty || 0,
          status: inv ? calcStatus(stok, qty) : 'pending',
        }];
      }
      if (dbBahan.tutup_nama) {
        const inv = findInv('tutup', dbBahan.tutup_nama);
        const stok = inv?.total_stock || 0;
        updated.coreComponents[2] = [{
          ...makeComp('tutup'),
          item_name: dbBahan.tutup_nama,
          inventory_item_id: inv?.id || '',
          stock_available: stok,
          unit: 'pcs',
          qty_needed: qty || 0,
          status: inv ? calcStatus(stok, qty) : 'pending',
        }];
      }
      if (dbBahan.spray_nama) {
        const inv = findInv('spray', dbBahan.spray_nama);
        const stok = inv?.total_stock || 0;
        updated.coreComponents[3] = [{
          ...makeComp('spray'),
          item_name: dbBahan.spray_nama,
          inventory_item_id: inv?.id || '',
          stock_available: stok,
          unit: 'pcs',
          qty_needed: qty || 0,
          status: inv ? calcStatus(stok, qty) : 'pending',
        }];
      }
      // Auto-fill ukuran botol dari db bahan
      if (dbBahan.botol_ukuran_label_ml && !product.ukuran_botol_ml) {
        updated.ukuran_botol_ml = dbBahan.botol_ukuran_label_ml;
      }
    }

    onChange(updated);

    // Deteksi item yang tidak ditemukan di inventori
    const missing = [];

    // Cek bibit dari racikan
    racikanItems.filter(r => r.kategori_bahan === 'Bibit').forEach(bibit => {
      const inv = findInv('bibit', bibit.nama_bahan) || findInv('bahan', bibit.nama_bahan);
      if (!inv) {
        const qtyNeeded = calcBibitQty(bibit.persentase);
        missing.push({
          name: bibit.nama_bahan,
          category: 'bibit',
          qty_needed: qtyNeeded,
          unit: 'kg',
          vendor: bibit.vendor || '',
        });
      }
    });

    // Cek packaging dari dbBahan
    if (dbBahan) {
      if (dbBahan.botol_nama && !findInv('botol', dbBahan.botol_nama)) {
        missing.push({ name: dbBahan.botol_nama, category: 'botol', qty_needed: qty || 0, unit: 'pcs', vendor: '' });
      }
      if (dbBahan.tutup_nama && !findInv('tutup', dbBahan.tutup_nama)) {
        missing.push({ name: dbBahan.tutup_nama, category: 'tutup', qty_needed: qty || 0, unit: 'pcs', vendor: '' });
      }
      if (dbBahan.spray_nama && !findInv('spray', dbBahan.spray_nama)) {
        missing.push({ name: dbBahan.spray_nama, category: 'spray', qty_needed: qty || 0, unit: 'pcs', vendor: '' });
      }
    }

    setMissingItems(missing);
  };

  // Recalculate qty saat target_qty atau ukuran_botol_ml berubah
  useEffect(() => {
    if (qty <= 0) return;
    const newComponents = product.coreComponents.map((catComps, catIdx) => {
      const cat = CORE_CATEGORIES[catIdx];
      return catComps.map(comp => {
        if (!comp.inventory_item_id && !comp.item_name) return comp;
        if (cat === 'bibit') {
          const bibitInRacikan = product.racikanList.find(r =>
            r.kategori_bahan === 'Bibit' && r.nama_bahan === comp.item_name
          );
          if (bibitInRacikan && ukuranMl > 0) {
            const qtyNeeded = +((bibitInRacikan.persentase / 100) * ukuranMl * qty / 1000).toFixed(3);
            const stok = comp.stock_available || 0;
            return { ...comp, qty_needed: qtyNeeded, status: comp.inventory_item_id ? calcStatus(stok, qtyNeeded) : 'pending' };
          }
          return comp;
        } else {
          const stok = comp.stock_available || 0;
          return { ...comp, qty_needed: qty, status: comp.inventory_item_id ? calcStatus(stok, qty) : 'pending' };
        }
      });
    });
    onChange({ ...product, coreComponents: newComponents });
  }, [product.target_qty, product.ukuran_botol_ml]); // eslint-disable-line

  const updateField = (key, val) => onChange({ ...product, [key]: val });

  const setRacikanList = (fn) => {
    const newList = typeof fn === 'function' ? fn(product.racikanList) : fn;
    onChange({ ...product, racikanList: newList });
  };

  const addCoreComp = (catIdx) => {
    const updated = product.coreComponents.map((arr, i) =>
      i === catIdx ? [...arr, makeComp(CORE_CATEGORIES[catIdx])] : arr
    );
    onChange({ ...product, coreComponents: updated });
  };

  const removeCoreComp = (catIdx, compIdx) => {
    const updated = product.coreComponents.map((arr, i) => {
      if (i !== catIdx) return arr;
      const filtered = arr.filter((_, ci) => ci !== compIdx);
      return filtered.length === 0 ? [makeComp(CORE_CATEGORIES[catIdx])] : filtered;
    });
    onChange({ ...product, coreComponents: updated });
  };

  const updateCoreComp = (catIdx, compIdx, updatedComp) => {
    const updated = product.coreComponents.map((arr, i) =>
      i === catIdx ? arr.map((c, ci) => ci === compIdx ? updatedComp : c) : arr
    );
    onChange({ ...product, coreComponents: updated });
  };

  const allFlat = product.coreComponents.flat();
  const needBuyCount = allFlat.filter(c => c.status === 'need_buy').length;

  const queryClient = useQueryClient();
  const addInventoryItem = useMutation({
    mutationFn: (data) => base44.entities.InventoryItem.create(data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['inventory'] }); toast.success('Item baru ditambahkan'); },
  });

  return (
    <div className="border border-border rounded-xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 bg-muted/40 border-b border-border">
        <div className="flex items-center justify-center w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs font-bold shrink-0">
          {index + 1}
        </div>
        <Package className="w-4 h-4 text-muted-foreground shrink-0" />
        <span className="font-semibold text-sm flex-1">
          {product.product_name || `Produk ${index + 1}`}
        </span>
        {product.target_qty && (
          <Badge variant="secondary" className="text-xs">{product.target_qty} pcs</Badge>
        )}
        {needBuyCount > 0 && (
          <Badge className="text-xs bg-red-100 text-red-700 border-red-200">{needBuyCount} perlu beli</Badge>
        )}
        <button type="button" onClick={() => setCollapsed(v => !v)} className="text-muted-foreground hover:text-foreground">
          {collapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
        </button>
        <button type="button" onClick={onRemove} className="text-destructive/50 hover:text-destructive ml-1">
          <Trash2 className="w-4 h-4" />
        </button>
      </div>

      {!collapsed && (
        <div className="p-4 space-y-4">
          {/* Basic info */}
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <Label className="text-xs">Nama Produk</Label>
              <Input className="mt-1 h-9" value={product.product_name} onChange={e => updateField('product_name', e.target.value)} placeholder="Opsional" />
            </div>
            <div>
              <Label className="text-xs">Target Qty *</Label>
              <Input type="number" className="mt-1 h-9" value={product.target_qty} onChange={e => updateField('target_qty', e.target.value)} placeholder="1000" />
            </div>
            <div>
              <Label className="text-xs">Ukuran Botol (ml)</Label>
              <Input type="number" min="1" className="mt-1 h-9" value={product.ukuran_botol_ml} onChange={e => updateField('ukuran_botol_ml', e.target.value)} placeholder="30" />
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Switch checked={product.is_dynamic_qty || false} onCheckedChange={v => updateField('is_dynamic_qty', v)} />
            <Label className="font-normal text-xs">Dynamic Qty (ikuti sisa racikan)</Label>
          </div>

          {/* Racikan */}
          <RacikanPOSection
            ukuranMl={ukuranMl}
            qty={qty}
            racikanList={product.racikanList}
            setRacikanList={setRacikanList}
            onAutoFillComponents={handleAutoFill}
            onProductNameChange={(name) => {
              if (!product.product_name) updateField('product_name', name);
            }}
            onUkuranChange={(ml) => {
              if (!product.ukuran_botol_ml) updateField('ukuran_botol_ml', ml);
            }}
          />

          {/* Missing items alert */}
          <MissingItemsAlert
            missingItems={missingItems}
            onAddItem={async (itemData) => {
              const newItem = await addInventoryItem.mutateAsync(itemData);
              return newItem;
            }}
          />

          {/* Komponen Utama */}
          <div className="space-y-3">
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Komponen Utama</p>
              <p className="text-xs text-muted-foreground mt-0.5">Pilih item dari inventori. Status otomatis dihitung dari stok.</p>
            </div>
            {CORE_CATEGORIES.map((cat, catIdx) => (
              <div key={cat} className="space-y-2">
                {product.coreComponents[catIdx].map((comp, compIdx) => (
                  <POComponentItem
                    key={`${cat}-${compIdx}`}
                    comp={comp}
                    inventoryItems={inventoryItems}
                    onChange={(updated) => updateCoreComp(catIdx, compIdx, updated)}
                    onRemove={() => removeCoreComp(catIdx, compIdx)}
                    isCore={product.coreComponents[catIdx].length === 1}
                    onAddNewItem={(newItemData) => addInventoryItem.mutateAsync(newItemData)}
                  />
                ))}
                <Button type="button" variant="ghost" size="sm"
                  className="text-xs text-muted-foreground hover:text-primary gap-1 h-7 px-2"
                  onClick={() => addCoreComp(catIdx)}>
                  <Plus className="w-3 h-3" />
                  Tambah {cat.charAt(0).toUpperCase() + cat.slice(1)} Lain
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}