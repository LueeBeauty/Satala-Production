import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Plus, PackageMinus, ChevronDown, ChevronUp, X } from 'lucide-react';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';
import LastUpdated from '@/components/ui/LastUpdated';
import BarangKeluarForm from '@/components/barangkeluar/BarangKeluarForm';

export default function BarangKeluarPage() {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [expanded, setExpanded] = useState(null);
  const [search, setSearch] = useState('');

  const { data: records = [], isLoading } = useQuery({
    queryKey: ['barang-keluar'],
    queryFn: () => base44.entities.BarangKeluar.list('-created_date'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.BarangKeluar.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['barang-keluar'] }),
  });

  const filtered = records.filter(r =>
    r.nomor_referensi?.toLowerCase().includes(search.toLowerCase()) ||
    r.tujuan?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Barang Keluar</h1>
          <p className="text-muted-foreground text-sm mt-1">Catat pengeluaran barang & kurangi stok otomatis</p>
        </div>
        <Button onClick={() => setShowForm(true)} className="gap-2">
          <Plus className="w-4 h-4" /> Input Barang Keluar
        </Button>
      </div>

      <Input
        placeholder="Cari nomor referensi atau tujuan..."
        value={search}
        onChange={e => setSearch(e.target.value)}
        className="max-w-sm"
      />

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
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {record.tanggal ? format(new Date(record.tanggal + 'T00:00:00'), 'dd MMMM yyyy', { locale: id }) : '-'}
                          {record.tujuan ? ` • ${record.tujuan}` : ''}
                        </p>
                        <LastUpdated date={record.updated_date || record.created_date} className="mt-0.5" />
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-muted-foreground hover:text-destructive"
                        onClick={() => { if (confirm('Hapus catatan ini?')) deleteMutation.mutate(record.id); }}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => setExpanded(expanded === record.id ? null : record.id)}>
                        {expanded === record.id ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </Button>
                    </div>
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
                          <span className="text-right font-medium text-red-600">-{item.jumlah} {item.satuan}</span>
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
        <BarangKeluarForm
          onClose={() => setShowForm(false)}
          onSaved={() => {
            setShowForm(false);
            queryClient.invalidateQueries({ queryKey: ['barang-keluar'] });
          }}
        />
      )}
    </div>
  );
}