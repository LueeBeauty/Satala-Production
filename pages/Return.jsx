import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Pencil, Trash2, RotateCcw, FileDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { toast } from 'sonner';
import SearchableSelect from '@/components/ui/SearchableSelect';
import PicSelector from '@/components/shared/PicSelector';
import LastUpdated from '@/components/ui/LastUpdated';
import { getLatestUpdatedDate } from '@/hooks/useRelativeTime';
import { exportToPDF } from '@/utils/exportPDF';
import { useSession } from '@/lib/SessionContext';
import { canManageReturn } from '@/lib/AuthSession';

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
      pic: item.pic || '',
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
      pic: '',
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
            <div>
              <Label>No. Return</Label>
              <Input value={form.return_number} onChange={e => setForm(f => ({ ...f, return_number: e.target.value }))} placeholder="RTN-001" />
            </div>
            <div>
              <Label>Tanggal</Label>
              <Input type="date" value={form.return_date} onChange={e => setForm(f => ({ ...f, return_date: e.target.value }))} required />
            </div>
          </div>
          <div>
            <Label>Brand</Label>
            {brandOptions.length > 0 ? (
              <SearchableSelect
                value={form.brand_name}
                onValueChange={v => setForm(f => ({ ...f, brand_name: v }))}
                options={[...brandOptions, { value: '__other', label: 'Lainnya (ketik manual)' }]}
                placeholder="Pilih brand..."
              />
            ) : (
              <Input value={form.brand_name} onChange={e => setForm(f => ({ ...f, brand_name: e.target.value }))} required />
            )}
            {form.brand_name === '__other' && (
              <Input className="mt-1" placeholder="Nama brand" onChange={e => setForm(f => ({ ...f, brand_name: e.target.value }))} />
            )}
          </div>
          <div>
            <Label>Nama Produk</Label>
            <Input value={form.product_name} onChange={e => setForm(f => ({ ...f, product_name: e.target.value }))} placeholder="Opsional" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Qty Return</Label>
              <Input type="number" value={form.qty_returned} onChange={e => setForm(f => ({ ...f, qty_returned: e.target.value }))} required />
            </div>
            <div>
              <Label>Alasan</Label>
              <SearchableSelect value={form.reason} onValueChange={v => setForm(f => ({ ...f, reason: v }))} options={REASON_OPTIONS} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Status</Label>
              <SearchableSelect value={form.return_status} onValueChange={v => setForm(f => ({ ...f, return_status: v }))} options={STATUS_OPTIONS} />
            </div>
            <div>
              <Label>Tindakan</Label>
              <SearchableSelect value={form.action_taken} onValueChange={v => setForm(f => ({ ...f, action_taken: v }))} options={ACTION_OPTIONS} />
            </div>
          </div>
          <div>
            <PicSelector
              value={form.pic}
              onChange={v => setForm(f => ({ ...f, pic: v }))}
              label="PIC Penanggung Jawab"
            />
          </div>
          <div>
            <Label>Catatan</Label>
            <Textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
          </div>
          <Button type="submit" className="w-full">{isEdit ? 'Simpan Perubahan' : 'Catat Return'}</Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default function ReturnPage() {
  const queryClient = useQueryClient();
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const { member } = useSession();
  const canEdit = canManageReturn(member);

  const { data: returns = [], isLoading } = useQuery({
    queryKey: ['returns'],
    queryFn: () => base44.entities.ReturnOrder.list('-return_date'),
  });

  const { data: orders = [] } = useQuery({
    queryKey: ['production-orders'],
    queryFn: () => base44.entities.ProductionOrder.list('order_number'),
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.ReturnOrder.create(data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['returns'] }); toast.success('Return dicatat'); },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.ReturnOrder.update(id, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['returns'] }); toast.success('Return diperbarui'); },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.ReturnOrder.delete(id),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['returns'] }); toast.success('Return dihapus'); },
  });

  const filteredReturns = returns.filter(r => {
    const matchFrom = !dateFrom || (r.return_date && r.return_date >= dateFrom);
    const matchTo = !dateTo || (r.return_date && r.return_date <= dateTo);
    return matchFrom && matchTo;
  });

  const handleExport = () => {
    const subtitle = (dateFrom || dateTo)
      ? `Periode: ${dateFrom || '...'} s/d ${dateTo || '...'} · ${filteredReturns.length} data`
      : `Total ${filteredReturns.length} data return`;
    exportToPDF({
      title: 'Laporan Return',
      subtitle,
      filename: 'Laporan-Return',
      columns: [
        { key: 'return_number', label: 'No. Return', render: r => r.return_number || '-' },
        { key: 'return_date', label: 'Tanggal', render: r => r.return_date ? new Date(r.return_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : '-' },
        { key: 'brand_name', label: 'Brand' },
        { key: 'product_name', label: 'Produk', render: r => r.product_name || '-' },
        { key: 'qty_returned', label: 'Qty', render: r => `${r.qty_returned || 0} unit` },
        { key: 'reason', label: 'Alasan', render: r => REASONS.find(rs => rs.value === r.reason)?.label || r.reason || '-' },
        { key: 'return_status', label: 'Status', render: r => STATUS_CONFIG[r.return_status]?.label || r.return_status || '-' },
        { key: 'action_taken', label: 'Tindakan', render: r => ACTION_CONFIG[r.action_taken]?.label || r.action_taken || '-' },
        { key: 'pic', label: 'PIC', render: r => r.pic || '-' },
        { key: 'received_by', label: 'Diterima Oleh', render: r => r.received_by || '-' },
        { key: 'notes', label: 'Catatan', render: r => r.notes || '-' },
      ],
      rows: filteredReturns,
    });
  };

  const stats = {
    total: filteredReturns.length,
    pending: filteredReturns.filter(r => r.return_status === 'pending').length,
    diproses: filteredReturns.filter(r => r.return_status === 'diproses').length,
    selesai: filteredReturns.filter(r => r.return_status === 'selesai').length,
    totalQty: filteredReturns.reduce((s, r) => s + (r.qty_returned || 0), 0),
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold tracking-tight">Return</h1>
          <p className="text-muted-foreground text-sm mt-1">
            {stats.total} return · {stats.totalQty.toLocaleString()} unit · {stats.pending} pending
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" className="gap-2" onClick={handleExport}>
            <FileDown className="w-4 h-4" /> Export PDF
          </Button>
          {canEdit && (
            <ReturnDialog
              orders={orders}
              onSave={(data) => createMutation.mutateAsync(data)}
              trigger={<Button className="gap-2"><Plus className="w-4 h-4" /> Catat Return</Button>}
            />
          )}
        </div>
      </div>

      {/* Filter Tanggal */}
      <div className="flex flex-wrap gap-2 items-center">
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-muted-foreground whitespace-nowrap">Dari:</span>
          <Input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="w-36 h-9" />
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-muted-foreground whitespace-nowrap">S/d:</span>
          <Input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="w-36 h-9" />
        </div>
        {(dateFrom || dateTo) && (
          <button className="text-xs text-muted-foreground hover:text-foreground h-9 px-2" onClick={() => { setDateFrom(''); setDateTo(''); }}>Reset</button>
        )}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-secondary rounded-xl px-4 py-3 border border-border/40">
          <div className="text-2xl font-bold">{stats.total}</div><div className="text-xs text-muted-foreground">Total Return</div>
        </div>
        <div className="bg-gray-50 rounded-xl px-4 py-3 border border-border/40">
          <div className="text-2xl font-bold">{stats.pending}</div><div className="text-xs text-muted-foreground">Pending</div>
        </div>
        <div className="bg-yellow-50 rounded-xl px-4 py-3 border border-yellow-200/50">
          <div className="text-2xl font-bold text-yellow-700">{stats.diproses}</div><div className="text-xs text-yellow-600">Diproses</div>
        </div>
        <div className="bg-green-50 rounded-xl px-4 py-3 border border-green-200/50">
          <div className="text-2xl font-bold text-green-700">{stats.selesai}</div><div className="text-xs text-green-600">Selesai</div>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-3">{Array(4).fill(0).map((_, i) => <div key={i} className="h-24 rounded-xl bg-muted animate-pulse" />)}</div>
      ) : filteredReturns.length === 0 ? (
        <div className="text-center py-20 text-muted-foreground">
          <RotateCcw className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p>Belum ada data return</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredReturns.map(ret => {
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
                        {ret.pic && <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full font-medium">👤 {ret.pic}</span>}
                      </div>
                      {ret.notes && <p className="text-xs text-muted-foreground mt-1 italic">{ret.notes}</p>}
                      <div className="mt-1.5">
                        <LastUpdated date={ret.updated_date || ret.created_date} />
                      </div>
                    </div>
                    {canEdit && (
                      <div className="flex flex-col gap-1.5 shrink-0">
                        {ret.return_status === 'pending' && (
                          <Button size="sm" variant="outline" className="h-7 text-xs"
                            onClick={() => updateMutation.mutate({ id: ret.id, data: { return_status: 'diterima' } })}>
                            Terima
                          </Button>
                        )}
                        {ret.return_status === 'diterima' && (
                          <Button size="sm" variant="outline" className="h-7 text-xs"
                            onClick={() => updateMutation.mutate({ id: ret.id, data: { return_status: 'diproses' } })}>
                            Proses
                          </Button>
                        )}
                        {ret.return_status === 'diproses' && (
                          <Button size="sm" variant="outline" className="h-7 text-xs text-green-700 border-green-300"
                            onClick={() => updateMutation.mutate({ id: ret.id, data: { return_status: 'selesai' } })}>
                            Selesai
                          </Button>
                        )}
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <ReturnDialog
                            item={ret}
                            orders={orders}
                            onSave={(data) => updateMutation.mutateAsync({ id: ret.id, data })}
                            trigger={<Button variant="ghost" size="icon" className="h-7 w-7"><Pencil className="w-3 h-3" /></Button>}
                          />
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive"
                            onClick={() => { if (confirm('Hapus data return ini?')) deleteMutation.mutate(ret.id); }}>
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                    )}
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