import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Pencil, Trash2, ClipboardList, ChevronLeft, ChevronRight, FileDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { toast } from 'sonner';
import SearchableSelect from '@/components/ui/SearchableSelect';
import LastUpdated from '@/components/ui/LastUpdated';
import { getLatestUpdatedDate } from '@/hooks/useRelativeTime';
import { exportToPDF } from '@/utils/exportPDF';

const ACTIVITIES = [
  { value: 'filling', label: 'Filling', color: 'bg-blue-100 text-blue-700' },
  { value: 'sablon', label: 'Sablon', color: 'bg-purple-100 text-purple-700' },
  { value: 'perakitan', label: 'Perakitan', color: 'bg-yellow-100 text-yellow-700' },
  { value: 'packing', label: 'Packing', color: 'bg-green-100 text-green-700' },
  { value: 'labeling', label: 'Labeling', color: 'bg-orange-100 text-orange-700' },
  { value: 'sealing', label: 'Sealing', color: 'bg-pink-100 text-pink-700' },
  { value: 'quality_check', label: 'Quality Check', color: 'bg-indigo-100 text-indigo-700' },
  { value: 'lainnya', label: 'Lainnya', color: 'bg-gray-100 text-gray-700' },
];

const ACTIVITY_OPTIONS = ACTIVITIES.map(a => ({ value: a.value, label: a.label }));
const SHIFT_OPTIONS = [
  { value: 'pagi', label: 'Pagi' },
  { value: 'siang', label: 'Siang' },
  { value: 'malam', label: 'Malam' },
];

