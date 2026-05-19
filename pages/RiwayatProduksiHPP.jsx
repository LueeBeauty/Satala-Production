import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import {
  Search, ChevronDown, ChevronUp, CheckCircle2, XCircle,
  Edit2, Calendar, Database, FileDown, CreditCard, Wallet,
  Save, TrendingUp, Clock, AlertTriangle, UserCircle2
} from 'lucide-react';
import { needsLiterConversion, formatGramMl } from '@/lib/unitConverter';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';
import EditProduksiModal from '@/components/riwayat/EditProduksiModal';
import SimpanDatabaseModal from '@/components/riwayat/SimpanDatabaseModal';
import GenerateHppPdfModal from '@/components/hpp/GenerateHppPdfModal';
import BankSettingsPanel from '@/components/riwayat/BankSettingsPanel';
import { useSession } from '@/lib/SessionContext';
import { canEditRiwayatHPP, canManageBank } from '@/lib/AuthSession';

const fmt = (n) => n ? new Intl.NumberFormat('id-ID').format(Math.round(n)) : '0';

const SORT_OPTIONS = [
  { key: 'terbaru', label: 'Terbaru' },
  { key: 'terlama', label: 'Terlama' },
  { key: 'abjad', label: 'A–Z Brand' },
  { key: 'sudah_lunas', label: 'Sudah Lunas' },
  { key: 'belum_lunas', label: 'Belum Lunas' },
  { key: 'belum_bayar', label: 'Belum Bayar' },
];

const getStatusBayar = (jumlahDibayar, totalTagihan) => {
  if (!jumlahDibayar || jumlahDibayar <= 0) return 'Belum Bayar';
  if (jumlahDibayar >= totalTagihan) return 'Sudah Lunas';
  return 'Belum Lunas';
};

const STATUS_CONFIG = {
  'Sudah Lunas': { color: 'bg-green-100 text-green-700 border-green-200', dot: 'bg-green-500', icon: CheckCircle2 },
  'Belum Lunas': { color: 'bg-orange-100 text-orange-700 border-orange-200', dot: 'bg-orange-400', icon: Wallet },
  'Belum Bayar': { color: 'bg-red-100 text-red-600 border-red-200', dot: 'bg-red-400', icon: XCircle },
};

const PAGE_TABS = [
  { key: 'riwayat', label: 'Riwayat HPP' },
  { key: 'bank', label: 'Rekening Bank', icon: CreditCard },
];

// Hitung margin berdasarkan jumlah yang sudah dibayar vs total HPP
function hitungMarginDenganPembayaran(record) {
  const totalHPP = record.total_hpp_semua || 0;
  const totalJual = record.total_harga_jual_semua || 0;
  const jumlahDibayar = record.jumlah_dibayar || 0;
  const status = getStatusBayar(jumlahDibayar, totalJual || totalHPP);

  // Margin ideal (jika lunas penuh)
  const marginIdeal = totalJual - totalHPP;

  // Margin real berdasarkan pembayaran
  // Jika belum bayar: rugi = -totalHPP (modal keluar, belum ada pemasukan)
  // Jika belum lunas: pemasukan - modal
  // Jika lunas: pemasukan penuh - modal
  let marginReal;
  if (status === 'Belum Bayar') {
    marginReal = -totalHPP; // semua modal belum kembali
  } else if (status === 'Sudah Lunas') {
    marginReal = jumlahDibayar - totalHPP;
  } else {
    marginReal = jumlahDibayar - totalHPP;
  }

  return { marginIdeal, marginReal, status, totalHPP, totalJual, jumlahDibayar };
}

