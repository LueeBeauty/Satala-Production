import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { ChevronRight, Lock, FlaskConical } from 'lucide-react';
import { Link } from 'react-router-dom';
import ProgressRing from './ProgressRing';
import StatusBadge from './StatusBadge';
import { formatRelativeTime } from '@/lib/timeUtils';
import LastUpdated from '@/components/ui/LastUpdated';

const ARRIVED_STATUSES = ['sudah_datang', 'selesai'];
const PENDING_PO_STATUSES = ['sudah_po', 'sudah_order', 'dalam_pengiriman', 'dalam_perjalanan'];

export default function BrandCard({ order }) {
  const components = order.components || [];
  const purchaseStatuses = order.purchase_statuses || {};
  const addons = order.additional_components || [];

  // Hitung progress: sama persis dengan ProductionDetail
  const linkedComps = components.filter(c => c.inventory_item_id);

  const getEffectiveStatus = (comp) => {
    const ps = purchaseStatuses[comp.inventory_item_id];
    if (ARRIVED_STATUSES.includes(ps)) return 'ready';
    if (PENDING_PO_STATUSES.includes(ps)) return 'pending_po';
    return comp.status; // 'ready' | 'need_buy' | 'pending'
  };

  const readyCount = linkedComps.filter(c => getEffectiveStatus(c) === 'ready').length;
  const totalCount = linkedComps.length;
  const needBuyCount = linkedComps.filter(c => c.status === 'need_buy' && !ARRIVED_STATUSES.includes(purchaseStatuses[c.inventory_item_id]) && !PENDING_PO_STATUSES.includes(purchaseStatuses[c.inventory_item_id])).length;

  // Gabungkan addons ke progress (sama seperti ProductionDetail)
  const addonTotal = addons.length;
  const addonReady = addons.filter(a => a.status === 'sudah_diterima').length;
  const totalItems = totalCount + addonTotal;
  const totalReady = readyCount + addonReady;
  const percentage = totalItems > 0 ? Math.round((totalReady / totalItems) * 100) : 0;

  return (
    <Link to={`/production/${order.id}`}>
      <Card className="group hover:shadow-lg transition-all duration-300 hover:-translate-y-0.5 cursor-pointer border-border/60 overflow-hidden">
        <CardContent className="p-5">
          <div className="flex items-start gap-4">
            <ProgressRing percentage={percentage} size={64} strokeWidth={5} />

            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground font-mono">#{order.order_number}</span>
                  <StatusBadge status={order.status} small />
                  {order.is_dynamic_qty && (
                    <Lock className="w-3 h-3 text-muted-foreground" title="Dynamic Qty" />
                  )}
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors" />
              </div>

              <h3 className="font-display text-lg font-semibold truncate leading-tight">{order.brand_name}</h3>
              {order.product_name && (
                <p className="text-xs text-muted-foreground truncate">{order.product_name}</p>
              )}

              <div className="flex items-center gap-1.5 mt-3 flex-wrap">
                {linkedComps.map((comp, i) => {
                  const effStatus = getEffectiveStatus(comp);
                  const color = effStatus === 'ready'
                    ? 'bg-green-100 text-green-700'
                    : effStatus === 'need_buy'
                    ? 'bg-red-100 text-red-600'
                    : effStatus === 'pending_po'
                    ? 'bg-blue-100 text-blue-600'
                    : 'bg-yellow-100 text-yellow-700';
                  const dot = effStatus === 'ready'
                    ? 'bg-green-500'
                    : effStatus === 'need_buy'
                    ? 'bg-red-500'
                    : effStatus === 'pending_po'
                    ? 'bg-blue-400'
                    : 'bg-yellow-500';
                  return (
                    <span key={i} className={`inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full font-medium ${color}`}>
                      <span className={`w-1 h-1 rounded-full ${dot}`} />
                      {comp.item_name || comp.name}
                    </span>
                  );
                })}
                {needBuyCount > 0 && (
                  <span className="text-[10px] bg-red-500 text-white px-1.5 py-0.5 rounded-full font-bold">
                    {needBuyCount} HARUS BELI
                  </span>
                )}
              </div>

              {/* Racikan summary */}
              {order.racikan_digunakan?.length > 0 && (
                <div className="mt-2 flex items-center gap-1.5 flex-wrap">
                  <FlaskConical className="w-3 h-3 text-purple-500 shrink-0" />
                  <span className="text-[10px] text-purple-600 font-medium">
                    {order.racikan_digunakan.length} bahan racikan
                    {order.ukuran_botol_ml ? ` · ${order.ukuran_botol_ml}ml` : ''}
                  </span>
                  {order.racikan_digunakan.map((r, i) => {
                    // Hitung kebutuhan jika ada ukuran botol + target qty
                    const kebutuhanMl = order.ukuran_botol_ml && order.target_qty
                      ? (r.persentase / 100) * order.ukuran_botol_ml * order.target_qty
                      : r.kebutuhan_ml || null;
                    const label = kebutuhanMl
                      ? `${r.nama_bahan} ${r.persentase}% = ${kebutuhanMl >= 1000 ? (kebutuhanMl / 1000).toFixed(1) + 'L' : kebutuhanMl + 'ml'}`
                      : r.kebutuhan_nilai
                      ? `${r.nama_bahan} ${r.persentase}% = ${r.kebutuhan_nilai}${r.kebutuhan_satuan || ''}`
                      : `${r.nama_bahan} ${r.persentase}%`;
                    return (
                      <span key={i} className="text-[10px] bg-purple-50 text-purple-700 px-1.5 py-0.5 rounded-full border border-purple-200">
                        {label}
                      </span>
                    );
                  })}
                </div>
              )}

              {order.notes && (
                <p className="text-[11px] text-muted-foreground mt-2 line-clamp-1">{order.notes}</p>
              )}
            </div>
          </div>

          <div className="mt-3 pt-3 border-t border-border/50 flex items-center justify-between text-xs text-muted-foreground">
            <div className="flex items-center gap-3 flex-wrap">
              {order.target_qty > 0 && (
                <span>Target: <strong className="text-foreground">{order.target_qty?.toLocaleString()} pcs</strong></span>
              )}
              {order.deadline && (
                <span>Deadline: <strong className="text-foreground">{new Date(order.deadline).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', timeZone: 'UTC' })}</strong></span>
              )}
              {order.pic_marketing && (
                <span className="bg-primary/10 text-primary px-1.5 py-0.5 rounded-full font-medium">👤 {order.pic_marketing}</span>
              )}
            </div>
            <LastUpdated date={order.updated_date || order.created_date} />
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}