import React, { useState, useMemo, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  TrendingUp, TrendingDown, DollarSign, Package, FileDown,
  Calendar, ArrowUpRight, ArrowDownRight, Minus, BarChart2
} from 'lucide-react';
import { format, isAfter, isBefore, isEqual, startOfDay } from 'date-fns';
import { id } from 'date-fns/locale';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend, LineChart, Line
} from 'recharts';

const fmt = (n) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n || 0);
const fmtNum = (n) => new Intl.NumberFormat('id-ID').format(Math.round(n || 0));
const fmtPct = (n) => `${(n || 0).toFixed(1)}%`;

// Hitung faktor pembayaran (0–1) berdasarkan status_bayar
// "Sudah Bayar" / "Lunas" → 1.0
// "Belum Bayar" → 0
// "DP 50%" / "Bayar 50%" / angka % → parse persentase
// "DP" saja (tanpa angka) → 0.5
function getPaymentFactor(status) {
  if (!status) return 0;
  const s = status.toLowerCase().trim();
  if (s === 'sudah bayar' || s === 'lunas' || s === 'paid') return 1;
  if (s === 'belum bayar' || s === 'unpaid') return 0;
  // cari angka persen: "dp 50%", "bayar 30%", "50%", dll
  const match = s.match(/(\d+(\.\d+)?)\s*%/);
  if (match) return Math.min(1, parseFloat(match[1]) / 100);
  // ada kata "dp" tapi tanpa angka → anggap 50%
  if (s.includes('dp')) return 0.5;
  return 0;
}

function isInRange(dateStr, start, end) {
  if (!dateStr) return false;
  try {
    const d = startOfDay(new Date(dateStr));
    const s = startOfDay(new Date(start));
    const e = startOfDay(new Date(end));
    return (isAfter(d, s) || isEqual(d, s)) && (isBefore(d, e) || isEqual(d, e));
  } catch { return false; }
}

const PRESETS = [
  { label: 'Hari ini', getValue: () => { const t = format(new Date(), 'yyyy-MM-dd'); return [t, t]; } },
  { label: '7 Hari', getValue: () => { const now = new Date(); return [format(new Date(now - 6 * 86400000), 'yyyy-MM-dd'), format(now, 'yyyy-MM-dd')]; } },
  { label: '30 Hari', getValue: () => { const now = new Date(); return [format(new Date(now - 29 * 86400000), 'yyyy-MM-dd'), format(now, 'yyyy-MM-dd')]; } },
  { label: 'Bulan Ini', getValue: () => { const now = new Date(); return [format(new Date(now.getFullYear(), now.getMonth(), 1), 'yyyy-MM-dd'), format(now, 'yyyy-MM-dd')]; } },
  { label: 'Semua', getValue: () => ['2000-01-01', '2099-12-31'] },
];

