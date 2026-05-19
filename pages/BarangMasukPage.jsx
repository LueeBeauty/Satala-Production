import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Plus, Truck, ChevronDown, ChevronUp, FileDown } from 'lucide-react';
import BarangMasukForm from '@/components/barangmasuk/BarangMasukForm';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';
import LastUpdated from '@/components/ui/LastUpdated';
import { getLatestUpdatedDate } from '@/hooks/useRelativeTime';
import { exportToPDF } from '@/utils/exportPDF';

export default function BarangMasukPage() {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [expanded, setExpanded] = useState(null);
  const [search, setSearch] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const { data: records = [], isLoading } = useQuery({
    queryKey: ['barang-masuk'],
    queryFn: () => base44.entities.BarangMasuk.list('-created_date'),
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
        { key: 'items', label: 'Jml Item', render: r => `${r.items?.length || 0} item` },
        { key: 'items_detail', label: 'Detail Barang', render: r => (r.items || []).map(i => `${i.nama_barang} (+${i.jumlah} ${i.satuan})`).join(', ') || '-' },
        { key: 'pic', label: 'PIC', render: r => r.pic || '-' },
        { key: 'catatan', label: 'Catatan', render: r => r.catatan || '-' },
      ],
      rows: filtered,
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Barang Masuk</h1>
          <p className="text-muted-foreground text-sm mt-1">Catat penerimaan barang & update stok otomatis</p>

        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => handleExport()} className="gap-2">
            <FileDown className="w-4 h-4" /> Export PDF
          </Button>
          <Button onClick={() => setShowForm(true)} className="gap-2">
            <Plus className="w-4 h-4" /> Input Barang Masuk
          </Button>
        </div>
      </div>

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
                          <span className="inline-flex items-center gap-1 text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full font-medium mt-1">👤 {record.pic}</span>
                        )}
                        <LastUpdated date={record.updated_date || record.created_date} className="mt-0.5" />
                      </div>
                    </div>
                    <Button variant="ghost" size="icon" onClick={() => setExpanded(expanded === record.id ? null : record.id)}>
                      {expanded === record.id ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </Button>
                  </div>

                  {expanded === record.id && record.items?.length > 0 && (
                    <div className="mt-4 border-t pt-4 space-y-2">
                      {record.catatan && <p className="text-sm text-muted-foreground italic mb-3">Catatan: {record.catatan}</p>}
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
                          <span className="text-right font-medium">+{item.jumlah} {item.satuan}</span>
                        </div>
                      ))}
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
            queryClient.invalidateQueries({ queryKey: ['stock-items'] });
          }}
        />
      )}
    </div>
  );
}