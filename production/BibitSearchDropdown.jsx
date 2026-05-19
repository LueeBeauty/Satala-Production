import React, { useState, useRef, useEffect } from 'react';
import { Search, ChevronDown, Plus, AlertCircle, ShoppingCart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

/**
 * Dropdown khusus untuk Bibit:
 * User harus pilih vendor dulu, baru pilih nama bibit.
 * Karena nama bibit bisa sama tapi vendor beda.
 */
export default function BibitSearchDropdown({ inventoryItems, selectedItemId, onSelect, onAddNew }) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState('vendor'); // 'vendor' | 'bibit'
  const [selectedVendor, setSelectedVendor] = useState('');
  const [search, setSearch] = useState('');
  const [showAddNew, setShowAddNew] = useState(false);
  const [newItemForm, setNewItemForm] = useState({ item_name: '', vendor: '', unit: 'gram', notes: '' });
  const ref = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const bibitItems = inventoryItems.filter(i => i.category === 'bibit');
  const vendors = [...new Set(bibitItems.map(i => i.vendor).filter(Boolean))].sort();
  const selected = inventoryItems.find(i => i.id === selectedItemId);

  const filteredBibit = bibitItems
    .filter(i => i.vendor === selectedVendor)
    .filter(i => !search || i.item_name?.toLowerCase().includes(search.toLowerCase()));

  const filteredVendors = vendors.filter(v => !search || v.toLowerCase().includes(search.toLowerCase()));

  const handleOpenDropdown = () => {
    setOpen(true);
    setStep('vendor');
    setSearch('');
    setSelectedVendor('');
  };

  const handleVendorSelect = (vendor) => {
    setSelectedVendor(vendor);
    setStep('bibit');
    setSearch('');
  };

  const handleBibitSelect = (item) => {
    onSelect(item);
    setOpen(false);
    setSearch('');
    setStep('vendor');
  };

  const handleAddNew = async () => {
    if (!newItemForm.item_name.trim() || !newItemForm.vendor.trim()) return;
    await onAddNew({ ...newItemForm, category: 'bibit', total_stock: 0, minimum_stock: 0, allocated_qty: 0 });
    setNewItemForm({ item_name: '', vendor: '', unit: 'gram', notes: '' });
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
          onClick={handleOpenDropdown}
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
            <span className="text-muted-foreground">Pilih vendor lalu bibit...</span>
          )}
          <ChevronDown className="w-3.5 h-3.5 text-muted-foreground shrink-0 ml-2" />
        </button>

        {open && (
          <div className="absolute z-50 w-full top-10 rounded-xl border bg-popover shadow-xl overflow-hidden">
            {/* Step indicator */}
            <div className="flex text-xs border-b">
              <button
                type="button"
                onClick={() => { setStep('vendor'); setSearch(''); }}
                className={`flex-1 px-3 py-2 font-medium transition-colors ${step === 'vendor' ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-accent'}`}
              >
                1. Pilih Vendor {selectedVendor && step === 'bibit' && <span className="font-normal">({selectedVendor})</span>}
              </button>
              <button
                type="button"
                disabled={!selectedVendor}
                onClick={() => selectedVendor && setStep('bibit')}
                className={`flex-1 px-3 py-2 font-medium transition-colors ${step === 'bibit' ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-accent'} disabled:opacity-40 disabled:cursor-not-allowed`}
              >
                2. Pilih Bibit
              </button>
            </div>

            <div className="p-2 border-b">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                <input
                  autoFocus
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder={step === 'vendor' ? 'Cari vendor...' : 'Cari nama bibit...'}
                  className="w-full pl-8 pr-3 py-1.5 text-sm bg-muted rounded-md outline-none"
                />
              </div>
            </div>

            <div className="max-h-52 overflow-y-auto">
              {step === 'vendor' ? (
                filteredVendors.length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-4">
                    {search ? `"${search}" tidak ditemukan` : 'Belum ada vendor bibit'}
                  </p>
                ) : (
                  <div className="p-1">
                    {filteredVendors.map(vendor => {
                      const count = bibitItems.filter(i => i.vendor === vendor).length;
                      return (
                        <button
                          key={vendor}
                          type="button"
                          onClick={() => handleVendorSelect(vendor)}
                          className="w-full text-left px-3 py-2.5 rounded-lg hover:bg-accent transition-colors flex items-center justify-between"
                        >
                          <span className="text-sm font-medium">{vendor}</span>
                          <span className="text-xs text-muted-foreground">{count} bibit</span>
                        </button>
                      );
                    })}
                  </div>
                )
              ) : (
                filteredBibit.length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-4">
                    {search ? `"${search}" tidak ditemukan` : `Belum ada bibit dari ${selectedVendor}`}
                  </p>
                ) : (
                  <div className="p-1">
                    {filteredBibit.map(item => {
                      const stockStatus = getStockStatus(item);
                      return (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => handleBibitSelect(item)}
                          className={`w-full text-left px-3 py-2.5 rounded-lg hover:bg-accent transition-colors flex items-center justify-between gap-2 ${selectedItemId === item.id ? 'bg-accent font-semibold' : ''}`}
                        >
                          <div className="min-w-0 flex items-center gap-1.5">
                            <span className={`w-2 h-2 rounded-full shrink-0 ${
                              stockStatus === 'ok' ? 'bg-green-500' :
                              stockStatus === 'low' ? 'bg-yellow-500' : 'bg-red-500'
                            }`} />
                            <span className="text-sm truncate">{item.item_name}</span>
                          </div>
                          <div className="text-right shrink-0">
                            <p className={`text-xs font-semibold ${
                              stockStatus === 'ok' ? 'text-green-600' :
                              stockStatus === 'low' ? 'text-yellow-600' : 'text-red-600'
                            }`}>
                              {item.total_stock || 0} {item.unit || 'gram'}
                            </p>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )
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
                {search.trim() ? `Tambah "${search.trim()}" ke Inventori` : 'Tambah Bibit Baru ke Inventori'}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Dialog tambah bibit baru */}
      <Dialog open={showAddNew} onOpenChange={setShowAddNew}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="w-4 h-4" />
              Tambah Bibit Baru
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <p className="text-xs text-amber-700">Bibit ini akan ditambahkan ke inventori dengan stok 0. Wajib isi vendor karena bibit bisa memiliki nama sama dari vendor berbeda.</p>
            </div>
            <div>
              <Label className="text-xs">Vendor *</Label>
              <Input
                value={newItemForm.vendor}
                onChange={e => setNewItemForm(f => ({ ...f, vendor: e.target.value }))}
                placeholder="Nama vendor..."
                className="h-8 text-sm mt-1"
              />
            </div>
            <div>
              <Label className="text-xs">Nama Bibit *</Label>
              <Input
                value={newItemForm.item_name}
                onChange={e => setNewItemForm(f => ({ ...f, item_name: e.target.value }))}
                placeholder="Nama bibit..."
                className="h-8 text-sm mt-1"
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs">Satuan</Label>
                <Input
                  value={newItemForm.unit}
                  onChange={e => setNewItemForm(f => ({ ...f, unit: e.target.value }))}
                  placeholder="gram, ml..."
                  className="h-8 text-sm mt-1"
                />
              </div>
              <div>
                <Label className="text-xs">Catatan</Label>
                <Input
                  value={newItemForm.notes}
                  onChange={e => setNewItemForm(f => ({ ...f, notes: e.target.value }))}
                  placeholder="Opsional"
                  className="h-8 text-sm mt-1"
                />
              </div>
            </div>
            <div className="flex gap-2 pt-1">
              <Button type="button" variant="outline" size="sm" className="flex-1" onClick={() => setShowAddNew(false)}>Batal</Button>
              <Button type="button" size="sm" className="flex-1 gap-1" onClick={handleAddNew} disabled={!newItemForm.item_name.trim() || !newItemForm.vendor.trim()}>
                <ShoppingCart className="w-3 h-3" /> Tambah & Tandai Beli
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}