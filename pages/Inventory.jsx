import React, { useState, useRef, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Package, Search, Pencil, Trash2, AlertTriangle, ChevronDown, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import LastUpdated from '@/components/ui/LastUpdated';
import { getLatestUpdatedDate } from '@/hooks/useRelativeTime';

const CATEGORIES = ['bibit', 'botol', 'tutup', 'spray', 'segel', 'lainnya'];



function SearchableSelect({ value, onChange, options, placeholder = 'Pilih...' }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const ref = useRef(null);

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const filtered = options.filter(o => o.label.toLowerCase().includes(search.toLowerCase()));
  const selected = options.find(o => o.value === value);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="flex h-9 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm hover:bg-accent transition-colors"
      >
        <span className={selected ? '' : 'text-muted-foreground'}>{selected ? selected.label : placeholder}</span>
        <ChevronDown className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
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
                placeholder="Cari..."
                className="w-full pl-8 pr-3 py-1.5 text-sm bg-muted rounded-md outline-none"
              />
            </div>
          </div>
          <div className="max-h-44 overflow-y-auto p-1">
            {filtered.length === 0
              ? <p className="text-xs text-muted-foreground text-center py-3">Tidak ditemukan</p>
              : filtered.map(o => (
                <button key={o.value} type="button"
                  onClick={() => { onChange(o.value); setOpen(false); setSearch(''); }}
                  className={`w-full text-left px-3 py-2 text-sm rounded-md hover:bg-accent transition-colors ${value === o.value ? 'font-semibold bg-accent' : ''}`}
                >
                  {o.label}
                </button>
              ))
            }
          </div>
        </div>
      )}
    </div>
  );
}

