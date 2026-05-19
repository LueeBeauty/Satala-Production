import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { TrendingDown, TrendingUp, Building2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

const fmt = (n) => new Intl.NumberFormat('id-ID').format(Math.round(n));

export default function VendorPricePanel({ bahanId, currentVendorName, onSelectVendorPrice }) {
  const { data: hargaVendorList = [] } = useQuery({
    queryKey: ['harga-vendor'],
    queryFn: () => base44.entities.HargaVendor.list(),
    staleTime: 30000,
  });

  if (!bahanId) return null;

  const hargaForBahan = hargaVendorList.filter(h => h.bahan_id === bahanId);
  if (hargaForBahan.length < 2) return null;

  const withPerMl = hargaForBahan.map(h => ({
    ...h,
    harga_per_ml: (h.satuan === 'kg' || h.satuan === 'liter') ? h.harga_rupiah / 1000 : h.harga_rupiah,
  }));

  const sorted = [...withPerMl].sort((a, b) => a.harga_per_ml - b.harga_per_ml);
  const cheapest = sorted[0];
  const current = withPerMl.find(h => h.vendor_nama === currentVendorName);

  return (
    <div className="mt-2 border border-accent/20 rounded-xl bg-accent/5 p-3">
      <div className="flex items-center gap-1.5 mb-2">
        <Building2 className="w-3.5 h-3.5 text-accent" />
        <p className="text-xs font-semibold text-accent">Perbandingan Harga Vendor</p>
      </div>
      <div className="space-y-1.5">
        {sorted.map((h, idx) => {
          const isCheapest = idx === 0;
          const isSelected = h.vendor_nama === currentVendorName;
          return (
            <button
              key={h.id}
              type="button"
              onClick={() => onSelectVendorPrice && onSelectVendorPrice(h)}
              className={`w-full flex items-center justify-between px-3 py-1.5 rounded-lg text-left transition-all ${
                isSelected
                  ? 'bg-accent/20 border border-accent/40'
                  : 'hover:bg-muted/50 border border-transparent'
              }`}
            >
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-foreground">{h.vendor_nama}</span>
                {isCheapest && <Badge className="text-[9px] px-1.5 py-0 bg-emerald-100 text-emerald-700 border-emerald-200 gap-0.5">
                  <TrendingDown className="w-2.5 h-2.5" /> Termurah
                </Badge>}
                {isSelected && <Badge className="text-[9px] px-1.5 py-0 bg-primary/10 text-primary border-primary/20">Dipilih</Badge>}
              </div>
              <span className={`text-xs font-bold ${isCheapest ? 'text-emerald-600' : 'text-foreground'}`}>
                Rp {fmt(h.harga_per_ml)}/ml
              </span>
            </button>
          );
        })}
      </div>
      {cheapest && current && cheapest.vendor_nama !== currentVendorName && (
        <p className="text-[10px] text-amber-700 bg-amber-50 border border-amber-100 rounded-lg px-2.5 py-1.5 mt-2">
          💡 Gunakan <strong>{cheapest.vendor_nama}</strong> untuk hemat Rp {fmt(current.harga_per_ml - cheapest.harga_per_ml)}/ml
        </p>
      )}
    </div>
  );
}