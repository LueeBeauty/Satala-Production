import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, Package, Truck, MapPin, Calendar, Hash, FlaskConical } from 'lucide-react';

const statusDot = { pending: 'bg-gray-400', in_progress: 'bg-yellow-500', ready: 'bg-green-500' };
const statusLabel = { pending: 'Pending', in_progress: 'In Progress', ready: 'Ready' };

export default function ShippedDetailDialog({ order, open, onClose }) {
  if (!order) return null;
  const components = order.components || [];

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display text-xl">{order.brand_name}</DialogTitle>
          {order.product_name && <p className="text-sm text-muted-foreground">{order.product_name}</p>}
        </DialogHeader>

        {/* Info Grid */}
        <div className="grid grid-cols-2 gap-3 text-sm">
          {order.shipped_at && (
            <div className="flex items-start gap-2 bg-green-50 rounded-lg p-3">
              <Calendar className="w-4 h-4 text-green-600 mt-0.5 shrink-0" />
              <div>
                <p className="text-[11px] text-muted-foreground">Tanggal Selesai</p>
                <p className="font-medium text-green-700">
                  {new Date(order.shipped_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
                </p>
              </div>
            </div>
          )}
          {(order.target_qty > 0 || order.final_qty > 0) && (
            <div className="flex items-start gap-2 bg-muted/50 rounded-lg p-3">
              <Package className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
              <div>
                <p className="text-[11px] text-muted-foreground">Qty</p>
                {order.target_qty > 0 && <p className="text-xs">Target: <strong>{order.target_qty?.toLocaleString()}</strong> pcs</p>}
                {order.final_qty > 0 && <p className="text-xs">Final: <strong>{order.final_qty?.toLocaleString()}</strong> pcs</p>}
              </div>
            </div>
          )}
          {order.courier && (
            <div className="flex items-start gap-2 bg-muted/50 rounded-lg p-3">
              <Truck className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
              <div>
                <p className="text-[11px] text-muted-foreground">Kurir</p>
                <p className="font-medium">{order.courier}</p>
              </div>
            </div>
          )}
          {order.tracking_number && (
            <div className="flex items-start gap-2 bg-muted/50 rounded-lg p-3">
              <Hash className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
              <div>
                <p className="text-[11px] text-muted-foreground">Resi</p>
                <p className="font-mono text-xs font-medium break-all">{order.tracking_number}</p>
              </div>
            </div>
          )}
          {order.shipping_address && (
            <div className="col-span-2 flex items-start gap-2 bg-muted/50 rounded-lg p-3">
              <MapPin className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
              <div>
                <p className="text-[11px] text-muted-foreground">Alamat Pengiriman</p>
                <p className="text-sm">{order.shipping_address}</p>
              </div>
            </div>
          )}
        </div>

        {/* Components */}
        {components.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-2">
              <FlaskConical className="w-4 h-4 text-muted-foreground" />
              <p className="font-semibold text-sm">Komponen ({components.length})</p>
            </div>
            <div className="space-y-1.5">
              {components.map((comp, idx) => (
                <div key={idx} className="flex items-center gap-3 bg-muted/30 rounded-lg px-3 py-2">
                  {comp.color_code && (
                    <div className="w-3 h-3 rounded-full shrink-0 border border-border/50" style={{ backgroundColor: comp.color_code }} />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{comp.name}</p>
                    {comp.vendor && <p className="text-[11px] text-muted-foreground">{comp.vendor}</p>}
                  </div>
                  <div className="text-right shrink-0">
                    {(comp.current_qty > 0 || comp.target_qty > 0) && (
                      <p className="text-xs text-muted-foreground">{comp.current_qty || 0}/{comp.target_qty || 0} pcs</p>
                    )}
                    <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                      <span className={`w-1.5 h-1.5 rounded-full mr-1 ${statusDot[comp.status] || 'bg-gray-400'}`} />
                      {statusLabel[comp.status] || comp.status}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Notes */}
        {order.notes && (
          <div className="bg-muted/30 rounded-lg p-3">
            <p className="text-[11px] text-muted-foreground mb-1">Catatan</p>
            <p className="text-sm">{order.notes}</p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}