function ActivityBadge({ activity }) {
  const a = ACTIVITIES.find(x => x.value === activity) || ACTIVITIES[ACTIVITIES.length - 1];
  return <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${a.color}`}>{a.label}</span>;
}

function EntryDialog({ entry, orders, onSave, trigger }) {
  const isEdit = !!entry;
  const today = new Date().toISOString().split('T')[0];
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(
    entry
      ? { date: entry.date, brand_name: entry.brand_name, activity: entry.activity, qty_produced: entry.qty_produced, operator: entry.operator || '', shift: entry.shift || 'pagi', notes: entry.notes || '', waste_qty: entry.waste_qty || 0 }
      : { date: today, brand_name: '', activity: 'filling', qty_produced: '', operator: '', shift: 'pagi', notes: '', waste_qty: 0 }
  );

  const handleSubmit = async (e) => {
    e.preventDefault();
    await onSave({ ...form, qty_produced: Number(form.qty_produced) || 0, waste_qty: Number(form.waste_qty) || 0 });
    setOpen(false);
  };

  const brandOptions = [...new Set(orders.map(o => o.brand_name).filter(Boolean))].map(b => ({ value: b, label: b }));

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="font-display">{isEdit ? 'Edit Log Produksi' : 'Input Produksi Harian'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Tanggal</Label>
              <Input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} required />
            </div>
            <div>
              <Label>Shift</Label>
              <SearchableSelect value={form.shift} onValueChange={v => setForm(f => ({ ...f, shift: v }))} options={SHIFT_OPTIONS} />
            </div>
          </div>
          <div>
            <Label>Brand</Label>
            {brandOptions.length > 0 ? (
              <SearchableSelect
                value={form.brand_name}
                onValueChange={v => setForm(f => ({ ...f, brand_name: v }))}
                options={brandOptions}
                placeholder="Pilih brand..."
              />
            ) : (
              <Input value={form.brand_name} onChange={e => setForm(f => ({ ...f, brand_name: e.target.value }))} placeholder="Nama brand" required />
            )}
          </div>
          <div>
            <Label>Aktivitas</Label>
            <SearchableSelect value={form.activity} onValueChange={v => setForm(f => ({ ...f, activity: v }))} options={ACTIVITY_OPTIONS} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Qty Produksi</Label>
              <Input type="number" value={form.qty_produced} onChange={e => setForm(f => ({ ...f, qty_produced: e.target.value }))} required />
            </div>
            <div>
              <Label>Qty Waste</Label>
              <Input type="number" value={form.waste_qty} onChange={e => setForm(f => ({ ...f, waste_qty: e.target.value }))} />
            </div>
          </div>
          <div>
            <Label>Operator</Label>
            <Input value={form.operator} onChange={e => setForm(f => ({ ...f, operator: e.target.value }))} placeholder="Nama operator" />
          </div>
          <div>
            <Label>Catatan / Kendala</Label>
            <Textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Kendala, info tambahan..." />
          </div>
          <Button type="submit" className="w-full">{isEdit ? 'Simpan Perubahan' : 'Catat Produksi'}</Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default function DailyProduction() {
  const today = new Date().toISOString().split('T')[0];
  const [selectedDate, setSelectedDate] = useState(today);
  const queryClient = useQueryClient();

  const { data: logs = [], isLoading } = useQuery({
    queryKey: ['daily-production'],
    queryFn: () => base44.entities.DailyProduction.list('-date'),
  });

  const { data: orders = [] } = useQuery({
    queryKey: ['production-orders'],
    queryFn: () => base44.entities.ProductionOrder.list('order_number'),
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.DailyProduction.create(data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['daily-production'] }); toast.success('Log dicatat'); },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.DailyProduction.update(id, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['daily-production'] }); toast.success('Log diperbarui'); },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.DailyProduction.delete(id),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['daily-production'] }); toast.success('Log dihapus'); },
  });

  const shiftDate = (days) => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + days);
    setSelectedDate(d.toISOString().split('T')[0]);
  };

  const logsForDate = logs.filter(l => l.date === selectedDate);
  const totalQty = logsForDate.reduce((s, l) => s + (l.qty_produced || 0), 0);
  const totalWaste = logsForDate.reduce((s, l) => s + (l.waste_qty || 0), 0);

  const handleExportHarian = () => {
    exportToPDF({
      title: 'Catatan Produksi Harian',
      subtitle: `Tanggal: ${selectedDate} — Total: ${totalQty.toLocaleString()} pcs diproduksi, ${totalWaste.toLocaleString()} pcs waste`,
      filename: `Produksi-Harian-${selectedDate}`,
      columns: [
        { key: 'brand_name', label: 'Brand' },
        { key: 'activity', label: 'Aktivitas', render: r => (ACTIVITIES.find(a => a.value === r.activity) || ACTIVITIES[ACTIVITIES.length - 1]).label },
        { key: 'shift', label: 'Shift', render: r => (r.shift || '').charAt(0).toUpperCase() + (r.shift || '').slice(1) },
        { key: 'qty_produced', label: 'Qty Produksi', render: r => `${(r.qty_produced || 0).toLocaleString()} pcs` },
        { key: 'waste_qty', label: 'Waste', render: r => r.waste_qty > 0 ? `${r.waste_qty} pcs` : '-' },
        { key: 'operator', label: 'Operator', render: r => r.operator || '-' },
        { key: 'notes', label: 'Catatan', render: r => r.notes || '-' },
      ],
      rows: logsForDate,
    });
  };

  const handleExportSemua = () => {
    exportToPDF({
      title: 'Semua Catatan Produksi Harian',
      subtitle: `Total ${logs.length} log produksi`,
      filename: 'Produksi-Harian-Semua',
      columns: [
        { key: 'date', label: 'Tanggal' },
        { key: 'brand_name', label: 'Brand' },
        { key: 'activity', label: 'Aktivitas', render: r => (ACTIVITIES.find(a => a.value === r.activity) || ACTIVITIES[ACTIVITIES.length - 1]).label },
        { key: 'shift', label: 'Shift' },
        { key: 'qty_produced', label: 'Qty', render: r => `${(r.qty_produced || 0).toLocaleString()} pcs` },
        { key: 'waste_qty', label: 'Waste', render: r => r.waste_qty > 0 ? `${r.waste_qty} pcs` : '-' },
        { key: 'operator', label: 'Operator', render: r => r.operator || '-' },
        { key: 'notes', label: 'Catatan', render: r => r.notes || '-' },
      ],
      rows: logs,
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold tracking-tight">Produksi Harian</h1>
          <p className="text-muted-foreground text-sm mt-1">Log aktivitas produksi per hari</p>

        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleExportSemua} className="gap-2">
            <FileDown className="w-4 h-4" /> Export Semua
          </Button>
          <EntryDialog
            orders={orders}
            onSave={(data) => createMutation.mutateAsync(data)}
            trigger={<Button className="gap-2"><Plus className="w-4 h-4" /> Input Produksi</Button>}
          />
        </div>
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        <Button variant="outline" size="icon" onClick={() => shiftDate(-1)}><ChevronLeft className="w-4 h-4" /></Button>
        <Input type="date" value={selectedDate} onChange={e => setSelectedDate(e.target.value)} className="w-44" />
        <Button variant="outline" size="icon" onClick={() => shiftDate(1)}><ChevronRight className="w-4 h-4" /></Button>
        {selectedDate !== today && (
          <Button variant="ghost" size="sm" className="text-xs text-muted-foreground" onClick={() => setSelectedDate(today)}>Hari Ini</Button>
        )}
        {logsForDate.length > 0 && (
          <Button variant="outline" size="sm" onClick={handleExportHarian} className="gap-1.5 ml-auto">
            <FileDown className="w-3.5 h-3.5" /> Export Hari Ini
          </Button>
        )}
      </div>

      {logsForDate.length > 0 && (
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-blue-50 rounded-xl px-4 py-3 border border-blue-200/50">
            <div className="text-xl font-bold text-blue-700">{logsForDate.length}</div>
            <div className="text-[11px] text-blue-600">Aktivitas</div>
          </div>
          <div className="bg-green-50 rounded-xl px-4 py-3 border border-green-200/50">
            <div className="text-xl font-bold text-green-700">{totalQty.toLocaleString()}</div>
            <div className="text-[11px] text-green-600">Total Produksi</div>
          </div>
          <div className={`rounded-xl px-4 py-3 border ${totalWaste > 0 ? 'bg-red-50 border-red-200/50' : 'bg-muted/50 border-border'}`}>
            <div className={`text-xl font-bold ${totalWaste > 0 ? 'text-destructive' : 'text-muted-foreground'}`}>{totalWaste.toLocaleString()}</div>
            <div className="text-[11px] text-muted-foreground">Total Waste</div>
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="space-y-3">{Array(3).fill(0).map((_, i) => <div key={i} className="h-20 rounded-xl bg-muted animate-pulse" />)}</div>
      ) : logsForDate.length === 0 ? (
        <div className="text-center py-20 text-muted-foreground">
          <ClipboardList className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p>Belum ada log untuk tanggal ini</p>
          <p className="text-sm mt-1">Klik "Input Produksi" untuk mencatat</p>
        </div>
      ) : (
        <div className="space-y-3">
          {logsForDate.map(log => (
            <Card key={log.id} className="group hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <h3 className="font-semibold">{log.brand_name}</h3>
                      <ActivityBadge activity={log.activity} />
                      <span className="text-[10px] bg-secondary px-2 py-0.5 rounded-full capitalize text-muted-foreground">{log.shift}</span>
                    </div>
                    <div className="flex items-center gap-4 text-sm">
                      <span className="text-green-700 font-medium">+{(log.qty_produced || 0).toLocaleString()} pcs</span>
                      {(log.waste_qty || 0) > 0 && (
                        <span className="text-destructive text-xs">waste: {log.waste_qty} pcs</span>
                      )}
                      {log.operator && <span className="text-xs text-muted-foreground">oleh {log.operator}</span>}
                    </div>
                    {log.notes && <p className="text-xs text-muted-foreground mt-1 italic">{log.notes}</p>}
                    <div className="mt-1">
                      <LastUpdated date={log.updated_date || log.created_date} />
                    </div>
                  </div>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                    <EntryDialog
                      entry={log}
                      orders={orders}
                      onSave={(data) => updateMutation.mutateAsync({ id: log.id, data })}
                      trigger={
                        <Button variant="ghost" size="icon" className="h-7 w-7"><Pencil className="w-3 h-3" /></Button>
                      }
                    />
                    <Button
                      variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive"
                      onClick={() => { if (confirm('Hapus log ini?')) deleteMutation.mutate(log.id); }}
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}