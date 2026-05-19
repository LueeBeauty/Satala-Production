import React, { useState } from 'react';
import { Plus, Trash2, Edit2, Save, X, Package } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';

const ADDON_TYPES = [
  { value: 'sticker', label: 'Sticker', emoji: '🏷️', color: 'bg-pink-50 border-pink-200 text-pink-700' },
  { value: 'box', label: 'Box / Kemasan', emoji: '📦', color: 'bg-amber-50 border-amber-200 text-amber-700' },
  { value: 'sablon', label: 'Sablon', emoji: '🎨', color: 'bg-indigo-50 border-indigo-200 text-indigo-700' },
  { value: 'seal', label: 'Seal / Shrink', emoji: '🔐', color: 'bg-cyan-50 border-cyan-200 text-cyan-700' },
  { value: 'ribbon', label: 'Ribbon / Pita', emoji: '🎀', color: 'bg-rose-50 border-rose-200 text-rose-700' },
  { value: 'hangtag', label: 'Hangtag', emoji: '🏷️', color: 'bg-violet-50 border-violet-200 text-violet-700' },
  { value: 'kantong', label: 'Kantong / Pouch', emoji: '🛍️', color: 'bg-teal-50 border-teal-200 text-teal-700' },
  { value: 'lainnya', label: 'Lainnya', emoji: '✨', color: 'bg-gray-50 border-gray-200 text-gray-700' },
];

const makeAddon = () => ({
  type: 'sticker',
  name: '',
  qty: 0,
  unit: 'pcs',
  vendor: '',
  notes: '',
  status: 'belum_dipesan',
});

const STATUS_OPTIONS = [
  { value: 'belum_dipesan', label: 'Belum Dipesan', color: 'bg-gray-100 text-gray-600 border-gray-200' },
  { value: 'sudah_dipesan', label: 'Sudah Dipesan', color: 'bg-blue-100 text-blue-700 border-blue-200' },
  { value: 'sudah_diterima', label: 'Sudah Diterima', color: 'bg-green-100 text-green-700 border-green-200' },
];

