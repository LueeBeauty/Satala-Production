import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, Legend } from 'recharts';
import { TrendingUp, Package, FlaskConical, AlertTriangle, CheckCircle2, BarChart2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import ProgressRing from '@/components/production/ProgressRing';

const STATUS_COLORS = { pending: '#94a3b8', in_progress: '#f59e0b', filling: '#3b82f6', qc: '#8b5cf6', packing: '#f97316', done: '#22c55e' };
const PIE_COLORS = ['#22c55e', '#f59e0b', '#94a3b8', '#3b82f6', '#8b5cf6', '#f97316'];

export default function Reporting() {
  const [period, setPeriod] = useState('30');

  const { data: orders = [] } = useQuery({
    queryKey: ['production-orders'],
    queryFn: () => base44.entities.ProductionOrder.list('order_number'),
  });

  const { data: logs = [] } = useQuery({
    queryKey: ['daily-production'],
    queryFn: () => base44.entities.DailyProduction.list('-date'),
  });

  const { data: tests = [] } = useQuery({
    queryKey: ['qc-tests'],
    queryFn: () => base44.entities.QCTest.list('-test_date'),
  });

  const { data: inventory = [] } = useQuery({
    queryKey: ['inventory'],
    queryFn: () => base44.entities.InventoryItem.list(),
  });

  // Filter logs by period
  const since = new Date();
  since.setDate(since.getDate() - Number(period));
  const recentLogs = logs.filter(l => l.date && new Date(l.date) >= since);

  // --- KPI ---
  const totalPO = orders.length;
  const donePO = orders.filter(o => o.status === 'done').length;
  const avgProgress = orders.length > 0
    ? Math.round(orders.reduce((sum, o) => {
        const comps = o.components || [];
        const p = comps.length > 0 ? comps.filter(c => c.status === 'ready').length / comps.length * 100 : 0;
        return sum + p;
      }, 0) / orders.length)
    : 0;
  const totalProduced = recentLogs.reduce((s, l) => s + (l.qty_produced || 0), 0);
  const totalWaste = recentLogs.reduce((s, l) => s + (l.waste_qty || 0), 0);
  const wasteRate = totalProduced > 0 ? ((totalWaste / totalProduced) * 100).toFixed(1) : 0;
  const criticalItems = inventory.filter(i => (i.total_stock - (i.allocated_qty || 0)) <= 0).length;

  // --- Charts ---
  // 1. Daily output (last 14 days)
  const last14 = Array.from({ length: 14 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (13 - i));
    const dateStr = d.toISOString().split('T')[0];
    const dayLogs = logs.filter(l => l.date === dateStr);
    return {
      label: d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' }),
      qty: dayLogs.reduce((s, l) => s + (l.qty_produced || 0), 0),
      waste: dayLogs.reduce((s, l) => s + (l.waste_qty || 0), 0),
    };
  });

  // 2. Production by activity
  const activityMap = {};
  recentLogs.forEach(l => {
    activityMap[l.activity] = (activityMap[l.activity] || 0) + (l.qty_produced || 0);
  });
  const activityData = Object.entries(activityMap).map(([name, value]) => ({ name, value }));

  // 3. PO Status breakdown
  const statusMap = {};
  orders.forEach(o => { statusMap[o.status] = (statusMap[o.status] || 0) + 1; });
  const statusData = Object.entries(statusMap).map(([name, value]) => ({ name, value }));

  // 4. Top brands by output
  const brandMap = {};
  recentLogs.forEach(l => {
    brandMap[l.brand_name] = (brandMap[l.brand_name] || 0) + (l.qty_produced || 0);
  });
  const brandData = Object.entries(brandMap)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([name, qty]) => ({ name, qty }));

  // 5. Component readiness across all POs
  const compReadiness = {};
  orders.forEach(o => {
    (o.components || []).forEach(c => {
      if (!compReadiness[c.name]) compReadiness[c.name] = { ready: 0, total: 0 };
      compReadiness[c.name].total++;
      if (c.status === 'ready') compReadiness[c.name].ready++;
    });
  });
  const compData = Object.entries(compReadiness).map(([name, { ready, total }]) => ({
    name, pct: Math.round((ready / total) * 100), ready, total,
  })).sort((a, b) => b.pct - a.pct);

  // 6. QC scores by brand
  const qcByBrand = {};
  tests.forEach(t => {
    if (!qcByBrand[t.brand_name]) qcByBrand[t.brand_name] = { scores: [], acc: 0, total: 0 };
    if (t.score > 0) qcByBrand[t.brand_name].scores.push(t.score);
    qcByBrand[t.brand_name].total++;
    if (t.approval_status === 'acc') qcByBrand[t.brand_name].acc++;
  });
  const qcData = Object.entries(qcByBrand).map(([brand, d]) => ({
    brand,
    avgScore: d.scores.length > 0 ? (d.scores.reduce((a, b) => a + b, 0) / d.scores.length).toFixed(1) : '-',
    accRate: d.total > 0 ? Math.round((d.acc / d.total) * 100) : 0,
  }));

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold tracking-tight">Reporting</h1>
          <p className="text-muted-foreground text-sm mt-1">Analitik & ringkasan produksi</p>
        </div>
        <Select value={period} onValueChange={setPeriod}>
          <SelectTrigger className="w-40">
            <BarChart2 className="w-4 h-4 mr-2" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7">7 hari terakhir</SelectItem>
            <SelectItem value="14">14 hari terakhir</SelectItem>
            <SelectItem value="30">30 hari terakhir</SelectItem>
            <SelectItem value="90">3 bulan</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Progress Rata-rata</p>
                <p className="text-2xl font-bold mt-1">{avgProgress}%</p>
                <p className="text-[11px] text-muted-foreground">{donePO}/{totalPO} PO selesai</p>
              </div>
              <ProgressRing percentage={avgProgress} size={48} strokeWidth={4} />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <TrendingUp className="w-5 h-5 text-green-600 mb-2" />
            <p className="text-xs text-muted-foreground">Total Produksi</p>
            <p className="text-2xl font-bold">{totalProduced.toLocaleString()}</p>
            <p className="text-[11px] text-muted-foreground">{period} hari terakhir</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <AlertTriangle className={`w-5 h-5 mb-2 ${Number(wasteRate) > 5 ? 'text-destructive' : 'text-yellow-500'}`} />
            <p className="text-xs text-muted-foreground">Waste Rate</p>
            <p className="text-2xl font-bold">{wasteRate}%</p>
            <p className="text-[11px] text-muted-foreground">{totalWaste.toLocaleString()} pcs waste</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <Package className={`w-5 h-5 mb-2 ${criticalItems > 0 ? 'text-destructive' : 'text-green-600'}`} />
            <p className="text-xs text-muted-foreground">Stok Kritis</p>
            <p className="text-2xl font-bold">{criticalItems}</p>
            <p className="text-[11px] text-muted-foreground">item habis/minus</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="output">
        <TabsList className="grid grid-cols-2 md:grid-cols-4 h-auto">
          <TabsTrigger value="output">Output Harian</TabsTrigger>
          <TabsTrigger value="komponen">Komponen</TabsTrigger>
          <TabsTrigger value="brand">Per Brand</TabsTrigger>
          <TabsTrigger value="qc">QC Score</TabsTrigger>
        </TabsList>

        {/* Output Harian */}
        <TabsContent value="output" className="space-y-4 mt-4">
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-base">Output & Waste 14 Hari Terakhir</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={last14} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="label" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="qty" name="Produksi" fill="#22c55e" radius={[3, 3, 0, 0]} />
                  <Bar dataKey="waste" name="Waste" fill="#f87171" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-base">Distribusi Aktivitas</CardTitle></CardHeader>
              <CardContent>
                {activityData.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">Belum ada data</p>
                ) : (
                  <ResponsiveContainer width="100%" height={200}>
                    <PieChart>
                      <Pie data={activityData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="value" nameKey="name" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false}>
                        {activityData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-base">Status PO</CardTitle></CardHeader>
              <CardContent>
                {statusData.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">Belum ada data</p>
                ) : (
                  <ResponsiveContainer width="100%" height={200}>
                    <PieChart>
                      <Pie data={statusData} cx="50%" cy="50%" outerRadius={80} dataKey="value" nameKey="name" label={({ name, value }) => `${name}: ${value}`}>
                        {statusData.map((entry, i) => <Cell key={i} fill={STATUS_COLORS[entry.name] || '#94a3b8'} />)}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Komponen */}
        <TabsContent value="komponen" className="mt-4">
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-base">Kesiapan Komponen per Jenis</CardTitle></CardHeader>
            <CardContent>
              {compData.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">Belum ada data komponen</p>
              ) : (
                <div className="space-y-3">
                  {compData.map(comp => (
                    <div key={comp.name} className="flex items-center gap-3">
                      <div className="w-24 text-sm font-medium truncate">{comp.name}</div>
                      <div className="flex-1 h-3 bg-muted rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${comp.pct >= 100 ? 'bg-green-500' : comp.pct >= 50 ? 'bg-yellow-500' : 'bg-red-400'}`}
                          style={{ width: `${comp.pct}%` }}
                        />
                      </div>
                      <div className="text-xs text-muted-foreground w-20 text-right">{comp.ready}/{comp.total} PO · {comp.pct}%</div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Per Brand */}
        <TabsContent value="brand" className="mt-4">
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-base">Top Brand by Output ({period} hari)</CardTitle></CardHeader>
            <CardContent>
              {brandData.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">Belum ada log produksi</p>
              ) : (
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={brandData} layout="vertical" margin={{ left: 10, right: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
                    <XAxis type="number" tick={{ fontSize: 10 }} />
                    <YAxis dataKey="name" type="category" tick={{ fontSize: 11 }} width={90} />
                    <Tooltip />
                    <Bar dataKey="qty" name="Qty" fill="hsl(var(--accent))" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* QC Score */}
        <TabsContent value="qc" className="mt-4">
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-base">Ringkasan Skor QC per Brand</CardTitle></CardHeader>
            <CardContent>
              {qcData.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">Belum ada data QC</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b text-muted-foreground text-xs">
                        <th className="py-2 text-left">Brand</th>
                        <th className="py-2 text-center">Avg Skor</th>
                        <th className="py-2 text-center">ACC Rate</th>
                        <th className="py-2 text-right">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/50">
                      {qcData.map(row => (
                        <tr key={row.brand} className="hover:bg-muted/30">
                          <td className="py-2.5 font-medium">{row.brand}</td>
                          <td className="py-2.5 text-center">
                            <span className={`font-bold ${Number(row.avgScore) >= 8 ? 'text-green-600' : Number(row.avgScore) >= 6 ? 'text-yellow-600' : 'text-destructive'}`}>
                              {row.avgScore}/10
                            </span>
                          </td>
                          <td className="py-2.5 text-center">
                            <div className="inline-flex items-center gap-1.5">
                              <div className="w-16 h-1.5 bg-muted rounded-full overflow-hidden">
                                <div className="h-full bg-green-500 rounded-full" style={{ width: `${row.accRate}%` }} />
                              </div>
                              <span className="text-xs">{row.accRate}%</span>
                            </div>
                          </td>
                          <td className="py-2.5 text-right">
                            {row.accRate >= 80 ? (
                              <span className="text-[10px] bg-green-100 text-green-700 px-2 py-0.5 rounded-full">Baik</span>
                            ) : row.accRate >= 50 ? (
                              <span className="text-[10px] bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full">Perlu Monitor</span>
                            ) : (
                              <span className="text-[10px] bg-red-100 text-red-700 px-2 py-0.5 rounded-full">Perhatian</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}