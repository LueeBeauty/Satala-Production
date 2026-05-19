import React, { useState } from 'react';
import { Trash2, ChevronDown, ChevronUp, MessageSquare, CheckCircle2, Clock, ShoppingCart, Package } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import InventorySearchDropdown from './InventorySearchDropdown';
import BibitSearchDropdown from './BibitSearchDropdown';
import AddNewItemModal from '@/components/shared/AddNewItemModal';
import SmartQtyInput from '@/components/ui/SmartQtyInput';
import { checkSufficiency, smartDisplayQty, formatQty } from '@/lib/unitConverter';

/**
 * Satu baris komponen dalam PO (Botol / Bibit / Tutup / Spray).
 * Props:
 *  - comp: { category, inventory_item_id, item_name, vendor, qty_needed, stock_available, status, notes, is_integrated, item_notes }
 *  - inventoryItems
 *  - onChange: (updatedComp) => void
 *  - onRemove: () => void
 *  - isCore: boolean (jika true, tidak bisa dihapus)
 */
export default function POComponentItem({ comp, inventoryItems, onChange, onRemove, isCore, onAddNewItem }) {
  const [showNotes, setShowNotes] = useState(false);
  const [addModal, setAddModal] = useState(null); // { initialName }

  const categoryToType = { botol: 'botol', tutup: 'tutup', spray: 'spray', bibit: 'bahan' };

  const handleAddNew = (initialName) => {
    setAddModal({ initialName: initialName || '' });
  };

  const handleCreated = (newItem) => {
    setAddModal(null);
    // Bangun inventory_item_id dengan prefix sesuai kategori (format yang dipakai di seluruh app)
    const prefixMap = { botol: 'botol', tutup: 'tutup', spray: 'spray', bibit: 'bahan', bahan: 'bahan' };
    const prefix = prefixMap[comp.category] || 'bahan';
    const virtualId = `${prefix}-${newItem.id}`;
    onChange({
      ...comp,
      inventory_item_id: virtualId,
      item_name: newItem.nama,
      vendor: newItem.vendor || newItem.catatan || '',
      stock_available: 0,
      unit: newItem.satuan || newItem.unit || 'pcs',
      status: 'need_buy',
    });
  };

  const categoryLabel = {
    botol: 'Botol',
    bibit: 'Bibit',
    tutup: 'Tutup',
    spray: 'Spray',
  };

  const categoryColor = {
    botol: 'bg-blue-50 border-blue-200',
    bibit: 'bg-green-50 border-green-200',
    tutup: 'bg-purple-50 border-purple-200',
    spray: 'bg-orange-50 border-orange-200',
  };

  const categoryIcon = {
    botol: '🧴',
    bibit: '🌿',
    tutup: '🔒',
    spray: '💨',
  };

  const handleItemSelect = (item) => {
    const stockAvail = item ? (item.total_stock || 0) : 0;
    const needed = comp.qty_needed || 0;
    const itemUnit = item?.unit || 'pcs';
    let status = 'pending';
    if (item) {
      const { sufficient } = checkSufficiency(stockAvail, itemUnit, needed, itemUnit);
      if (needed > 0 && sufficient) status = 'ready';
      else if (stockAvail <= 0) status = 'need_buy';
      else status = 'pending';
    }

    onChange({
      ...comp,
      inventory_item_id: item?.id || '',
      item_name: item?.item_name || '',
      vendor: item?.vendor || '',
      stock_available: stockAvail,
      unit: item?.unit || 'pcs',
      status,
    });
  };

  const handleQtyChange = (val) => {
    const qty = Number(val) || 0;
    const stockAvail = comp.stock_available || 0;
    const stockUnit = comp.unit || 'pcs';
    let status = comp.status;
    if (comp.inventory_item_id) {
      const { sufficient } = checkSufficiency(stockAvail, stockUnit, qty, stockUnit);
      if (qty > 0 && sufficient) status = 'ready';
      else if (stockAvail <= 0) status = 'need_buy';
      else status = 'pending';
    }
    onChange({ ...comp, qty_needed: qty, status });
  };

  const statusConfig = {
    ready: {
      label: 'Ready',
      icon: <CheckCircle2 className="w-3 h-3" />,
      class: 'bg-green-100 text-green-700 border-green-200',
    },
    pending: {
      label: 'Pending',
      icon: <Clock className="w-3 h-3" />,
      class: 'bg-yellow-100 text-yellow-700 border-yellow-200',
    },
    need_buy: {
      label: 'Harus Dibeli',
      icon: <ShoppingCart className="w-3 h-3" />,
      class: 'bg-red-100 text-red-700 border-red-200',
    },
  };

  const sc = statusConfig[comp.status] || statusConfig.pending;

  return (
    <>
    {addModal && (
      <AddNewItemModal
        type={categoryToType[comp.category] || 'botol'}
        initialName={addModal.initialName}
        initialKategori="Bibit"
        onClose={() => setAddModal(null)}
        onCreated={handleCreated}
      />
    )}
    <div className={`rounded-xl border-2 p-4 space-y-3 ${categoryColor[comp.category] || 'bg-muted/30 border-border'}`}>
      {/* Header row */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-base">{categoryIcon[comp.category] || '📦'}</span>
          <span className="font-semibold text-sm">{categoryLabel[comp.category] || comp.category}</span>
          {comp.inventory_item_id && (
            <span className={`inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full border font-medium ${sc.class}`}>
              {sc.icon} {sc.label}
            </span>
          )}
          {comp.status === 'need_buy' && (
            <span className="text-[10px] bg-red-200 text-red-800 px-1.5 py-0.5 rounded-full font-bold animate-pulse">
              ⚠ BELI
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-muted-foreground hover:text-foreground"
            onClick={() => setShowNotes(n => !n)}
            title="Catatan item"
          >
            {showNotes ? <ChevronUp className="w-3.5 h-3.5" /> : <MessageSquare className="w-3.5 h-3.5" />}
          </Button>
          {!isCore && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-destructive hover:text-destructive"
              onClick={onRemove}
            >
              <Trash2 className="w-3.5 h-3.5" />
            </Button>
          )}
        </div>
      </div>

      {/* Dropdown pilih item inventori */}
      <div className="space-y-1">
        <Label className="text-xs text-muted-foreground">
          {comp.category === 'bibit' ? 'Pilih Vendor → Bibit' : `Pilih ${categoryLabel[comp.category] || comp.category} dari Inventori`}
        </Label>
        {comp.category === 'bibit' ? (
          <BibitSearchDropdown
            inventoryItems={inventoryItems}
            selectedItemId={comp.inventory_item_id}
            onSelect={handleItemSelect}
            onAddNew={handleAddNew}
          />
        ) : (
          <InventorySearchDropdown
            category={comp.category}
            inventoryItems={inventoryItems}
            selectedItemId={comp.inventory_item_id}
            onSelect={handleItemSelect}
            onAddNew={handleAddNew}
            placeholder={`Pilih ${categoryLabel[comp.category] || comp.category}...`}
          />
        )}
      </div>

      {/* Qty + stok info */}
      {comp.inventory_item_id && (
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Kebutuhan</Label>
            <SmartQtyInput
              value={comp.qty_needed || 0}
              onChange={handleQtyChange}
              stockUnit={comp.unit || 'pcs'}
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Stok di Inventori</Label>
            {(() => {
              const stockUnit = comp.unit || 'pcs';
              const stok = comp.stock_available || 0;
              const needed = comp.qty_needed || 0;
              const { sufficient } = checkSufficiency(stok, stockUnit, needed, stockUnit);
              const { display, unit: displayUnit } = smartDisplayQty(stok, stockUnit);
              const isZero = stok <= 0;
              const colorClass = isZero
                ? 'bg-red-50 border-red-200 text-red-700'
                : needed > 0 && sufficient
                ? 'bg-green-50 border-green-200 text-green-700'
                : 'bg-yellow-50 border-yellow-200 text-yellow-700';
              return (
                <div className={`h-8 rounded-md border px-3 flex items-center text-sm font-semibold ${colorClass}`}>
                  {display} {displayUnit}
                </div>
              );
            })()}
          </div>
        </div>
      )}

      {/* Tampil nama item yang dipilih jika ada */}
      {comp.item_name && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Package className="w-3 h-3 shrink-0" />
          <span>{comp.item_name}</span>
          {comp.vendor && <span className="text-muted-foreground">· {comp.vendor}</span>}
        </div>
      )}

      {/* Notes section */}
      {showNotes && (
        <div className="space-y-1 pt-1 border-t border-black/5">
          <Label className="text-xs text-muted-foreground">Catatan Item</Label>
          <Textarea
            value={comp.item_notes || ''}
            onChange={e => onChange({ ...comp, item_notes: e.target.value })}
            placeholder="Keterangan kondisi, spesifikasi, atau info tambahan item ini..."
            rows={2}
            className="text-sm resize-none"
          />
        </div>
      )}
    </div>
    </>
  );
}