import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, FlaskConical, CheckCircle2, Clock, AlertCircle, Pencil, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { toast } from 'sonner';
import StatusBadge from '@/components/production/StatusBadge';
import SearchableSelect from '@/components/ui/SearchableSelect';
import LastUpdated from '@/components/ui/LastUpdated';
import { getLatestUpdatedDate } from '@/hooks/useRelativeTime';

const TEST_TYPES = [
  { value: 'sillage', label: 'Sillage' },
  { value: 'projection', label: 'Projection' },
  { value: 'longevity', label: 'Longevity' },
  { value: 'stability', label: 'Stability' },
  { value: 'color_check', label: 'Color Check' },
  { value: 'aroma_match', label: 'Aroma Match' },
];

const APPROVAL_OPTIONS = [
  { value: 'pending', label: 'Pending' },
  { value: 'acc', label: 'ACC' },
  { value: 'revision', label: 'Revisi' },
  { value: 'rejected', label: 'Ditolak' },
];

function TestDialog({ test, onSave, trigger }) {
  const isEdit = !!test;
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(
    test
      ? { brand_name: test.brand_name, test_type: test.test_type, test_date: test.test_date || new Date().toISOString().split('T')[0], result: test.result || '', score: test.score || '', approval_status: test.approval_status, notes: test.notes || '' }
      : { brand_name: '', test_type: 'longevity', test_date: new Date().toISOString().split('T')[0], result: '', score: '', approval_status: 'pending', notes: '' }
  );

  const handleSubmit = async (e) => {
    e.preventDefault();
    await onSave({ ...form, score: Number(form.score) || 0 });
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="font-display">{isEdit ? 'Edit Hasil QC' : 'Tambah Hasil QC'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <Label>Brand</Label>
            <Input value={form.brand_name} onChange={e => setForm(f => ({ ...f, brand_name: e.target.value }))} required placeholder="Nama brand" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Jenis Tes</Label>
              <SearchableSelect value={form.test_type} onValueChange={v => setForm(f => ({ ...f, test_type: v }))} options={TEST_TYPES} />
            </div>
            <div>
              <Label>Tanggal</Label>
              <Input type="date" value={form.test_date} onChange={e => setForm(f => ({ ...f, test_date: e.target.value }))} />
            </div>
          </div>
          <div>
            <Label>Hasil Tes</Label>
            <Textarea value={form.result} onChange={e => setForm(f => ({ ...f, result: e.target.value }))} placeholder="Deskripsi hasil..." />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Skor (1-10)</Label>
              <Input type="number" min="1" max="10" value={form.score} onChange={e => setForm(f => ({ ...f, score: e.target.value }))} />
            </div>
            <div>
              <Label>Status</Label>
              <SearchableSelect value={form.approval_status} onValueChange={v => setForm(f => ({ ...f, approval_status: v }))} options={APPROVAL_OPTIONS} />
            </div>
          </div>
          <div>
            <Label>Catatan</Label>
            <Textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
          </div>
          <Button type="submit" className="w-full">{isEdit ? 'Simpan Perubahan' : 'Simpan'}</Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default function QCLab() {
  const queryClient = useQueryClient();

  const { data: tests = [], isLoading } = useQuery({
    queryKey: ['qc-tests'],
    queryFn: () => base44.entities.QCTest.list('-test_date'),
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.QCTest.create(data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['qc-tests'] }); toast.success('Tes ditambahkan'); },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.QCTest.update(id, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['qc-tests'] }); toast.success('Tes diperbarui'); },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.QCTest.delete(id),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['qc-tests'] }); toast.success('Tes dihapus'); },
  });

  const stats = {
    total: tests.length,
    acc: tests.filter(t => t.approval_status === 'acc').length,
    pending: tests.filter(t => t.approval_status === 'pending').length,
    revision: tests.filter(t => t.approval_status === 'revision').length,
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold tracking-tight">QC & Sampling Lab</h1>
          <p className="text-muted-foreground text-sm mt-1">
            {stats.total} tes · {stats.acc} ACC · {stats.pending} pending · {stats.revision} revisi
          </p>

        </div>
        <TestDialog
          onSave={(data) => createMutation.mutateAsync(data)}
          trigger={<Button className="gap-2"><Plus className="w-4 h-4" /> Tambah Tes</Button>}
        />
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="bg-green-50 rounded-xl px-4 py-3 border border-green-200/50 flex items-center gap-3">
          <CheckCircle2 className="w-5 h-5 text-green-600" />
          <div><div className="text-xl font-bold text-green-700">{stats.acc}</div><div className="text-[11px] text-green-600">ACC</div></div>
        </div>
        <div className="bg-yellow-50 rounded-xl px-4 py-3 border border-yellow-200/50 flex items-center gap-3">
          <Clock className="w-5 h-5 text-yellow-600" />
          <div><div className="text-xl font-bold text-yellow-700">{stats.pending}</div><div className="text-[11px] text-yellow-600">Pending</div></div>
        </div>
        <div className="bg-orange-50 rounded-xl px-4 py-3 border border-orange-200/50 flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-orange-600" />
          <div><div className="text-xl font-bold text-orange-700">{stats.revision}</div><div className="text-[11px] text-orange-600">Revisi</div></div>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {Array(4).fill(0).map((_, i) => <div key={i} className="h-24 rounded-xl bg-muted animate-pulse" />)}
        </div>
      ) : tests.length === 0 ? (
        <div className="text-center py-20 text-muted-foreground">
          <FlaskConical className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p>Belum ada hasil QC</p>
        </div>
      ) : (
        <div className="space-y-3">
          {tests.map(test => (
            <Card key={test.id} className="hover:shadow-md transition-shadow group">
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <h3 className="font-semibold">{test.brand_name}</h3>
                      <StatusBadge status={test.approval_status} small />
                    </div>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
                      <span className="capitalize bg-secondary px-2 py-0.5 rounded-full">{test.test_type?.replace('_', ' ')}</span>
                      {test.test_date && <span>{new Date(test.test_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}</span>}
                      {test.score > 0 && <span className="font-semibold text-foreground">Skor: {test.score}/10</span>}
                    </div>
                    {test.result && <p className="text-sm mt-2 text-muted-foreground">{test.result}</p>}
                    {test.notes && <p className="text-xs mt-1 text-muted-foreground/70 italic">{test.notes}</p>}
                    <div className="mt-1.5">
                      <LastUpdated date={test.updated_date || test.created_date} />
                    </div>
                  </div>
                  <div className="flex flex-col gap-1.5 shrink-0">
                    {test.approval_status === 'pending' && (
                      <div className="flex gap-1.5">
                        <Button size="sm" variant="outline" className="h-7 text-xs text-green-700 border-green-300 hover:bg-green-50"
                          onClick={() => updateMutation.mutate({ id: test.id, data: { approval_status: 'acc' } })}>
                          ACC
                        </Button>
                        <Button size="sm" variant="outline" className="h-7 text-xs text-yellow-700 border-yellow-300 hover:bg-yellow-50"
                          onClick={() => updateMutation.mutate({ id: test.id, data: { approval_status: 'revision' } })}>
                          Revisi
                        </Button>
                      </div>
                    )}
                    <div className="flex gap-1 justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                      <TestDialog
                        test={test}
                        onSave={(data) => updateMutation.mutateAsync({ id: test.id, data })}
                        trigger={
                          <Button variant="ghost" size="icon" className="h-7 w-7">
                            <Pencil className="w-3 h-3" />
                          </Button>
                        }
                      />
                      <Button
                        variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive"
                        onClick={() => { if (confirm('Hapus data tes ini?')) deleteMutation.mutate(test.id); }}
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
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