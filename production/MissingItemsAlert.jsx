import React, { useState } from 'react';
import { ShoppingCart, Plus, Check, AlertTriangle, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';

/**
 * MissingItemsAlert — tampil jika ada komponen/bahan yang tidak ditemukan di inventori.
 * Menampilkan daftar item missing dan tombol untuk menambahkan ke inventori.
 * 
 * Props:
 *  - missingItems: [{ name, category, qty_needed, unit, vendor }]
 *  - onAddItem: (item) => Promise<newInventoryItem>
 */
export default function MissingItemsAlert({ missingItems, onAddItem }) {
  const [expanded, setExpanded] = useState(true);
  const [added, setAdded] = useState({}); // { name: true }
  const [loading, setLoading] = useState({}); // { name: true }
  const [qtyOverrides, setQtyOverrides] = useState({}); // { name: qty }

  if (!missingItems || missingItems.length === 0) return null;

  const pendingItems = missingItems.filter(i => !added[i.name]);

  if (pendingItems.length === 0) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-green-50 border border-green-200 text-xs text-green-700">
        <Check className="w-4 h-4 shrink-0" />
        <span className="font-medium">Semua item berhasil ditambahkan ke inventori</span>
      </div>
    );
  }

  const categoryLabel = { botol: 'Botol', bibit: 'Bibit', tutup: 'Tutup', spray: 'Spray', bahan: 'Bahan' };
  const categoryColor = {
    botol: 'bg-blue-100 text-blue-700',
    bibit: 'bg-green-100 text-green-700',
    tutup: 'bg-purple-100 text-purple-700',
    spray: 'bg-orange-100 text-orange-700',
    bahan: 'bg-teal-100 text-teal-700',
  };
  const categoryIcon = { botol: '🧴', bibit: '🌿', tutup: '🔒', spray: '💨', bahan: '🧪' };

  const handleAdd = async (item) => {
    const qty = qtyOverrides[item.name] !== undefined ? Number(qtyOverrides[item.name]) : (item.qty_needed || 0);
    setLoading(prev => ({ ...prev, [item.name]: true }));
    await onAddItem({
      item_name: item.name,
      category: item.category,
      total_stock: 0, // harga/stok dikosongkan dulu
      unit: item.unit || 'pcs',
      vendor: item.vendor || '',
      minimum_stock: 0,
      notes: `Auto-created dari PO. Kebutuhan: ${qty} ${item.unit || 'pcs'}`,
    });
    setLoading(prev => ({ ...prev, [item.name]: false }));
    setAdded(prev => ({ ...prev, [item.name]: true }));
  };

  const handleAddAll = async () => {
    for (const item of pendingItems) {
      await handleAdd(item);
    }
  };

  return (
    <div className="rounded-xl border-2 border-amber-300 bg-amber-50 overflow-hidden">
      {/* Header */}
      <button
        type="button"
        onClick={() => setExpanded(v => !v)}
        className="w-full flex items-center gap-2 px-3 py-2.5 hover:bg-amber-100 transition-colors"
      >
        <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
        <span className="text-sm font-semibold text-amber-800 flex-1 text-left">
          {pendingItems.length} item tidak ada di stok — perlu dibeli
        </span>
        <Badge className="bg-amber-200 text-amber-800 border-0 text-xs">{pendingItems.length}</Badge>
        {expanded ? <ChevronUp className="w-4 h-4 text-amber-600" /> : <ChevronDown className="w-4 h-4 text-amber-600" />}
      </button>

      {expanded && (
        <div className="px-3 pb-3 space-y-2 border-t border-amber-200">
          <p className="text-[11px] text-amber-700 pt-2">
            Item berikut tidak ditemukan di inventori. Klik <strong>"+ Tambah"</strong> untuk mencatatnya sebagai kebutuhan beli (harga dikosongkan, stok = 0).
          </p>

          <div className="space-y-2">
            {pendingItems.map((item) => {
              const isLoading = loading[item.name];
              const qty = qtyOverrides[item.name] !== undefined ? qtyOverrides[item.name] : (item.qty_needed ?? '');
              return (
                <div key={item.name} className="flex items-center gap-2 bg-white rounded-lg border border-amber-200 px-3 py-2">
                  <span className="text-base shrink-0">{categoryIcon[item.category] || '📦'}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-foreground truncate">{item.name}</p>
                    <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                      <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${categoryColor[item.category] || 'bg-gray-100 text-gray-700'}`}>
                        {categoryLabel[item.category] || item.category}
                      </span>
                      {item.vendor && <span className="text-[10px] text-muted-foreground">{item.vendor}</span>}
                    </div>
                  </div>
                  {/* Qty input */}
                  <div className="flex items-center gap-1 shrink-0">
                    <Input
                      type="number"
                      min="0"
                      step="0.001"
                      value={qty}
                      onChange={e => setQtyOverrides(prev => ({ ...prev, [item.name]: e.target.value }))}
                      className="h-7 w-20 text-xs text-center"
                      placeholder="qty"
                    />
                    <span className="text-[10px] text-muted-foreground w-8 shrink-0">{item.unit || 'pcs'}</span>
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    disabled={isLoading}
                    onClick={() => handleAdd(item)}
                    className="h-7 text-xs gap-1 bg-amber-600 hover:bg-amber-700 shrink-0"
                  >
                    {isLoading ? (
                      <span className="w-3 h-3 border border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <Plus className="w-3 h-3" />
                    )}
                    Tambah
                  </Button>
                </div>
              );
            })}
          </div>

          {pendingItems.length > 1 && (
            <Button
              type="button"
              size="sm"
              onClick={handleAddAll}
              variant="outline"
              className="w-full h-8 text-xs gap-2 border-amber-400 text-amber-800 hover:bg-amber-100"
            >
              <ShoppingCart className="w-3.5 h-3.5" />
              Tambah Semua ke Inventori
            </Button>
          )}
        </div>
      )}
    </div>
  );
}