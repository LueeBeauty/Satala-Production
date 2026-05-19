import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { CheckCircle2, Truck, Calendar, Package, Edit2, CheckCheck, ExternalLink } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function ShippingCard({ order, onUpdate, onMarkShipped }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    shipping_date: order.shipping_date || '',
    shipping_address: order.shipping_address || '',
    courier: order.courier || '',
    tracking_number: order.tracking_number || '',
    final_qty: order.final_qty || order.target_qty || '',
    notes: order.notes || '',
  });

  const handleSave = (e) => {
    e.preventDefault();
    onUpdate({ ...form, final_qty: Number(form.final_qty) || 0 });
    setOpen(false);
  };

  return (
    <Card className="border-green-200/60 bg-green-50/30 hover:shadow-md transition-shadow">
      <CardContent className="p-5">
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-mono text-muted-foreground">#{order.order_number}</span>
              <span className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full bg-green-100 text-green-700">
                <CheckCircle2 className="w-3 h-3" /> Selesai
              </span>
            </div>
            <Link to={`/production/${order.id}`} className="hover:underline">
              <h3 className="font-display text-lg font-semibold truncate leading-tight">{order.brand_name}</h3>
            </Link>
            {order.product_name && <p className="text-xs text-muted-foreground">{order.product_name}</p>}
          </div>
          <div className="flex gap-1 shrink-0">
            <Link to={`/production/${order.id}`} title="Lihat Detail PO">
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <ExternalLink className="w-3.5 h-3.5" />
              </Button>
            </Link>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
                <Edit2 className="w-3.5 h-3.5" />
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle className="font-display">Info Pengiriman — {order.brand_name}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSave} className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Tanggal Kirim</Label>
                    <Input type="date" value={form.shipping_date} onChange={e => setForm(f => ({ ...f, shipping_date: e.target.value }))} />
                  </div>
                  <div>
                    <Label>Final Qty</Label>
                    <Input type="number" value={form.final_qty} onChange={e => setForm(f => ({ ...f, final_qty: e.target.value }))} />
                  </div>
                </div>
                <div>
                  <Label>Alamat Pengiriman</Label>
                  <Textarea value={form.shipping_address} onChange={e => setForm(f => ({ ...f, shipping_address: e.target.value }))} rows={2} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Kurir</Label>
                    <Input value={form.courier} onChange={e => setForm(f => ({ ...f, courier: e.target.value }))} placeholder="JNE, JT, dll" />
                  </div>
                  <div>
                    <Label>No. Resi</Label>
                    <Input value={form.tracking_number} onChange={e => setForm(f => ({ ...f, tracking_number: e.target.value }))} />
                  </div>
                </div>
                <div>
                  <Label>Catatan</Label>
                  <Textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={2} />
                </div>
                <Button type="submit" className="w-full">Simpan Info Pengiriman</Button>
              </form>
            </DialogContent>
          </Dialog>
          </div>
        </div>

        {/* Shipping info summary */}
        <div className="space-y-1.5 text-xs text-muted-foreground">
          {order.final_qty > 0 && (
            <div className="flex items-center gap-2">
              <Package className="w-3.5 h-3.5 shrink-0" />
              <span><strong className="text-foreground">{order.final_qty?.toLocaleString()}</strong> pcs</span>
            </div>
          )}
          {order.shipping_date && (
            <div className="flex items-center gap-2">
              <Calendar className="w-3.5 h-3.5 shrink-0" />
              <span>Kirim: <strong className="text-foreground">{new Date(order.shipping_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' })}</strong></span>
            </div>
          )}
          {order.courier && (
            <div className="flex items-center gap-2">
              <Truck className="w-3.5 h-3.5 shrink-0" />
              <span>{order.courier}{order.tracking_number ? ` · ${order.tracking_number}` : ''}</span>
            </div>
          )}
          {!order.shipping_date && !order.courier && (
            <p className="text-[11px] italic">Belum ada info pengiriman — klik edit untuk mengisi</p>
          )}
          {order.shipping_address && (
            <p className="text-[11px] pt-1 border-t border-border/40 line-clamp-2">{order.shipping_address}</p>
          )}
        </div>

        {/* Mark as shipped */}
        <div className="mt-3 pt-3 border-t border-green-200/50">
          <Button
            size="sm"
            className="w-full gap-2 bg-green-600 hover:bg-green-700 text-white h-8 text-xs"
            onClick={() => {
              if (confirm('Tandai PO ini sudah selesai dikirim ke customer?')) onMarkShipped();
            }}
          >
            <CheckCheck className="w-3.5 h-3.5" /> Tandai Selesai Kirim
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}