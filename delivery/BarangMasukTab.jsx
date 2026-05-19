import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Plus, Truck, ChevronDown, ChevronUp, Pencil, Trash2, FileDown, Package, UserCircle2, Navigation, Banknote, StickyNote } from 'lucide-react';
import BarangMasukForm from '@/components/barangmasuk/BarangMasukForm';
import BarangMasukEditForm from '@/components/delivery/BarangMasukEditForm';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';
import LastUpdated from '@/components/ui/LastUpdated';
import { exportToPDF } from '@/utils/exportPDF';
import { useSession } from '@/lib/SessionContext';
import { canManageDelivery } from '@/lib/AuthSession';

export default function BarangMasukTab() {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editRecord, setEditRecord] = useState(null);
  const [expanded, setExpanded] = useState(null);
  const [search, setSearch] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const { member } = useSession();
  const canEdit = canManageDelivery(member);

  const { data: records = [], isLoading } = useQuery({
    queryKey: ['barang-masuk'],
    queryFn: () => base44.entities.BarangMasuk.list('-created_date'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.BarangMasuk.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['barang-masuk'] }),
  });

  const filtered = records.filter(r => {
    const matchSearch = !search ||
      r.nomor_referensi?.toLowerCase().includes(search.toLowerCase()) ||
      r.supplier?.toLowerCase().includes(search.toLowerCase());
    const matchFrom = !dateFrom || (r.tanggal && r.tanggal >= dateFrom);
    const matchTo = !dateTo || (r.tanggal && r.tanggal <= dateTo);
    return matchSearch && matchFrom && matchTo;
  });

  const handleExport = () => {
    const subtitle = (dateFrom || dateTo)
      ? `Periode: ${dateFrom || '...'} s/d ${dateTo || '...'} · ${filtered.length} data`
      : `Total ${filtered.length} catatan penerimaan`;
    exportToPDF({
      title: 'Laporan Barang Masuk',
      subtitle,
      filename: 'Barang-Masuk',
      columns: [
        { key: 'nomor_referensi', label: 'No. Referensi' },
        { key: 'tanggal', label: 'Tanggal', render: r => r.tanggal ? format(new Date(r.tanggal + 'T00:00:00'), 'dd/MM/yyyy') : '-' },
        { key: 'supplier', label: 'Supplier', render: r => r.supplier || '-' },
        { key: 'ekspedisi', label: 'Ekspedisi', render: r => r.ekspedisi || '-' },
        { key: 'ongkir', label: 'Ongkir', render: r => {
          if (!r.ongkir || r.ongkir <= 0) return '-';
          const dibayar = r.ongkir_dibayar_oleh === 'Perusahaan' ? 'dari Perusahaan' : r.ongkir_dibayar_oleh === 'Supplier' ? 'dari Supplier' : r.ongkir_dibayar_oleh === 'Split' ? '(Split)' : '';
          return `Rp ${r.ongkir.toLocaleString('id-ID')} ${dibayar}`;
        }},
        { key: 'items', label: 'Jml Item', render: r => `${r.items?.length || 0} item` },
        { key: 'items_detail', label: 'Detail Barang', render: r => (r.items || []).map(i => `${i.nama_barang} (+${i.jumlah} ${i.satuan})`).join(', ') || '-' },
        { key: 'pic', label: 'PIC', render: r => r.pic || '-' },
        { key: 'catatan', label: 'Catatan', render: r => r.catatan || '-' },
      ],
      rows: filtered,
    });
  };

  const handleDelete = (record) => {
    if (!confirm(`Hapus data barang masuk "${record.nomor_referensi || 'ini'}"? Perubahan stok tidak akan dikembalikan.`)) return;
    deleteMutation.mutate(record.id);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2 items-center">
        <Input
          placeholder="Cari nomor referensi atau supplier..."
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
            <Button onClick={() => setShowForm(true)} className="gap-2 shrink-0">
              <Plus className="w-4 h-4" /> Input Barang Masuk
            </Button>
          )}
        </div>
      </div>

      {isLoading ? (
        <div className="text-center py-12 text-muted-foreground">Memuat data...</div>
      ) : (
        <div className="grid gap-3">
          {filtered.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">Belum ada data barang masuk.</div>
          ) : (
            filtered.map(record => (
              <Card key={record.id}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-green-100 text-green-600 flex items-center justify-center shrink-0">
                        <Truck className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold">{record.nomor_referensi || 'Tanpa Referensi'}</span>
                          <Badge variant="outline" className="text-xs text-green-600 border-green-300">
                            {record.items?.length || 0} item
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {record.tanggal ? format(new Date(record.tanggal + 'T00:00:00'), 'dd MMMM yyyy', { locale: id }) : '-'}
                          {record.supplier ? ` • ${record.supplier}` : ''}
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
                      {/* Info ekspedisi, ongkir & PIC */}
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
                          <div className="grid grid-cols-3 text-xs font-semibold text-muted-foreground pb-1 border-b">
                            <span>Barang</span>
                            <span className="text-center">Kategori</span>
                            <span className="text-right">Jumlah</span>
                          </div>
                          {record.items.map((item, idx) => (
                            <div key={idx} className="grid grid-cols-3 text-sm">
                              <span>{item.nama_barang}</span>
                              <span className="text-center">
                                <Badge variant="outline" className="text-xs">{item.kategori}</Badge>
                              </span>
                              <span className="text-right font-medium text-green-600">+{item.jumlah} {item.satuan}</span>
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
        <BarangMasukForm
          onClose={() => setShowForm(false)}
          onSaved={() => {
            setShowForm(false);
            queryClient.invalidateQueries({ queryKey: ['barang-masuk'] });
          }}
        />
      )}

      {editRecord && (
        <BarangMasukEditForm
          record={editRecord}
          onClose={() => setEditRecord(null)}
          onSaved={() => {
            setEditRecord(null);
            queryClient.invalidateQueries({ queryKey: ['barang-masuk'] });
          }}
        />
      )}
    </div>
  );
}