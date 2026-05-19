import React, { useState } from 'react';
import { ShoppingCart, ChevronDown, ChevronUp, Edit2, Save, X, CheckCircle2, Truck, Clock, ShoppingBag, Package } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';

const PURCHASE_STATUS_OPTIONS = [
  { value: 'perlu_dibeli', label: 'Perlu Dibeli', icon: ShoppingCart, color: 'bg-red-100 text-red-700 border-red-200', pulse: true },
  { value: 'sudah_po', label: 'Sudah PO', icon: ShoppingBag, color: 'bg-blue-100 text-blue-700 border-blue-200' },
  { value: 'dalam_pengiriman', label: 'Dalam Pengiriman', icon: Truck, color: 'bg-amber-100 text-amber-700 border-amber-200' },
  { value: 'sudah_datang', label: 'Sudah Datang', icon: CheckCircle2, color: 'bg-green-100 text-green-700 border-green-200' },
  // legacy support
  { value: 'sudah_order', label: 'Sudah Order', icon: ShoppingBag, color: 'bg-blue-100 text-blue-700 border-blue-200' },
  { value: 'dalam_perjalanan', label: 'Dalam Perjalanan', icon: Truck, color: 'bg-amber-100 text-amber-700 border-amber-200' },
  { value: 'selesai', label: 'Selesai / Diterima', icon: CheckCircle2, color: 'bg-green-100 text-green-700 border-green-200' },
];

// Status yang dianggap "pending" (sudah PO / dalam pengiriman)
const PENDING_STATUSES = ['sudah_po', 'sudah_order', 'dalam_pengiriman', 'dalam_perjalanan'];
// Status yang dianggap "sudah datang / ready"
const ARRIVED_STATUSES = ['sudah_datang', 'selesai'];

function PurchaseStatusBadge({ status }) {
  // Map legacy keys
  const key = status === 'sudah_order' ? 'sudah_po' : status === 'dalam_perjalanan' ? 'dalam_pengiriman' : status === 'selesai' ? 'sudah_datang' : status;
  const opt = PURCHASE_STATUS_OPTIONS.find(o => o.value === key) || PURCHASE_STATUS_OPTIONS[0];
  const Icon = opt.icon;
  return (
    <span className={`inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full border font-medium ${opt.color} ${opt.pulse ? 'animate-pulse' : ''}`}>
      <Icon className="w-3 h-3" />
      {opt.label}
    </span>
  );
}

const fmtQty = (n) => n != null ? new Intl.NumberFormat('id-ID').format(n) : '—';

