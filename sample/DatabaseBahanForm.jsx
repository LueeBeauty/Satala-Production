import React, { useState } from 'react';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { X, Plus, Trash2, Search } from 'lucide-react';

const ITEM_TAMBAHAN_KATEGORI = ['Stiker', 'Dus', 'Gift Card', 'Lainnya'];

export default function DatabaseBahanForm({ item, onClose, onSaved }) {
  const qc = useQueryClient();
  const isEdit = !!item?.id;

  const { data: botolList = [] } = useQuery({ queryKey: ['botol'], queryFn: () => base44.entities.Botol.list() });
  const { data: tutupList = [] } = useQuery({ queryKey: ['tutup'], queryFn: () => base44.entities.Tutup.list() });
  const { data: sprayList = [] } = useQuery({ queryKey: ['spray'], queryFn: () => base44.entities.Spray.list() });

  const [form, setForm] = useState({
    nama_brand: item?.nama_brand || '',
    nama_varian: item?.nama_varian || '',
    botol_nama: item?.botol_nama || '',
    botol_ukuran_label_ml: item?.botol_ukuran_label_ml || '',
    botol_ukuran_aktual_ml: item?.botol_ukuran_aktual_ml || '',
    tutup_nama: item?.tutup_nama || '',
    spray_nama: item?.spray_nama || '',
    item_tambahan: item?.item_tambahan || [],
    catatan: item?.catatan || '',
    status: item?.status || 'aktif',
  });

  // Search state for dropdowns
  const [botolSearch, setBotolSearch] = useState('');
  const [tutupSearch, setTutupSearch] = useState('');
  const [spraySearch, setSpraySearch] = useState('');
  const [showBotolDrop, setShowBotolDrop] = useState(false);
  const [showTutupDrop, setShowTutupDrop] = useState(false);
  const [showSprayDrop, setShowSprayDrop] = useState(false);

  const filteredBotol = botolList.filter(b => b.nama?.toLowerCase().includes(botolSearch.toLowerCase()));
  const filteredTutup = tutupList.filter(t => t.nama?.toLowerCase().includes(tutupSearch.toLowerCase()));
  const filteredSpray = sprayList.filter(s => s.nama?.toLowerCase().includes(spraySearch.toLowerCase()));

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  // Item tambahan handlers
  const addItem = () => set('item_tambahan', [...form.item_tambahan, { nama: '', kategori: 'Stiker', qty_per_pcs: 1, catatan: '' }]);
  const removeItem = (i) => set('item_tambahan', form.item_tambahan.filter((_, idx) => idx !== i));
  const updateItem = (i, k, v) => set('item_tambahan', form.item_tambahan.map((it, idx) => idx === i ? { ...it, [k]: v } : it));

  const saveMut = useMutation({
    mutationFn: (data) =>
      isEdit
        ? base44.entities.DatabaseBahan.update(item.id, data)
        : base44.entities.DatabaseBahan.create(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['database-bahan'] });
      onSaved?.();
    },
  });

  const handleSelectBotol = (b) => {
    setForm(p => ({
      ...p,
      botol_nama: b.nama,
      botol_ukuran_label_ml: b.ukuran_label_ml || '',
      botol_ukuran_aktual_ml: b.ukuran_aktual_ml || '',
    }));
    setBotolSearch(b.nama);
    setShowBotolDrop(false);
  };

  const handleSelectTutup = (t) => {
    set('tutup_nama', t.nama);
    setTutupSearch(t.nama);
    setShowTutupDrop(false);
  };

  const handleSelectSpray = (s) => {
    set('spray_nama', s.nama);
    setSpraySearch(s.nama);
    setShowSprayDrop(false);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    saveMut.mutate(form);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-start justify-center p-4 overflow-y-auto">
      <div className="bg-card rounded-2xl shadow-2xl w-full max-w-2xl my-8">
        <div className="flex items-center justify-between p-6 border-b border-border">
          <h3 className="text-lg font-semibold">{isEdit ? 'Edit' : 'Tambah'} Database Bahan</h3>
          <Button variant="ghost" size="icon" onClick={onClose}><X className="w-4 h-4" /></Button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Brand & Varian */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Nama Brand *</label>
              <Input value={form.nama_brand} onChange={e => set('nama_brand', e.target.value)} placeholder="Misal: Cielmora" required />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Nama Varian *</label>
              <Input value={form.nama_varian} onChange={e => set('nama_varian', e.target.value)} placeholder="Misal: Sun Zest 30ml" required />
            </div>
          </div>

          {/* Botol — Searchable */}
          <div className="bg-muted/30 rounded-xl p-4 space-y-3">
            <h4 className="text-sm font-semibold">Botol</h4>
            <div className="relative">
              <label className="text-xs text-muted-foreground mb-1 block">Pilih dari stok (opsional) — ketik untuk cari</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                <Input
                  className="pl-8 text-sm"
                  placeholder="Cari botol..."
                  value={botolSearch}
                  onChange={e => { setBotolSearch(e.target.value); setShowBotolDrop(true); if (!e.target.value) { set('botol_nama', ''); set('botol_ukuran_label_ml', ''); set('botol_ukuran_aktual_ml', ''); } }}
                  onFocus={() => setShowBotolDrop(true)}
                />
              </div>
              {showBotolDrop && filteredBotol.length > 0 && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setShowBotolDrop(false)} />
                  <div className="absolute z-20 left-0 right-0 top-full mt-1 bg-card border border-border rounded-xl shadow-lg max-h-48 overflow-y-auto">
                    {filteredBotol.map(b => (
                      <button key={b.id} type="button" onClick={() => handleSelectBotol(b)}
                        className="w-full text-left px-3 py-2 text-sm hover:bg-muted/60 transition-colors flex items-center justify-between">
                        <span className="font-medium">{b.nama}</span>
                        <span className="text-xs text-muted-foreground">{b.ukuran_label_ml}ml · {b.stok ?? 0} pcs</span>
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-1">
                <label className="text-xs text-muted-foreground mb-1 block">Nama Botol</label>
                <Input value={form.botol_nama} onChange={e => set('botol_nama', e.target.value)} placeholder="Nama botol" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Ukuran Label (ml)</label>
                <Input type="number" value={form.botol_ukuran_label_ml} onChange={e => set('botol_ukuran_label_ml', Number(e.target.value))} placeholder="30" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Ukuran Aktual (ml)</label>
                <Input type="number" value={form.botol_ukuran_aktual_ml} onChange={e => set('botol_ukuran_aktual_ml', Number(e.target.value))} placeholder="33" />
              </div>
            </div>
          </div>

          {/* Tutup & Spray — Searchable */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-muted/30 rounded-xl p-4 space-y-2">
              <h4 className="text-sm font-semibold">Tutup</h4>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                <Input
                  className="pl-8 text-sm"
                  placeholder="Cari tutup..."
                  value={tutupSearch || form.tutup_nama}
                  onChange={e => { setTutupSearch(e.target.value); set('tutup_nama', e.target.value); setShowTutupDrop(true); }}
                  onFocus={() => setShowTutupDrop(true)}
                />
              </div>
              {showTutupDrop && filteredTutup.length > 0 && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setShowTutupDrop(false)} />
                  <div className="absolute z-20 bg-card border border-border rounded-xl shadow-lg max-h-36 overflow-y-auto min-w-[200px]">
                    {filteredTutup.map(t => (
                      <button key={t.id} type="button" onClick={() => handleSelectTutup(t)}
                        className="w-full text-left px-3 py-2 text-sm hover:bg-muted/60 transition-colors">
                        {t.nama}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
            <div className="bg-muted/30 rounded-xl p-4 space-y-2">
              <h4 className="text-sm font-semibold">Spray</h4>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                <Input
                  className="pl-8 text-sm"
                  placeholder="Cari spray..."
                  value={spraySearch || form.spray_nama}
                  onChange={e => { setSpraySearch(e.target.value); set('spray_nama', e.target.value); setShowSprayDrop(true); }}
                  onFocus={() => setShowSprayDrop(true)}
                />
              </div>
              {showSprayDrop && filteredSpray.length > 0 && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setShowSprayDrop(false)} />
                  <div className="absolute z-20 bg-card border border-border rounded-xl shadow-lg max-h-36 overflow-y-auto min-w-[200px]">
                    {filteredSpray.map(s => (
                      <button key={s.id} type="button" onClick={() => handleSelectSpray(s)}
                        className="w-full text-left px-3 py-2 text-sm hover:bg-muted/60 transition-colors">
                        {s.nama}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Item Tambahan */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-sm font-semibold">Item Tambahan</h4>
              <Button type="button" size="sm" variant="outline" onClick={addItem} className="h-7 text-xs gap-1">
                <Plus className="w-3 h-3" /> Tambah
              </Button>
            </div>
            {form.item_tambahan.length === 0 && (
              <div className="text-center py-4 border border-dashed border-border rounded-xl text-muted-foreground text-xs">
                Belum ada item tambahan (stiker, dus, dll)
              </div>
            )}
            <div className="space-y-2">
              {form.item_tambahan.map((it, i) => (
                <div key={i} className="bg-muted/30 rounded-xl p-3 grid grid-cols-12 gap-2 items-end">
                  <div className="col-span-4">
                    <label className="text-[10px] text-muted-foreground block mb-0.5">Nama Item</label>
                    <Input value={it.nama} onChange={e => updateItem(i, 'nama', e.target.value)} placeholder="Stiker bulat" className="h-8 text-xs" />
                  </div>
                  <div className="col-span-3">
                    <label className="text-[10px] text-muted-foreground block mb-0.5">Kategori</label>
                    <select className="w-full h-8 rounded-md border border-input bg-transparent px-2 text-xs"
                      value={it.kategori} onChange={e => updateItem(i, 'kategori', e.target.value)}>
                      {ITEM_TAMBAHAN_KATEGORI.map(k => <option key={k}>{k}</option>)}
                    </select>
                  </div>
                  <div className="col-span-2">
                    <label className="text-[10px] text-muted-foreground block mb-0.5">Qty/pcs</label>
                    <Input type="number" min="1" value={it.qty_per_pcs} onChange={e => updateItem(i, 'qty_per_pcs', Number(e.target.value))} className="h-8 text-xs" />
                  </div>
                  <div className="col-span-2">
                    <label className="text-[10px] text-muted-foreground block mb-0.5">Catatan</label>
                    <Input value={it.catatan} onChange={e => updateItem(i, 'catatan', e.target.value)} placeholder="..." className="h-8 text-xs" />
                  </div>
                  <div className="col-span-1 flex justify-end">
                    <Button type="button" variant="ghost" size="icon" className="w-7 h-7 text-destructive/60 hover:text-destructive" onClick={() => removeItem(i)}>
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Catatan */}
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Catatan</label>
            <Input value={form.catatan} onChange={e => set('catatan', e.target.value)} placeholder="Catatan (opsional)" />
          </div>

          {/* Status */}
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Status</label>
            <div className="flex gap-2">
              {['aktif', 'arsip'].map(s => (
                <button key={s} type="button" onClick={() => set('status', s)}
                  className={`flex-1 py-1.5 rounded-lg border text-sm font-medium capitalize transition-all ${form.status === s ? 'bg-accent text-accent-foreground border-accent' : 'border-border text-muted-foreground hover:border-accent/50'}`}>
                  {s === 'aktif' ? 'Aktif' : 'Arsip'}
                </button>
              ))}
            </div>
          </div>

          <div className="flex gap-3 pt-2 border-t border-border">
            <Button type="button" variant="outline" onClick={onClose} className="flex-1">Batal</Button>
            <Button type="submit" disabled={saveMut.isPending || !form.nama_brand.trim() || !form.nama_varian.trim()} className="flex-1">
              {saveMut.isPending ? 'Menyimpan...' : isEdit ? 'Simpan Perubahan' : 'Simpan Database Bahan'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}