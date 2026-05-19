import React, { useState } from 'react';
import { ClipboardList, BarChart2, TrendingUp } from 'lucide-react';
import CatatanHarianPage from './laporan/CatatanHarianPage';
import RekapPage from './laporan/RekapPage';
import LaporanMarginPage from './laporan/LaporanMarginPage';

const TABS = [
  {
    key: 'harian',
    label: 'Catatan Harian',
    icon: ClipboardList,
    desc: 'Log aktivitas harian',
    component: CatatanHarianPage,
  },
  {
    key: 'rekap',
    label: 'Rekap & Analitik',
    icon: BarChart2,
    desc: 'Laporan & rekap periode',
    component: RekapPage,
  },
  {
    key: 'margin',
    label: 'Margin Keuntungan',
    icon: TrendingUp,
    desc: 'Laporan untung/rugi & margin berdasarkan HPP',
    component: LaporanMarginPage,
  },
];

export default function LaporanPage() {
  const [activeTab, setActiveTab] = useState('harian');
  const ActiveComp = TABS.find(t => t.key === activeTab)?.component;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold font-display">Laporan</h1>
        <p className="text-muted-foreground text-sm mt-1">Catatan harian & rekap produksi</p>
      </div>

      {/* Sub Menu */}
      <div className="flex gap-2 border-b border-border pb-0">
        {TABS.map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-all -mb-px ${
                isActive
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Tab description */}
      <div className="text-xs text-muted-foreground -mt-4">
        {TABS.find(t => t.key === activeTab)?.desc}
      </div>

      {/* Active Component */}
      {ActiveComp && <ActiveComp />}
    </div>
  );
}