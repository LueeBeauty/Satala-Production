import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { AlertTriangle, Package, Truck, Factory, FlaskConical, TrendingDown, ArrowRight, Beaker } from 'lucide-react';
import { format, subDays } from 'date-fns';
import { id } from 'date-fns/locale';

export default function DashboardBaru() {
  const { data: stockItems = [] } = useQuery({
    queryKey: ['stock-items'],
    queryFn: () => base44.entities.StockItem.list('-updated_date'),
  });
  const { data: produksiRecords = [] } = useQuery({
    queryKey: ['produksi'],
    queryFn: () => base44.entities.Produksi.list('-created_date', 10),
  });
  const { data: barangMasuk = [] } = useQuery({
    queryKey: ['barang-masuk'],
    queryFn: () => base44.entities.BarangMasuk.list('-created_date', 5),
  });

  const lowStock = stockItems.filter(i => i.stok_minimum > 0 && i.stok_saat_ini <= i.stok_minimum);
  const totalBahan = stockItems.filter(i => i.kategori === 'Bahan').length;
  const totalKemasan = stockItems.filter(i => i.kategori === 'Kemasan').length;
  const produksiHariIni = produksiRecords.filter(p => p.tanggal === new Date().toISOString().split('T')[0]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground text-sm mt-1">Ringkasan aktivitas produksi & stok</p>
      </div>

      {/* Alert stok rendah */}
      {lowStock.length > 0 && (
        <Card className="border-destructive/50 bg-destructive/5">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-destructive mt-0.5 shrink-0" />
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <p className="font-semibold text-destructive">⚠️ {lowStock.length} Item Stok Hampir Habis</p>
                  <Link to="/stock">
                    <Button variant="ghost" size="sm" className="text-destructive gap-1 h-7 text-xs">
                      Lihat Stok <ArrowRight className="w-3 h-3" />
                    </Button>
                  </Link>
                </div>
                <div className="flex flex-wrap gap-2 mt-2">
                  {lowStock.map(i => (
                    <div key={i.id} className="flex items-center gap-1 bg-destructive/10 rounded-full px-3 py-1">
                      <TrendingDown className="w-3 h-3 text-destructive" />
                      <span className="text-xs font-medium text-destructive">{i.nama}</span>
                      <span className="text-xs text-destructive/70">({i.stok_saat_ini} {i.satuan})</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Bahan</p>
                <p className="text-2xl font-bold mt-1">{totalBahan}</p>
                <p className="text-xs text-muted-foreground">jenis item</p>
              </div>
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <Beaker className="w-5 h-5 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Kemasan</p>
                <p className="text-2xl font-bold mt-1">{totalKemasan}</p>
                <p className="text-xs text-muted-foreground">jenis item</p>
              </div>
              <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center">
                <Package className="w-5 h-5 text-amber-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Produksi Hari Ini</p>
                <p className="text-2xl font-bold mt-1">{produksiHariIni.length}</p>
                <p className="text-xs text-muted-foreground">aktivitas</p>
              </div>
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                <Factory className="w-5 h-5 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className={lowStock.length > 0 ? 'border-destructive/40' : ''}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Stok Rendah</p>
                <p className={`text-2xl font-bold mt-1 ${lowStock.length > 0 ? 'text-destructive' : ''}`}>{lowStock.length}</p>
                <p className="text-xs text-muted-foreground">item perlu restok</p>
              </div>
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${lowStock.length > 0 ? 'bg-destructive/10' : 'bg-muted'}`}>
                <AlertTriangle className={`w-5 h-5 ${lowStock.length > 0 ? 'text-destructive' : 'text-muted-foreground'}`} />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Link to="/stock">
          <Card className="hover:shadow-md transition-shadow cursor-pointer">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                <Package className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="font-semibold text-sm">Kelola Stok</p>
                <p className="text-xs text-muted-foreground">Tambah & edit barang</p>
              </div>
              <ArrowRight className="w-4 h-4 text-muted-foreground ml-auto" />
            </CardContent>
          </Card>
        </Link>
        <Link to="/barang-masuk">
          <Card className="hover:shadow-md transition-shadow cursor-pointer">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                <Truck className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="font-semibold text-sm">Barang Masuk</p>
                <p className="text-xs text-muted-foreground">Input penerimaan barang</p>
              </div>
              <ArrowRight className="w-4 h-4 text-muted-foreground ml-auto" />
            </CardContent>
          </Card>
        </Link>
        <Link to="/produksi">
          <Card className="hover:shadow-md transition-shadow cursor-pointer">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <Factory className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="font-semibold text-sm">Catat Produksi</p>
                <p className="text-xs text-muted-foreground">Produksi & sample</p>
              </div>
              <ArrowRight className="w-4 h-4 text-muted-foreground ml-auto" />
            </CardContent>
          </Card>
        </Link>
      </div>

      {/* Aktivitas Terakhir */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Produksi Terbaru</CardTitle>
              <Link to="/produksi"><Button variant="ghost" size="sm" className="h-7 text-xs gap-1">Semua <ArrowRight className="w-3 h-3" /></Button></Link>
            </div>
          </CardHeader>
          <CardContent className="space-y-2 pt-0">
            {produksiRecords.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">Belum ada aktivitas produksi</p>
            ) : (
              produksiRecords.slice(0, 5).map(r => (
                <div key={r.id} className="flex items-center justify-between py-2 border-b last:border-0">
                  <div className="flex items-center gap-2">
                    {r.tipe === 'Sample'
                      ? <FlaskConical className="w-4 h-4 text-purple-500" />
                      : <Factory className="w-4 h-4 text-blue-500" />}
                    <div>
                      <p className="text-sm font-medium">{r.nama_produk}</p>
                      <p className="text-xs text-muted-foreground">{r.tanggal ? format(new Date(r.tanggal), 'dd MMM', { locale: id }) : '-'}</p>
                    </div>
                  </div>
                  <Badge variant="outline" className={`text-xs ${r.tipe === 'Sample' ? 'text-purple-600' : 'text-blue-600'}`}>{r.tipe}</Badge>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Barang Masuk Terbaru</CardTitle>
              <Link to="/barang-masuk"><Button variant="ghost" size="sm" className="h-7 text-xs gap-1">Semua <ArrowRight className="w-3 h-3" /></Button></Link>
            </div>
          </CardHeader>
          <CardContent className="space-y-2 pt-0">
            {barangMasuk.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">Belum ada barang masuk</p>
            ) : (
              barangMasuk.slice(0, 5).map(r => (
                <div key={r.id} className="flex items-center justify-between py-2 border-b last:border-0">
                  <div className="flex items-center gap-2">
                    <Truck className="w-4 h-4 text-green-500" />
                    <div>
                      <p className="text-sm font-medium">{r.nomor_referensi || 'Tanpa Referensi'}</p>
                      <p className="text-xs text-muted-foreground">{r.tanggal ? format(new Date(r.tanggal), 'dd MMM', { locale: id }) : '-'}{r.supplier ? ` • ${r.supplier}` : ''}</p>
                    </div>
                  </div>
                  <Badge variant="outline" className="text-xs text-green-600">{r.items?.length || 0} item</Badge>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}