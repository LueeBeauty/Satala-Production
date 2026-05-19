import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Plus, Edit2, Trash2, CreditCard, Check, X, Building2, Loader2 } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { useSession } from '@/lib/SessionContext';
import { canManageBank } from '@/lib/AuthSession';

const EMPTY_FORM = { nama_bank: '', nama_pemilik: '', nomor_rekening: '', singkatan_invoice: '', is_active: true };

function BankForm({ item, onClose, onSaved }) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const isEdit = !!item?.id;
  const [form, setForm] = useState(item ? { ...item } : { ...EMPTY_FORM });
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const mut = useMutation({
    mutationFn: (data) =>
      isEdit
        ? base44.entities.BankSettings.update(item.id, data)
        : base44.entities.BankSettings.create(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['bank-settings'] });
      toast({ title: isEdit ? 'Rekening diperbarui' : 'Rekening ditambahkan' });
      onSaved();
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    mut.mutate({ ...form, singkatan_invoice: form.singkatan_invoice.toUpperCase() });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-primary/10 rounded-xl flex items-center justify-center">
              <CreditCard className="w-5 h-5 text-primary" />
            </div>
            <h2 className="font-semibold">{isEdit ? 'Edit Rekening' : 'Tambah Rekening Bank'}</h2>
          </div>
          <Button variant="ghost" size="icon" className="w-8 h-8" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Nama Bank *</label>
            <Input value={form.nama_bank} onChange={e => set('nama_bank', e.target.value)} placeholder="BCA, Mandiri, BNI, dll" required />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Nama Pemilik Rekening *</label>
            <Input value={form.nama_pemilik} onChange={e => set('nama_pemilik', e.target.value)} placeholder="Nama pemilik" required />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Nomor Rekening *</label>
            <Input value={form.nomor_rekening} onChange={e => set('nomor_rekening', e.target.value)} placeholder="0123456789" required />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Singkatan Invoice *</label>
            <Input
              value={form.singkatan_invoice}
              onChange={e => set('singkatan_invoice', e.target.value.toUpperCase())}
              placeholder="Misal: BCA, ASB, CJT"
              maxLength={6}
              required
              className="uppercase"
            />
            <p className="text-[11px] text-muted-foreground mt-1">Digunakan sebagai prefix kode invoice, huruf kapital otomatis.</p>
          </div>
          <div className="flex items-center gap-3">
            <label className="text-xs font-medium text-muted-foreground">Status Aktif</label>
            <button
              type="button"
              onClick={() => set('is_active', !form.is_active)}
              className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${form.is_active ? 'bg-accent' : 'bg-muted-foreground/30'}`}
            >
              <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform shadow ${form.is_active ? 'translate-x-4' : 'translate-x-0.5'}`} />
            </button>
            <span className="text-xs text-muted-foreground">{form.is_active ? 'Aktif' : 'Nonaktif'}</span>
          </div>
          <div className="flex gap-3 pt-2 border-t border-border">
            <Button type="button" variant="outline" onClick={onClose} className="flex-1">Batal</Button>
            <Button type="submit" disabled={mut.isPending} className="flex-1">
              {mut.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : isEdit ? 'Simpan Perubahan' : 'Tambah Rekening'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function BankSettingsPanel() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState(null);

  const { data: banks = [], isLoading } = useQuery({
    queryKey: ['bank-settings'],
    queryFn: () => base44.entities.BankSettings.list(),
  });

  const delMut = useMutation({
    mutationFn: id => base44.entities.BankSettings.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['bank-settings'] });
      toast({ title: 'Rekening dihapus' });
    },
  });

  const toggleActive = useMutation({
    mutationFn: ({ id, is_active }) => base44.entities.BankSettings.update(id, { is_active }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['bank-settings'] }),
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium">Rekening Bank untuk Invoice</p>
          <p className="text-xs text-muted-foreground mt-0.5">Data rekening yang digunakan saat membuat invoice untuk customer.</p>
        </div>
        <Button size="sm" className="gap-2" onClick={() => { setEditItem(null); setShowForm(true); }}>
          <Plus className="w-4 h-4" /> Tambah Rekening
        </Button>
      </div>

      {isLoading ? (
        <div className="text-center py-8 text-muted-foreground text-sm">Memuat data bank...</div>
      ) : banks.length === 0 ? (
        <div className="border border-dashed border-border rounded-xl py-12 text-center">
          <Building2 className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p className="text-muted-foreground text-sm">Belum ada rekening bank.</p>
          <p className="text-xs text-muted-foreground mt-1">Klik "Tambah Rekening" untuk menambahkan.</p>
        </div>
      ) : (
        <div className="grid gap-3">
          {banks.map(bank => (
            <Card key={bank.id} className={`transition-all ${!bank.is_active ? 'opacity-60' : ''}`}>
              <CardContent className="p-4">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                    <CreditCard className="w-5 h-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-sm">{bank.nama_bank}</span>
                      <Badge className="text-xs bg-primary/10 text-primary border-primary/20 font-mono">{bank.singkatan_invoice}</Badge>
                      {bank.is_active
                        ? <Badge className="text-xs bg-green-100 text-green-700 border-green-200">Aktif</Badge>
                        : <Badge className="text-xs bg-slate-100 text-slate-600">Nonaktif</Badge>
                      }
                    </div>
                    <p className="text-sm text-foreground mt-0.5 font-medium">{bank.nama_pemilik}</p>
                    <p className="text-xs text-muted-foreground font-mono">{bank.nomor_rekening}</p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Button
                      variant="ghost" size="sm"
                      className={`text-xs h-7 gap-1 ${bank.is_active ? 'text-muted-foreground' : 'text-green-600 hover:bg-green-50'}`}
                      onClick={() => toggleActive.mutate({ id: bank.id, is_active: !bank.is_active })}
                    >
                      {bank.is_active ? 'Nonaktifkan' : 'Aktifkan'}
                    </Button>
                    <Button variant="ghost" size="icon" className="w-8 h-8"
                      onClick={() => { setEditItem(bank); setShowForm(true); }}>
                      <Edit2 className="w-3.5 h-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="w-8 h-8 text-destructive/60 hover:text-destructive"
                      onClick={() => { if (confirm(`Hapus rekening ${bank.nama_bank}?`)) delMut.mutate(bank.id); }}>
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {showForm && (
        <BankForm
          item={editItem}
          onClose={() => { setShowForm(false); setEditItem(null); }}
          onSaved={() => { setShowForm(false); setEditItem(null); }}
        />
      )}
    </div>
  );
}