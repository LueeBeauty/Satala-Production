import React, { useState } from 'react';
import { Truck, PackageMinus } from 'lucide-react';
import BarangMasukTab from '@/components/delivery/BarangMasukTab';
import BarangKeluarTab from '@/components/delivery/BarangKeluarTab';

const TABS = [
  { key: 'masuk', label: 'Barang Masuk', icon: Truck, desc: 'Penerimaan barang & tambah stok otomatis' },
  { key: 'keluar', label: 'Barang Keluar', icon: PackageMinus, desc: 'Pengurangan stok dari PO & manual' },
];

export default function DeliveryPage() {
  const [activeTab, setActiveTab] = useState('masuk');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold font-display">Delivery</h1>
        <p className="text-muted-foreground text-sm mt-1">Manajemen barang masuk & keluar gudang</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-0 border-b border-border">
        {TABS.map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-2 px-5 py-3 text-sm font-medium border-b-2 transition-all -mb-px ${
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

      {/* Tab desc */}
      <p className="text-xs text-muted-foreground -mt-4">
        {TABS.find(t => t.key === activeTab)?.desc}
      </p>

      {/* Content */}
      {activeTab === 'masuk' ? <BarangMasukTab /> : <BarangKeluarTab />}
    </div>
  );
}