function NeedBuyItemRow({ comp, purchaseStatus, onStatusChange }) {
  const [editing, setEditing] = useState(false);
  const [localStatus, setLocalStatus] = useState(purchaseStatus || 'perlu_dibeli');

  const handleSave = () => {
    onStatusChange(comp.inventory_item_id, localStatus);
    setEditing(false);
  };

  const currentStatus = purchaseStatus || 'perlu_dibeli';
  const isArrived = ARRIVED_STATUSES.includes(currentStatus);
  const isPending = PENDING_STATUSES.includes(currentStatus);
  const kurang = Math.max(0, (comp.qty_needed || 0) - (comp.stock_available || 0));

  let rowBg = 'bg-red-50 border-red-200';
  if (isArrived) rowBg = 'bg-green-50 border-green-200 opacity-75';
  else if (isPending) rowBg = 'bg-amber-50 border-amber-200';

  // Only show the 4 main options in the dropdown
  const displayOptions = PURCHASE_STATUS_OPTIONS.slice(0, 4);

  return (
    <div className={`flex items-center gap-3 py-3 px-4 rounded-xl border transition-all ${rowBg}`}>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p className={`text-sm font-semibold ${isArrived ? 'line-through text-muted-foreground' : ''}`}>
            {comp.item_name || '—'}
          </p>
          {isArrived && (
            <span className="text-[10px] bg-green-200 text-green-800 px-1.5 py-0.5 rounded-full font-medium">Ready</span>
          )}
          {isPending && (
            <span className="text-[10px] bg-amber-200 text-amber-800 px-1.5 py-0.5 rounded-full font-medium">Pending</span>
          )}
        </div>
        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
          <span className="text-xs text-muted-foreground">
            Butuh: <strong>{fmtQty(comp.qty_needed)} {comp.unit || 'pcs'}</strong>
          </span>
          <span className="text-xs text-muted-foreground">
            · Stok: <strong className={isArrived ? 'text-green-600' : 'text-red-600'}>{fmtQty(comp.stock_available || 0)}</strong>
          </span>
          {kurang > 0 && !isArrived && (
            <span className="text-xs text-orange-600 font-semibold">· Kurang: {fmtQty(kurang)}</span>
          )}
          {comp.vendor && (
            <span className="text-xs text-muted-foreground">· {comp.vendor}</span>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        {editing ? (
          <>
            <Select value={localStatus} onValueChange={setLocalStatus}>
              <SelectTrigger className="h-7 text-xs w-44">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {displayOptions.map(opt => (
                  <SelectItem key={opt.value} value={opt.value}>
                    <span className="flex items-center gap-1.5">
                      <opt.icon className="w-3 h-3" />
                      {opt.label}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button size="icon" className="h-7 w-7 bg-green-600 hover:bg-green-700" onClick={handleSave}>
              <Save className="w-3 h-3" />
            </Button>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setLocalStatus(currentStatus); setEditing(false); }}>
              <X className="w-3 h-3" />
            </Button>
          </>
        ) : (
          <>
            <PurchaseStatusBadge status={currentStatus} />
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-muted-foreground hover:text-foreground"
              onClick={() => setEditing(true)}
              title="Edit status pembelian"
            >
              <Edit2 className="w-3 h-3" />
            </Button>
          </>
        )}
      </div>
    </div>
  );
}

/**
 * NeedBuySection — tampilkan daftar item yang perlu dibeli beserta status pembeliannya.
 * purchaseStatuses: { [inventory_item_id]: 'perlu_dibeli' | 'sudah_order' | 'dalam_perjalanan' | 'selesai' }
 * onStatusChange: (itemId, newStatus) => void
 * onAllSelesai: () => void — dipanggil ketika semua item sudah selesai
 */
export default function NeedBuySection({ needBuyComps, purchaseStatuses = {}, onStatusChange }) {
  const [collapsed, setCollapsed] = useState(false);

  if (!needBuyComps || needBuyComps.length === 0) return null;

  const totalItem = needBuyComps.length;
  const arrivedCount = needBuyComps.filter(c => ARRIVED_STATUSES.includes(purchaseStatuses[c.inventory_item_id] || '')).length;
  const dalperCount = needBuyComps.filter(c => ['dalam_pengiriman', 'dalam_perjalanan'].includes(purchaseStatuses[c.inventory_item_id] || '')).length;
  const sudahPoCount = needBuyComps.filter(c => ['sudah_po', 'sudah_order'].includes(purchaseStatuses[c.inventory_item_id] || '')).length;
  const perluBeliCount = needBuyComps.filter(c => !purchaseStatuses[c.inventory_item_id] || purchaseStatuses[c.inventory_item_id] === 'perlu_dibeli').length;

  return (
    <Card className="border-red-200 bg-red-50/30">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <ShoppingCart className="w-4 h-4 text-red-600" />
            <CardTitle className="text-base text-red-800">
              {totalItem} Item Perlu Dibeli
            </CardTitle>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {arrivedCount > 0 && <Badge className="bg-green-100 text-green-700 border-green-200">{arrivedCount} sudah datang</Badge>}
            {dalperCount > 0 && <Badge className="bg-amber-100 text-amber-700 border-amber-200">{dalperCount} dalam pengiriman</Badge>}
            {sudahPoCount > 0 && <Badge className="bg-blue-100 text-blue-700 border-blue-200">{sudahPoCount} sudah PO</Badge>}
            {perluBeliCount > 0 && <Badge className="bg-red-100 text-red-700 border-red-200">{perluBeliCount} perlu dibeli</Badge>}
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setCollapsed(c => !c)}>
              {collapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
            </Button>
          </div>
        </div>
        {arrivedCount < totalItem && (
          <p className="text-xs text-red-600 mt-1">
            Tandai status PO setiap item. Sudah PO/Dalam Pengiriman → <strong>Pending</strong>. Sudah Datang → <strong>Ready</strong>.
          </p>
        )}
        {arrivedCount === totalItem && totalItem > 0 && (
          <p className="text-xs text-green-700 mt-1 font-semibold">✓ Semua item sudah datang! Progress PO diupdate.</p>
        )}
      </CardHeader>
      {!collapsed && (
        <CardContent className="space-y-2 pt-0">
          {needBuyComps.map((comp, i) => (
            <NeedBuyItemRow
              key={comp.inventory_item_id || i}
              comp={comp}
              purchaseStatus={purchaseStatuses[comp.inventory_item_id] || 'perlu_dibeli'}
              onStatusChange={onStatusChange}
            />
          ))}
        </CardContent>
      )}
    </Card>
  );
}