import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Trash2, Tag } from 'lucide-react';

const fmt = (n) => new Intl.NumberFormat('id-ID').format(Math.round(n || 0));

const DEFAULT_KATEGORI = ['Box', 'Stiker', 'Sablon', 'Gift Card'];

/**
 * Section Komponen Tambahan di ProductHPPCard
 * komponenList: Array<{ kategori: string, nama: string, harga: number }>
 * onKomponenChange: (list) => void
 */
export default function KomponenTambahanSection({ komponenList = [], onKomponenChange }) {
  const [customKategori, setCustomKategori] = useState('');
  const [showCustomInput, setShowCustomInput] = useState(false);

  const totalKomponen = komponenList.reduce((s, k) => s + (k.harga || 0), 0);

  const addKomponen = (kategori) => {
    const newList = [...komponenList, { kategori, nama: kategori, harga: 0 }];
    onKomponenChange(newList);
  };

  const addCustom = () => {
    if (!customKategori.trim()) return;
    const newList = [...komponenList, { kategori: customKategori.trim(), nama: customKategori.trim(), harga: 0 }];
    onKomponenChange(newList);
    setCustomKategori('');
    setShowCustomInput(false);
  };

  const updateKomponen = (idx, field, value) => {
    const updated = komponenList.map((k, i) => i === idx ? { ...k, [field]: value } : k);
    onKomponenChange(updated);
  };

  const removeKomponen = (idx) => {
    onKomponenChange(komponenList.filter((_, i) => i !== idx));
  };

  return (
    <div>
      <h4 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
        <span className="w-5 h-5 rounded-full bg-pink-100 flex items-center justify-center text-pink-600 text-xs">
          <Tag className="w-3 h-3" />
        </span>
        Komponen Tambahan
        <span className="text-xs font-normal text-muted-foreground">(stiker, box, sablon, dll)</span>
      </h4>

      {/* Pilih kategori cepat */}
      <div className="flex flex-wrap gap-2 mb-3">
        {DEFAULT_KATEGORI.map(k => {
          const alreadyAdded = komponenList.some(kk => kk.kategori === k);
          return (
            <button
              key={k}
              type="button"
              onClick={() => addKomponen(k)}
              className={`px-3 py-1 rounded-lg border text-xs font-medium transition-all flex items-center gap-1 ${alreadyAdded ? 'bg-pink-100 text-pink-700 border-pink-200' : 'border-border text-muted-foreground hover:border-pink-300 hover:text-pink-600'}`}
            >
              <Plus className="w-3 h-3" />
              {k}
            </button>
          );
        })}
        <button
          type="button"
          onClick={() => setShowCustomInput(!showCustomInput)}
          className="px-3 py-1 rounded-lg border border-dashed border-border text-xs font-medium text-muted-foreground hover:border-pink-300 hover:text-pink-600 transition-all flex items-center gap-1"
        >
          <Plus className="w-3 h-3" />
          Kategori Lain
        </button>
      </div>

      {/* Custom kategori input */}
      {showCustomInput && (
        <div className="flex gap-2 mb-3">
          <Input
            value={customKategori}
            onChange={e => setCustomKategori(e.target.value)}
            placeholder="Nama kategori baru..."
            className="h-8 text-sm flex-1"
            onKeyDown={e => e.key === 'Enter' && addCustom()}
          />
          <Button type="button" size="sm" onClick={addCustom} className="h-8 text-xs">Tambah</Button>
          <Button type="button" size="sm" variant="ghost" onClick={() => setShowCustomInput(false)} className="h-8 text-xs">Batal</Button>
        </div>
      )}

      {/* Daftar komponen */}
      {komponenList.length > 0 && (
        <div className="space-y-2">
          {komponenList.map((k, i) => (
            <div key={i} className="flex items-center gap-2 bg-muted/30 rounded-lg px-3 py-2">
              <span className="text-xs font-medium text-pink-700 bg-pink-100 px-2 py-0.5 rounded shrink-0">
                {k.kategori}
              </span>
              <Input
                value={k.nama}
                onChange={e => updateKomponen(i, 'nama', e.target.value)}
                placeholder="Nama/keterangan..."
                className="h-7 text-xs flex-1 bg-transparent border-0 border-b border-border rounded-none focus-visible:ring-0 px-1"
              />
              <div className="flex items-center gap-1 shrink-0">
                <span className="text-xs text-muted-foreground">Rp</span>
                <Input
                  type="number"
                  min="0"
                  value={k.harga || ''}
                  onChange={e => updateKomponen(i, 'harga', Number(e.target.value) || 0)}
                  placeholder="0"
                  className="h-7 text-xs w-24 text-right"
                />
                <span className="text-xs text-muted-foreground">/pcs</span>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="w-6 h-6 text-destructive/50 hover:text-destructive shrink-0"
                onClick={() => removeKomponen(i)}
              >
                <Trash2 className="w-3 h-3" />
              </Button>
            </div>
          ))}
          {totalKomponen > 0 && (
            <div className="flex justify-between items-center px-3 py-1.5 bg-pink-50 border border-pink-200 rounded-lg">
              <span className="text-xs font-medium text-pink-700">Total Komponen Tambahan</span>
              <span className="text-sm font-bold text-pink-700">Rp {fmt(totalKomponen)}/pcs</span>
            </div>
          )}
        </div>
      )}

      {komponenList.length === 0 && (
        <p className="text-xs text-muted-foreground italic">Klik kategori di atas untuk menambahkan komponen</p>
      )}
    </div>
  );
}