import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus, Search, AlertTriangle, Package, Beaker, Edit2, Trash2 } from 'lucide-react';
import StockItemForm from '@/components/stock/StockItemForm';
import LastUpdated from '@/components/ui/LastUpdated';
import { getLatestUpdatedDate } from '@/hooks/useRelativeTime';

export default function StockPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [filterKategori, setFilterKategori] = useState('Semua');
  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState(null);

  const { data: items = [], isLoading } = useQuery({
    queryKey: ['stock-items'],
    queryFn: () => base44.entities.StockItem.list('-updated_date'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.StockItem.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['stock-items'] }),
  });

  const filtered = items.filter((item) => {
    const matchSearch = item.nama?.toLowerCase().includes(search.toLowerCase()) ||
      item.kode?.toLowerCase().includes(search.toLowerCase());
    const matchKat = filterKategori === 'Semua' || item.kategori === filterKategori;
    return matchSearch && matchKat;
  });

  const lowStock = items.filter(i => i.stok_minimum > 0 && i.stok_saat_ini <= i.stok_minimum);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Manajemen Stok</h1>
          <p className="text-muted-foreground text-sm mt-1">Kelola bahan dan kemasan produksi</p>

        </div>
        <Button onClick={() => { setEditItem(null); setShowForm(true); }} className="gap-2">
          <Plus className="w-4 h-4" /> Tambah Barang
        </Button>
      </div>

      {lowStock.length > 0 && (
        <Card className="border-destructive/50 bg-destructive/5">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-destructive mt-0.5 shrink-0" />
              <div>
                <p className="font-semibold text-destructive text-sm">Stok Hampir Habis ({lowStock.length} item)</p>
                <div className="flex flex-wrap gap-2 mt-2">
                  {lowStock.map(i => (
                    <Badge key={i.id} variant="destructive" className="text-xs">
                      {i.nama} — {i.stok_saat_ini} {i.satuan}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Cari nama atau kode barang..." className="pl-9" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <div className="flex gap-2">
          {['Semua', 'Bahan', 'Kemasan'].map(k => (
            <Button key={k} variant={filterKategori === k ? 'default' : 'outline'} size="sm" onClick={() => setFilterKategori(k)}>
              {k === 'Bahan' && <Beaker className="w-3 h-3 mr-1" />}
              {k === 'Kemasan' && <Package className="w-3 h-3 mr-1" />}
              {k}
            </Button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="text-center py-12 text-muted-foreground">Memuat data...</div>
      ) : (
        <div className="grid gap-3">
          {filtered.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">Belum ada data barang.</div>
          ) : (
            filtered.map(item => {
              const isLow = item.stok_minimum > 0 && item.stok_saat_ini <= item.stok_minimum;
              return (
                <Card key={item.id} className={isLow ? 'border-destructive/40' : ''}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${item.kategori === 'Bahan' ? 'bg-blue-100 text-blue-600' : 'bg-amber-100 text-amber-600'}`}>
                          {item.kategori === 'Bahan' ? <Beaker className="w-5 h-5" /> : <Package className="w-5 h-5" />}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-semibold">{item.nama}</span>
                            {item.kode && <span className="text-xs text-muted-foreground">({item.kode})</span>}
                            <Badge variant="outline" className="text-xs">{item.kategori}</Badge>
                            {isLow && <Badge variant="destructive" className="text-xs gap-1"><AlertTriangle className="w-3 h-3" />Stok Rendah</Badge>}
                          </div>
                          {item.deskripsi && <p className="text-xs text-muted-foreground mt-0.5">{item.deskripsi}</p>}
                          <LastUpdated date={item.updated_date || item.created_date} className="mt-0.5" />
                        </div>
                      </div>
                      <div className="flex items-center gap-4 shrink-0">
                        <div className="text-right">
                          <p className={`text-lg font-bold ${isLow ? 'text-destructive' : ''}`}>{item.stok_saat_ini ?? 0}</p>
                          <p className="text-xs text-muted-foreground">{item.satuan}</p>
                          {item.stok_minimum > 0 && <p className="text-xs text-muted-foreground">Min: {item.stok_minimum}</p>}
                        </div>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon" className="w-8 h-8" onClick={() => { setEditItem(item); setShowForm(true); }}>
                            <Edit2 className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="w-8 h-8 text-destructive hover:text-destructive" onClick={() => { if (confirm('Hapus barang ini?')) deleteMutation.mutate(item.id); }}>
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>
      )}

      {showForm && (
        <StockItemForm
          item={editItem}
          onClose={() => setShowForm(false)}
          onSaved={() => { setShowForm(false); queryClient.invalidateQueries({ queryKey: ['stock-items'] }); }}
        />
      )}
    </div>
  );
}