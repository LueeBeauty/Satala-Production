import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, Legend, PieChart, Pie, Cell
} from 'recharts';
import {
  TrendingUp, TrendingDown, DollarSign, Package2, BarChart2, Calendar, SlidersHorizontal
} from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { format, subDays, startOfMonth } from 'date-fns';

const fmt = (n) => new Intl.NumberFormat('id-ID').format(Math.round(n || 0));
const fmtShort = (n) => {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}jt`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}rb`;
  return String(Math.round(n || 0));
};

const PIE_COLORS = ['#7c3aed', '#d97706', '#0891b2', '#16a34a', '#dc2626', '#db2777', '#2563eb'];

const PRESET_RANGES = [
  { label: '7 hari', days: 7 },
  { label: '30 hari', days: 30 },
  { label: 'Bulan ini', days: -1 },
  { label: '3 bulan', days: 90 },
  { label: 'Semua', days: 0 },
];

export default function RekapPage() {
  const [preset, setPreset] = useState('30 hari');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [useCustom, setUseCustom] = useState(false);
  const [filterBrand, setFilterBrand] = useState('semua');

  // Laporan Kustom state
  const [kustomMode, setKustomMode] = useState('hpp_brand'); // 'hpp_brand' | 'biaya_bahan' | 'biaya_packaging' | 'biaya_komponen'
  const [kustomBrand, setKustomBrand] = useState('semua');
  const [kustomKategoriBahan, setKustomKategoriBahan] = useState('semua');
  const [kustomPackaging, setKustomPackaging] = useState('botol');

  const { data: riwayatList = [], isLoading } = useQuery({
    queryKey: ['riwayat-produksi'],
    queryFn: () => base44.entities.RiwayatProduksi.list('-tanggal'),
  });

  const now = new Date();

  const { rangeStart, rangeEnd } = useMemo(() => {
    if (useCustom) return { rangeStart: customStart, rangeEnd: customEnd };
    const p = PRESET_RANGES.find(r => r.label === preset);
    if (!p || p.days === 0) return { rangeStart: null, rangeEnd: null };
    if (p.days === -1) {
      return {
        rangeStart: format(startOfMonth(now), 'yyyy-MM-dd'),
        rangeEnd: format(now, 'yyyy-MM-dd'),
      };
    }
    return {
      rangeStart: format(subDays(now, p.days), 'yyyy-MM-dd'),
      rangeEnd: format(now, 'yyyy-MM-dd'),
    };
  }, [preset, customStart, customEnd, useCustom]);

  const inRange = (dateStr) => {
    if (!rangeStart && !rangeEnd) return true;
    if (!dateStr) return false;
    const d = dateStr.split('T')[0];
    if (rangeStart && d < rangeStart) return false;
    if (rangeEnd && d > rangeEnd) return false;
    return true;
  };

  const filteredByDate = riwayatList.filter(r => inRange(r.tanggal));

  // Brands untuk filter
  const brands = useMemo(() => {
    const set = new Set(filteredByDate.map(r => r.nama_brand).filter(Boolean));
    return Array.from(set).sort();
  }, [filteredByDate]);

  const filtered = useMemo(() => {
    if (filterBrand === 'semua') return filteredByDate;
    return filteredByDate.filter(r => r.nama_brand === filterBrand);
  }, [filteredByDate, filterBrand]);

  // Flatten semua produk dari riwayat yang terfilter
  const allProducts = useMemo(() => {
    const list = [];
    filtered.forEach(r => {
      (r.products || []).forEach(p => {
        list.push({
          ...p,
          nama_brand: r.nama_brand,
          tanggal: r.tanggal,
          riwayat_id: r.id,
        });
      });
    });
    return list;
  }, [filtered]);

  // === KPI ===
  const totalHPP = filtered.reduce((s, r) => s + (r.total_hpp_semua || 0), 0);
  const totalJual = filtered.reduce((s, r) => s + (r.total_harga_jual_semua || 0), 0);
  const totalMargin = filtered.reduce((s, r) => s + (r.total_margin_nominal_semua || 0), 0);
  const totalQty = allProducts.reduce((s, p) => s + (p.qty || 0), 0);
  const marginPct = totalHPP > 0 ? (totalMargin / totalHPP) * 100 : 0;
  const avgHppPerPcs = totalQty > 0 ? totalHPP / totalQty : 0;

  // === Tren HPP & Harga Jual per tanggal ===
  const trendData = useMemo(() => {
    const map = {};
    filtered.forEach(r => {
      const d = r.tanggal?.split('T')[0] || '';
      if (!map[d]) map[d] = { tanggal: d, hpp: 0, jual: 0, margin: 0, qty: 0 };
      map[d].hpp += r.total_hpp_semua || 0;
      map[d].jual += r.total_harga_jual_semua || 0;
      map[d].margin += r.total_margin_nominal_semua || 0;
      (r.products || []).forEach(p => { map[d].qty += p.qty || 0; });
    });
    return Object.values(map).sort((a, b) => a.tanggal.localeCompare(b.tanggal));
  }, [filtered]);

  // === Profitabilitas per Brand ===
  const brandData = useMemo(() => {
    const map = {};
    filtered.forEach(r => {
      const b = r.nama_brand || 'Tanpa Brand';
      if (!map[b]) map[b] = { brand: b, hpp: 0, jual: 0, margin: 0, qty: 0, count: 0 };
      map[b].hpp += r.total_hpp_semua || 0;
      map[b].jual += r.total_harga_jual_semua || 0;
      map[b].margin += r.total_margin_nominal_semua || 0;
      map[b].count += 1;
      (r.products || []).forEach(p => { map[b].qty += p.qty || 0; });
    });
    return Object.values(map).sort((a, b) => b.margin - a.margin);
  }, [filtered]);

  // === Profitabilitas per Produk (top) ===
  const productData = useMemo(() => {
    const map = {};
    allProducts.forEach(p => {
      const key = `${p.nama_brand} — ${p.nama_product || 'Produk'}`;
      if (!map[key]) map[key] = { nama: key, hpp: 0, jual: 0, margin: 0, qty: 0 };
      const hppTotal = (p.hpp_per_pcs_digunakan || p.hpp_per_pcs_label || 0) * (p.qty || 1);
      const jualTotal = (p.harga_jual_per_pcs || 0) * (p.qty || 1);
      map[key].hpp += hppTotal;
      map[key].jual += jualTotal;
      map[key].margin += jualTotal - hppTotal;
      map[key].qty += p.qty || 0;
    });
    return Object.values(map)
      .map(v => ({ ...v, margin_pct: v.hpp > 0 ? (v.margin / v.hpp) * 100 : 0 }))
      .sort((a, b) => b.margin - a.margin)
      .slice(0, 10);
  }, [allProducts]);

  // === Distribusi Bahan Cair (biaya terbesar) ===
  const bahanData = useMemo(() => {
    const map = {};
    allProducts.forEach(p => {
      (p.racikan || []).forEach(r => {
        const key = r.bahan_nama || 'Bahan';
        if (!map[key]) map[key] = { nama: key, total: 0 };
        map[key].total += (r.hpp_bahan || 0) * (p.qty || 1);
      });
    });
    return Object.values(map).sort((a, b) => b.total - a.total).slice(0, 7);
  }, [allProducts]);

  // === Data untuk Laporan Kustom ===
  // Semua produk tanpa filter brand (untuk laporan kustom bisa pilih sendiri)
  const allProductsAll = useMemo(() => {
    const list = [];
    filteredByDate.forEach(r => {
      (r.products || []).forEach(p => {
        list.push({ ...p, nama_brand: r.nama_brand, tanggal: r.tanggal });
      });
    });
    return list;
  }, [filteredByDate]);

  const allBrandsAll = useMemo(() => {
    const set = new Set(allProductsAll.map(p => p.nama_brand).filter(Boolean));
    return Array.from(set).sort();
  }, [allProductsAll]);

  const kustomProducts = useMemo(() => {
    if (kustomBrand === 'semua') return allProductsAll;
    return allProductsAll.filter(p => p.nama_brand === kustomBrand);
  }, [allProductsAll, kustomBrand]);

  // Hasil laporan kustom
  const kustomResult = useMemo(() => {
    if (kustomMode === 'hpp_brand') {
      // Total HPP per brand per produk
      const map = {};
      kustomProducts.forEach(p => {
        const key = p.nama_product || 'Produk';
        if (!map[key]) map[key] = { nama: key, hpp: 0, jual: 0, margin: 0, qty: 0 };
        const qty = p.qty || 1;
        const hpp = (p.hpp_per_pcs_digunakan || p.hpp_per_pcs_label || 0) * qty;
        const jual = (p.harga_jual_per_pcs || 0) * qty;
        map[key].hpp += hpp;
        map[key].jual += jual;
        map[key].margin += jual - hpp;
        map[key].qty += qty;
      });
      return Object.values(map).sort((a, b) => b.hpp - a.hpp);
    }

    if (kustomMode === 'biaya_bahan') {
      // Total biaya per bahan, difilter kategori
      const map = {};
      kustomProducts.forEach(p => {
        (p.racikan || []).forEach(r => {
          const kat = r.kategori || r.kategori_bahan || 'Lainnya';
          if (kustomKategoriBahan !== 'semua' && kat.toLowerCase() !== kustomKategoriBahan.toLowerCase()) return;
          const key = r.bahan_nama || 'Bahan';
          if (!map[key]) map[key] = { nama: key, kategori: kat, total: 0, volume_ml: 0 };
          map[key].total += (r.hpp_bahan || 0) * (p.qty || 1);
          map[key].volume_ml += (r.volume_ml || 0) * (p.qty || 1);
        });
      });
      return Object.values(map).sort((a, b) => b.total - a.total);
    }

    if (kustomMode === 'biaya_packaging') {
      // Total biaya packaging per produk
      return kustomProducts.map(p => {
        const qty = p.qty || 1;
        let biaya = 0;
        let label = '';
        if (kustomPackaging === 'botol') {
          biaya = (p.botol_harga_beli || p.botol_harga || 0) * qty;
          label = p.botol_nama || '—';
        } else if (kustomPackaging === 'tutup') {
          biaya = (p.tutup_harga_beli || p.tutup_harga || 0) * qty;
          label = p.tutup_nama || '—';
        } else {
          biaya = (p.spray_harga_beli || p.spray_harga || 0) * qty;
          label = p.spray_nama || '—';
        }
        return { nama: p.nama_product || 'Produk', brand: p.nama_brand, detail: label, qty, biaya };
      }).filter(x => x.biaya > 0).sort((a, b) => b.biaya - a.biaya);
    }

    if (kustomMode === 'biaya_komponen') {
      // Total biaya komponen tambahan
      const map = {};
      kustomProducts.forEach(p => {
        (p.komponen_tambahan || []).forEach(k => {
          const key = k.nama || k.kategori || 'Komponen';
          if (!map[key]) map[key] = { nama: key, kategori: k.kategori, total: 0 };
          map[key].total += (k.harga || 0) * (p.qty || 1);
        });
      });
      return Object.values(map).sort((a, b) => b.total - a.total);
    }

    return [];
  }, [kustomMode, kustomProducts, kustomKategoriBahan, kustomPackaging]);

  const kustomTotal = useMemo(() => {
    if (kustomMode === 'hpp_brand') return kustomResult.reduce((s, r) => s + r.hpp, 0);
    if (kustomMode === 'biaya_bahan') return kustomResult.reduce((s, r) => s + r.total, 0);
    if (kustomMode === 'biaya_packaging') return kustomResult.reduce((s, r) => s + r.biaya, 0);
    if (kustomMode === 'biaya_komponen') return kustomResult.reduce((s, r) => s + r.total, 0);
    return 0;
  }, [kustomResult, kustomMode]);

  // === Distribusi Packaging ===
  const packagingData = useMemo(() => {
    const map = { Botol: 0, Tutup: 0, Spray: 0 };
    allProducts.forEach(p => {
      const qty = p.qty || 1;
      map.Botol += (p.botol_harga_beli || p.botol_harga || 0) * qty;
      map.Tutup += (p.tutup_harga_beli || p.tutup_harga || 0) * qty;
      map.Spray += (p.spray_harga_beli || p.spray_harga || 0) * qty;
    });
    return Object.entries(map)
      .filter(([, v]) => v > 0)
      .map(([nama, total]) => ({ nama, total }));
  }, [allProducts]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-4 border-border border-t-accent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Filter Bar */}
      <div className="bg-card border border-border rounded-xl p-4 space-y-3">
        <div className="flex items-center gap-2 flex-wrap">
          <Calendar className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm font-medium">Periode:</span>
          <div className="flex gap-1 flex-wrap">
            {PRESET_RANGES.map(r => (
              <button
                key={r.label}
                onClick={() => { setPreset(r.label); setUseCustom(false); }}
                className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${!useCustom && preset === r.label ? 'bg-primary text-primary-foreground' : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'}`}
              >
                {r.label}
              </button>
            ))}
            <button
              onClick={() => setUseCustom(true)}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${useCustom ? 'bg-primary text-primary-foreground' : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'}`}
            >
              Pilih Rentang
            </button>
          </div>
        </div>

        {useCustom && (
          <div className="flex gap-2 items-center flex-wrap">
            <Input type="date" value={customStart} onChange={e => setCustomStart(e.target.value)} className="h-8 w-36" />
            <span className="text-xs text-muted-foreground">hingga</span>
            <Input type="date" value={customEnd} onChange={e => setCustomEnd(e.target.value)} className="h-8 w-36" />
          </div>
        )}

        {brands.length > 1 && (
          <div className="flex items-center gap-2 flex-wrap">
            <Package2 className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm font-medium text-muted-foreground">Brand:</span>
            <button
              onClick={() => setFilterBrand('semua')}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${filterBrand === 'semua' ? 'bg-accent text-accent-foreground' : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'}`}
            >
              Semua
            </button>
            {brands.map(b => (
              <button
                key={b}
                onClick={() => setFilterBrand(b)}
                className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${filterBrand === b ? 'bg-accent text-accent-foreground' : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'}`}
              >
                {b}
              </button>
            ))}
          </div>
        )}
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-20 text-muted-foreground">
          <BarChart2 className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="font-medium">Belum ada data riwayat HPP di periode ini</p>
          <p className="text-sm mt-1">Simpan kalkulasi HPP terlebih dahulu untuk melihat analitik</p>
        </div>
      ) : (
        <>
          {/* KPI */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            {[
              { label: 'Total HPP', value: `Rp ${fmtShort(totalHPP)}`, sub: `${filtered.length} sesi`, icon: DollarSign, color: 'text-primary' },
              { label: 'Total Harga Jual', value: `Rp ${fmtShort(totalJual)}`, sub: 'semua produk', icon: TrendingUp, color: 'text-blue-600' },
              { label: 'Total Margin', value: `Rp ${fmtShort(totalMargin)}`, sub: marginPct >= 0 ? `+${marginPct.toFixed(1)}%` : `${marginPct.toFixed(1)}%`, icon: marginPct >= 0 ? TrendingUp : TrendingDown, color: marginPct >= 0 ? 'text-green-600' : 'text-red-600' },
              { label: 'Total Unit', value: totalQty.toLocaleString(), sub: 'pcs diproduksi', icon: Package2, color: 'text-accent' },
              { label: 'Avg HPP/pcs', value: `Rp ${fmtShort(avgHppPerPcs)}`, sub: 'rata-rata', icon: BarChart2, color: 'text-purple-600' },
              { label: 'Total Brand', value: brands.length || 1, sub: 'aktif', icon: Package2, color: 'text-orange-600' },
            ].map(k => (
              <Card key={k.label}>
                <CardContent className="p-4">
                  <k.icon className={`w-4 h-4 ${k.color} mb-2`} />
                  <p className="text-lg font-bold leading-tight">{k.value}</p>
                  <p className="text-xs font-medium text-foreground mt-0.5">{k.label}</p>
                  <p className="text-[11px] text-muted-foreground">{k.sub}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Tren HPP & Harga Jual */}
          {trendData.length > 1 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-accent" />
                  Tren HPP vs Harga Jual
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={220}>
                  <LineChart data={trendData} margin={{ left: 10, right: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="tanggal" tick={{ fontSize: 10 }} tickFormatter={d => d.slice(5)} />
                    <YAxis tick={{ fontSize: 10 }} tickFormatter={fmtShort} />
                    <Tooltip formatter={(v) => `Rp ${fmt(v)}`} labelFormatter={l => `Tanggal: ${l}`} />
                    <Legend />
                    <Line type="monotone" dataKey="hpp" name="HPP" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
                    <Line type="monotone" dataKey="jual" name="Harga Jual" stroke="#16a34a" strokeWidth={2} dot={false} />
                    <Line type="monotone" dataKey="margin" name="Margin" stroke="#d97706" strokeWidth={2} strokeDasharray="4 2" dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Profitabilitas per Brand */}
            {brandData.length > 0 && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Profitabilitas per Brand</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={brandData} margin={{ left: -10 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="brand" tick={{ fontSize: 10 }} />
                      <YAxis tick={{ fontSize: 10 }} tickFormatter={fmtShort} />
                      <Tooltip formatter={(v) => `Rp ${fmt(v)}`} />
                      <Legend />
                      <Bar dataKey="hpp" name="HPP" fill="hsl(var(--primary))" radius={[3,3,0,0]} />
                      <Bar dataKey="jual" name="Harga Jual" fill="#16a34a" radius={[3,3,0,0]} />
                      <Bar dataKey="margin" name="Margin" fill="#d97706" radius={[3,3,0,0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            )}

            {/* Distribusi Biaya Bahan Cair */}
            {bahanData.length > 0 && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Distribusi Biaya Bahan Cair</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={220}>
                    <PieChart>
                      <Pie data={bahanData} dataKey="total" nameKey="nama" cx="50%" cy="50%" outerRadius={75} label={({ nama, percent }) => `${nama} ${(percent * 100).toFixed(0)}%`} labelLine={false}>
                        {bahanData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                      </Pie>
                      <Tooltip formatter={(v) => `Rp ${fmt(v)}`} />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Distribusi Biaya Packaging */}
          {packagingData.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Distribusi Biaya Packaging</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-3">
                  {packagingData.map((p, i) => (
                    <div key={i} className="bg-muted/40 rounded-xl p-4 text-center">
                      <p className="text-xs text-muted-foreground">{p.nama}</p>
                      <p className="text-lg font-bold mt-1">Rp {fmtShort(p.total)}</p>
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        {totalHPP > 0 ? `${((p.total / totalHPP) * 100).toFixed(1)}% dari HPP` : '—'}
                      </p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Top 10 Produk Paling Menguntungkan */}
          {productData.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-green-600" />
                  Top Produk Paling Menguntungkan
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {productData.map((p, i) => (
                    <div key={i} className="flex items-center gap-3 bg-muted/30 rounded-lg px-3 py-2">
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${i === 0 ? 'bg-amber-400 text-white' : i === 1 ? 'bg-slate-400 text-white' : i === 2 ? 'bg-orange-400 text-white' : 'bg-muted text-muted-foreground'}`}>
                        {i + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold truncate">{p.nama}</p>
                        <p className="text-[11px] text-muted-foreground">HPP: Rp {fmtShort(p.hpp)} · Jual: Rp {fmtShort(p.jual)} · {p.qty} pcs</p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className={`text-sm font-bold ${p.margin >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {p.margin >= 0 ? '+' : ''}Rp {fmtShort(p.margin)}
                        </p>
                        <Badge variant="outline" className={`text-[10px] ${p.margin_pct >= 30 ? 'border-green-300 text-green-700' : p.margin_pct >= 10 ? 'border-amber-300 text-amber-700' : 'border-red-300 text-red-600'}`}>
                          {p.margin_pct.toFixed(1)}%
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* ===== LAPORAN KUSTOM ===== */}
          <Card className="border-accent/30">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <SlidersHorizontal className="w-4 h-4 text-accent" />
                Laporan Kustom
              </CardTitle>
              <p className="text-xs text-muted-foreground">Filter spesifik: HPP per produk, biaya bahan tertentu, biaya packaging, dll.</p>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Kontrol kustom */}
              <div className="flex flex-wrap gap-3 items-end">
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">Jenis Laporan</label>
                  <Select value={kustomMode} onValueChange={setKustomMode}>
                    <SelectTrigger className="h-8 text-xs w-48">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="hpp_brand">Total HPP per Produk</SelectItem>
                      <SelectItem value="biaya_bahan">Biaya Bahan Cair</SelectItem>
                      <SelectItem value="biaya_packaging">Biaya Packaging</SelectItem>
                      <SelectItem value="biaya_komponen">Biaya Komponen Tambahan</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">Brand</label>
                  <Select value={kustomBrand} onValueChange={setKustomBrand}>
                    <SelectTrigger className="h-8 text-xs w-36">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="semua">Semua Brand</SelectItem>
                      {allBrandsAll.map(b => <SelectItem key={b} value={b}>{b}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>

                {kustomMode === 'biaya_bahan' && (
                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-1 block">Kategori Bahan</label>
                    <Select value={kustomKategoriBahan} onValueChange={setKustomKategoriBahan}>
                      <SelectTrigger className="h-8 text-xs w-36">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="semua">Semua Kategori</SelectItem>
                        <SelectItem value="Bibit">Bibit</SelectItem>
                        <SelectItem value="Alkohol">Alkohol</SelectItem>
                        <SelectItem value="Aqua Des">Aqua Des</SelectItem>
                        <SelectItem value="DPG">DPG</SelectItem>
                        <SelectItem value="Peg">Peg</SelectItem>
                        <SelectItem value="Sustain">Sustain</SelectItem>
                        <SelectItem value="Lainnya">Lainnya</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {kustomMode === 'biaya_packaging' && (
                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-1 block">Komponen</label>
                    <Select value={kustomPackaging} onValueChange={setKustomPackaging}>
                      <SelectTrigger className="h-8 text-xs w-32">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="botol">Botol</SelectItem>
                        <SelectItem value="tutup">Tutup</SelectItem>
                        <SelectItem value="spray">Spray</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>

              {/* Hasil */}
              {kustomResult.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-6">Tidak ada data untuk filter ini</p>
              ) : (
                <>
                  <div className="flex items-center justify-between bg-accent/10 rounded-lg px-4 py-2.5">
                    <span className="text-xs font-semibold text-accent">
                      Total {kustomMode === 'hpp_brand' ? 'HPP' : kustomMode === 'biaya_bahan' ? 'Biaya Bahan' : kustomMode === 'biaya_packaging' ? `Biaya ${kustomPackaging}` : 'Biaya Komponen'}
                      {kustomBrand !== 'semua' ? ` — ${kustomBrand}` : ''}
                    </span>
                    <span className="text-base font-bold text-accent">Rp {fmt(kustomTotal)}</span>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="border-b text-muted-foreground">
                          {kustomMode === 'hpp_brand' && <>
                            <th className="py-2 text-left">Produk</th>
                            <th className="py-2 text-right">Qty</th>
                            <th className="py-2 text-right">Total HPP</th>
                            <th className="py-2 text-right">Total Jual</th>
                            <th className="py-2 text-right">Margin</th>
                          </>}
                          {kustomMode === 'biaya_bahan' && <>
                            <th className="py-2 text-left">Bahan</th>
                            <th className="py-2 text-left">Kategori</th>
                            <th className="py-2 text-right">Vol. Total (ml)</th>
                            <th className="py-2 text-right">Total Biaya</th>
                          </>}
                          {kustomMode === 'biaya_packaging' && <>
                            <th className="py-2 text-left">Produk</th>
                            <th className="py-2 text-left">Brand</th>
                            <th className="py-2 text-left">Nama {kustomPackaging}</th>
                            <th className="py-2 text-right">Qty</th>
                            <th className="py-2 text-right">Total Biaya</th>
                          </>}
                          {kustomMode === 'biaya_komponen' && <>
                            <th className="py-2 text-left">Komponen</th>
                            <th className="py-2 text-left">Kategori</th>
                            <th className="py-2 text-right">Total Biaya</th>
                          </>}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border/40">
                        {kustomResult.map((row, i) => (
                          <tr key={i} className="hover:bg-muted/30">
                            {kustomMode === 'hpp_brand' && <>
                              <td className="py-2 font-medium">{row.nama}</td>
                              <td className="py-2 text-right">{row.qty} pcs</td>
                              <td className="py-2 text-right">Rp {fmt(row.hpp)}</td>
                              <td className="py-2 text-right text-green-700">Rp {fmt(row.jual)}</td>
                              <td className="py-2 text-right">
                                <span className={row.margin >= 0 ? 'text-green-600 font-semibold' : 'text-red-600 font-semibold'}>
                                  {row.margin >= 0 ? '+' : ''}Rp {fmt(row.margin)}
                                </span>
                              </td>
                            </>}
                            {kustomMode === 'biaya_bahan' && <>
                              <td className="py-2 font-medium">{row.nama}</td>
                              <td className="py-2 text-muted-foreground">{row.kategori}</td>
                              <td className="py-2 text-right">{row.volume_ml.toFixed(1)} ml</td>
                              <td className="py-2 text-right font-semibold">Rp {fmt(row.total)}</td>
                            </>}
                            {kustomMode === 'biaya_packaging' && <>
                              <td className="py-2 font-medium">{row.nama}</td>
                              <td className="py-2 text-muted-foreground">{row.brand}</td>
                              <td className="py-2 text-muted-foreground">{row.detail}</td>
                              <td className="py-2 text-right">{row.qty} pcs</td>
                              <td className="py-2 text-right font-semibold">Rp {fmt(row.biaya)}</td>
                            </>}
                            {kustomMode === 'biaya_komponen' && <>
                              <td className="py-2 font-medium">{row.nama}</td>
                              <td className="py-2 text-muted-foreground">{row.kategori || '—'}</td>
                              <td className="py-2 text-right font-semibold">Rp {fmt(row.total)}</td>
                            </>}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Tabel Riwayat HPP */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Riwayat Sesi Produksi HPP ({filtered.length})</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b text-muted-foreground">
                      <th className="py-2 text-left">Tanggal</th>
                      <th className="py-2 text-left">Brand</th>
                      <th className="py-2 text-right">Total HPP</th>
                      <th className="py-2 text-right">Harga Jual</th>
                      <th className="py-2 text-right">Margin</th>
                      <th className="py-2 text-center">Status Bayar</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/40">
                    {filtered.slice(0, 30).map(r => {
                      const margin = r.total_margin_nominal_semua || 0;
                      const pct = r.total_hpp_semua > 0 ? (margin / r.total_hpp_semua) * 100 : 0;
                      return (
                        <tr key={r.id} className="hover:bg-muted/30">
                          <td className="py-2">{r.tanggal || '—'}</td>
                          <td className="py-2 font-semibold">{r.nama_brand}</td>
                          <td className="py-2 text-right">Rp {fmt(r.total_hpp_semua)}</td>
                          <td className="py-2 text-right text-green-700 font-medium">Rp {fmt(r.total_harga_jual_semua)}</td>
                          <td className="py-2 text-right">
                            <span className={`font-semibold ${margin >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                              {margin >= 0 ? '+' : ''}Rp {fmt(margin)}
                            </span>
                            <span className="text-muted-foreground ml-1">({pct.toFixed(1)}%)</span>
                          </td>
                          <td className="py-2 text-center">
                            <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                              r.status_bayar === 'Sudah Lunas' ? 'bg-green-100 text-green-700' :
                              r.status_bayar === 'Belum Lunas' ? 'bg-amber-100 text-amber-700' :
                              'bg-red-100 text-red-600'
                            }`}>
                              {r.status_bayar || 'Belum Bayar'}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                {filtered.length > 30 && (
                  <p className="text-xs text-muted-foreground text-center pt-2">
                    Menampilkan 30 dari {filtered.length} sesi
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}