export default function LaporanMarginPage() {
  const printRef = useRef(null);
  const now = new Date();
  const defaultStart = format(new Date(now - 29 * 86400000), 'yyyy-MM-dd');
  const defaultEnd = format(now, 'yyyy-MM-dd');

  const [activePreset, setActivePreset] = useState('Semua');
  const [dateStart, setDateStart] = useState('2000-01-01');
  const [dateEnd, setDateEnd] = useState('2099-12-31');
  const [isCustom, setIsCustom] = useState(false);

  const { data: riwayat = [], isLoading } = useQuery({
    queryKey: ['riwayat-produksi'],
    queryFn: () => base44.entities.RiwayatProduksi.list('-tanggal'),
  });

  const handlePreset = (preset) => {
    const [s, e] = preset.getValue();
    setDateStart(s);
    setDateEnd(e);
    setActivePreset(preset.label);
    setIsCustom(false);
  };

  const filtered = useMemo(() => {
    return riwayat.filter(r => {
      const d = r.tanggal || r.created_date?.split('T')[0];
      return isInRange(d, dateStart, dateEnd);
    });
  }, [riwayat, dateStart, dateEnd]);

  // Hitung total — menggunakan jumlah_dibayar real (sinkron dengan riwayat HPP)
  const summary = useMemo(() => {
    let totalHPP = 0, totalJual = 0, totalMargin = 0;
    filtered.forEach(r => {
      const hpp = r.total_hpp_semua || 0;
      const jual = r.total_harga_jual_semua || 0;
      const dibayar = r.jumlah_dibayar || 0;
      const status = r.status_bayar || 'Belum Bayar';
      totalHPP += hpp;
      if (status === 'Sudah Lunas') {
        totalJual += jual;
        totalMargin += jual - hpp;
      } else if (status === 'Belum Lunas') {
        totalJual += dibayar;
        totalMargin += dibayar - hpp;
      }
      // Belum Bayar: tidak ada pemasukan, tidak tambah ke totalJual/Margin
    });
    const marginPct = totalJual > 0 ? (totalMargin / totalJual) * 100 : 0;
    return { totalHPP, totalJual, totalMargin, marginPct, count: filtered.length };
  }, [filtered]);

  // Helper: hitung hpp/jual/margin real dari satu record
  const getRecordMetrics = (r) => {
    const hpp = r.total_hpp_semua || 0;
    const jual = r.total_harga_jual_semua || 0;
    const dibayar = r.jumlah_dibayar || 0;
    const status = r.status_bayar || 'Belum Bayar';
    if (status === 'Sudah Lunas') return { hpp, jual, margin: jual - hpp };
    if (status === 'Belum Lunas') return { hpp, jual: dibayar, margin: dibayar - hpp };
    return { hpp, jual: 0, margin: 0 }; // Belum Bayar
  };

  // Chart data: per brand
  const chartDataBrand = useMemo(() => {
    const map = {};
    filtered.forEach(r => {
      const { hpp, jual, margin } = getRecordMetrics(r);
      const key = r.nama_brand || 'Unknown';
      if (!map[key]) map[key] = { brand: key, hpp: 0, jual: 0, margin: 0 };
      map[key].hpp += hpp;
      map[key].jual += jual;
      map[key].margin += margin;
    });
    return Object.values(map).sort((a, b) => b.margin - a.margin).slice(0, 10);
  }, [filtered]);

  // Chart data: tren per tanggal
  const chartDataTren = useMemo(() => {
    const map = {};
    filtered.forEach(r => {
      const { hpp, jual, margin } = getRecordMetrics(r);
      const d = r.tanggal || r.created_date?.split('T')[0] || '';
      if (!d) return;
      if (!map[d]) map[d] = { tanggal: d, hpp: 0, jual: 0, margin: 0 };
      map[d].hpp += hpp;
      map[d].jual += jual;
      map[d].margin += margin;
    });
    return Object.values(map).sort((a, b) => a.tanggal.localeCompare(b.tanggal));
  }, [filtered]);

  const handleExportPDF = () => {
    const printContent = printRef.current;
    if (!printContent) return;

    const originalBody = document.body.innerHTML;
    const printHTML = `
      <html>
        <head>
          <title>Laporan Margin Keuntungan</title>
          <style>
            * { box-sizing: border-box; margin: 0; padding: 0; }
            body { font-family: 'Segoe UI', Arial, sans-serif; font-size: 12px; color: #1a1a2e; background: white; padding: 20px; }
            .header { text-align: center; margin-bottom: 24px; border-bottom: 2px solid #6366f1; padding-bottom: 16px; }
            .header h1 { font-size: 20px; font-weight: 700; color: #4f46e5; }
            .header p { color: #64748b; font-size: 11px; margin-top: 4px; }
            .summary-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 24px; }
            .summary-card { border: 1px solid #e2e8f0; border-radius: 10px; padding: 14px; background: #f8fafc; }
            .summary-card .label { font-size: 10px; color: #64748b; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 6px; }
            .summary-card .value { font-size: 16px; font-weight: 700; color: #1e293b; }
            .summary-card .sub { font-size: 10px; margin-top: 3px; }
            .green { color: #16a34a; } .red { color: #dc2626; } .blue { color: #2563eb; } .purple { color: #7c3aed; }
            table { width: 100%; border-collapse: collapse; margin-top: 16px; }
            th { background: #f1f5f9; padding: 8px 10px; text-align: left; font-size: 10px; text-transform: uppercase; letter-spacing: 0.05em; color: #64748b; border-bottom: 1px solid #e2e8f0; }
            td { padding: 8px 10px; font-size: 11px; border-bottom: 1px solid #f1f5f9; }
            tr:nth-child(even) td { background: #fafafa; }
            .text-right { text-align: right; }
            .text-center { text-align: center; }
            .badge-green { background: #dcfce7; color: #16a34a; padding: 2px 8px; border-radius: 9999px; font-size: 10px; font-weight: 600; }
            .badge-red { background: #fee2e2; color: #dc2626; padding: 2px 8px; border-radius: 9999px; font-size: 10px; font-weight: 600; }
            .section-title { font-size: 13px; font-weight: 700; color: #1e293b; margin-bottom: 10px; margin-top: 20px; border-left: 3px solid #6366f1; padding-left: 8px; }
            .footer { margin-top: 32px; text-align: center; font-size: 10px; color: #94a3b8; border-top: 1px solid #e2e8f0; padding-top: 12px; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>Laporan Margin Keuntungan</h1>
            <p>Periode: ${dateStart} s/d ${dateEnd} &nbsp;|&nbsp; Dicetak: ${format(new Date(), 'dd MMMM yyyy HH:mm', { locale: id })}</p>
          </div>

          <div class="summary-grid">
            <div class="summary-card">
              <div class="label">Total Transaksi</div>
              <div class="value blue">${summary.count}</div>
              <div class="sub" style="color:#64748b">produksi</div>
            </div>
            <div class="summary-card">
              <div class="label">Total HPP (Modal)</div>
              <div class="value red">${fmt(summary.totalHPP)}</div>
              <div class="sub" style="color:#dc2626">pengeluaran</div>
            </div>
            <div class="summary-card">
              <div class="label">Total Penjualan</div>
              <div class="value blue">${fmt(summary.totalJual)}</div>
              <div class="sub" style="color:#2563eb">pemasukan</div>
            </div>
            <div class="summary-card">
              <div class="label">Margin Keuntungan</div>
              <div class="value green">${fmt(summary.totalMargin)}</div>
              <div class="sub green">${fmtPct(summary.marginPct)} dari penjualan</div>
            </div>
          </div>

          <div class="section-title">Rincian Per Produksi</div>
          <table>
            <thead>
              <tr>
                <th>Tanggal</th>
                <th>Nama Brand</th>
                <th class="text-right">HPP (Modal)</th>
                <th class="text-right">Harga Jual</th>
                <th class="text-right">Margin</th>
                <th class="text-center">% Margin</th>
                <th class="text-center">Status</th>
              </tr>
            </thead>
            <tbody>
              ${filtered.map(r => {
                const factor = getPaymentFactor(r.status_bayar);
                const hpp = (r.total_hpp_semua || 0) * factor;
                const jual = (r.total_harga_jual_semua || 0) * factor;
                const margin = (r.total_margin_nominal_semua || 0) * factor;
                const pct = jual > 0 ? (margin / jual) * 100 : 0;
                const belumBayar = factor === 0;
                const statusBayarLabel = r.status_bayar || 'Belum Bayar';
                const statusClass = belumBayar ? '' : (margin >= 0 ? 'badge-green' : 'badge-red');
                const statusLabel = belumBayar ? `<span style="color:#94a3b8">${statusBayarLabel}</span>` : `<span class="${statusClass}">${margin >= 0 ? 'Untung' : 'Rugi'}</span>`;
                return `<tr style="${belumBayar ? 'opacity:0.4' : ''}">
                  <td>${r.tanggal || r.created_date?.split('T')[0] || '—'}</td>
                  <td><strong>${r.nama_brand || '—'}</strong><br/><small style="color:#94a3b8">${statusBayarLabel}</small></td>
                  <td class="text-right" style="color:#dc2626">${belumBayar ? '—' : fmt(hpp)}</td>
                  <td class="text-right" style="color:#2563eb">${belumBayar ? '—' : fmt(jual)}</td>
                  <td class="text-right" style="color:${margin >= 0 ? '#16a34a' : '#dc2626'}"><strong>${belumBayar ? '—' : fmt(margin)}</strong></td>
                  <td class="text-center" style="color:${pct >= 0 ? '#16a34a' : '#dc2626'}">${belumBayar ? '—' : fmtPct(pct)}</td>
                  <td class="text-center">${statusLabel}</td>
                </tr>`;
              }).join('')}
            </tbody>
            <tfoot>
              <tr style="background:#f1f5f9; font-weight:700; border-top: 2px solid #e2e8f0;">
                <td colspan="2"><strong>TOTAL</strong></td>
                <td class="text-right" style="color:#dc2626"><strong>${fmt(summary.totalHPP)}</strong></td>
                <td class="text-right" style="color:#2563eb"><strong>${fmt(summary.totalJual)}</strong></td>
                <td class="text-right" style="color:${summary.totalMargin >= 0 ? '#16a34a' : '#dc2626'}"><strong>${fmt(summary.totalMargin)}</strong></td>
                <td class="text-center" style="color:${summary.marginPct >= 0 ? '#16a34a' : '#dc2626'}"><strong>${fmtPct(summary.marginPct)}</strong></td>
                <td></td>
              </tr>
            </tfoot>
          </table>

          <div class="footer">Laporan ini dihasilkan secara otomatis dari sistem manajemen produksi</div>
        </body>
      </html>
    `;

    const printWindow = window.open('', '_blank');
    printWindow.document.write(printHTML);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => { printWindow.print(); }, 500);
  };

  // eslint-disable-next-line react/display-name
  const MetricCard = ({ label, value, sub, icon: Icon, color, trend }) => (
    <Card className="relative overflow-hidden">
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide mb-1">{label}</p>
            <p className={`text-xl font-bold ${color}`}>{value}</p>
            {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
          </div>
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
            color.includes('green') ? 'bg-green-100' :
            color.includes('red') ? 'bg-red-100' :
            color.includes('blue') ? 'bg-blue-100' : 'bg-purple-100'
          }`}>
            <Icon className={`w-5 h-5 ${color}`} />
          </div>
        </div>
        {trend !== undefined && (
          <div className={`flex items-center gap-1 mt-2 text-xs font-medium ${trend >= 0 ? 'text-green-600' : 'text-red-500'}`}>
            {trend >= 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
            {fmtPct(Math.abs(trend))} margin
          </div>
        )}
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-5" ref={printRef}>
      {/* Filter Bar */}
      <div className="bg-card border border-border rounded-xl p-4 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2 flex-wrap">
            <Calendar className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm font-medium">Periode:</span>
            <div className="flex gap-1 flex-wrap">
              {PRESETS.map(p => (
                <button
                  key={p.label}
                  onClick={() => handlePreset(p)}
                  className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${
                    !isCustom && activePreset === p.label
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
                  }`}
                >
                  {p.label}
                </button>
              ))}
              <button
                onClick={() => setIsCustom(true)}
                className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${
                  isCustom ? 'bg-primary text-primary-foreground' : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
                }`}
              >
                Custom
              </button>
            </div>
          </div>

          <Button onClick={handleExportPDF} size="sm" variant="outline" className="gap-2 shrink-0">
            <FileDown className="w-4 h-4" />
            Export PDF
          </Button>
        </div>

        {isCustom && (
          <div className="flex items-center gap-2 flex-wrap">
            <Input type="date" value={dateStart} onChange={e => setDateStart(e.target.value)} className="h-8 w-36" />
            <span className="text-xs text-muted-foreground">hingga</span>
            <Input type="date" value={dateEnd} onChange={e => setDateEnd(e.target.value)} className="h-8 w-36" />
          </div>
        )}

        <p className="text-xs text-muted-foreground">
          Menampilkan <span className="font-semibold text-foreground">{summary.count}</span> transaksi dari {dateStart} s/d {dateEnd}
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <MetricCard
          label="Total Transaksi"
          value={fmtNum(summary.count)}
          sub="produksi"
          icon={Package}
          color="text-blue-600"
        />
        <MetricCard
          label="Total HPP / Modal"
          value={fmt(summary.totalHPP)}
          sub="total pengeluaran"
          icon={ArrowDownRight}
          color="text-red-500"
        />
        <MetricCard
          label="Total Penjualan"
          value={fmt(summary.totalJual)}
          sub="total pemasukan"
          icon={ArrowUpRight}
          color="text-blue-600"
        />
        <MetricCard
          label="Margin Keuntungan"
          value={fmt(summary.totalMargin)}
          sub={`${fmtPct(summary.marginPct)} dari penjualan`}
          icon={TrendingUp}
          color={summary.totalMargin >= 0 ? 'text-green-600' : 'text-red-500'}
          trend={summary.marginPct}
        />
      </div>

      {/* Charts */}
      {filtered.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Bar chart per brand */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <BarChart2 className="w-4 h-4 text-primary" />
                HPP vs Penjualan per Brand (Top 10)
              </CardTitle>
            </CardHeader>
            <CardContent>
              {chartDataBrand.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">Tidak ada data</p>
              ) : (
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={chartDataBrand} margin={{ left: -10 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="brand" tick={{ fontSize: 9 }} tickFormatter={v => v.length > 8 ? v.slice(0, 8) + '…' : v} />
                    <YAxis tick={{ fontSize: 9 }} tickFormatter={v => `${(v / 1000000).toFixed(0)}jt`} />
                    <Tooltip formatter={(v) => fmt(v)} />
                    <Legend wrapperStyle={{ fontSize: 10 }} />
                    <Bar dataKey="hpp" name="HPP" fill="#f87171" radius={[3, 3, 0, 0]} />
                    <Bar dataKey="jual" name="Penjualan" fill="#60a5fa" radius={[3, 3, 0, 0]} />
                    <Bar dataKey="margin" name="Margin" fill="#4ade80" radius={[3, 3, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          {/* Line tren margin */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-green-600" />
                Tren Margin per Tanggal
              </CardTitle>
            </CardHeader>
            <CardContent>
              {chartDataTren.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">Tidak ada data</p>
              ) : (
                <ResponsiveContainer width="100%" height={220}>
                  <LineChart data={chartDataTren} margin={{ left: -10 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="tanggal" tick={{ fontSize: 9 }} tickFormatter={v => v.slice(5)} />
                    <YAxis tick={{ fontSize: 9 }} tickFormatter={v => `${(v / 1000000).toFixed(0)}jt`} />
                    <Tooltip formatter={(v) => fmt(v)} labelFormatter={v => `Tgl: ${v}`} />
                    <Legend wrapperStyle={{ fontSize: 10 }} />
                    <Line type="monotone" dataKey="jual" name="Penjualan" stroke="#60a5fa" strokeWidth={2} dot={false} />
                    <Line type="monotone" dataKey="hpp" name="HPP" stroke="#f87171" strokeWidth={2} dot={false} />
                    <Line type="monotone" dataKey="margin" name="Margin" stroke="#4ade80" strokeWidth={2.5} dot={{ r: 3 }} />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Tabel Detail */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <DollarSign className="w-4 h-4 text-primary" />
            Rincian Margin per Produksi ({summary.count})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">{Array(5).fill(0).map((_, i) => <div key={i} className="h-10 bg-muted animate-pulse rounded" />)}</div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <TrendingUp className="w-12 h-12 mx-auto mb-3 opacity-20" />
              <p className="font-medium">Tidak ada data di periode ini</p>
              <p className="text-xs mt-1">Simpan data dari Kalkulator HPP untuk melihat laporan margin</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b text-muted-foreground">
                    <th className="py-2 text-left font-medium">Tanggal</th>
                    <th className="py-2 text-left font-medium">Nama Brand</th>
                    <th className="py-2 text-right font-medium">HPP / Modal</th>
                    <th className="py-2 text-right font-medium">Harga Jual</th>
                    <th className="py-2 text-right font-medium">Margin</th>
                    <th className="py-2 text-center font-medium">% Margin</th>
                    <th className="py-2 text-center font-medium">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40">
                 {filtered.map(r => {
                   const { hpp, jual, margin } = getRecordMetrics(r);
                   const status = r.status_bayar || 'Belum Bayar';
                   const belumBayar = status === 'Belum Bayar';
                   const pct = jual > 0 ? (margin / jual) * 100 : 0;
                   const isProfit = margin >= 0;
                   const tanggal = r.tanggal || r.created_date?.split('T')[0] || '—';

                   return (
                     <tr key={r.id} className={`hover:bg-muted/30 transition-colors ${belumBayar ? 'opacity-40' : ''}`}>
                       <td className="py-2.5 text-muted-foreground">{tanggal}</td>
                       <td className="py-2.5">
                         <span className="font-semibold">{r.nama_brand || '—'}</span>
                         <div className="mt-0.5">
                           <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${
                             status === 'Sudah Lunas' ? 'bg-green-100 text-green-700' :
                             status === 'Belum Lunas' ? 'bg-orange-100 text-orange-700' :
                             'bg-red-100 text-red-500'
                           }`}>
                             {status}
                             {status === 'Belum Lunas' ? ` (${fmt(r.jumlah_dibayar || 0)} dibayar)` : ''}
                           </span>
                         </div>
                       </td>
                       <td className="py-2.5 text-right text-red-500 font-medium">{belumBayar ? <span className="text-muted-foreground">—</span> : fmt(hpp)}</td>
                       <td className="py-2.5 text-right text-blue-600 font-medium">{belumBayar ? <span className="text-muted-foreground">—</span> : fmt(jual)}</td>
                       <td className={`py-2.5 text-right font-bold ${isProfit ? 'text-green-600' : 'text-red-500'}`}>
                         {belumBayar ? <span className="text-muted-foreground">—</span> : <>{isProfit ? '+' : ''}{fmt(margin)}</>}
                       </td>
                       <td className="py-2.5 text-center">
                         {belumBayar ? <span className="text-muted-foreground text-xs">—</span> : (
                           <span className={`font-semibold ${isProfit ? 'text-green-600' : 'text-red-500'}`}>
                             {isProfit ? '' : '-'}{fmtPct(Math.abs(pct))}
                           </span>
                         )}
                       </td>
                       <td className="py-2.5 text-center">
                         {belumBayar ? (
                           <Badge variant="outline" className="bg-gray-50 text-gray-500 border-gray-200">Belum Dibayar</Badge>
                         ) : (
                           <Badge variant="outline" className={isProfit ? 'bg-green-50 text-green-700 border-green-200' : 'bg-red-50 text-red-700 border-red-200'}>
                             {isProfit ? <><TrendingUp className="w-3 h-3 mr-1" />Untung</> : <><TrendingDown className="w-3 h-3 mr-1" />Rugi</>}
                           </Badge>
                         )}
                       </td>
                     </tr>
                   );
                 })}
                </tbody>
                {/* Footer total */}
                <tfoot>
                  <tr className="bg-muted/50 border-t-2 border-border font-semibold">
                    <td className="py-3 pl-2" colSpan={2}>
                      <span className="text-xs uppercase tracking-wide text-muted-foreground">Total ({summary.count} transaksi)</span>
                    </td>
                    <td className="py-3 text-right text-red-500">{fmt(summary.totalHPP)}</td>
                    <td className="py-3 text-right text-blue-600">{fmt(summary.totalJual)}</td>
                    <td className={`py-3 text-right font-bold text-base ${summary.totalMargin >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                      {summary.totalMargin >= 0 ? '+' : ''}{fmt(summary.totalMargin)}
                    </td>
                    <td className={`py-3 text-center font-bold ${summary.marginPct >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                      {fmtPct(summary.marginPct)}
                    </td>
                    <td />
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}