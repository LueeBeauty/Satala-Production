import React, { useState, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Search, ArrowUpDown, Truck, PackageCheck, CheckCircle2, RotateCcw, ExternalLink, Undo2, Trash2, Package, Pencil } from 'lucide-react';
import { useSession } from '@/lib/SessionContext';
import { canManagePO } from '@/lib/AuthSession';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import BrandCard from '@/components/production/BrandCard';
import AddOrderDialog from '@/components/production/AddOrderDialog';
import ShippingCard from '@/components/production/ShippingCard';
import LastUpdated from '@/components/ui/LastUpdated';
import SearchableSelect from '@/components/ui/SearchableSelect';
import { getLatestUpdatedDate } from '@/hooks/useRelativeTime';

// ── Return constants ──────────────────────────────────────────────
const REASONS = [
  { value: 'cacat_produksi', label: 'Cacat Produksi', color: 'bg-red-100 text-red-700' },
  { value: 'salah_kirim', label: 'Salah Kirim', color: 'bg-orange-100 text-orange-700' },
  { value: 'kadaluarsa', label: 'Kadaluarsa', color: 'bg-yellow-100 text-yellow-700' },
  { value: 'permintaan_customer', label: 'Permintaan Customer', color: 'bg-blue-100 text-blue-700' },
  { value: 'lainnya', label: 'Lainnya', color: 'bg-gray-100 text-gray-700' },
];
const STATUS_CONFIG = {
  pending: { label: 'Pending', color: 'bg-gray-100 text-gray-600' },
  diterima: { label: 'Diterima', color: 'bg-blue-100 text-blue-700' },
  diproses: { label: 'Diproses', color: 'bg-yellow-100 text-yellow-700' },
  selesai: { label: 'Selesai', color: 'bg-green-100 text-green-700' },
  ditolak: { label: 'Ditolak', color: 'bg-red-100 text-red-700' },
};
const ACTION_CONFIG = {
  rework: { label: 'Rework', color: 'bg-purple-100 text-purple-700' },
  dispose: { label: 'Dispose', color: 'bg-red-100 text-red-700' },
  restock: { label: 'Restock', color: 'bg-green-100 text-green-700' },
  pending: { label: 'Belum Ditentukan', color: 'bg-gray-100 text-gray-600' },
};
const REASON_OPTIONS = REASONS.map(r => ({ value: r.value, label: r.label }));
const STATUS_OPTIONS = Object.entries(STATUS_CONFIG).map(([v, c]) => ({ value: v, label: c.label }));
const ACTION_OPTIONS = [
  { value: 'rework', label: 'Rework' },
  { value: 'dispose', label: 'Dispose' },
  { value: 'restock', label: 'Restock' },
  { value: 'pending', label: 'Belum Ditentukan' },
];

