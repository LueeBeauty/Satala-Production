import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Edit2, Trash2, Search, ClipboardList, Sun, Sunset, Moon, CheckCircle2, AlertTriangle, MinusCircle, FileDown } from 'lucide-react';
import { exportToPDF } from '@/utils/exportPDF';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';
import { useSession } from '@/lib/SessionContext';
import { canEditLaporan } from '@/lib/AuthSession';

const SHIFT_CONFIG = {
  Pagi: { icon: Sun, cls: 'bg-amber-100 text-amber-700', label: 'Pagi' },
  Siang: { icon: Sunset, cls: 'bg-orange-100 text-orange-700', label: 'Siang' },
  Malam: { icon: Moon, cls: 'bg-indigo-100 text-indigo-700', label: 'Malam' },
};
const AKTIVITAS_OPTIONS = ['Filling', 'QC', 'Packing', 'Mixing', 'Labeling', 'Pengiriman', 'Lainnya'];
const STATUS_CONFIG = {
  selesai: { label: 'Selesai', cls: 'bg-green-100 text-green-700', icon: CheckCircle2 },
  sebagian: { label: 'Sebagian', cls: 'bg-amber-100 text-amber-700', icon: AlertTriangle },
  tidak_selesai: { label: 'Tidak Selesai', cls: 'bg-red-100 text-red-700', icon: MinusCircle },
};

const emptyForm = {
  tanggal: new Date().toISOString().split('T')[0],
  shift: 'Pagi',
  aktivitas: 'Filling',
  operator: '',
  jumlah_output: '',
  satuan_output: 'pcs',
  nama_produk: '',
  catatan: '',
  kendala: '',
  status: 'selesai',
};

