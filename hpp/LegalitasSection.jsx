import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Plus, X, Shield } from 'lucide-react';

const fmt = (n) => new Intl.NumberFormat('id-ID').format(Math.round(n));

// Harga beli default untuk legalitas
const HARGA_BELI_DEFAULT = {
  BPOM: 500000,
  HAKI: 2000000,
};

const LEGALITAS_PRESETS = ['HAKI', 'BPOM'];

export default function LegalitasSection({ legalitasList = [], onLegalitasChange }) {
  const [customInput, setCustomInput] = useState('');

  const addItem = (nama) => {
    if (legalitasList.find(l => l.nama === nama)) return;
    const isBPOM = nama === 'BPOM';
    const hargaBeli = HARGA_BELI_DEFAULT[nama] || 0;
    onLegalitasChange([...legalitasList, {
      nama,
      harga_beli: hargaBeli,
      harga_jual: 0,
      qty_variant: isBPOM ? 1 : null,
    }]);
  };

  const removeItem = (idx) => {
    onLegalitasChange(legalitasList.filter((_, i) => i !== idx));
  };

  const updateItem = (idx, field, value) => {
    const updated = [...legalitasList];
    updated[idx] = { ...updated[idx], [field]: value };
    onLegalitasChange(updated);
  };

  const handleAddCustom = () => {
    const nama = customInput.trim();
    if (!nama) return;
    addItem(nama);
    setCustomInput('');
  };

  const totalBeli = legalitasList.reduce((s, l) => {
    const qty = l.qty_variant || 1;
    return s + (l.harga_beli || 0) * qty;
  }, 0);

  const totalJual = legalitasList.reduce((s, l) => {
    const qty = l.qty_variant || 1;
    return s + (l.harga_jual || 0) * qty;
  }, 0);

  const totalMargin = totalJual - totalBeli;

  return (
    <div className="border border-border rounded-xl p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold flex items-center gap-2">
          <span className="w-5 h-5 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 text-xs">
            <Shield className="w-3 h-3" />
          </span>
          Legalitas
        </h4>
        {totalBeli > 0 && (
          <Badge className="bg-blue-50 text-blue-700 border-blue-200 text-xs">
            HPP: Rp {fmt(totalBeli)}
          </Badge>
        )}
      </div>

      {/* Preset Buttons */}
      <div className="flex flex-wrap gap-2">
        {LEGALITAS_PRESETS.map(nama => {
          const active = legalitasList.find(l => l.nama === nama);
          return (
            <button
              key={nama}
              type="button"
              onClick={() => active ? removeItem(legalitasList.findIndex(l => l.nama === nama)) : addItem(nama)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                active
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'bg-background border-border text-muted-foreground hover:border-blue-400 hover:text-blue-600'
              }`}
            >
              {nama}
            </button>
          );
        })}

        {/* Custom tambah */}
        <div className="flex items-center gap-1">
          <Input
            value={customInput}
            onChange={e => setCustomInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleAddCustom()}
            placeholder="Lainnya..."
            className="h-7 text-xs w-28"
          />
          <Button size="sm" variant="outline" onClick={handleAddCustom} className="h-7 px-2">
            <Plus className="w-3 h-3" />
          </Button>
        </div>
      </div>

      {/* List Item Legalitas */}
      {legalitasList.length > 0 && (
        <div className="space-y-2">
          {/* Header */}
          <div className="grid grid-cols-12 gap-2 px-1">
            <div className="col-span-2 text-xs text-muted-foreground font-medium">Item</div>
            <div className="col-span-3 text-xs text-muted-foreground font-medium">Harga Beli (HPP)</div>
            <div className="col-span-3 text-xs text-muted-foreground font-medium">Harga Jual ke Customer</div>
            <div className="col-span-2 text-xs text-muted-foreground font-medium">Qty Variant</div>
            <div className="col-span-2 text-xs text-muted-foreground font-medium text-right">Margin</div>
          </div>
          {legalitasList.map((item, idx) => {
            const isBPOM = item.nama === 'BPOM';
            const qty = item.qty_variant || 1;
            const marginPerUnit = (item.harga_jual || 0) - (item.harga_beli || 0);
            const marginTotal = marginPerUnit * qty;
            return (
              <div key={item.nama} className="bg-blue-50/50 border border-blue-100 rounded-lg px-3 py-2.5 space-y-2">
                <div className="grid grid-cols-12 gap-2 items-center">
                  {/* Nama */}
                  <div className="col-span-2">
                    <span className="text-xs font-semibold text-blue-700">{item.nama}</span>
                  </div>

                  {/* Harga Beli */}
                  <div className="col-span-3 flex items-center gap-1">
                    <span className="text-xs text-muted-foreground shrink-0">Rp</span>
                    <Input
                      type="number"
                      min="0"
                      value={item.harga_beli || ''}
                      onChange={e => updateItem(idx, 'harga_beli', parseFloat(e.target.value) || 0)}
                      placeholder="0"
                      className="h-7 text-xs"
                    />
                  </div>

                  {/* Harga Jual */}
                  <div className="col-span-3 flex items-center gap-1">
                    <span className="text-xs text-muted-foreground shrink-0">Rp</span>
                    <Input
                      type="number"
                      min="0"
                      value={item.harga_jual || ''}
                      onChange={e => updateItem(idx, 'harga_jual', parseFloat(e.target.value) || 0)}
                      placeholder="0"
                      className="h-7 text-xs"
                    />
                  </div>

                  {/* Qty Variant — hanya BPOM */}
                  <div className="col-span-2">
                    {isBPOM ? (
                      <div className="flex items-center gap-1">
                        <span className="text-xs text-muted-foreground shrink-0">×</span>
                        <Input
                          type="number"
                          min="1"
                          value={item.qty_variant || 1}
                          onChange={e => updateItem(idx, 'qty_variant', parseInt(e.target.value) || 1)}
                          className="h-7 text-xs w-14"
                        />
                      </div>
                    ) : (
                      <span className="text-xs text-muted-foreground px-1">× 1</span>
                    )}
                  </div>

                  {/* Margin */}
                  <div className="col-span-1 text-right">
                    {item.harga_jual > 0 ? (
                      <span className={`text-xs font-semibold ${marginPerUnit >= 0 ? 'text-green-700' : 'text-red-600'}`}>
                        {marginPerUnit >= 0 ? '+' : ''}Rp {fmt(marginPerUnit)}
                      </span>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </div>

                  {/* Hapus */}
                  <div className="col-span-1 flex justify-end">
                    <button onClick={() => removeItem(idx)} className="text-muted-foreground hover:text-destructive">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Total row jika qty > 1 */}
                {qty > 1 && item.harga_beli > 0 && (
                  <div className="flex items-center gap-3 text-xs text-muted-foreground border-t border-blue-100 pt-1.5">
                    <span>× {qty} variant</span>
                    <span>HPP Total: <strong className="text-blue-700">Rp {fmt((item.harga_beli || 0) * qty)}</strong></span>
                    {item.harga_jual > 0 && (
                      <span>Margin Total: <strong className={marginTotal >= 0 ? 'text-green-700' : 'text-red-600'}>{marginTotal >= 0 ? '+' : ''}Rp {fmt(marginTotal)}</strong></span>
                    )}
                  </div>
                )}
              </div>
            );
          })}

          {/* Summary */}
          {totalJual > 0 && (
            <div className="bg-blue-100/60 border border-blue-200 rounded-lg px-3 py-2 flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-4 text-xs">
                <span className="text-blue-800">HPP Legalitas: <strong>Rp {fmt(totalBeli)}</strong></span>
                <span className="text-blue-800">Jual: <strong>Rp {fmt(totalJual)}</strong></span>
              </div>
              <span className={`text-xs font-bold ${totalMargin >= 0 ? 'text-green-700' : 'text-red-600'}`}>
                Margin: {totalMargin >= 0 ? '+' : ''}Rp {fmt(totalMargin)}
              </span>
            </div>
          )}
        </div>
      )}

      {legalitasList.length === 0 && (
        <p className="text-xs text-muted-foreground italic">Opsional — pilih HAKI, BPOM, atau tambah lainnya</p>
      )}
    </div>
  );
}