function ReturnDialog({ item, orders, onSave, trigger }) {
  const isEdit = !!item;
  const today = new Date().toISOString().split('T')[0];
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(
    item ? {
      return_number: item.return_number || '',
      brand_name: item.brand_name,
      product_name: item.product_name || '',
      return_date: item.return_date,
      qty_returned: item.qty_returned,
      reason: item.reason,
      return_status: item.return_status,
      action_taken: item.action_taken || 'pending',
      notes: item.notes || '',
    } : {
      return_number: '',
      brand_name: '',
      product_name: '',
      return_date: today,
      qty_returned: '',
      reason: 'cacat_produksi',
      return_status: 'pending',
      action_taken: 'pending',
      notes: '',
    }
  );

  const handleSubmit = async (e) => {
    e.preventDefault();
    await onSave({ ...form, qty_returned: Number(form.qty_returned) || 0 });
    setOpen(false);
  };

  const brandOptions = [...new Set(orders.map(o => o.brand_name).filter(Boolean))].map(b => ({ value: b, label: b }));

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display">{isEdit ? 'Edit Return' : 'Catat Return Baru'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div><Label>No. Return</Label><Input value={form.return_number} onChange={e => setForm(f => ({ ...f, return_number: e.target.value }))} placeholder="RTN-001" /></div>
            <div><Label>Tanggal</Label><Input type="date" value={form.return_date} onChange={e => setForm(f => ({ ...f, return_date: e.target.value }))} required /></div>
          </div>
          <div>
            <Label>Brand</Label>
            {brandOptions.length > 0 ? (
              <SearchableSelect value={form.brand_name} onValueChange={v => setForm(f => ({ ...f, brand_name: v }))} options={[...brandOptions, { value: '__other', label: 'Lainnya (ketik manual)' }]} placeholder="Pilih brand..." />
            ) : (
              <Input value={form.brand_name} onChange={e => setForm(f => ({ ...f, brand_name: e.target.value }))} required />
            )}
            {form.brand_name === '__other' && <Input className="mt-1" placeholder="Nama brand" onChange={e => setForm(f => ({ ...f, brand_name: e.target.value }))} />}
          </div>
          <div><Label>Nama Produk</Label><Input value={form.product_name} onChange={e => setForm(f => ({ ...f, product_name: e.target.value }))} placeholder="Opsional" /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Qty Return</Label><Input type="number" value={form.qty_returned} onChange={e => setForm(f => ({ ...f, qty_returned: e.target.value }))} required /></div>
            <div><Label>Alasan</Label><SearchableSelect value={form.reason} onValueChange={v => setForm(f => ({ ...f, reason: v }))} options={REASON_OPTIONS} /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Status</Label><SearchableSelect value={form.return_status} onValueChange={v => setForm(f => ({ ...f, return_status: v }))} options={STATUS_OPTIONS} /></div>
            <div><Label>Tindakan</Label><SearchableSelect value={form.action_taken} onValueChange={v => setForm(f => ({ ...f, action_taken: v }))} options={ACTION_OPTIONS} /></div>
          </div>
          <div><Label>Catatan</Label><Textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} /></div>
          <Button type="submit" className="w-full">{isEdit ? 'Simpan Perubahan' : 'Catat Return'}</Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default function Dashboard() {
  const { member } = useSession();
  const canManage = canManagePO(member);
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState('order_number');
  const [activeTab, setActiveTab] = useState('active');
  const [shippedSearch, setShippedSearch] = useState('');
  const [shippedSort, setShippedSort] = useState('shipped_at');
  const queryClient = useQueryClient();

  const { data: orders = [], isLoading } = useQuery({
    queryKey: ['production-orders'],
    queryFn: () => base44.entities.ProductionOrder.list('order_number'),
    staleTime: 0,
    refetchOnMount: 'always',
    refetchOnWindowFocus: true,
  });

  const { data: inventoryItems = [] } = useQuery({
    queryKey: ['inventory'],
    queryFn: () => base44.entities.InventoryItem.list('item_name'),
    staleTime: 0,
    refetchOnMount: 'always',
    refetchOnWindowFocus: true,
  });

  // ── Selesai (shipped) ──
  const { data: shippedOrders = [], isLoading: shippedLoading } = useQuery({
    queryKey: ['shipped-orders'],
    queryFn: () => base44.entities.ProductionOrder.filter({ is_shipped: true }),
  });

  const deleteMutationShipped = useMutation({
    mutationFn: (id) => base44.entities.ProductionOrder.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shipped-orders'] });
      queryClient.invalidateQueries({ queryKey: ['production-orders'] });
      toast.success('PO dihapus');
    },
  });

  const unshipMutation = useMutation({
    mutationFn: (id) => base44.entities.ProductionOrder.update(id, { is_shipped: false, shipped_at: null }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shipped-orders'] });
      queryClient.invalidateQueries({ queryKey: ['production-orders'] });
      toast.success('PO dikembalikan ke pengiriman');
    },
  });

  const filteredShipped = shippedOrders
    .filter(o => !shippedSearch || o.brand_name?.toLowerCase().includes(shippedSearch.toLowerCase()) || o.product_name?.toLowerCase().includes(shippedSearch.toLowerCase()))
    .sort((a, b) => {
      if (shippedSort === 'shipped_at') return new Date(b.shipped_at || '2000-01-01') - new Date(a.shipped_at || '2000-01-01');
      if (shippedSort === 'brand_name') return (a.brand_name || '').localeCompare(b.brand_name || '');
      return 0;
    });

  // ── Return ──
  const { data: returns = [], isLoading: returnsLoading } = useQuery({
    queryKey: ['returns'],
    queryFn: () => base44.entities.ReturnOrder.list('-return_date'),
  });

  const createReturnMutation = useMutation({
    mutationFn: (data) => base44.entities.ReturnOrder.create(data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['returns'] }); toast.success('Return dicatat'); },
  });

  const updateReturnMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.ReturnOrder.update(id, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['returns'] }); toast.success('Return diperbarui'); },
  });

  const deleteReturnMutation = useMutation({
    mutationFn: (id) => base44.entities.ReturnOrder.delete(id),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['returns'] }); toast.success('Return dihapus'); },
  });

  const returnStats = {
    total: returns.length,
    pending: returns.filter(r => r.return_status === 'pending').length,
    diproses: returns.filter(r => r.return_status === 'diproses').length,
    selesai: returns.filter(r => r.return_status === 'selesai').length,
    totalQty: returns.reduce((s, r) => s + (r.qty_returned || 0), 0),
  };

  // Buat stockMap dari inventori terbaru
  const stockMap = useMemo(() => {
    const map = {};
    inventoryItems.forEach(item => { map[item.id] = item.total_stock || 0; });
    return map;
  }, [inventoryItems]);

  // Inject status real-time ke setiap komponen PO berdasarkan stok inventori saat ini
  const ordersWithRealtimeStatus = useMemo(() => {
    if (inventoryItems.length === 0) return orders;
    return orders.map(order => {
      const purchaseStatuses = order.purchase_statuses || {};
      return {
        ...order,
        purchase_statuses: purchaseStatuses,
        components: (order.components || []).map(comp => {
          if (!comp.inventory_item_id) return comp;
          const realStock = stockMap[comp.inventory_item_id] ?? comp.stock_available ?? 0;
          const needed = comp.qty_needed || 0;
          const ps = purchaseStatuses[comp.inventory_item_id];
          const ARRIVED = ['sudah_datang', 'selesai'];
          let status = 'pending';
          // Jika item sudah ditandai sudah_datang atau selesai → anggap ready
          if (ARRIVED.includes(ps)) {
            status = 'ready';
          } else if (realStock <= 0) {
            status = 'need_buy';
          } else if (needed > 0 && realStock >= needed) {
            status = 'ready';
          } else if (needed > 0 && realStock < needed) {
            status = 'need_buy';
          }
          return { ...comp, stock_available: realStock, status };
        }),
      };
    });
  }, [orders, stockMap, inventoryItems]);

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.ProductionOrder.create(data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['production-orders'] }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.ProductionOrder.update(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['production-orders'] }),
  });

  // Tandai selesai kirim + kurangi stok inventori otomatis
  const handleMarkShipped = async (order) => {
    const components = order.components || [];
    const integratedComps = components.filter(c => c.inventory_item_id && (c.qty_needed || 0) > 0);
    for (const comp of integratedComps) {
      const invItem = inventoryItems.find(i => i.id === comp.inventory_item_id);
      if (invItem) {
        const newStock = Math.max(0, (invItem.total_stock || 0) - (comp.qty_needed || 0));
        await base44.entities.InventoryItem.update(comp.inventory_item_id, { total_stock: newStock });
      }
    }
    await base44.entities.ProductionOrder.update(order.id, {
      is_shipped: true,
      shipped_at: new Date().toISOString().split('T')[0],
    });
    queryClient.invalidateQueries({ queryKey: ['production-orders'] });
    queryClient.invalidateQueries({ queryKey: ['inventory'] });
    toast.success(`PO selesai dikirim! Stok ${integratedComps.length} item terkurangi otomatis.`);
  };

  const activeOrders = ordersWithRealtimeStatus.filter(o => o.status !== 'done' && !o.is_shipped);
  const doneOrders = ordersWithRealtimeStatus.filter(o => o.status === 'done' && !o.is_shipped);

  const applyFilter = (list) =>
    list
      .filter(o => !search || o.brand_name?.toLowerCase().includes(search.toLowerCase()) || o.product_name?.toLowerCase().includes(search.toLowerCase()))
      .sort((a, b) => {
        if (sortBy === 'order_number') return (a.order_number || 0) - (b.order_number || 0);
        if (sortBy === 'brand_name') return (a.brand_name || '').localeCompare(b.brand_name || '');
        if (sortBy === 'deadline') return new Date(a.deadline || '2099-12-31') - new Date(b.deadline || '2099-12-31');
        if (sortBy === 'progress') {
          const getP = (o) => {
            const comps = o.components || [];
            return comps.length > 0 ? comps.filter(c => c.status === 'ready').length / comps.length : 0;
          };
          return getP(b) - getP(a);
        }
        return 0;
      });

  const stats = {
    total: ordersWithRealtimeStatus.length,
    done: doneOrders.length,
    inProgress: ordersWithRealtimeStatus.filter(o => o.status === 'in_progress' || o.status === 'filling').length,
    pending: ordersWithRealtimeStatus.filter(o => o.status === 'pending').length,
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold tracking-tight">Active Production</h1>
          <p className="text-muted-foreground text-sm mt-1">
            {stats.total} project · {stats.done} selesai · {stats.inProgress} berjalan · {stats.pending} pending
          </p>

        </div>
        {canManage && (
          <AddOrderDialog
            onSave={(data) => createMutation.mutateAsync(data)}
            trigger={
              <Button className="gap-2">
                <Plus className="w-4 h-4" /> Tambah PO
              </Button>
            }
          />
        )}
      </div>

      {/* Stats pills */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Total PO', value: stats.total, color: 'bg-secondary' },
          { label: 'Berjalan', value: stats.inProgress, color: 'bg-yellow-50' },
          { label: 'Pending', value: stats.pending, color: 'bg-gray-50' },
          { label: 'Selesai', value: stats.done, color: 'bg-green-50' },
        ].map((s) => (
          <div key={s.label} className={`${s.color} rounded-xl px-4 py-3 border border-border/40`}>
            <div className="text-2xl font-bold">{s.value}</div>
            <div className="text-xs text-muted-foreground">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Cari brand..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={sortBy} onValueChange={setSortBy}>
          <SelectTrigger className="w-48">
            <ArrowUpDown className="w-4 h-4 mr-2" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="order_number">No. Urut</SelectItem>
            <SelectItem value="brand_name">Nama Brand (A-Z)</SelectItem>
            <SelectItem value="deadline">Deadline Terdekat</SelectItem>
            <SelectItem value="progress">Progress Tertinggi</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Tabs: Aktif, Pengiriman, Selesai, Return */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="flex-wrap h-auto gap-0.5">
          <TabsTrigger value="active" className="gap-2">
            <PackageCheck className="w-4 h-4" />
            Aktif ({activeOrders.length})
          </TabsTrigger>
          <TabsTrigger value="done" className="gap-2">
            <Truck className="w-4 h-4" />
            Pengiriman ({doneOrders.length})
          </TabsTrigger>

        </TabsList>

        {/* Aktif */}
        <TabsContent value="active" className="mt-4">
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {Array(6).fill(0).map((_, i) => <div key={i} className="h-40 rounded-xl bg-muted animate-pulse" />)}
            </div>
          ) : applyFilter(activeOrders).length === 0 ? (
            <div className="text-center py-20 text-muted-foreground">
              <p className="text-lg">Belum ada Production Order aktif</p>
              <p className="text-sm mt-1">Klik "Tambah PO" untuk memulai</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {applyFilter(activeOrders).map(order => (
                <BrandCard key={order.id} order={order} />
              ))}
            </div>
          )}
        </TabsContent>

        {/* Pengiriman */}
        <TabsContent value="done" className="mt-4">
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {Array(3).fill(0).map((_, i) => <div key={i} className="h-32 rounded-xl bg-muted animate-pulse" />)}
            </div>
          ) : applyFilter(doneOrders).length === 0 ? (
            <div className="text-center py-20 text-muted-foreground">
              <Truck className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>Belum ada PO yang siap kirim</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {applyFilter(doneOrders).map(order => (
                <ShippingCard
                  key={order.id}
                  order={order}
                  onUpdate={(data) => updateMutation.mutate({ id: order.id, data })}
                  onMarkShipped={() => handleMarkShipped(order)}
                />
              ))}
            </div>
          )}
        </TabsContent>

        {/* Selesai (Arsip) */}
        <TabsContent value="shipped" className="mt-4">
          <div className="flex flex-col sm:flex-row gap-3 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input placeholder="Cari brand atau produk..." value={shippedSearch} onChange={e => setShippedSearch(e.target.value)} className="pl-9" />
            </div>
            <Select value={shippedSort} onValueChange={setShippedSort}>
              <SelectTrigger className="w-44">
                <ArrowUpDown className="w-4 h-4 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="shipped_at">Tanggal Selesai</SelectItem>
                <SelectItem value="brand_name">Nama Brand (A-Z)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {shippedLoading ? (
            <div className="space-y-3">{Array(4).fill(0).map((_, i) => <div key={i} className="h-20 rounded-xl bg-muted animate-pulse" />)}</div>
          ) : filteredShipped.length === 0 ? (
            <div className="text-center py-20 text-muted-foreground">
              <CheckCircle2 className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>Belum ada PO yang selesai dikirim</p>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredShipped.map(order => (
                <Card key={order.id} className="border-green-200/40 bg-green-50/20 group hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center shrink-0">
                        <CheckCircle2 className="w-5 h-5 text-green-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-base truncate">{order.brand_name}</h3>
                        {order.product_name && <p className="text-xs text-muted-foreground truncate">{order.product_name}</p>}
                        <div className="flex items-center gap-3 mt-1 flex-wrap">
                          {order.shipped_at && <p className="text-xs font-medium text-green-700">{new Date(order.shipped_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' })}</p>}
                          {order.final_qty > 0 && <p className="text-xs text-muted-foreground flex items-center gap-1"><Package className="w-3 h-3" />{order.final_qty?.toLocaleString()} pcs</p>}
                          {order.courier && <p className="text-xs text-muted-foreground">{order.courier}{order.tracking_number ? ` · ${order.tracking_number}` : ''}</p>}
                          <LastUpdated date={order.updated_date || order.created_date} />
                        </div>
                      </div>
                      <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Link to={`/production/${order.id}`} title="Lihat detail PO">
                          <Button variant="ghost" size="icon" className="h-8 w-8"><ExternalLink className="w-4 h-4" /></Button>
                        </Link>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-yellow-600 hover:text-yellow-700" title="Kembalikan ke pengiriman"
                          onClick={() => { if (confirm('Kembalikan PO ini ke tab Pengiriman?')) unshipMutation.mutate(order.id); }}>
                          <Undo2 className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" title="Hapus PO"
                          onClick={() => { if (confirm(`Hapus PO "${order.brand_name}" secara permanen?`)) deleteMutationShipped.mutate(order.id); }}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Return */}
        <TabsContent value="return" className="mt-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 flex-1">
              <div className="bg-secondary rounded-xl px-4 py-3 border border-border/40">
                <div className="text-2xl font-bold">{returnStats.total}</div><div className="text-xs text-muted-foreground">Total Return</div>
              </div>
              <div className="bg-gray-50 rounded-xl px-4 py-3 border border-border/40">
                <div className="text-2xl font-bold">{returnStats.pending}</div><div className="text-xs text-muted-foreground">Pending</div>
              </div>
              <div className="bg-yellow-50 rounded-xl px-4 py-3 border border-yellow-200/50">
                <div className="text-2xl font-bold text-yellow-700">{returnStats.diproses}</div><div className="text-xs text-yellow-600">Diproses</div>
              </div>
              <div className="bg-green-50 rounded-xl px-4 py-3 border border-green-200/50">
                <div className="text-2xl font-bold text-green-700">{returnStats.selesai}</div><div className="text-xs text-green-600">Selesai</div>
              </div>
            </div>
            <ReturnDialog
              orders={orders}
              onSave={(data) => createReturnMutation.mutateAsync(data)}
              trigger={<Button className="gap-2 shrink-0"><Plus className="w-4 h-4" /> Catat Return</Button>}
            />
          </div>
          {returnsLoading ? (
            <div className="space-y-3">{Array(4).fill(0).map((_, i) => <div key={i} className="h-24 rounded-xl bg-muted animate-pulse" />)}</div>
          ) : returns.length === 0 ? (
            <div className="text-center py-20 text-muted-foreground">
              <RotateCcw className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>Belum ada data return</p>
            </div>
          ) : (
            <div className="space-y-3">
              {returns.map(ret => {
                const reason = REASONS.find(r => r.value === ret.reason);
                const status = STATUS_CONFIG[ret.return_status] || STATUS_CONFIG.pending;
                const action = ACTION_CONFIG[ret.action_taken] || ACTION_CONFIG.pending;
                return (
                  <Card key={ret.id} className="group hover:shadow-md transition-shadow">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap mb-1">
                            {ret.return_number && <span className="text-xs font-mono text-muted-foreground">{ret.return_number}</span>}
                            <h3 className="font-semibold">{ret.brand_name}</h3>
                            {ret.product_name && <span className="text-xs text-muted-foreground">· {ret.product_name}</span>}
                          </div>
                          <div className="flex items-center gap-2 flex-wrap mb-2">
                            <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full border ${status.color}`}>{status.label}</span>
                            {reason && <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${reason.color}`}>{reason.label}</span>}
                            <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${action.color}`}>{action.label}</span>
                          </div>
                          <div className="flex items-center gap-4 text-sm flex-wrap">
                            <span className="text-destructive font-medium">{(ret.qty_returned || 0).toLocaleString()} unit</span>
                            {ret.return_date && <span className="text-xs text-muted-foreground">{new Date(ret.return_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}</span>}

                          </div>
                          {ret.notes && <p className="text-xs text-muted-foreground mt-1 italic">{ret.notes}</p>}
                          <div className="mt-1.5"><LastUpdated date={ret.updated_date || ret.created_date} /></div>
                        </div>
                        <div className="flex flex-col gap-1.5 shrink-0">
                          {ret.return_status === 'pending' && <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => updateReturnMutation.mutate({ id: ret.id, data: { return_status: 'diterima' } })}>Terima</Button>}
                          {ret.return_status === 'diterima' && <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => updateReturnMutation.mutate({ id: ret.id, data: { return_status: 'diproses' } })}>Proses</Button>}
                          {ret.return_status === 'diproses' && <Button size="sm" variant="outline" className="h-7 text-xs text-green-700 border-green-300" onClick={() => updateReturnMutation.mutate({ id: ret.id, data: { return_status: 'selesai' } })}>Selesai</Button>}
                          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <ReturnDialog item={ret} orders={orders} onSave={(data) => updateReturnMutation.mutateAsync({ id: ret.id, data })} trigger={<Button variant="ghost" size="icon" className="h-7 w-7"><Pencil className="w-3 h-3" /></Button>} />
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => { if (confirm('Hapus data return ini?')) deleteReturnMutation.mutate(ret.id); }}><Trash2 className="w-3 h-3" /></Button>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}