export default function CatatanHarianPage() {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [filterShift, setFilterShift] = useState('Semua');
  const [filterAktivitas, setFilterAktivitas] = useState('Semua');
  const [search, setSearch] = useState('');
  const [filterDate, setFilterDate] = useState('');

  const { member } = useSession();
  const canEdit = canEditLaporan(member);

  const { data: catatan = [], isLoading } = useQuery({
    queryKey: ['catatan-harian'],
    queryFn: () => base44.entities.CatatanHarian.list('-tanggal'),
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.CatatanHarian.create(data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['catatan-harian'] }); setShowForm(false); setForm(emptyForm); setEditItem(null); },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.CatatanHarian.update(id, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['catatan-harian'] }); setShowForm(false); setForm(emptyForm); setEditItem(null); },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.CatatanHarian.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['catatan-harian'] }),
  });

  const handleEdit = (item) => {
    setEditItem(item);
    setForm({
      tanggal: item.tanggal || new Date().toISOString().split('T')[0],
      shift: item.shift || 'Pagi',
      aktivitas: item.aktivitas || 'Filling',
      operator: item.operator || '',
      jumlah_output: item.jumlah_output || '',
      satuan_output: item.satuan_output || 'pcs',
      nama_produk: item.nama_produk || '',
      catatan: item.catatan || '',
      kendala: item.kendala || '',
      status: item.status || 'selesai',
    });
    setShowForm(true);
  };

  const handleSave = () => {
    const data = { ...form, jumlah_output: form.jumlah_output ? Number(form.jumlah_output) : undefined };
    if (!data.jumlah_output) delete data.jumlah_output;
    if (editItem) updateMutation.mutate({ id: editItem.id, data });
    else createMutation.mutate(data);
  };

  const filtered = catatan
    .filter(c => filterShift === 'Semua' || c.shift === filterShift)
    .filter(c => filterAktivitas === 'Semua' || c.aktivitas === filterAktivitas)
    .filter(c => !filterDate || c.tanggal === filterDate)
    .filter(c => !search || c.nama_produk?.toLowerCase().includes(search.toLowerCase()) || c.operator?.toLowerCase().includes(search.toLowerCase()) || c.catatan?.toLowerCase().includes(search.toLowerCase()));

  // Group by tanggal
  const grouped = filtered.reduce((acc, item) => {
    const key = item.tanggal || 'Tanggal tidak diketahui';
    if (!acc[key]) acc[key] = [];
    acc[key].push(item);
    return acc;
  }, {});
  const groupedKeys = Object.keys(grouped).sort((a, b) => b.localeCompare(a));

  const totalOutput = filtered.reduce((s, c) => s + (c.jumlah_output || 0), 0);

  const handleExport = () => {
    exportToPDF({
      title: 'Laporan Catatan Harian',
      subtitle: filterDate ? `Tanggal: ${filterDate}` : `Total ${filtered.length} catatan`,
      filename: 'Catatan-Harian',
      columns: [
        { key: 'tanggal', label: 'Tanggal' },
        { key: 'shift', label: 'Shift' },
        { key: 'aktivitas', label: 'Aktivitas' },
        { key: 'nama_produk', label: 'Produk', render: r => r.nama_produk || '-' },
        { key: 'operator', label: 'Operator', render: r => r.operator || '-' },
        { key: 'jumlah_output', label: 'Output', render: r => r.jumlah_output ? `${r.jumlah_output} ${r.satuan_output || ''}` : '-' },
        { key: 'status', label: 'Status', render: r => r.status === 'selesai' ? 'Selesai' : r.status === 'sebagian' ? 'Sebagian' : 'Tidak Selesai' },
        { key: 'catatan', label: 'Catatan', render: r => r.catatan || '-' },
        { key: 'kendala', label: 'Kendala', render: r => r.kendala || '-' },
      ],
      rows: filtered,
    });
  };

  return (
    <div className="space-y-5">
      {/* Header stats */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Total Catatan', value: catatan.length, sub: 'semua waktu' },
          { label: 'Hari Ini', value: catatan.filter(c => c.tanggal === new Date().toISOString().split('T')[0]).length, sub: 'catatan hari ini' },
          { label: 'Output', value: totalOutput.toLocaleString(), sub: `${filtered.length} catatan` },
        ].map(s => (
          <Card key={s.label}>
            <CardContent className="p-3">
              <p className="text-2xl font-bold">{s.value}</p>
              <p className="text-xs font-medium">{s.label}</p>
              <p className="text-xs text-muted-foreground">{s.sub}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filter bar */}
      <div className="flex flex-wrap gap-2 items-center">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <Input placeholder="Cari produk, operator..." className="pl-8 h-8 w-44" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <Input type="date" value={filterDate} onChange={e => setFilterDate(e.target.value)} className="h-8 w-40" />
        <Select value={filterShift} onValueChange={setFilterShift}>
          <SelectTrigger className="h-8 w-28"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="Semua">Semua Shift</SelectItem>
            {['Pagi', 'Siang', 'Malam'].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterAktivitas} onValueChange={setFilterAktivitas}>
          <SelectTrigger className="h-8 w-32"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="Semua">Semua Aktivitas</SelectItem>
            {AKTIVITAS_OPTIONS.map(a => <SelectItem key={a} value={a}>{a}</SelectItem>)}
          </SelectContent>
        </Select>
        <div className="ml-auto flex gap-2">
          <Button size="sm" variant="outline" onClick={handleExport} className="gap-1.5">
            <FileDown className="w-3.5 h-3.5" /> Export PDF
          </Button>
          {canEdit && (
            <Button size="sm" onClick={() => { setEditItem(null); setForm(emptyForm); setShowForm(true); }} className="gap-1.5">
              <Plus className="w-3.5 h-3.5" /> Tambah Catatan
            </Button>
          )}
        </div>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="text-center py-10 text-muted-foreground text-sm">Memuat...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <ClipboardList className="w-10 h-10 mx-auto mb-3 opacity-20" />
          <p>Belum ada catatan harian.</p>
        </div>
      ) : (
        <div className="space-y-5">
          {groupedKeys.map(dateKey => {
            let dateLabel = dateKey;
            try { dateLabel = format(new Date(dateKey), 'EEEE, dd MMMM yyyy', { locale: id }); } catch {}
            return (
              <div key={dateKey}>
                <div className="flex items-center gap-3 mb-3">
                  <p className="text-sm font-semibold text-muted-foreground">{dateLabel}</p>
                  <div className="flex-1 h-px bg-border" />
                  <span className="text-xs text-muted-foreground">{grouped[dateKey].length} catatan</span>
                </div>
                <div className="grid gap-2">
                  {grouped[dateKey].map(item => {
                    const shiftCfg = SHIFT_CONFIG[item.shift] || SHIFT_CONFIG.Pagi;
                    const statusCfg = STATUS_CONFIG[item.status] || STATUS_CONFIG.selesai;
                    const StatusIcon = statusCfg.icon;
                    const ShiftIcon = shiftCfg.icon;
                    return (
                      <Card key={item.id}>
                        <CardContent className="p-4">
                          <div className="flex items-start gap-3">
                            <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${shiftCfg.cls}`}>
                              <ShiftIcon className="w-4 h-4" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-semibold text-sm">{item.aktivitas}</span>
                                {item.nama_produk && <span className="text-sm text-muted-foreground">— {item.nama_produk}</span>}
                                <Badge className={`text-[11px] ${shiftCfg.cls}`}>{shiftCfg.label}</Badge>
                                <span className={`inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full font-medium ${statusCfg.cls}`}>
                                  <StatusIcon className="w-3 h-3" /> {statusCfg.label}
                                </span>
                              </div>
                              <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground flex-wrap">
                                {item.operator && <span>{item.operator}</span>}
                                {item.jumlah_output && <span className="font-semibold text-foreground">{item.jumlah_output} {item.satuan_output}</span>}
                              </div>
                              {item.catatan && <p className="text-xs text-muted-foreground mt-1">{item.catatan}</p>}
                              {item.kendala && <p className="text-xs text-red-500 mt-1">Kendala: {item.kendala}</p>}
                            </div>
                            <div className="flex gap-1 shrink-0">
                              {canEdit && (
                                <>
                                  <Button variant="ghost" size="icon" className="w-8 h-8" onClick={() => handleEdit(item)}><Edit2 className="w-3.5 h-3.5" /></Button>
                                  <Button variant="ghost" size="icon" className="w-8 h-8 text-destructive/60 hover:text-destructive" onClick={() => { if (confirm('Hapus catatan ini?')) deleteMutation.mutate(item.id); }}><Trash2 className="w-3.5 h-3.5" /></Button>
                                </>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Form Dialog */}
      <Dialog open={showForm} onOpenChange={(o) => { if (!o) { setShowForm(false); setEditItem(null); setForm(emptyForm); } }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editItem ? 'Edit' : 'Tambah'} Catatan Harian</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1 col-span-1">
                <Label className="text-xs">Tanggal *</Label>
                <Input type="date" value={form.tanggal} onChange={e => setForm(f => ({ ...f, tanggal: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Shift *</Label>
                <Select value={form.shift} onValueChange={v => setForm(f => ({ ...f, shift: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {['Pagi', 'Siang', 'Malam'].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Aktivitas *</Label>
                <Select value={form.aktivitas} onValueChange={v => setForm(f => ({ ...f, aktivitas: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {AKTIVITAS_OPTIONS.map(a => <SelectItem key={a} value={a}>{a}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Nama Produk</Label>
                <Input value={form.nama_produk} onChange={e => setForm(f => ({ ...f, nama_produk: e.target.value }))} placeholder="Produk yang dikerjakan..." />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Operator / Petugas</Label>
                <Input value={form.operator} onChange={e => setForm(f => ({ ...f, operator: e.target.value }))} placeholder="Nama operator..." />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1 col-span-2">
                <Label className="text-xs">Jumlah Output</Label>
                <Input type="number" min="0" value={form.jumlah_output} onChange={e => setForm(f => ({ ...f, jumlah_output: e.target.value }))} placeholder="0" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Satuan</Label>
                <Input value={form.satuan_output} onChange={e => setForm(f => ({ ...f, satuan_output: e.target.value }))} placeholder="pcs, botol..." />
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Status</Label>
              <Select value={form.status} onValueChange={v => setForm(f => ({ ...f, status: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="selesai">Selesai</SelectItem>
                  <SelectItem value="sebagian">Sebagian</SelectItem>
                  <SelectItem value="tidak_selesai">Tidak Selesai</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Catatan Kegiatan</Label>
              <Textarea value={form.catatan} onChange={e => setForm(f => ({ ...f, catatan: e.target.value }))} rows={2} placeholder="Kegiatan hari ini..." />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Kendala</Label>
              <Textarea value={form.kendala} onChange={e => setForm(f => ({ ...f, kendala: e.target.value }))} rows={2} placeholder="Kendala yang dihadapi (opsional)..." />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => { setShowForm(false); setEditItem(null); setForm(emptyForm); }}>Batal</Button>
              <Button onClick={handleSave} disabled={createMutation.isPending || updateMutation.isPending}>
                {createMutation.isPending || updateMutation.isPending ? 'Menyimpan...' : 'Simpan'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}