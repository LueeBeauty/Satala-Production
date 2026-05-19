import React, { useState, useRef, useEffect } from 'react';
import { Search, ChevronDown, Plus, AlertCircle, CheckCircle2, ShoppingCart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

/**
 * Dropdown yang terintegrasi dengan inventori.
 * Props:
 *  - category: 'botol' | 'tutup' | 'spray' (bukan bibit)
 *  - inventoryItems: semua item dari inventori
 *  - selectedItemId: ID item yang dipilih
 *  - onSelect: (item) => void — dipanggil saat pilih item
 *  - onAddNew: (newItemData) => void — dipanggil saat tambah item baru ke inventori
 *  - placeholder
 */
export default function InventorySearchDropdown({ category, inventoryItems, selectedItemId, onSelect, onAddNew, placeholder }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [showAddNew, setShowAddNew] = useState(false);
  const [newItemForm, setNewItemForm] = useState({ item_name: '', unit: 'pcs', vendor: '', notes: '' });
  const ref = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const filtered = inventoryItems
    .filter(i => i.category === category)
    .filter(i => !search || i.item_name?.toLowerCase().includes(search.toLowerCase()) || i.vendor?.toLowerCase().includes(search.toLowerCase()));

  const selected = inventoryItems.find(i => i.id === selectedItemId);

  const handleSelect = (item) => {
    onSelect(item);
    setOpen(false);
    setSearch('');
  };

  const handleAddNew = async () => {
    if (!newItemForm.item_name.trim()) return;
    await onAddNew({ ...newItemForm, category, total_stock: 0, minimum_stock: 0, allocated_qty: 0 });
    setNewItemForm({ item_name: '', unit: 'pcs', vendor: '', notes: '' });
    setShowAddNew(false);
  };

  const getStockStatus = (item) => {
    const stock = item.total_stock || 0;
    const min = item.minimum_stock || 0;
    if (stock <= 0) return 'empty';
    if (min > 0 && stock <= min) return 'low';
    return 'ok';
  };

  return (
    <>
      <div className="relative" ref={ref}>
        <button
          type="button"
          onClick={() => setOpen(o => !o)}
          className="flex h-9 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm hover:bg-accent/50 transition-colors"
        >
          {selected ? (
            <div className="flex items-center gap-2 min-w-0">
              <span className={`w-2 h-2 rounded-full shrink-0 ${
                getStockStatus(selected) === 'ok' ? 'bg-green-500' :
                getStockStatus(selected) === 'low' ? 'bg-yellow-500' : 'bg-red-500'
              }`} />
              <span className="truncate font-medium">{selected.item_name}</span>
              {selected.vendor && <span className="text-muted-foreground text-xs shrink-0">({selected.vendor})</span>}
            </div>
          ) : (
            <span className="text-muted-foreground">{placeholder || `Pilih ${category}...`}</span>
          )}
          <ChevronDown className="w-3.5 h-3.5 text-muted-foreground shrink-0 ml-2" />
        </button>

        {open && (
          <div className="absolute z-50 w-full top-10 rounded-xl border bg-popover shadow-xl overflow-hidden">
            <div className="p-2 border-b">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                <input
                  autoFocus
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Cari item..."
                  className="w-full pl-8 pr-3 py-1.5 text-sm bg-muted rounded-md outline-none"
                />
              </div>
            </div>

            <div className="max-h-52 overflow-y-auto">
              {filtered.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-4">
                  {search ? `"${search}" tidak ditemukan di inventori` : `Belum ada item kategori ${category}`}
                </p>
              ) : (
                <div className="p-1">
                  {filtered.map(item => {
                    const stockStatus = getStockStatus(item);
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => handleSelect(item)}
                        className={`w-full text-left px-3 py-2.5 rounded-lg hover:bg-accent transition-colors flex items-center justify-between gap-2 ${selectedItemId === item.id ? 'bg-accent font-semibold' : ''}`}
                      >
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className={`w-2 h-2 rounded-full shrink-0 ${
                              stockStatus === 'ok' ? 'bg-green-500' :
                              stockStatus === 'low' ? 'bg-yellow-500' : 'bg-red-500'
                            }`} />
                            <span className="text-sm truncate">{item.item_name}</span>
                          </div>
                          {item.vendor && <p className="text-xs text-muted-foreground ml-3.5">Vendor: {item.vendor}</p>}
                        </div>
                        <div className="text-right shrink-0">
                          <p className={`text-xs font-semibold ${
                            stockStatus === 'ok' ? 'text-green-600' :
                            stockStatus === 'low' ? 'text-yellow-600' : 'text-red-600'
                          }`}>
                            {item.total_stock || 0} {item.unit || 'pcs'}
                          </p>
                          <p className="text-[10px] text-muted-foreground">stok</p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="border-t p-2">
              <button
                type="button"
                onClick={() => {
                  setOpen(false);
                  if (typeof onAddNew === 'function') {
                    onAddNew(search);
                  } else {
                    setShowAddNew(true);
                  }
                }}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-primary hover:bg-primary/5 rounded-lg transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                {search.trim() ? `Tambah "${search.trim()}" ke Inventori` : 'Tambah Item Baru ke Inventori'}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Dialog tambah item baru */}
      <Dialog open={showAddNew} onOpenChange={setShowAddNew}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="w-4 h-4" />
              Tambah Item Baru — <span className="capitalize">{category}</span>
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <p className="text-xs text-amber-700">Item ini akan ditambahkan ke inventori dengan stok 0. Tandai sebagai <strong>barang harus dibeli</strong>.</p>
            </div>
            <div>
              <Label className="text-xs">Nama Item *</Label>
              <Input
                value={newItemForm.item_name}
                onChange={e => setNewItemForm(f => ({ ...f, item_name: e.target.value }))}
                placeholder={`Nama ${category}...`}
                className="h-8 text-sm mt-1"
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs">Vendor</Label>
                <Input
                  value={newItemForm.vendor}
                  onChange={e => setNewItemForm(f => ({ ...f, vendor: e.target.value }))}
                  placeholder="Opsional"
                  className="h-8 text-sm mt-1"
                />
              </div>
              <div>
                <Label className="text-xs">Satuan</Label>
                <Input
                  value={newItemForm.unit}
                  onChange={e => setNewItemForm(f => ({ ...f, unit: e.target.value }))}
                  placeholder="pcs, botol..."
                  className="h-8 text-sm mt-1"
                />
              </div>
            </div>
            <div>
              <Label className="text-xs">Catatan (opsional)</Label>
              <Input
                value={newItemForm.notes}
                onChange={e => setNewItemForm(f => ({ ...f, notes: e.target.value }))}
                placeholder="Keterangan tambahan..."
                className="h-8 text-sm mt-1"
              />
            </div>
            <div className="flex gap-2 pt-1">
              <Button type="button" variant="outline" size="sm" className="flex-1" onClick={() => setShowAddNew(false)}>Batal</Button>
              <Button type="button" size="sm" className="flex-1 gap-1" onClick={handleAddNew} disabled={!newItemForm.item_name.trim()}>
                <ShoppingCart className="w-3 h-3" /> Tambah & Tandai Beli
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}