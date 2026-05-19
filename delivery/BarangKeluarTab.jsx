import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Plus, PackageMinus, ChevronDown, ChevronUp, Pencil, Trash2, RefreshCw, ClipboardCheck, FileDown, UserCircle2, Navigation, Banknote, StickyNote } from 'lucide-react';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';
import LastUpdated from '@/components/ui/LastUpdated';
import BarangKeluarManualForm from '@/components/delivery/BarangKeluarManualForm';
import BarangKeluarEditForm from '@/components/delivery/BarangKeluarEditForm';
import { exportToPDF } from '@/utils/exportPDF';
import { useSession } from '@/lib/SessionContext';
import { canManageDelivery } from '@/lib/AuthSession';

export default function BarangKeluarTab() {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editRecord, setEditRecord] = useState(null);
  const [expanded, setExpanded] = useState(null);
  const [search, setSearch] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [syncing, setSyncing] = useState(false);

  const { member } = useSession();
  const canEdit = canManageDelivery(member);

  const { data: records = [], isLoading } = useQuery({
    queryKey: ['barang-keluar'],
    queryFn: () => base44.entities.BarangKeluar.list('-created_date'),
  });

  const { data: orders = [] } = useQuery({
    queryKey: ['production-orders'],
    queryFn: () => base44.entities.ProductionOrder.list('-updated_date'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.BarangKeluar.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['barang-keluar'] }),
  });

  // PO yang sudah done dan belum pernah di-sync ke barang keluar
  const syncedPoIds = useMemo(() => {
    const ids = new Set();
    records.forEach(r => { if (r.source_po_id) ids.add(r.source_po_id); });
    return ids;
  }, [records]);

  const donePOs = useMemo(() =>
    orders.filter(o => o.status === 'done' && !syncedPoIds.has(o.id)),
    [orders, syncedPoIds]
  );

  // Sync: baca PO done → buat record barang keluar per item (packaging + bahan cair)
  const handleSyncPO = async () => {
    if (donePOs.length === 0) return alert('Tidak ada PO done baru yang perlu disync.');
    if (!confirm(`Sync ${donePOs.length} PO yang sudah selesai ke catatan barang keluar?\n\nCatatan: Ini hanya mencatat riwayat pengeluaran barang. Stok inventori sudah otomatis dikurangi saat PO ditandai selesai.`)) return;
    setSyncing(true);
    for (const po of donePOs) {
      const items = [];

      // Komponen packaging (botol, spray, tutup, dll)
      (po.components || []).forEach(comp => {
        if (!comp.item_name) return;
        items.push({
          nama_barang: comp.item_name,
          kategori: comp.category || comp.name || '-',
          jumlah: comp.qty_needed || 0,
          satuan: comp.unit || 'pcs',
          vendor: comp.vendor || '-',
          item_id: comp.inventory_item_id || '',
          item_tipe: comp.category || '',
        });
      });

      // Racikan / bahan cair
      (po.racikan_digunakan || []).forEach(r => {
        if (!r.nama_bahan) return;
        items.push({
          nama_barang: r.nama_bahan,
          kategori: r.kategori_bahan || 'Bahan Cair',
          jumlah: r.kebutuhan_nilai || 0,
          satuan: r.kebutuhan_satuan || 'g',
          vendor: r.vendor || '-',
          item_id: '',
          item_tipe: 'bahan',
        });
      });

      if (items.length === 0) continue;

      const sudahDikurangi = po.stock_deducted
        ? ` — Stok sudah dikurangi otomatis (${po.stock_deducted_trigger === 'in_progress' ? 'saat In Progress' : 'saat Selesai'})`
        : '';

      await base44.entities.BarangKeluar.create({
        nomor_referensi: `PO-${po.order_number || po.id.slice(-6)}`,
        tanggal: po.shipped_at || po.shipping_date || new Date().toISOString().split('T')[0],
        tujuan: po.brand_name || '',
        alasan: 'Produksi (PO)',
        catatan: `Auto-sync dari PO #${po.order_number} — ${po.brand_name} ${po.product_name || ''}${sudahDikurangi}`.trim(),
        source_po_id: po.id,
        items,
      });
    }
    await queryClient.invalidateQueries({ queryKey: ['barang-keluar'] });
    setSyncing(false);
  };

  const filtered = records.filter(r => {
    const matchSearch = !search ||
      r.nomor_referensi?.toLowerCase().includes(search.toLowerCase()) ||
      r.tujuan?.toLowerCase().includes(search.toLowerCase()) ||
      r.alasan?.toLowerCase().includes(search.toLowerCase());
    const matchFrom = !dateFrom || (r.tanggal && r.tanggal >= dateFrom);
    const matchTo = !dateTo || (r.tanggal && r.tanggal <= dateTo);
    return matchSearch && matchFrom && matchTo;
  });

  const handleDelete = (record) => {
    if (!confirm(`Hapus catatan barang keluar "${record.nomor_referensi || 'ini'}"?`)) return;
    deleteMutation.mutate(record.id);
  };

  const handleExport = () => {
    const subtitle = (dateFrom || dateTo)
      ? `Periode: ${dateFrom || '...'} s/d ${dateTo || '...'} · ${filtered.length} data`
      : `Total ${filtered.length} catatan pengeluaran`;
    exportToPDF({
      title: 'Laporan Barang Keluar',
      subtitle,
      filename: 'Barang-Keluar',
      columns: [
        { key: 'nomor_referensi', label: 'No. Referensi' },
        { key: 'tanggal', label: 'Tanggal', render: r => r.tanggal ? format(new Date(r.tanggal + 'T00:00:00'), 'dd/MM/yyyy') : '-' },
        { key: 'tujuan', label: 'Tujuan', render: r => r.tujuan || '-' },
        { key: 'alasan', label: 'Alasan', render: r => r.alasan || '-' },
        { key: 'ekspedisi', label: 'Ekspedisi', render: r => r.ekspedisi || '-' },
        { key: 'ongkir', label: 'Ongkir', render: r => {
          if (!r.ongkir || r.ongkir <= 0) return '-';
          const dibayar = r.ongkir_dibayar_oleh === 'Perusahaan' ? 'dari Perusahaan' : r.ongkir_dibayar_oleh === 'Customer' ? 'dari Client' : r.ongkir_dibayar_oleh === 'Split' ? '(Split)' : '';
          return `Rp ${r.ongkir.toLocaleString('id-ID')} ${dibayar}`;
        }},
        { key: 'items', label: 'Jml Item', render: r => `${r.items?.length || 0} item` },
        { key: 'items_detail', label: 'Detail Barang', render: r => (r.items || []).map(i => `${i.nama_barang} (-${i.jumlah} ${i.satuan})`).join(', ') || '-' },
        { key: 'pic', label: 'PIC', render: r => r.pic || '-' },
        { key: 'catatan', label: 'Catatan', render: r => r.catatan || '-' },
      ],
      rows: filtered,
    });
  };

  return (
    <div className="space-y-4">
      {/* Sync PO banner */}
      {donePOs.length > 0 && (
        <div className="flex items-start gap-3 px-4 py-3 bg-amber-50 border border-amber-200 rounded-xl">
          <ClipboardCheck className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-amber-800">{donePOs.length} PO selesai belum dicatat ke riwayat barang keluar</p>
            <p className="text-xs text-amber-600 mt-0.5">
              {donePOs.slice(0, 3).map(p => `PO-${p.order_number} ${p.brand_name}`).join(', ')}
              {donePOs.length > 3 ? ` +${donePOs.length - 3} lainnya` : ''}
            </p>
            <p className="text-xs text-amber-500 mt-1">
              Stok inventori sudah otomatis dikurangi saat PO ditandai selesai. Sync ini hanya mencatat riwayat.
            </p>
          </div>
          {canEdit && (
            <Button size="sm" className="gap-1.5 shrink-0 bg-amber-600 hover:bg-amber-700 text-white" onClick={handleSyncPO} disabled={syncing}>
              <RefreshCw className={`w-3.5 h-3.5 ${syncing ? 'animate-spin' : ''}`} />
              {syncing ? 'Syncing...' : 'Catat Riwayat'}
            </Button>
          )}
        </div>
      )}

      <div className="flex flex-wrap gap-2 items-center">
        <Input
          placeholder="Cari referensi, tujuan, atau alasan..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-56"
        />
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-muted-foreground whitespace-nowrap">Dari:</span>
          <Input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="w-36 h-9" />
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-muted-foreground whitespace-nowrap">S/d:</span>
          <Input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="w-36 h-9" />
        </div>
        {(dateFrom || dateTo) && (
          <Button variant="ghost" size="sm" className="text-xs h-9" onClick={() => { setDateFrom(''); setDateTo(''); }}>Reset</Button>
        )}
        <div className="flex gap-2 shrink-0 ml-auto">
          <Button onClick={handleExport} variant="outline" className="gap-2">
            <FileDown className="w-4 h-4" /> Export PDF
          </Button>
          {canEdit && (
            <Button onClick={() => setShowForm(true)} className="gap-2" variant="outline">
              <Plus className="w-4 h-4" /> Input Manual
            </Button>
          )}
        </div>
      </div>

      {isLoading ? (
        <div className="text-center py-12 text-muted-foreground">Memuat data...</div>
      ) : (
        <div className="grid gap-3">
          {filtered.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">Belum ada data barang keluar.</div>
          ) : (
            filtered.map(record => (
              <Card key={record.id}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-red-100 text-red-600 flex items-center justify-center shrink-0">
                        <PackageMinus className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold">{record.nomor_referensi || 'Tanpa Referensi'}</span>
                          <Badge variant="outline" className="text-xs text-red-600 border-red-300">
                            {record.items?.length || 0} item
                          </Badge>
                          {record.alasan && (
                            <Badge variant="secondary" className="text-xs">{record.alasan}</Badge>
                          )}
                          {record.source_po_id && (
                            <Badge className="text-xs bg-blue-100 text-blue-700 border-blue-200">dari PO</Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {record.tanggal ? format(new Date(record.tanggal + 'T00:00:00'), 'dd MMMM yyyy', { locale: id }) : '-'}
                          {record.tujuan ? ` • ${record.tujuan}` : ''}
                        </p>
                        {record.pic && (
                          <span className="inline-flex items-center gap-1 text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full font-medium mt-0.5">
                            <UserCircle2 className="w-3 h-3" />{record.pic}
                          </span>
                        )}
                        <LastUpdated date={record.updated_date || record.created_date} className="mt-0.5" />
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      {canEdit && (
                        <>
                          <Button variant="ghost" size="icon" className="w-8 h-8 text-muted-foreground hover:text-foreground"
                            onClick={() => setEditRecord(record)}>
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="w-8 h-8 text-muted-foreground hover:text-destructive"
                            onClick={() => handleDelete(record)}>
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </>
                      )}
                      <Button variant="ghost" size="icon" className="w-8 h-8"
                        onClick={() => setExpanded(expanded === record.id ? null : record.id)}>
                        {expanded === record.id ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </Button>
                    </div>
                  </div>

                  {expanded === record.id && (
                    <div className="mt-4 border-t pt-4 space-y-3">
                      {/* Info ekspedisi & ongkir */}
                      {(record.ekspedisi || record.ongkir > 0 || record.pic) && (
                        <div className="flex flex-wrap gap-2 text-xs">
                          {record.ekspedisi && (
                            <span className="inline-flex items-center gap-1.5 bg-slate-100 text-slate-700 px-2.5 py-1 rounded-full font-medium">
                              <Navigation className="w-3 h-3" />{record.ekspedisi}
                            </span>
                          )}
                          {record.ongkir > 0 && (
                            <span className="inline-flex items-center gap-1.5 bg-emerald-50 text-emerald-700 px-2.5 py-1 rounded-full font-medium">
                              <Banknote className="w-3 h-3" />Rp {record.ongkir.toLocaleString('id-ID')}
                              {record.ongkir_dibayar_oleh && <span className="text-emerald-500">· {record.ongkir_dibayar_oleh}</span>}
                            </span>
                          )}
                          {record.pic && (
                            <span className="inline-flex items-center gap-1.5 bg-primary/10 text-primary px-2.5 py-1 rounded-full font-medium">
                              <UserCircle2 className="w-3 h-3" />{record.pic}
                            </span>
                          )}
                        </div>
                      )}
                      {record.catatan && <p className="text-sm text-muted-foreground italic">Catatan: {record.catatan}</p>}
                      {record.items?.length > 0 && (
                        <>
                          <div className="grid grid-cols-4 text-xs font-semibold text-muted-foreground pb-1 border-b">
                            <span className="col-span-2">Barang</span>
                            <span className="text-center">Vendor</span>
                            <span className="text-right">Jumlah</span>
                          </div>
                          {record.items.map((item, idx) => (
                            <div key={idx} className="grid grid-cols-4 text-sm items-center">
                              <div className="col-span-2">
                                <span className="font-medium">{item.nama_barang}</span>
                                <span className="ml-1.5">
                                  <Badge variant="outline" className="text-xs">{item.kategori}</Badge>
                                </span>
                              </div>
                              <span className="text-center text-xs text-muted-foreground">{item.vendor || '-'}</span>
                              <span className="text-right font-medium text-red-600">-{item.jumlah} {item.satuan}</span>
                            </div>
                          ))}
                        </>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))
          )}
        </div>
      )}

      {showForm && (
        <BarangKeluarManualForm
          onClose={() => setShowForm(false)}
          onSaved={() => {
            setShowForm(false);
            queryClient.invalidateQueries({ queryKey: ['barang-keluar'] });
          }}
        />
      )}

      {editRecord && (
        <BarangKeluarEditForm
          record={editRecord}
          onClose={() => setEditRecord(null)}
          onSaved={() => {
            setEditRecord(null);
            queryClient.invalidateQueries({ queryKey: ['barang-keluar'] });
          }}
        />
      )}
    </div>
  );
}