import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useMaserasiAutoUpdate } from '@/hooks/useMaserasiAutoUpdate';
import { base44 } from '@/api/base44Client';
import { useSession } from '@/lib/SessionContext';
import { canManageProduksi } from '@/lib/AuthSession';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, FlaskConical, Factory, ChevronDown, ChevronUp, Package, ArrowUpDown } from 'lucide-react';
import ProduksiForm from '@/components/produksi/ProduksiFormBaru';
import TugasHariIni from '@/components/produksi/TugasHariIni';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';
import { needsLiterConversion, formatGramMl } from '@/lib/unitConverter';

const tipeBadge = {
  Produksi: 'bg-blue-100 text-blue-700',
  Sample: 'bg-purple-100 text-purple-700',
};

export default function ProduksiPage() {
  const { member } = useSession();
  const canAdd = canManageProduksi(member);
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [expanded, setExpanded] = useState(null);
  const [filterTipe, setFilterTipe] = useState('Semua');
  const [filterStatus, setFilterStatus] = useState('Semua');

  const { data: records = [], isLoading } = useQuery({
    queryKey: ['produksi'],
    queryFn: () => base44.entities.Produksi.list('-created_date'),
  });

  // Auto-update PO: maserasi → menunggu_filling saat waktu selesai
  useMaserasiAutoUpdate(() => {
    queryClient.invalidateQueries({ queryKey: ['production-orders'] });
  });

  const STATUS_OPTIONS = [
    { value: 'Semua', label: 'Semua Status' },
    { value: 'pending', label: 'Pending' },
    { value: 'diracik', label: 'Sedang Diracik' },
    { value: 'maserasi', label: 'Maserasi' },
    { value: 'menunggu_filling', label: 'Menunggu Filling' },
    { value: 'filling', label: 'Filling' },
    { value: 'menunggu_packing', label: 'Menunggu Packing' },
    { value: 'packing', label: 'Packing' },
    { value: 'siap_kirim', label: 'Siap Kirim' },
    { value: 'selesai', label: 'Selesai' },
  ];

  const filtered = records.filter(r => {
    const tipeMatch = filterTipe === 'Semua' || r.tipe === filterTipe;
    const statusMatch = filterStatus === 'Semua' || r.status === filterStatus;
    return tipeMatch && statusMatch;
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Produksi & Sample</h1>
          <p className="text-muted-foreground text-sm mt-1">Catat produksi & stok otomatis terkurangi</p>
        </div>
        {canAdd && (
          <Button onClick={() => setShowForm(true)} className="gap-2">
            <Plus className="w-4 h-4" /> Catat Produksi
          </Button>
        )}
      </div>

      {/* Tugas Hari Ini */}
      <div className="border border-border rounded-2xl p-4 bg-card">
        <TugasHariIni />
      </div>

      <div className="border-t border-border pt-2">
        <h2 className="text-base font-semibold mb-3">Riwayat Produksi & Sample</h2>
      </div>

      <div className="flex flex-wrap gap-2 items-center">
        <div className="flex gap-2">
          {['Semua', 'Produksi', 'Sample'].map(t => (
            <Button key={t} variant={filterTipe === t ? 'default' : 'outline'} size="sm" onClick={() => setFilterTipe(t)}>
              {t === 'Produksi' && <Factory className="w-3 h-3 mr-1" />}
              {t === 'Sample' && <FlaskConical className="w-3 h-3 mr-1" />}
              {t}
            </Button>
          ))}
        </div>
        <div className="flex items-center gap-2 ml-auto">
          <ArrowUpDown className="w-3.5 h-3.5 text-muted-foreground" />
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="h-8 text-xs w-44">
              <SelectValue placeholder="Filter status..." />
            </SelectTrigger>
            <SelectContent>
              {STATUS_OPTIONS.map(s => (
                <SelectItem key={s.value} value={s.value} className="text-xs">{s.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {isLoading ? (
        <div className="text-center py-12 text-muted-foreground">Memuat data...</div>
      ) : (
        <div className="grid gap-3">
          {filtered.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">Belum ada data produksi.</div>
          ) : (
            filtered.map(record => (
              <Card key={record.id}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${record.tipe === 'Sample' ? 'bg-purple-100 text-purple-600' : 'bg-blue-100 text-blue-600'}`}>
                        {record.tipe === 'Sample' ? <FlaskConical className="w-5 h-5" /> : <Factory className="w-5 h-5" />}
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold">{record.nama_produk}</span>
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${tipeBadge[record.tipe]}`}>{record.tipe}</span>
                          {record.jumlah_produk && (
                            <Badge variant="outline" className="text-xs">{record.jumlah_produk} {record.satuan_produk}</Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {record.tanggal ? format(new Date(record.tanggal), 'dd MMMM yyyy', { locale: id }) : '-'}
                          {record.operator ? ` • ${record.operator}` : ''}
                          {record.pic ? ` • 👤 ${record.pic}` : ''}
                        </p>
                        <div className="flex gap-2 flex-wrap mt-0.5">
                          {record.racikan_digunakan?.length > 0 && (
                            <span className="text-xs text-purple-600">
                              <FlaskConical className="w-3 h-3 inline mr-0.5" />
                              {record.racikan_digunakan.length} racikan
                              {record.ukuran_botol_ml ? ` · ${record.ukuran_botol_ml}ml` : ''}
                            </span>
                          )}
                          {record.bahan_digunakan?.length > 0 && (
                            <span className="text-xs text-blue-600">
                              <Package className="w-3 h-3 inline mr-0.5" />
                              {record.bahan_digunakan.length} komponen
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <Button variant="ghost" size="icon" onClick={() => setExpanded(expanded === record.id ? null : record.id)}>
                      {expanded === record.id ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </Button>
                  </div>

                  {expanded === record.id && (
                    <div className="mt-4 border-t pt-4 space-y-4">
                      {record.catatan && <p className="text-sm text-muted-foreground italic">📝 {record.catatan}</p>}

                      {/* Racikan */}
                      {record.racikan_digunakan?.length > 0 && (
                        <div>
                          <div className="flex items-center gap-2 mb-2">
                            <FlaskConical className="w-4 h-4 text-purple-600" />
                            <p className="text-sm font-semibold text-purple-700">Racikan / Formula</p>
                            {record.ukuran_botol_ml && record.jumlah_produk && (
                              <Badge variant="outline" className="text-xs ml-auto">
                                {record.ukuran_botol_ml}ml × {record.jumlah_produk} pcs
                              </Badge>
                            )}
                          </div>
                          <div className="rounded-xl border border-purple-200 overflow-hidden">
                            <table className="w-full text-sm">
                              <thead className="bg-purple-50">
                                <tr>
                                  <th className="text-left px-3 py-2 text-xs font-semibold text-purple-700">Bahan</th>
                                  <th className="text-right px-3 py-2 text-xs font-semibold text-purple-700">%</th>
                                  <th className="text-right px-3 py-2 text-xs font-semibold text-purple-700">Kebutuhan</th>
                                </tr>
                              </thead>
                              <tbody>
                                {record.racikan_digunakan.map((r, i) => {
                                  const isLiter = needsLiterConversion('', r.kategori_bahan);
                                  // Hitung ml dari persentase jika ada ukuran botol & qty
                                  const kebutuhanMlCalc = record.ukuran_botol_ml && record.jumlah_produk
                                    ? (r.persentase / 100) * record.ukuran_botol_ml * record.jumlah_produk
                                    : null;
                                  const gramMl = isLiter && (kebutuhanMlCalc || r.kebutuhan_ml) > 0
                                    ? formatGramMl(kebutuhanMlCalc || r.kebutuhan_ml)
                                    : null;
                                  return (
                                    <tr key={i} className="border-t border-purple-100">
                                      <td className="px-3 py-2">
                                        <p className="text-xs font-medium">{r.nama_bahan}</p>
                                        <span className="text-[10px] text-muted-foreground">{r.kategori_bahan}{r.vendor ? ` · ${r.vendor}` : ''}</span>
                                      </td>
                                      <td className="px-3 py-2 text-right">
                                        <span className="text-xs font-bold text-purple-700">{r.persentase}%</span>
                                      </td>
                                      <td className="px-3 py-2 text-right">
                                        {gramMl ? (
                                          <span className="text-xs font-semibold text-orange-600">
                                            {gramMl.gramLabel}<span className="text-muted-foreground font-normal">/{gramMl.mlLabel}</span>
                                          </span>
                                        ) : r.kebutuhan_nilai ? (
                                          r.kebutuhan_ml ? (
                                            <span className="text-xs font-semibold text-blue-700">
                                              {r.kebutuhan_nilai}g<span className="text-muted-foreground font-normal">/{r.kebutuhan_ml}ml</span>
                                            </span>
                                          ) : (
                                            <span className="text-xs font-semibold text-blue-700">
                                              {r.kebutuhan_nilai} {r.kebutuhan_satuan}
                                            </span>
                                          )
                                        ) : <span className="text-xs text-muted-foreground">—</span>}
                                      </td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      )}

                      {/* Bahan Jadi */}
                      {record.bahan_digunakan?.length > 0 ? (
                        <div>
                          <div className="flex items-center gap-2 mb-2">
                            <Package className="w-4 h-4 text-blue-600" />
                            <p className="text-sm font-semibold text-blue-700">Bahan / Komponen Jadi</p>
                          </div>
                          <div className="space-y-1">
                            {record.bahan_digunakan.map((b, i) => (
                              <div key={i} className="flex items-center justify-between text-sm bg-muted/50 rounded px-3 py-2">
                                <span>{b.nama_barang} <span className="text-xs text-muted-foreground capitalize">({b.kategori})</span></span>
                                <span className="font-medium text-destructive">-{b.jumlah_digunakan} {b.satuan}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      ) : (
                        !record.racikan_digunakan?.length && <p className="text-sm text-muted-foreground">Tidak ada bahan dicatat.</p>
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
        <ProduksiForm
          onClose={() => setShowForm(false)}
          onSaved={() => {
            setShowForm(false);
            queryClient.invalidateQueries({ queryKey: ['produksi'] });
            queryClient.invalidateQueries({ queryKey: ['stock-items'] });
          }}
        />
      )}
    </div>
  );
}