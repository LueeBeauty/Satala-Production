import React, { useState } from 'react';
import { CheckCircle2, Clock, ShoppingCart, MessageSquare, ChevronDown, ChevronUp, Pencil, Save, X, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import InventorySearchDropdown from './InventorySearchDropdown';
import BibitSearchDropdown from './BibitSearchDropdown';

/**
 * Tampilan satu baris komponen dalam halaman detail PO.
 * Mendukung edit notes, edit qty, edit item (ganti dari inventori), status badge.
 */
export default function ComponentDetailRow({ comp, inventoryItems = [], onUpdateNotes, onUpdateQty, onUpdateItem }) {
  const [showNotes, setShowNotes] = useState(!!(comp.item_notes));
  const [editingNotes, setEditingNotes] = useState(false);
  const [notesValue, setNotesValue] = useState(comp.item_notes || '');
  const [editingQty, setEditingQty] = useState(false);
  const [qtyValue, setQtyValue] = useState(comp.qty_needed || comp.target_qty || 0);
  const [editingItem, setEditingItem] = useState(false);

  const categoryIcon = {
    botol: '🧴', bibit: '🌿', tutup: '🔒', spray: '💨', lainnya: '📦',
  };
  const categoryLabel = {
    botol: 'Botol', bibit: 'Bibit', tutup: 'Tutup', spray: 'Spray', lainnya: 'Tambahan',
  };

  // Hitung status dari stok real-time
  const computedStatus = (() => {
    if (!comp.inventory_item_id) return 'need_buy';
    const stock = comp.stock_available || 0;
    const needed = comp.qty_needed || comp.target_qty || 0;
    if (stock <= 0) return 'need_buy';
    if (needed > 0 && stock >= needed) return 'ready';
    return 'pending';
  })();

  const effectiveStatus = comp.status || computedStatus;

  const statusConfig = {
    ready: {
      label: 'Ready',
      icon: <CheckCircle2 className="w-3 h-3" />,
      class: 'bg-green-100 text-green-700 border-green-200',
      rowClass: 'border-green-200 bg-green-50/30',
    },
    pending: {
      label: 'Pending',
      icon: <Clock className="w-3 h-3" />,
      class: 'bg-yellow-100 text-yellow-700 border-yellow-200',
      rowClass: 'border-yellow-200 bg-yellow-50/20',
    },
    need_buy: {
      label: 'Harus Dibeli',
      icon: <ShoppingCart className="w-3 h-3" />,
      class: 'bg-red-100 text-red-700 border-red-200',
      rowClass: 'border-red-200 bg-red-50/30',
    },
    in_progress: {
      label: 'In Progress',
      icon: <Clock className="w-3 h-3" />,
      class: 'bg-blue-100 text-blue-700 border-blue-200',
      rowClass: 'border-blue-200 bg-blue-50/20',
    },
  };

  const sc = statusConfig[effectiveStatus] || statusConfig.pending;

  const saveNotes = () => {
    onUpdateNotes(notesValue);
    setEditingNotes(false);
  };

  const saveQty = () => {
    onUpdateQty(Number(qtyValue) || 0);
    setEditingQty(false);
  };

  const handleItemSelect = (item) => {
    if (onUpdateItem) {
      onUpdateItem(item);
    }
    setEditingItem(false);
  };

  const isCore = ['botol', 'bibit', 'tutup', 'spray'].includes(comp.category);

  return (
    <div className={`rounded-xl border-2 overflow-hidden ${sc.rowClass}`}>
      {/* Main row */}
      <div className="flex items-center gap-3 px-4 py-3">
        <span className="text-lg">{categoryIcon[comp.category] || '📦'}</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
              {categoryLabel[comp.category] || comp.category}
            </span>
            <span className={`inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full border font-medium ${sc.class}`}>
              {sc.icon} {sc.label}
            </span>
            {effectiveStatus === 'need_buy' && (
              <span className="text-[10px] bg-red-500 text-white px-1.5 py-0.5 rounded-full font-bold">
                HARUS BELI
              </span>
            )}
          </div>
          <p className="text-sm font-semibold truncate mt-0.5">
            {comp.item_name || comp.name || '—'}
            {comp.vendor && <span className="text-xs font-normal text-muted-foreground ml-1">({comp.vendor})</span>}
          </p>
        </div>

        {/* Qty info */}
        <div className="text-right shrink-0">
          {editingQty ? (
            <div className="flex items-center gap-1">
              <Input
                type="number"
                value={qtyValue}
                onChange={e => setQtyValue(e.target.value)}
                className="h-7 w-20 text-sm text-right"
                autoFocus
              />
              <Button type="button" size="icon" variant="ghost" className="h-7 w-7" onClick={saveQty}>
                <Save className="w-3 h-3 text-green-600" />
              </Button>
              <Button type="button" size="icon" variant="ghost" className="h-7 w-7" onClick={() => setEditingQty(false)}>
                <X className="w-3 h-3" />
              </Button>
            </div>
          ) : (
            <button type="button" onClick={() => setEditingQty(true)} className="text-right hover:opacity-70 transition-opacity">
              <p className="text-sm font-bold">{comp.qty_needed || comp.target_qty || 0} {comp.unit || 'pcs'}</p>
              <p className="text-[10px] text-muted-foreground">kebutuhan</p>
            </button>
          )}
        </div>

        {/* Stok */}
        <div className={`text-right shrink-0 px-3 py-1.5 rounded-lg ${
          (comp.stock_available || 0) >= (comp.qty_needed || 1) && (comp.qty_needed || 0) > 0
            ? 'bg-green-100 text-green-700'
            : (comp.stock_available || 0) <= 0
            ? 'bg-red-100 text-red-700'
            : 'bg-yellow-100 text-yellow-700'
        }`}>
          <p className="text-sm font-bold">{comp.stock_available || 0} {comp.unit || 'pcs'}</p>
          <p className="text-[10px]">stok</p>
        </div>

        {/* Edit item button */}
        {onUpdateItem && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-7 w-7 shrink-0 text-muted-foreground"
            title="Ganti item"
            onClick={() => setEditingItem(n => !n)}
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </Button>
        )}

        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-7 w-7 shrink-0 text-muted-foreground"
          onClick={() => setShowNotes(n => !n)}
        >
          {showNotes ? <ChevronUp className="w-3.5 h-3.5" /> : <MessageSquare className="w-3.5 h-3.5" />}
        </Button>
      </div>

      {/* Edit item dari inventori */}
      {editingItem && onUpdateItem && (
        <div className="px-4 pb-3 border-t border-black/5">
          <div className="flex items-center justify-between mt-2 mb-2">
            <Label className="text-xs text-muted-foreground">Ganti Item dari Inventori</Label>
            <Button type="button" variant="ghost" size="sm" className="h-6 text-xs" onClick={() => setEditingItem(false)}>
              <X className="w-3 h-3 mr-1" /> Tutup
            </Button>
          </div>
          {comp.category === 'bibit' ? (
            <BibitSearchDropdown
              inventoryItems={inventoryItems}
              selectedItemId={comp.inventory_item_id}
              onSelect={handleItemSelect}
            />
          ) : (
            <InventorySearchDropdown
              category={isCore ? comp.category : undefined}
              inventoryItems={inventoryItems}
              selectedItemId={comp.inventory_item_id}
              onSelect={handleItemSelect}
              placeholder={`Pilih ${categoryLabel[comp.category] || comp.category}...`}
            />
          )}
        </div>
      )}

      {/* Notes section */}
      {showNotes && (
        <div className="px-4 pb-3 border-t border-black/5">
          <div className="flex items-center justify-between mt-2 mb-1">
            <Label className="text-xs text-muted-foreground">Catatan Item</Label>
            {!editingNotes ? (
              <Button type="button" variant="ghost" size="sm" className="h-6 text-xs gap-1" onClick={() => setEditingNotes(true)}>
                <Pencil className="w-3 h-3" /> Edit
              </Button>
            ) : (
              <div className="flex gap-1">
                <Button type="button" variant="ghost" size="sm" className="h-6 text-xs gap-1 text-green-600" onClick={saveNotes}>
                  <Save className="w-3 h-3" /> Simpan
                </Button>
                <Button type="button" variant="ghost" size="sm" className="h-6 text-xs" onClick={() => { setEditingNotes(false); setNotesValue(comp.item_notes || ''); }}>
                  Batal
                </Button>
              </div>
            )}
          </div>
          {editingNotes ? (
            <Textarea
              value={notesValue}
              onChange={e => setNotesValue(e.target.value)}
              placeholder="Catatan kondisi, spesifikasi, info tambahan..."
              rows={2}
              className="text-sm resize-none"
              autoFocus
            />
          ) : (
            <p className="text-sm text-muted-foreground italic bg-muted/50 rounded-lg px-3 py-2 min-h-[36px]">
              {comp.item_notes || <span className="text-muted-foreground/50">Belum ada catatan. Klik edit untuk tambah.</span>}
            </p>
          )}
        </div>
      )}
    </div>
  );
}