import React from 'react';
import { Input } from '@/components/ui/input';
import { Wrench } from 'lucide-react';

const fmt = (n) => new Intl.NumberFormat('id-ID').format(Math.round(n || 0));

/**
 * Section Jasa di ProductHPPCard — user input nominal sendiri secara manual
 */
export default function JasaSection({ jasaNominal, onJasaChange }) {
  return (
    <div>
      <h4 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
        <span className="w-5 h-5 rounded-full bg-orange-100 flex items-center justify-center text-orange-600 text-xs">
          <Wrench className="w-3 h-3" />
        </span>
        Jasa
        <span className="text-xs font-normal text-muted-foreground">(nominal fleksibel per pcs)</span>
      </h4>

      <div className="flex items-center gap-3">
        <div className="flex-1">
          <label className="text-xs font-medium text-muted-foreground mb-1 block">Biaya Jasa / pcs (Rp)</label>
          <Input
            type="number"
            min="0"
            value={jasaNominal || ''}
            onChange={e => onJasaChange(Number(e.target.value) || 0)}
            placeholder="0 = tidak ada jasa"
            className="h-9"
          />
        </div>
        {jasaNominal > 0 && (
          <div className="shrink-0 mt-5 px-3 py-1.5 bg-orange-50 border border-orange-200 rounded-lg">
            <p className="text-xs text-orange-600 font-medium">Rp {fmt(jasaNominal)}/pcs</p>
          </div>
        )}
      </div>

      {jasaNominal > 0 && (
        <p className="text-xs text-muted-foreground mt-1.5">
          💡 Nilai jasa disesuaikan dengan mitra atau pelanggan
        </p>
      )}
    </div>
  );
}