export default function RiwayatProduksiHPP() {
  const { member } = useSession();
  const canEdit = canEditRiwayatHPP(member);
  const canBank = canManageBank(member);
  const queryClient = useQueryClient();
  const [activePageTab, setActivePageTab] = useState('riwayat');
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState('terbaru');
  const [filterTanggal, setFilterTanggal] = useState('');
  const [expanded, setExpanded] = useState(null);
  const [editItem, setEditItem] = useState(null);
  const [simpanDbRecord, setSimpanDbRecord] = useState(null);
  const [pdfRecord, setPdfRecord] = useState(null);
  const [editBayarId, setEditBayarId] = useState(null);
  const [inputBayar, setInputBayar] = useState('');
  const [catatanBayar, setCatatanBayar] = useState('');

  const { data: records = [], isLoading } = useQuery({
    queryKey: ['riwayat-produksi'],
    queryFn: () => base44.entities.RiwayatProduksi.list('-created_date'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.RiwayatProduksi.update(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['riwayat-produksi'] }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.RiwayatProduksi.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['riwayat-produksi'] }),
  });

  const saveBayar = (record) => {
    const tambahan = parseFloat(inputBayar.replace(/\./g, '').replace(',', '.')) || 0;
    if (tambahan <= 0) { setEditBayarId(null); setInputBayar(''); setCatatanBayar(''); return; }

    const sudahDibayar = record.jumlah_dibayar || 0;
    const newTotal = sudahDibayar + tambahan;
    const total = record.total_harga_jual_semua || record.total_hpp_semua || 0;
    const status = getStatusBayar(newTotal, total);

    // Buat entry riwayat pembayaran baru dengan tanggal dan jam
    const now = new Date();
    const tanggalBayar = format(now, 'yyyy-MM-dd');
    const jamBayar = format(now, 'HH:mm:ss');

    const riwayatLama = record.riwayat_pembayaran || [];
    const entryBaru = {
      jumlah: tambahan,
      tanggal_bayar: tanggalBayar,
      jam_bayar: jamBayar,
      catatan: catatanBayar.trim() || '',
    };

    updateMutation.mutate({
      id: record.id,
      data: {
        jumlah_dibayar: newTotal,
        status_bayar: status,
        riwayat_pembayaran: [...riwayatLama, entryBaru],
      },
    });
    setEditBayarId(null);
    setInputBayar('');
    setCatatanBayar('');
  };

  // Filter
  let filtered = records.filter((r) => {
    const matchSearch = r.nama_brand?.toLowerCase().includes(search.toLowerCase());
    const matchDate = !filterTanggal || r.tanggal === filterTanggal;
    const total = r.total_harga_jual_semua || r.total_hpp_semua || 0;
    const status = getStatusBayar(r.jumlah_dibayar, total);
    if (sort === 'sudah_lunas') return matchSearch && matchDate && status === 'Sudah Lunas';
    if (sort === 'belum_lunas') return matchSearch && matchDate && status === 'Belum Lunas';
    if (sort === 'belum_bayar') return matchSearch && matchDate && status === 'Belum Bayar';
    return matchSearch && matchDate;
  });

  filtered = [...filtered].sort((a, b) => {
    if (sort === 'abjad') return (a.nama_brand ?? '').localeCompare(b.nama_brand ?? '');
    if (sort === 'terlama') return new Date(a.created_date) - new Date(b.created_date);
    return new Date(b.created_date) - new Date(a.created_date);
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-display font-bold text-foreground">Riwayat HPP</h1>
          <p className="text-muted-foreground text-sm mt-1">Lacak HPP & status pembayaran</p>
        </div>
      </div>

      {/* Page Tabs */}
      <div className="flex gap-2">
        {PAGE_TABS.filter(tab => tab.key !== 'bank' || canBank).map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.key}
              onClick={() => setActivePageTab(tab.key)}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-medium transition-all ${activePageTab === tab.key ? 'bg-primary text-primary-foreground shadow-sm' : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'}`}
            >
              {Icon && <Icon className="w-3.5 h-3.5" />}
              {tab.label}
            </button>
          );
        })}
      </div>

      {activePageTab === 'bank' && <BankSettingsPanel />}

      {activePageTab === 'riwayat' && <>
        {/* Filter Bar */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Cari nama brand..." className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-muted-foreground shrink-0" />
            <Input type="date" value={filterTanggal} onChange={(e) => setFilterTanggal(e.target.value)} className="w-44" />
            {filterTanggal && <Button variant="ghost" size="sm" onClick={() => setFilterTanggal('')} className="text-xs text-muted-foreground">Reset</Button>}
          </div>
        </div>

        {/* Sort Tabs */}
        <div className="flex gap-2 overflow-x-auto pb-1">
          {SORT_OPTIONS.map((opt) => (
            <button
              key={opt.key}
              onClick={() => setSort(opt.key)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all whitespace-nowrap ${sort === opt.key ? 'bg-primary text-primary-foreground' : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'}`}
            >
              {opt.key === 'sudah_lunas' && <CheckCircle2 className="w-3 h-3" />}
              {opt.key === 'belum_bayar' && <XCircle className="w-3 h-3" />}
              {opt.label}
            </button>
          ))}
        </div>

        {isLoading ? (
          <div className="text-center py-16 text-muted-foreground">Memuat riwayat...</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20">
            <div className="w-14 h-14 rounded-2xl bg-muted mx-auto mb-4 flex items-center justify-center">
              <Database className="w-6 h-6 text-muted-foreground opacity-40" />
            </div>
            <p className="text-muted-foreground">Belum ada riwayat HPP.</p>
            <p className="text-xs text-muted-foreground mt-1">Buat HPP di halaman Kalkulator HPP</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((record) => {
              const totalTagihan = record.total_harga_jual_semua || record.total_hpp_semua || 0;
              const jumlahDibayar = record.jumlah_dibayar || 0;
              const status = getStatusBayar(jumlahDibayar, totalTagihan);
              const persen = totalTagihan > 0 ? Math.min(100, Math.round(jumlahDibayar / totalTagihan * 100)) : 0;
              const sisa = totalTagihan - jumlahDibayar;
              const cfg = STATUS_CONFIG[status];
              const StatusIcon = cfg.icon;
              const borderColor = status === 'Sudah Lunas' ? 'border-green-200' : status === 'Belum Lunas' ? 'border-orange-200' : 'border-red-200';
              const riwayatBayar = record.riwayat_pembayaran || [];

              return (
                <Card key={record.id} className={`transition-all ${borderColor}`}>
                  <CardContent className="p-0">
                    {/* Card Header */}
                    <div className="flex items-center justify-between px-4 py-3">
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${cfg.dot}`} />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-semibold text-sm">{record.nama_brand || '—'}</span>
                            <span className="text-muted-foreground text-xs">·</span>
                            <span className="text-xs text-muted-foreground">{record.tanggal ? format(new Date(record.tanggal), 'dd MMM yyyy', { locale: id }) : '—'}</span>
                            <Badge className={`text-xs ${cfg.color}`}>
                              <StatusIcon className="w-3 h-3 mr-1 inline" />
                              {status}
                            </Badge>
                            {record.pic && (
                              <span className="inline-flex items-center gap-1 text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full font-medium">
                                <UserCircle2 className="w-3 h-3" />{record.pic}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-3 flex-wrap mt-0.5">
                            <p className="text-xs text-muted-foreground">
                              {record.products?.length ?? 0} produk
                              {(record.legalitas ?? []).length > 0 && ` • ${record.legalitas.length} legalitas`}
                              {' • '}Total: <span className="font-semibold text-foreground">Rp {fmt(totalTagihan)}</span>
                            </p>
                            {jumlahDibayar > 0 && (
                              <p className="text-xs text-green-700 font-medium">Terbayar: Rp {fmt(jumlahDibayar)} ({persen}%)</p>
                            )}
                            {status === 'Belum Lunas' && (
                              <p className="text-xs text-orange-600 font-medium">Sisa: Rp {fmt(sisa)} ({100 - persen}%)</p>
                            )}
                          </div>
                          {/* Progress bar */}
                          {jumlahDibayar > 0 && (
                            <div className="mt-1.5 w-full max-w-xs">
                              <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                                <div
                                  className={`h-full rounded-full transition-all ${status === 'Sudah Lunas' ? 'bg-green-500' : 'bg-orange-400'}`}
                                  style={{ width: `${persen}%` }}
                                />
                              </div>
                            </div>
                          )}

                          {/* Input bayar inline */}
                          {editBayarId === record.id && (
                            <div className="mt-2 space-y-1.5">
                              {jumlahDibayar > 0 && (
                                <p className="text-[11px] text-muted-foreground">
                                  Sudah dibayar: <span className="font-semibold text-green-700">Rp {fmt(jumlahDibayar)}</span>
                                  {' · '}Sisa: <span className="font-semibold text-orange-600">Rp {fmt(sisa)}</span>
                                </p>
                              )}
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-xs text-muted-foreground shrink-0">+Rp</span>
                                <Input
                                  autoFocus
                                  value={inputBayar}
                                  onChange={(e) => setInputBayar(e.target.value)}
                                  placeholder="Jumlah pembayaran"
                                  className="h-7 text-xs w-40"
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') saveBayar(record);
                                    if (e.key === 'Escape') { setEditBayarId(null); setInputBayar(''); setCatatanBayar(''); }
                                  }}
                                />
                                <Input
                                  value={catatanBayar}
                                  onChange={(e) => setCatatanBayar(e.target.value)}
                                  placeholder="Catatan (opsional)"
                                  className="h-7 text-xs w-40"
                                />
                                <Button size="sm" className="h-7 text-xs px-2" onClick={() => saveBayar(record)}>
                                  <Save className="w-3 h-3" />
                                </Button>
                                <Button variant="ghost" size="sm" className="h-7 text-xs px-2" onClick={() => { setEditBayarId(null); setInputBayar(''); setCatatanBayar(''); }}>
                                  <XCircle className="w-3 h-3" />
                                </Button>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        {canEdit && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-xs h-7 text-green-700 gap-1 hover:bg-green-50"
                            onClick={() => { setEditBayarId(record.id); setInputBayar(''); setCatatanBayar(''); }}
                          >
                            <Wallet className="w-3.5 h-3.5" />
                            <span className="hidden sm:inline">Input Bayar</span>
                          </Button>
                        )}
                        {canEdit && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className={`text-xs h-7 gap-1.5 hover:bg-accent/10 ${status === 'Sudah Lunas' ? 'text-accent' : 'text-muted-foreground hover:text-accent'}`}
                            onClick={() => setSimpanDbRecord(record)}
                            title={status !== 'Sudah Lunas' ? `Simpan ke DB (${persen}% terbayar)` : 'Simpan ke Database Bahan'}
                          >
                            <Database className="w-3.5 h-3.5" />
                            <span className="hidden sm:inline">Simpan DB</span>
                            {status !== 'Sudah Lunas' && persen > 0 && (
                              <span className="text-[10px] text-orange-600 font-bold">{persen}%</span>
                            )}
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-xs h-7 text-blue-600 gap-1 hover:bg-blue-50"
                          onClick={() => setPdfRecord(record)}
                        >
                          <FileDown className="w-3.5 h-3.5" />
                          <span className="hidden sm:inline">PDF</span>
                        </Button>
                        {canEdit && (
                          <Button variant="ghost" size="icon" className="w-7 h-7" onClick={() => setEditItem(record)}>
                            <Edit2 className="w-3.5 h-3.5" />
                          </Button>
                        )}
                        <Button variant="ghost" size="icon" className="w-7 h-7" onClick={() => setExpanded(expanded === record.id ? null : record.id)}>
                          {expanded === record.id ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        </Button>
                      </div>
                    </div>

                    {/* Expanded Detail */}
                    {expanded === record.id && (
                      <div className="border-t border-border px-4 py-4 space-y-4 bg-muted/20">

                        {/* === RIWAYAT PEMBAYARAN === */}
                        {riwayatBayar.length > 0 && (
                          <div>
                            <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-2">
                              <Clock className="w-3.5 h-3.5" />
                              Riwayat Pemasukan Dana
                            </p>
                            <div className="space-y-2">
                              {riwayatBayar.map((rb, idx) => (
                                <div key={idx} className="flex items-center justify-between bg-green-50 border border-green-200 rounded-xl px-3 py-2.5">
                                  <div className="flex items-center gap-2">
                                    <div className="w-5 h-5 rounded-full bg-green-200 flex items-center justify-center text-[10px] font-bold text-green-800">
                                      {idx + 1}
                                    </div>
                                    <div>
                                      <p className="text-xs font-semibold text-green-800">
                                        Rp {fmt(rb.jumlah)}
                                      </p>
                                      {rb.catatan && (
                                        <p className="text-[10px] text-green-600 italic">{rb.catatan}</p>
                                      )}
                                    </div>
                                  </div>
                                  <div className="text-right">
                                    <p className="text-[11px] font-semibold text-green-700">
                                      {rb.tanggal_bayar ? format(new Date(rb.tanggal_bayar), 'dd MMM yyyy', { locale: id }) : '—'}
                                    </p>
                                    <p className="text-[10px] text-green-600 flex items-center gap-1 justify-end">
                                      <Clock className="w-2.5 h-2.5" />
                                      {rb.jam_bayar || '—'}
                                    </p>
                                  </div>
                                </div>
                              ))}
                              <div className="flex items-center justify-between bg-green-100 border border-green-300 rounded-xl px-3 py-2">
                                <span className="text-xs font-bold text-green-800">Total Terbayar</span>
                                <span className="text-sm font-bold text-green-800">Rp {fmt(jumlahDibayar)}</span>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* === RINCIAN HPP === */}
                        <div>
                          <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-2">
                            <span className="w-4 h-4 rounded-full bg-primary/20 flex items-center justify-center text-primary text-[10px]">H</span>
                            Rincian HPP
                          </p>
                          {[...(record.products ?? [])].sort((a, b) => (a.nama_product || '').localeCompare(b.nama_product || '', 'id')).map((p, pi) => (
                            <div key={pi} className="bg-card border border-border rounded-xl p-4 mb-3">
                              <div className="flex items-start justify-between mb-3">
                                <div>
                                  <p className="font-semibold text-sm">{p.nama_product}</p>
                                  <p className="text-xs text-muted-foreground mt-0.5">Qty: {p.qty} unit</p>
                                </div>
                                <div className="text-right">
                                  <p className="text-xs text-muted-foreground">HPP per pcs</p>
                                  <p className="font-bold text-accent">Rp {fmt(p.hpp_per_pcs_digunakan || p.hpp_per_pcs_label)}</p>
                                  <p className="text-xs text-muted-foreground">× {p.qty} = Rp {fmt(p.total_hpp_product)}</p>
                                </div>
                              </div>

                              {/* Packaging */}
                              {(p.botol_nama || p.tutup_nama || p.spray_nama) && (
                                <div className="mb-2">
                                  <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Packaging</p>
                                  <div className="space-y-1">
                                    {p.botol_nama && (
                                      <div className="flex items-center justify-between text-xs bg-muted/40 rounded-lg px-2.5 py-1.5">
                                        <span className="font-medium">Botol: {p.botol_nama}</span>
                                        <span className="text-foreground font-semibold">Rp {fmt(p.botol_harga_beli || p.botol_harga || 0)}/pcs</span>
                                      </div>
                                    )}
                                    {p.tutup_nama && (
                                      <div className="flex items-center justify-between text-xs bg-muted/40 rounded-lg px-2.5 py-1.5">
                                        <span className="font-medium">Tutup: {p.tutup_nama}</span>
                                        <span className="text-foreground font-semibold">Rp {fmt(p.tutup_harga_beli || p.tutup_harga || 0)}/pcs</span>
                                      </div>
                                    )}
                                    {p.spray_nama && (
                                      <div className="flex items-center justify-between text-xs bg-muted/40 rounded-lg px-2.5 py-1.5">
                                        <span className="font-medium">Spray: {p.spray_nama}</span>
                                        <span className="text-foreground font-semibold">Rp {fmt(p.spray_harga_beli || p.spray_harga || 0)}/pcs</span>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              )}

                              {/* Racikan */}
                              {p.racikan?.length > 0 && (
                                <div className="mb-2">
                                  <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Bahan Cair</p>
                                  <div className="space-y-1">
                                    {p.racikan.map((r, ri) => {
                                      const isLiter = needsLiterConversion(r.satuan, r.kategori);
                                      const gramMl = isLiter && r.volume_ml > 0 ? formatGramMl(r.volume_ml) : null;
                                      return (
                                        <div key={ri} className="flex items-center justify-between text-xs bg-muted/40 rounded-lg px-2.5 py-1.5">
                                          <div className="flex items-center gap-2 flex-wrap">
                                            <span className="font-medium">{r.bahan_nama || '—'}</span>
                                            {r.vendor && <span className="text-muted-foreground">({r.vendor})</span>}
                                            <Badge variant="outline" className="text-[10px] py-0">{r.kategori}</Badge>
                                            <span className="text-muted-foreground">
                                              {r.persentase}% →{' '}
                                              {gramMl ? (
                                                <span className="text-orange-600 font-semibold">{gramMl.gramLabel} / {gramMl.mlLabel}</span>
                                              ) : (
                                                `${r.volume_ml?.toFixed(1)}ml`
                                              )}
                                            </span>
                                          </div>
                                          <span className="font-semibold text-accent shrink-0">Rp {fmt(r.hpp_bahan)}</span>
                                        </div>
                                      );
                                    })}
                                  </div>
                                </div>
                              )}

                              {/* Komponen tambahan */}
                              {(p.komponen_tambahan || []).filter((k) => k.harga > 0).length > 0 && (
                                <div className="mb-2">
                                  <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Komponen Tambahan</p>
                                  <div className="space-y-1">
                                    {(p.komponen_tambahan || []).filter((k) => k.harga > 0).map((k, ki) => (
                                      <div key={ki} className="flex items-center justify-between text-xs bg-muted/40 rounded-lg px-2.5 py-1.5">
                                        <span className="font-medium">{k.nama || k.kategori}</span>
                                        <span className="font-semibold">Rp {fmt(k.harga)}</span>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}

                              {/* Jasa */}
                              {(() => {
                                const jasaNominal = p.jasa_nominal || 0;
                                const packagingTotal = (p.botol_harga_beli || p.botol_harga || 0) + (p.tutup_harga_beli || p.tutup_harga || 0) + (p.spray_harga_beli || p.spray_harga || 0);
                                const racikanTotal = (p.racikan || []).reduce((s, r) => s + (r.hpp_bahan || 0), 0);
                                const komponenTotal = (p.komponen_tambahan || []).reduce((s, k) => s + (k.harga || 0), 0);
                                const hppTotal = p.hpp_per_pcs_digunakan || p.hpp_per_pcs_label || 0;
                                const derivedJasa = Math.round(hppTotal - packagingTotal - racikanTotal - komponenTotal);
                                const jasaDisplay = jasaNominal > 0 ? jasaNominal : derivedJasa > 0 ? derivedJasa : 0;
                                if (jasaDisplay <= 0) return null;
                                return (
                                  <div className="mb-2">
                                    <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Jasa</p>
                                    <div className="flex items-center justify-between text-xs bg-emerald-50 border border-emerald-100 rounded-lg px-2.5 py-1.5">
                                      <span className="font-medium text-emerald-700 flex items-center gap-1.5">
                                        Jasa Proses
                                        <span className="bg-emerald-100 px-1.5 py-0.5 rounded text-[10px]">Pure Profit</span>
                                      </span>
                                      <span className="font-semibold text-emerald-700">+Rp {fmt(jasaDisplay)}/pcs</span>
                                    </div>
                                  </div>
                                );
                              })()}
                            </div>
                          ))}

                          {/* Legalitas */}
                          {(record.legalitas ?? []).length > 0 && (
                            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 space-y-2">
                              <p className="text-xs font-semibold text-blue-700 uppercase tracking-wider flex items-center gap-1.5">
                                Legalitas
                              </p>
                              {(record.legalitas ?? []).map((l, li) => {
                                const hargaJual = l.harga_jual || 0;
                                const hargaBeli = l.harga_beli || l.nominal || 0;
                                const qty = l.qty_variant || 1;
                                const totalJual = hargaJual * qty;
                                const totalBeli = hargaBeli * qty;
                                return (
                                  <div key={li} className="flex items-center justify-between bg-white rounded-lg px-3 py-2 border border-blue-100 text-sm">
                                    <span className="font-semibold text-blue-800">
                                      {l.nama}{qty > 1 ? ` × ${qty}` : ''}
                                    </span>
                                    <div className="text-right text-xs space-y-0.5">
                                      <div className="text-muted-foreground">HPP: <span className="font-semibold text-foreground">Rp {fmt(totalBeli)}</span></div>
                                      {hargaJual > 0 && <div className="text-blue-700 font-bold">Jual: Rp {fmt(totalJual)}</div>}
                                    </div>
                                  </div>
                                );
                              })}
                              <div className="flex justify-between items-center pt-1 border-t border-blue-200 text-xs font-bold text-blue-800">
                                <span>Total Legalitas (Harga Jual)</span>
                                <span>Rp {fmt((record.legalitas ?? []).reduce((s, l) => s + (l.harga_jual || 0) * (l.qty_variant || 1), 0))}</span>
                              </div>
                              <div className="flex justify-between items-center text-xs font-medium text-blue-700">
                                <span>Total Legalitas (HPP Beli)</span>
                                <span>Rp {fmt((record.legalitas ?? []).reduce((s, l) => s + (l.harga_beli || l.nominal || 0) * (l.qty_variant || 1), 0))}</span>
                              </div>
                            </div>
                          )}
                        </div>

                        {/* === MARGIN KEUNTUNGAN — mengikuti status bayar === */}
                        <MarginKeuntunganSection record={record} />

                        {record.catatan_global && (
                          <p className="text-sm text-muted-foreground italic px-1">{record.catatan_global}</p>
                        )}

                        {canEdit && (
                          <div className="flex justify-end">
                            <Button variant="destructive" size="sm" className="text-xs" onClick={() => { if (confirm('Hapus riwayat ini?')) deleteMutation.mutate(record.id); }}>
                              Hapus Riwayat
                            </Button>
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
      </>}

      {editItem && (
        <EditProduksiModal
          record={editItem}
          onClose={() => setEditItem(null)}
          onSaved={() => {
            setEditItem(null);
            queryClient.invalidateQueries({ queryKey: ['riwayat-produksi'] });
          }}
        />
      )}

      {simpanDbRecord && (
        <SimpanDatabaseModal record={simpanDbRecord} onClose={() => setSimpanDbRecord(null)} />
      )}

      {pdfRecord && (
        <GenerateHppPdfModal record={pdfRecord} onClose={() => setPdfRecord(null)} />
      )}
    </div>
  );
}

/* ─── Komponen Margin Keuntungan yang mengikuti status bayar ─── */
function MarginKeuntunganSection({ record }) {
  const totalHPP = record.total_hpp_semua || 0;
  const totalJual = record.total_harga_jual_semua || 0;
  const jumlahDibayar = record.jumlah_dibayar || 0;
  const statusBayar = getStatusBayar(jumlahDibayar, totalJual || totalHPP);

  // Apakah ada harga jual yang diisi di produk
  const adaHargaJual = (record.products ?? []).some((p) => p.harga_jual_per_pcs > 0) || totalJual > 0;

  // Margin real berdasarkan yang sudah masuk kas vs modal
  const marginRealDariModal = jumlahDibayar - totalHPP;
  const marginIdeal = totalJual - totalHPP;

  const statusConfig = {
    'Belum Bayar': {
      bg: 'bg-gradient-to-br from-red-50 to-rose-50',
      border: 'border-red-200',
      headerColor: 'text-red-800',
      badgeBg: 'bg-red-100 text-red-700 border-red-200',
      icon: XCircle,
      label: 'Belum Bayar',
      desc: 'Dana belum masuk — modal belum kembali',
    },
    'Belum Lunas': {
      bg: 'bg-gradient-to-br from-orange-50 to-amber-50',
      border: 'border-orange-200',
      headerColor: 'text-orange-800',
      badgeBg: 'bg-orange-100 text-orange-700 border-orange-200',
      icon: AlertTriangle,
      label: 'Belum Lunas',
      desc: 'Pembayaran sebagian — dihitung dari dana masuk',
    },
    'Sudah Lunas': {
      bg: 'bg-gradient-to-br from-emerald-50 to-green-50',
      border: 'border-emerald-200',
      headerColor: 'text-emerald-800',
      badgeBg: 'bg-green-100 text-green-700 border-green-200',
      icon: CheckCircle2,
      label: 'Sudah Lunas',
      desc: 'Pembayaran penuh — margin dihitung dari harga jual',
    },
  };

  const sc = statusConfig[statusBayar];
  const StatusIcon = sc.icon;

  return (
    <div className={`${sc.bg} border ${sc.border} rounded-xl p-4 space-y-3`}>
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <p className={`text-xs font-bold ${sc.headerColor} uppercase tracking-wider flex items-center gap-2`}>
          <TrendingUp className="w-4 h-4" />
          Margin Keuntungan
        </p>
        <Badge className={`text-xs border ${sc.badgeBg} flex items-center gap-1`}>
          <StatusIcon className="w-3 h-3" />
          {sc.label}
        </Badge>
      </div>

      <p className="text-[11px] text-muted-foreground italic">{sc.desc}</p>

      {/* Summary angka */}
      <div className="grid grid-cols-3 gap-2 text-xs">
        <div className="bg-white/70 rounded-xl p-3 text-center border border-white/50">
          <p className="text-muted-foreground text-[10px] mb-0.5">Total HPP/Modal</p>
          <p className="font-bold text-foreground">Rp {fmt(totalHPP)}</p>
        </div>
        <div className="bg-white/70 rounded-xl p-3 text-center border border-white/50">
          <p className="text-blue-600 text-[10px] mb-0.5">
            {statusBayar === 'Sudah Lunas' ? 'Harga Jual (Lunas)' : 'Dana Masuk'}
          </p>
          <p className="font-bold text-blue-700">
            Rp {fmt(statusBayar === 'Sudah Lunas' ? jumlahDibayar : jumlahDibayar)}
          </p>
          {statusBayar !== 'Sudah Lunas' && adaHargaJual && (
            <p className="text-[9px] text-blue-400 mt-0.5">Target: Rp {fmt(totalJual)}</p>
          )}
        </div>
        <div className={`rounded-xl p-3 text-center border ${marginRealDariModal >= 0 && statusBayar !== 'Belum Bayar' ? 'bg-green-100 border-green-200' : 'bg-red-50 border-red-200'}`}>
          <p className={`text-[10px] mb-0.5 ${marginRealDariModal >= 0 && statusBayar !== 'Belum Bayar' ? 'text-green-600' : 'text-red-500'}`}>
            {statusBayar === 'Belum Bayar' ? 'Status' : 'Untung/Rugi Saat Ini'}
          </p>
          {statusBayar === 'Belum Bayar' ? (
            <p className="font-bold text-red-600 text-[11px]">Belum Ada Pemasukan</p>
          ) : (
            <p className={`font-bold text-sm ${marginRealDariModal >= 0 ? 'text-green-700' : 'text-red-600'}`}>
              {marginRealDariModal >= 0 ? '+' : ''}Rp {fmt(marginRealDariModal)}
            </p>
          )}
        </div>
      </div>

      {/* Keterangan status */}
      {statusBayar === 'Belum Bayar' && (
        <div className="bg-red-50 border border-red-200 rounded-xl px-3 py-2.5 flex items-start gap-2">
          <XCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
          <div>
            <p className="text-xs font-semibold text-red-700">{record.nama_brand} — Belum Bayar</p>
            <p className="text-[10px] text-red-500 mt-0.5">
              Modal Rp {fmt(totalHPP)} sudah keluar, belum ada dana masuk. Gunakan "Input Bayar" untuk mencatat pembayaran.
            </p>
          </div>
        </div>
      )}

      {statusBayar === 'Belum Lunas' && (
        <div className="bg-orange-50 border border-orange-200 rounded-xl px-3 py-2.5 space-y-1.5">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-orange-500 shrink-0" />
            <p className="text-xs font-semibold text-orange-700">{record.nama_brand} — Belum Lunas</p>
          </div>
          <div className="grid grid-cols-2 gap-2 text-[10px]">
            <div>
              <span className="text-muted-foreground">Dana masuk: </span>
              <span className="font-semibold text-green-700">Rp {fmt(jumlahDibayar)}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Sisa tagihan: </span>
              <span className="font-semibold text-orange-700">Rp {fmt((totalJual || totalHPP) - jumlahDibayar)}</span>
            </div>
          </div>
          <div className="h-1.5 bg-orange-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-orange-400 rounded-full transition-all"
              style={{ width: `${Math.min(100, Math.round(jumlahDibayar / (totalJual || totalHPP) * 100))}%` }}
            />
          </div>
          <p className="text-[10px] text-orange-600 flex items-center gap-1">
            {marginRealDariModal >= 0
              ? <><CheckCircle2 className="w-3 h-3 shrink-0" />{`Sudah balik modal +Rp ${fmt(marginRealDariModal)} dari dana masuk`}</>
              : <><XCircle className="w-3 h-3 shrink-0" />{`Belum balik modal, masih minus Rp ${fmt(Math.abs(marginRealDariModal))}`}</>}
          </p>
        </div>
      )}

      {/* Per produk — hanya tampil jika ada harga jual */}
      {adaHargaJual && (record.products ?? []).some((p) => p.harga_jual_per_pcs > 0) && (
        <div className="space-y-2">
          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Rincian Per Produk</p>
          {[...(record.products ?? [])].sort((a, b) => (a.nama_product || '').localeCompare(b.nama_product || '', 'id')).map((p, pi) => {
            if (!p.harga_jual_per_pcs) return null;
            const hppPcs = p.hpp_per_pcs_digunakan || p.hpp_per_pcs_label || 0;
            const jasaPerPcs = p.jasa_nominal || 0;
            const packagingBeli = (p.botol_harga_beli || p.botol_harga || 0) + (p.tutup_harga_beli || p.tutup_harga || 0) + (p.spray_harga_beli || p.spray_harga || 0);
            const racikanBeli = (p.racikan || []).reduce((s, r) => s + (r.hpp_bahan || 0), 0);
            const komponenBeli = (p.komponen_tambahan || []).reduce((s, k) => s + (k.harga || 0), 0);
            const hppBeliTanpaJasa = packagingBeli + racikanBeli + komponenBeli || hppPcs - jasaPerPcs;
            const marginPerPcs = p.margin_nominal_per_pcs || (p.harga_jual_per_pcs > 0 ? p.harga_jual_per_pcs - hppBeliTanpaJasa : 0);
            const marginTotal = marginPerPcs * (p.qty || 1);
            const pct = hppPcs > 0 ? (marginPerPcs / hppPcs * 100).toFixed(1) : '0';

            return (
              <div key={pi} className="bg-white/70 border border-white/50 rounded-xl p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <p className="font-semibold text-sm text-foreground">{p.nama_product}</p>
                  <div className="flex items-center gap-1.5">
                    {/* Status badge per produk mengikuti status bayar */}
                    {statusBayar !== 'Sudah Lunas' && (
                      <Badge className={`text-[10px] border ${sc.badgeBg}`}>
                        <StatusIcon className="w-2.5 h-2.5 mr-0.5" />
                        {sc.label}
                      </Badge>
                    )}
                    <Badge className={`text-xs ${marginPerPcs >= 0 ? 'bg-green-100 text-green-700 border-green-200' : 'bg-red-100 text-red-700 border-red-200'}`}>
                      {marginPerPcs >= 0 ? '+' : ''}{pct}%
                    </Badge>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2 text-xs">
                  <div className="bg-muted/40 rounded-lg p-2 text-center">
                    <p className="text-muted-foreground">HPP Beli</p>
                    <p className="font-bold text-foreground">Rp {fmt(hppBeliTanpaJasa)}</p>
                    <p className="text-muted-foreground text-[10px]">/pcs</p>
                  </div>
                  <div className="bg-blue-50 rounded-lg p-2 text-center">
                    <p className="text-blue-600">Harga Jual</p>
                    <p className="font-bold text-blue-700">Rp {fmt(p.harga_jual_per_pcs)}</p>
                    <p className="text-blue-500 text-[10px]">/pcs</p>
                  </div>
                  <div className={`rounded-lg p-2 text-center ${marginPerPcs >= 0 ? 'bg-green-100' : 'bg-red-50'}`}>
                    <p className={marginPerPcs >= 0 ? 'text-green-600' : 'text-red-500'}>Margin</p>
                    <p className={`font-bold ${marginPerPcs >= 0 ? 'text-green-700' : 'text-red-600'}`}>
                      {marginPerPcs >= 0 ? '+' : ''}Rp {fmt(marginPerPcs)}
                    </p>
                    <p className={`text-[10px] ${marginPerPcs >= 0 ? 'text-green-500' : 'text-red-400'}`}>/pcs</p>
                  </div>
                </div>
                {jasaPerPcs > 0 && (
                  <div className="flex items-center gap-2 text-xs text-emerald-700 bg-emerald-50 rounded-lg px-2.5 py-1.5">
                    <CheckCircle2 className="w-3 h-3 shrink-0" />
                    <span>Termasuk Jasa (Pure Profit): +Rp {fmt(jasaPerPcs)}/pcs</span>
                  </div>
                )}
                <div className={`flex items-center justify-between text-xs rounded-lg px-2.5 py-2 ${statusBayar === 'Sudah Lunas' ? (marginTotal >= 0 ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200') : 'bg-muted/30 border border-muted'}`}>
                  <span className="text-muted-foreground">Total Margin × {p.qty} unit</span>
                  <div className="text-right">
                    {statusBayar === 'Sudah Lunas' ? (
                      <span className={`font-bold ${marginTotal >= 0 ? 'text-green-700' : 'text-red-600'}`}>
                        {marginTotal >= 0 ? '+' : ''}Rp {fmt(marginTotal)}
                      </span>
                    ) : (
                      <span className="font-bold text-muted-foreground text-xs">
                        (ideal: {marginTotal >= 0 ? '+' : ''}Rp {fmt(marginTotal)})
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Margin legalitas */}
      {(record.legalitas ?? []).length > 0 && adaHargaJual && (
        <div className="bg-white/70 border border-white/50 rounded-xl p-3 space-y-2">
          <p className="text-xs font-semibold text-foreground">Margin Legalitas</p>
          {(record.legalitas ?? []).map((l, li) => {
            const hargaBeli = l.harga_beli || l.nominal || 0;
            const hargaJual = l.harga_jual || 0;
            const qty = l.qty_variant || 1;
            const totalBeli = hargaBeli * qty;
            const totalJualL = hargaJual * qty;
            const margin = totalJualL - totalBeli;
            return (
              <div key={li} className="bg-white/60 border border-white/50 rounded-xl p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <p className="font-semibold text-sm text-foreground">{l.nama}{qty > 1 ? ` × ${qty} variant` : ''}</p>
                </div>
                <div className="grid grid-cols-3 gap-2 text-xs">
                  <div className="bg-muted/40 rounded-lg p-2 text-center">
                    <p className="text-muted-foreground">HPP Beli</p>
                    <p className="font-bold text-foreground">Rp {fmt(totalBeli)}</p>
                  </div>
                  <div className="bg-blue-50 rounded-lg p-2 text-center">
                    <p className="text-blue-600">Harga Jual</p>
                    <p className="font-bold text-blue-700">Rp {fmt(totalJualL)}</p>
                  </div>
                  <div className={`rounded-lg p-2 text-center ${margin >= 0 ? 'bg-green-100' : 'bg-red-50'}`}>
                    <p className={margin >= 0 ? 'text-green-600' : 'text-red-500'}>Margin</p>
                    <p className={`font-bold ${margin >= 0 ? 'text-green-700' : 'text-red-600'}`}>
                      {margin >= 0 ? '+' : ''}Rp {fmt(margin)}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Grand total margin */}
      {adaHargaJual && (
        <div className={`border-t ${sc.border} pt-3`}>
          <div className="flex items-center justify-between mb-1">
            <span className="text-sm font-bold text-foreground">
              {statusBayar === 'Sudah Lunas' ? 'Total Margin (Lunas)' : 'Total Margin Ideal (jika lunas)'}
            </span>
            <span className={`text-lg font-bold ${marginIdeal >= 0 ? 'text-green-700' : 'text-red-600'}`}>
              {marginIdeal >= 0 ? '+' : ''}Rp {fmt(
                (record.products ?? []).reduce((s, p) => {
                  const m = p.margin_nominal_per_pcs || (p.harga_jual_per_pcs || 0) - (p.hpp_per_pcs_digunakan || p.hpp_per_pcs_label || 0);
                  return s + m * (p.qty || 1);
                }, 0) +
                (record.legalitas ?? []).reduce((s, l) => {
                  const hb = l.harga_beli || l.nominal || 0;
                  const hj = l.harga_jual || 0;
                  return s + (hj - hb) * (l.qty_variant || 1);
                }, 0)
              )}
            </span>
          </div>
          {statusBayar !== 'Sudah Lunas' && (
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Untung/Rugi dari Dana Masuk</span>
              <span className={`text-sm font-bold ${marginRealDariModal >= 0 ? 'text-green-700' : 'text-red-600'}`}>
                {marginRealDariModal >= 0 ? '+' : ''}Rp {fmt(marginRealDariModal)}
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}