function AddonRow({ addon, onSave, onRemove, isShipped }) {
  const [editing, setEditing] = useState(!addon.name);
  const [form, setForm] = useState({ ...addon });

  const typeInfo = ADDON_TYPES.find(t => t.value === form.type) || ADDON_TYPES[ADDON_TYPES.length - 1];
  const statusInfo = STATUS_OPTIONS.find(s => s.value === addon.status) || STATUS_OPTIONS[0];

  const handleSave = () => {
    if (!form.name.trim()) return;
    onSave(form);
    setEditing(false);
  };

  const handleCancel = () => {
    if (!addon.name) {
      onRemove();
    } else {
      setForm({ ...addon });
      setEditing(false);
    }
  };

  if (editing) {
    return (
      <div className="border border-border rounded-xl p-4 bg-muted/20 space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground font-medium">Tipe Komponen</label>
            <Select value={form.type} onValueChange={v => setForm(f => ({ ...f, type: v }))}>
              <SelectTrigger className="h-9 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ADDON_TYPES.map(t => (
                  <SelectItem key={t.value} value={t.value}>
                    {t.emoji} {t.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground font-medium">Nama / Deskripsi *</label>
            <Input
              value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              placeholder={`Misal: Sticker label depan`}
              className="h-9 text-sm"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground font-medium">Jumlah</label>
            <div className="flex gap-2">
              <Input
                type="number"
                value={form.qty}
                onChange={e => setForm(f => ({ ...f, qty: Number(e.target.value) }))}
                className="h-9 text-sm"
                min={0}
              />
              <Select value={form.unit} onValueChange={v => setForm(f => ({ ...f, unit: v }))}>
                <SelectTrigger className="h-9 text-sm w-24">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {['pcs', 'lembar', 'set', 'roll', 'pak', 'lusin'].map(u => (
                    <SelectItem key={u} value={u}>{u}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground font-medium">Vendor / Supplier</label>
            <Input
              value={form.vendor}
              onChange={e => setForm(f => ({ ...f, vendor: e.target.value }))}
              placeholder="Nama vendor (opsional)"
              className="h-9 text-sm"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground font-medium">Status</label>
            <Select value={form.status} onValueChange={v => setForm(f => ({ ...f, status: v }))}>
              <SelectTrigger className="h-9 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STATUS_OPTIONS.map(s => (
                  <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1 sm:col-span-2">
            <label className="text-xs text-muted-foreground font-medium">Catatan</label>
            <Textarea
              value={form.notes}
              onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
              placeholder="Catatan tambahan (warna, ukuran, spesifikasi, dll)"
              className="text-sm resize-none"
              rows={2}
            />
          </div>
        </div>
        <div className="flex gap-2 justify-end pt-1">
          <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={handleCancel}>
            <X className="w-3 h-3 mr-1" /> Batal
          </Button>
          <Button size="sm" className="h-8 text-xs bg-primary hover:bg-primary/90" onClick={handleSave} disabled={!form.name.trim()}>
            <Save className="w-3 h-3 mr-1" /> Simpan
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex items-center gap-3 py-2.5 px-3 rounded-xl border ${typeInfo.color}`}>
      <span className="text-base shrink-0">{typeInfo.emoji}</span>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="text-sm font-semibold truncate">{addon.name}</p>
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/60 border font-medium opacity-70">
            {typeInfo.label}
          </span>
        </div>
        <div className="flex items-center gap-3 mt-0.5 flex-wrap">
          {addon.vendor && <p className="text-xs opacity-70">{addon.vendor}</p>}
          {addon.notes && <p className="text-xs opacity-60 italic truncate max-w-[200px]">{addon.notes}</p>}
        </div>
      </div>
      <div className="text-right shrink-0">
        <p className="text-sm font-medium">{addon.qty > 0 ? `${addon.qty} ${addon.unit}` : '—'}</p>
      </div>
      <span className={`text-[11px] px-2 py-0.5 rounded-full border font-medium shrink-0 ${statusInfo.color}`}>
        {statusInfo.label}
      </span>
      {!isShipped && (
        <div className="flex gap-1 shrink-0">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-muted-foreground hover:text-foreground"
            onClick={() => setEditing(true)}
          >
            <Edit2 className="w-3 h-3" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-muted-foreground hover:text-destructive"
            onClick={onRemove}
          >
            <Trash2 className="w-3 h-3" />
          </Button>
        </div>
      )}
    </div>
  );
}

export default function AdditionalComponentSection({ addons = [], onChange, isShipped }) {
  const handleSave = (index, updated) => {
    const newList = addons.map((a, i) => i === index ? updated : a);
    onChange(newList);
  };

  const handleRemove = (index) => {
    const newList = addons.filter((_, i) => i !== index);
    onChange(newList);
  };

  const handleAdd = () => {
    onChange([...addons, makeAddon()]);
  };

  const receivedCount = addons.filter(a => a.status === 'sudah_diterima').length;
  const orderedCount = addons.filter(a => a.status === 'sudah_dipesan').length;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <div className="flex items-center gap-2">
              <CardTitle className="font-display text-lg">Komponen Tambahan</CardTitle>
              {addons.length > 0 && (
                <span className="text-xs bg-muted px-2 py-0.5 rounded-full text-muted-foreground font-medium">
                  {addons.length} item
                </span>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Sticker, box, sablon, dll — dari pihak ketiga. Tidak terintegrasi inventori.
            </p>
          </div>
          {addons.length > 0 && (
            <div className="flex gap-1.5 flex-wrap">
              {receivedCount > 0 && (
                <span className="text-[11px] px-2 py-0.5 bg-green-100 text-green-700 border border-green-200 rounded-full font-medium">
                  {receivedCount} diterima
                </span>
              )}
              {orderedCount > 0 && (
                <span className="text-[11px] px-2 py-0.5 bg-blue-100 text-blue-700 border border-blue-200 rounded-full font-medium">
                  {orderedCount} dipesan
                </span>
              )}
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {addons.length === 0 ? (
          <div className="text-center py-6 text-muted-foreground border border-dashed rounded-xl">
            <Package className="w-8 h-8 mx-auto mb-2 opacity-30" />
            <p className="text-sm">Belum ada komponen tambahan</p>
            <p className="text-xs mt-0.5 opacity-60">Opsional — tambahkan jika diperlukan</p>
          </div>
        ) : (
          addons.map((addon, i) => (
            <AddonRow
              key={i}
              addon={addon}
              onSave={(updated) => handleSave(i, updated)}
              onRemove={() => handleRemove(i)}
              isShipped={isShipped}
            />
          ))
        )}
        {!isShipped && (
          <Button
            variant="outline"
            size="sm"
            className="w-full mt-2 gap-2 text-xs border-dashed text-muted-foreground hover:text-foreground hover:border-solid"
            onClick={handleAdd}
          >
            <Plus className="w-3.5 h-3.5" /> Tambah Komponen Tambahan
          </Button>
        )}
      </CardContent>
    </Card>
  );
}