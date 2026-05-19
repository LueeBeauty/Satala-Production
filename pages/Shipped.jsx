import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Search, ArrowUpDown, CheckCircle2, Package, Trash2, ExternalLink, Undo2, Pencil, FileText, Truck, ChevronDown, ChevronUp, FileDown } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import LastUpdated from '@/components/ui/LastUpdated';
import { useSession } from '@/lib/SessionContext';
import { canManageSelesai } from '@/lib/AuthSession';
import EditShippedModal from '@/components/shipped/EditShippedModal';
import SuratJalanPrint from '@/components/production/SuratJalanPrint';
import { exportToPDF } from '@/utils/exportPDF';

function formatRupiah(val) {
  if (!val && val !== 0) return '-';
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(val);
}

export default function Shipped() {
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState('shipped_at');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [editOrder, setEditOrder] = useState(null);
  const [suratJalanOrder, setSuratJalanOrder] = useState(null);
  const [expanded, setExpanded] = useState(null);
  const queryClient = useQueryClient();

  const { member } = useSession();
  const canEdit = canManageSelesai(member);

  const { data: orders = [], isLoading } = useQuery({
    queryKey: ['shipped-orders'],
    queryFn: () => base44.entities.ProductionOrder.filter({ is_shipped: true }),
  });

  const { data: settingsList = [] } = useQuery({
    queryKey: ['company-settings'],
    queryFn: () => base44.entities.CompanySettings.list(),
  });
  const companySettings = settingsList[0] || {};

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.ProductionOrder.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shipped-orders'] });
      queryClient.invalidateQueries({ queryKey: ['production-orders'] });
      toast.success('PO dihapus');
    },
  });

  const unshipMutation = useMutation({
    mutationFn: (id) => base44.entities.ProductionOrder.update(id, { is_shipped: false, shipped_at: null }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shipped-orders'] });
      queryClient.invalidateQueries({ queryKey: ['production-orders'] });
      toast.success('PO dikembalikan ke pengiriman');
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.ProductionOrder.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shipped-orders'] });
      queryClient.invalidateQueries({ queryKey: ['production-orders'] });
      toast.success('Data berhasil diperbarui');
      setEditOrder(null);
    },
  });

  const handleExport = () => {
    const subtitle = (dateFrom || dateTo)
      ? `Periode: ${dateFrom || '...'} s/d ${dateTo || '...'} · ${filtered.length} PO`
      : `Total ${filtered.length} PO telah dikirim`;
    exportToPDF({
      title: 'Laporan Orderan Selesai',
      subtitle,
      filename: 'Orderan-Selesai',
      columns: [
        { key: 'order_number', label: 'No. PO', render: o => `PO-${o.order_number || '-'}` },
        { key: 'brand_name', label: 'Brand' },
        { key: 'product_name', label: 'Produk', render: o => o.product_name || '-' },
        { key: 'final_qty', label: 'Qty', render: o => `${(o.final_qty || o.target_qty || 0).toLocaleString()} pcs` },
        { key: 'ukuran_botol_ml', label: 'Ukuran', render: o => o.ukuran_botol_ml ? `${o.ukuran_botol_ml} ml` : '-' },
        { key: 'shipped_at', label: 'Tgl Kirim', render: o => o.shipped_at ? new Date(o.shipped_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }) : '-' },
        { key: 'shipping_via', label: 'Via', render: o => o.shipping_via || o.courier || '-' },
        { key: 'tracking_number', label: 'No. Resi', render: o => o.tracking_number || '-' },
        { key: 'ongkir_payer', label: 'Ongkir', render: o => o.ongkir_payer === 'pabrik' ? `Pabrik${o.ongkir_amount ? ` (${formatRupiah(o.ongkir_amount)})` : ''}` : o.ongkir_payer === 'customer' ? 'Customer' : '-' },
        { key: 'notes', label: 'Catatan', render: o => o.notes || '-' },
      ],
      rows: filteredForExport,
    });
  };

  const applyFilters = (list) =>
    list.filter(o => {
      const matchSearch = !search ||
        o.brand_name?.toLowerCase().includes(search.toLowerCase()) ||
        o.product_name?.toLowerCase().includes(search.toLowerCase());
      const matchFrom = !dateFrom || (o.shipped_at && o.shipped_at >= dateFrom);
      const matchTo = !dateTo || (o.shipped_at && o.shipped_at <= dateTo);
      return matchSearch && matchFrom && matchTo;
    }).sort((a, b) => {
      if (sortBy === 'shipped_at') return new Date(b.shipped_at || '2000-01-01') - new Date(a.shipped_at || '2000-01-01');
      if (sortBy === 'brand_name') return (a.brand_name || '').localeCompare(b.brand_name || '');
      return 0;
    });

  const filtered = applyFilters(orders);
  const filteredForExport = filtered;

  // Build product item list from a PO
  const getProductItems = (order) => {
    const items = [];
    const botolComps = (order.components || []).filter(c => c.category === 'botol' && c.item_name);
    if (botolComps.length > 0) {
      botolComps.forEach(comp => {
        items.push({
          nama: order.product_name || order.brand_name,
          keterangan: order.ukuran_botol_ml ? `${order.ukuran_botol_ml} ml` : comp.item_name,
          qty: order.final_qty || order.target_qty || comp.qty_needed || 0,
        });
      });
    } else {
      items.push({
        nama: order.product_name || order.brand_name,
        keterangan: order.ukuran_botol_ml ? `${order.ukuran_botol_ml} ml` : '-',
        qty: order.final_qty || order.target_qty || 0,
      });
    }
    return items;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="font-display text-3xl font-bold tracking-tight">Arsip Selesai</h1>
          <p className="text-muted-foreground text-sm mt-1">{orders.length} PO telah selesai dikirim</p>
        </div>
        <Button variant="outline" onClick={handleExport} className="gap-2 shrink-0">
          <FileDown className="w-4 h-4" /> Export PDF
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 items-center">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Cari brand atau produk..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9 w-52"
          />
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-muted-foreground whitespace-nowrap">Dari:</span>
          <Input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="w-36 h-9" />
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-muted-foreground whitespace-nowrap">S/d:</span>
          <Input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="w-36 h-9" />
        </div>
        {(dateFrom || dateTo) && (
          <button className="text-xs text-muted-foreground hover:text-foreground h-9 px-2" onClick={() => { setDateFrom(''); setDateTo(''); }}>Reset</button>
        )}
        <Select value={sortBy} onValueChange={setSortBy}>
          <SelectTrigger className="w-44 h-9 ml-auto">
            <ArrowUpDown className="w-4 h-4 mr-2" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="shipped_at">Tanggal Selesai</SelectItem>
            <SelectItem value="brand_name">Nama Brand (A-Z)</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {Array(4).fill(0).map((_, i) => <div key={i} className="h-20 rounded-xl bg-muted animate-pulse" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20 text-muted-foreground">
          <CheckCircle2 className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p>Belum ada PO yang selesai dikirim</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(order => {
            const isExpanded = expanded === order.id;
            const items = getProductItems(order);
            const via = order.shipping_via || order.courier;

            return (
              <Card key={order.id} className="border-green-200/40 bg-green-50/20 group hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  {/* Main row */}
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center shrink-0">
                      <CheckCircle2 className="w-5 h-5 text-green-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-semibold text-base">{order.brand_name}</h3>
                        {order.product_name && (
                          <span className="text-xs text-muted-foreground">— {order.product_name}</span>
                        )}
                        {order.ukuran_botol_ml && (
                          <Badge variant="outline" className="text-xs">{order.ukuran_botol_ml} ml</Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-3 mt-1 flex-wrap">
                        {order.shipped_at && (
                          <p className="text-xs font-medium text-green-700">
                            {new Date(order.shipped_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' })}
                          </p>
                        )}
                        {(order.final_qty > 0 || order.target_qty > 0) && (
                          <p className="text-xs text-muted-foreground flex items-center gap-1">
                            <Package className="w-3 h-3" /> {(order.final_qty || order.target_qty)?.toLocaleString()} pcs
                          </p>
                        )}
                        {via && (
                          <p className="text-xs text-muted-foreground flex items-center gap-1">
                            <Truck className="w-3 h-3" /> {via}{order.tracking_number ? ` · ${order.tracking_number}` : ''}
                          </p>
                        )}
                        {/* Ongkir badge */}
                        {order.ongkir_payer && (
                          <Badge
                            variant="outline"
                            className={`text-xs ${order.ongkir_payer === 'pabrik' ? 'border-orange-300 text-orange-700 bg-orange-50' : 'border-blue-300 text-blue-700 bg-blue-50'}`}
                          >
                            Ongkir: {order.ongkir_payer === 'pabrik' ? `Pabrik${order.ongkir_amount ? ` (${formatRupiah(order.ongkir_amount)})` : ''}` : 'Customer'}
                          </Badge>
                        )}
                        <LastUpdated date={order.updated_date || order.created_date} />
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1 shrink-0">
                      <Button
                        variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground"
                        title="Surat Jalan"
                        onClick={() => setSuratJalanOrder(order)}
                      >
                        <FileText className="w-4 h-4" />
                      </Button>
                      {canEdit && (
                        <Button
                          variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground"
                          title="Edit"
                          onClick={() => setEditOrder(order)}
                        >
                          <Pencil className="w-4 h-4" />
                        </Button>
                      )}
                      <button
                        className="h-8 w-8 flex items-center justify-center rounded-md hover:bg-muted text-muted-foreground"
                        onClick={() => setExpanded(isExpanded ? null : order.id)}
                      >
                        {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </button>
                      <Link to={`/production/${order.id}`} title="Lihat detail PO">
                        <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity">
                          <ExternalLink className="w-4 h-4" />
                        </Button>
                      </Link>
                      {canEdit && (
                        <>
                          <Button
                            variant="ghost" size="icon" className="h-8 w-8 text-yellow-600 hover:text-yellow-700 opacity-0 group-hover:opacity-100 transition-opacity"
                            title="Kembalikan ke pengiriman"
                            onClick={() => {
                              if (confirm('Kembalikan PO ini ke tab Pengiriman?')) unshipMutation.mutate(order.id);
                            }}
                          >
                            <Undo2 className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                            title="Hapus PO"
                            onClick={() => {
                              if (confirm(`Hapus PO "${order.brand_name}" secara permanen?`)) deleteMutation.mutate(order.id);
                            }}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Expanded detail */}
                  {isExpanded && (
                    <div className="mt-4 pt-4 border-t border-green-200/60 space-y-4">
                      {/* Product Table */}
                      <div>
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Detail Produk</p>
                        <div className="rounded-xl border border-border overflow-hidden">
                          <table className="w-full text-sm">
                            <thead>
                              <tr className="bg-muted/60">
                                <th className="text-left px-3 py-2 text-xs font-semibold text-muted-foreground">Nama Produk</th>
                                <th className="text-left px-3 py-2 text-xs font-semibold text-muted-foreground">Ukuran</th>
                                <th className="text-center px-3 py-2 text-xs font-semibold text-muted-foreground">Qty</th>
                                <th className="text-center px-3 py-2 text-xs font-semibold text-muted-foreground">Satuan</th>
                              </tr>
                            </thead>
                            <tbody>
                              {items.map((item, idx) => (
                                <tr key={idx} className="border-t border-border">
                                  <td className="px-3 py-2 font-medium">{item.nama}</td>
                                  <td className="px-3 py-2 text-muted-foreground">{item.keterangan}</td>
                                  <td className="px-3 py-2 text-center font-bold">{item.qty > 0 ? item.qty.toLocaleString('id-ID') : '-'}</td>
                                  <td className="px-3 py-2 text-center text-muted-foreground">pcs</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>

                      {/* Ongkir detail */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        {[
                          { label: 'Via', value: via || '-' },
                          { label: 'No. Resi', value: order.tracking_number || '-' },
                          {
                            label: 'Ongkir',
                            value: order.ongkir_payer === 'pabrik'
                              ? `Pabrik${order.ongkir_amount ? ` — ${formatRupiah(order.ongkir_amount)}` : ''}`
                              : order.ongkir_payer === 'customer' ? 'Customer'
                              : '-'
                          },
                          { label: 'Alamat', value: order.shipping_address || '-' },
                        ].map(({ label, value }) => (
                          <div key={label} className="bg-muted/30 rounded-xl p-3">
                            <p className="text-xs text-muted-foreground mb-0.5">{label}</p>
                            <p className="text-sm font-semibold truncate" title={value}>{value}</p>
                          </div>
                        ))}
                      </div>

                      {/* Notes */}
                      {order.notes && (
                        <div className="bg-amber-50/60 border border-amber-200/60 rounded-xl px-3 py-2 text-xs text-amber-800">
                          <span className="font-semibold">Catatan: </span>{order.notes}
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Edit Modal */}
      {editOrder && (
        <EditShippedModal
          order={editOrder}
          onSave={(data) => updateMutation.mutate({ id: editOrder.id, data })}
          onCancel={() => setEditOrder(null)}
          isSaving={updateMutation.isPending}
        />
      )}

      {/* Surat Jalan */}
      {suratJalanOrder && (
        <SuratJalanPrint
          order={suratJalanOrder}
          companySettings={companySettings}
          onClose={() => setSuratJalanOrder(null)}
        />
      )}
    </div>
  );
}