function ItemDialog({ item, onSave, trigger }) {
  const isEdit = !!item;
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(
    item
      ? { item_name: item.item_name, kode: item.kode || '', category: item.category, total_stock: item.total_stock ?? '', minimum_stock: item.minimum_stock ?? 0, allocated_qty: item.allocated_qty ?? 0, vendor: item.vendor || '', unit: item.unit || 'pcs', notes: item.notes || '' }
      : { item_name: '', kode: '', category: 'botol', total_stock: '', minimum_stock: 0, allocated_qty: 0, vendor: '', unit: 'pcs', notes: '' }
  );

  const handleSubmit = async (e) => {
    e.preventDefault();
    await onSave({
      ...form,
      total_stock: Number(form.total_stock) || 0,
      minimum_stock: Number(form.minimum_stock) || 0,
      allocated_qty: Number(form.allocated_qty) || 0,
    });
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="font-display">{isEdit ? 'Edit Item' : 'Tambah Inventori'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <Label>Nama Item</Label>
              <Input value={form.item_name} onChange={e => setForm(f => ({ ...f, item_name: e.target.value }))} required />
            </div>
            <div>
              <Label>Kode</Label>
              <Input value={form.kode} onChange={e => setForm(f => ({ ...f, kode: e.target.value }))} placeholder="Opsional" />
            </div>
            <div>
              <Label>Kategori</Label>
              <SearchableSelect
                value={form.category}
                onChange={v => setForm(f => ({ ...f, category: v }))}
                options={CATEGORIES.map(c => ({ value: c, label: c.charAt(0).toUpperCase() + c.slice(1) }))}
              />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label>Total Stok</Label>
              <Input type="number" value={form.total_stock} onChange={e => setForm(f => ({ ...f, total_stock: e.target.value }))} />
            </div>
            <div>
              <Label>Stok Minimum</Label>
              <Input type="number" value={form.minimum_stock} onChange={e => setForm(f => ({ ...f, minimum_stock: e.target.value }))} />
            </div>
            <div>
              <Label>Alokasi</Label>
              <Input type="number" value={form.allocated_qty} onChange={e => setForm(f => ({ ...f, allocated_qty: e.target.value }))} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Vendor</Label>
              <Input value={form.vendor} onChange={e => setForm(f => ({ ...f, vendor: e.target.value }))} />
            </div>
            <div>
              <Label>Satuan</Label>
              <Input value={form.unit} onChange={e => setForm(f => ({ ...f, unit: e.target.value }))} />
            </div>
          </div>
          <div>
            <Label>Catatan</Label>
            <Input value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
          </div>
          <Button type="submit" className="w-full">{isEdit ? 'Simpan Perubahan' : 'Tambah'}</Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// Searchable vendor filter dropdown
function VendorFilter({ vendors, activeVendor, onChange }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const ref = useRef(null);

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const filtered = vendors.filter(v => v.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-2 h-9 px-3 rounded-md border border-input bg-background text-sm hover:bg-accent transition-colors min-w-[140px] justify-between"
      >
        <span className={activeVendor === 'all' ? 'text-muted-foreground' : 'font-medium'}>
          {activeVendor === 'all' ? 'Semua Vendor' : activeVendor}
        </span>
        <div className="flex items-center gap-1">
          {activeVendor !== 'all' && (
            <span onClick={(e) => { e.stopPropagation(); onChange('all'); }} className="hover:text-destructive">
              <X className="w-3 h-3" />
            </span>
          )}
          <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
        </div>
      </button>

      {open && (
        <div className="absolute right-0 top-10 z-50 w-56 rounded-xl border bg-popover shadow-xl overflow-hidden">
          <div className="p-2 border-b">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
              <input
                autoFocus
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Cari vendor..."
                className="w-full pl-8 pr-3 py-1.5 text-sm bg-muted rounded-md outline-none"
              />
            </div>
          </div>
          <div className="max-h-48 overflow-y-auto p-1">
            <button
              onClick={() => { onChange('all'); setOpen(false); setSearch(''); }}
              className={`w-full text-left px-3 py-2 text-sm rounded-md hover:bg-accent transition-colors ${activeVendor === 'all' ? 'font-semibold bg-accent' : ''}`}
            >
              Semua Vendor
            </button>
            {filtered.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-3">Tidak ditemukan</p>
            ) : filtered.map(v => (
              <button
                key={v}
                onClick={() => { onChange(v); setOpen(false); setSearch(''); }}
                className={`w-full text-left px-3 py-2 text-sm rounded-md hover:bg-accent transition-colors ${activeVendor === v ? 'font-semibold bg-accent' : ''}`}
              >
                {v}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default function Inventory() {
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState('all');
  const [activeVendor, setActiveVendor] = useState('all');
  const queryClient = useQueryClient();

  const { data: items = [], isLoading } = useQuery({
    queryKey: ['inventory'],
    queryFn: () => base44.entities.InventoryItem.list(),
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.InventoryItem.create(data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['inventory'] }); toast.success('Item ditambahkan'); },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.InventoryItem.update(id, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['inventory'] }); toast.success('Item diperbarui'); },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.InventoryItem.delete(id),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['inventory'] }); toast.success('Item dihapus'); },
  });

  // Vendors that appear in the currently selected category
  const vendorsInCategory = [...new Set(
    items
      .filter(i => activeTab === 'all' || i.category === activeTab)
      .map(i => i.vendor)
      .filter(Boolean)
  )].sort();

  // Reset vendor filter when category changes
  const handleTabChange = (val) => {
    setActiveTab(val);
    setActiveVendor('all');
  };

  const filtered = items
    .filter(i => activeTab === 'all' || i.category === activeTab)
    .filter(i => activeVendor === 'all' || i.vendor === activeVendor)
    .filter(i => !search || i.item_name?.toLowerCase().includes(search.toLowerCase()) || i.kode?.toLowerCase().includes(search.toLowerCase()));

  const lowStockItems = items.filter(i => (i.minimum_stock || 0) > 0 && (i.total_stock || 0) <= (i.minimum_stock || 0));

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold tracking-tight">Inventori Komponen</h1>
          <p className="text-muted-foreground text-sm mt-1">{items.length} item tercatat</p>

        </div>
        <ItemDialog
          onSave={(data) => createMutation.mutateAsync(data)}
          trigger={<Button className="gap-2"><Plus className="w-4 h-4" /> Tambah Item</Button>}
        />
      </div>

      {/* Warning stok rendah */}
      {lowStockItems.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 space-y-2">
          <div className="flex items-center gap-2 text-red-700 font-semibold text-sm">
            <AlertTriangle className="w-4 h-4" />
            {lowStockItems.length} item stok menipis!
          </div>
          <div className="flex flex-wrap gap-2">
            {lowStockItems.map(i => (
              <span key={i.id} className="bg-red-100 text-red-700 text-xs px-2.5 py-1 rounded-full font-medium">
                {i.item_name} — {i.total_stock || 0} {i.unit || 'pcs'} (min: {i.minimum_stock})
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input placeholder="Cari item atau kode..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
      </div>

      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
        {/* Kategori item */}
        <div className="flex-1">
          <p className="text-xs text-muted-foreground mb-1.5 font-medium">Kategori</p>
          <Tabs value={activeTab} onValueChange={handleTabChange}>
            <TabsList className="flex-wrap h-auto gap-1">
              <TabsTrigger value="all">Semua</TabsTrigger>
              {CATEGORIES.map(c => (
                <TabsTrigger key={c} value={c} className="capitalize">{c}</TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        </div>

        {/* Filter vendor - hanya muncul jika ada vendor */}
        {vendorsInCategory.length > 0 && (
          <div className="shrink-0">
            <p className="text-xs text-muted-foreground mb-1.5 font-medium">Vendor</p>
            <VendorFilter
              vendors={vendorsInCategory}
              activeVendor={activeVendor}
              onChange={setActiveVendor}
            />
          </div>
        )}
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array(6).fill(0).map((_, i) => <div key={i} className="h-28 rounded-xl bg-muted animate-pulse" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20 text-muted-foreground">
          <Package className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p>Belum ada item inventori</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(item => {
            const available = (item.total_stock || 0) - (item.allocated_qty || 0);
            const isLow = (item.minimum_stock || 0) > 0 && (item.total_stock || 0) <= (item.minimum_stock || 0);
            return (
              <Card key={item.id} className={`hover:shadow-md transition-shadow group ${isLow ? 'border-red-300 bg-red-50/30' : ''}`}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <h3 className="font-semibold text-sm truncate">{item.item_name}</h3>
                        {isLow && <AlertTriangle className="w-3.5 h-3.5 text-red-500 shrink-0" />}
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[11px] text-muted-foreground capitalize">{item.category}</span>
                        {item.kode && <Badge variant="outline" className="text-[10px] px-1.5 py-0">{item.kode}</Badge>}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0 ml-2">
                      <ItemDialog
                        item={item}
                        onSave={(data) => updateMutation.mutateAsync({ id: item.id, data })}
                        trigger={
                          <Button variant="ghost" size="icon" className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Pencil className="w-3 h-3" />
                          </Button>
                        }
                      />
                      <Button
                        variant="ghost" size="icon"
                        className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:text-destructive"
                        onClick={() => { if (confirm('Hapus item ini?')) deleteMutation.mutate(item.id); }}
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                  <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                    <div className={`rounded-lg py-2 ${isLow ? 'bg-red-100' : 'bg-muted/50'}`}>
                      <div className={`text-lg font-bold ${isLow ? 'text-red-600' : ''}`}>{item.total_stock || 0}</div>
                      <div className="text-[10px] text-muted-foreground">Stok</div>
                    </div>
                    <div className="bg-muted/50 rounded-lg py-2">
                      <div className="text-lg font-bold">{item.minimum_stock || 0}</div>
                      <div className="text-[10px] text-muted-foreground">Minimum</div>
                    </div>
                    <div className={`rounded-lg py-2 ${available <= 0 ? 'bg-red-50' : 'bg-green-50'}`}>
                      <div className={`text-lg font-bold ${available <= 0 ? 'text-destructive' : 'text-green-700'}`}>{available}</div>
                      <div className="text-[10px] text-muted-foreground">Tersedia</div>
                    </div>
                  </div>
                  {item.vendor && <p className="text-[11px] text-muted-foreground mt-2">Vendor: {item.vendor}</p>}
                  {item.notes && <p className="text-[11px] text-muted-foreground mt-1 italic">{item.notes}</p>}
                  <div className="mt-2">
                    <LastUpdated date={item.updated_date || item.created_date} />
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}