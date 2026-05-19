/**
 * SmartQtyInput — Input qty cerdas dengan konversi satuan otomatis
 *
 * Logika:
 * - `value` (prop) = nilai dalam satuan STOK (kg, liter, pcs, dll)
 * - User bisa memilih satuan input berbeda (g, gram, ml)
 * - rawInput = apa yang user ketik (dalam inputUnit)
 * - Saat emit onChange → selalu konversi ke stockUnit dulu
 * - Saat inputUnit berubah → konversi rawInput ke unit baru (bukan pakai value dari luar)
 */
import React, { useState, useEffect, useRef } from 'react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowRightLeft } from 'lucide-react';
import { convertUnit, parseUserInput, formatQty, normalizeUnit } from '@/lib/unitConverter';

const UNIT_OPTIONS = {
  weight: ['kg', 'g'],
  volume: ['liter', 'ml'],
  other: [],
};

function getFamily(unit) {
  const u = normalizeUnit(unit);
  if (['kg', 'g', 'gram', 'mg'].includes(u)) return 'weight';
  if (['liter', 'l', 'ml', 'cc'].includes(u)) return 'volume';
  return 'other';
}

function getUnitOptions(baseUnit) {
  const family = getFamily(baseUnit);
  if (family === 'weight') return UNIT_OPTIONS.weight;
  if (family === 'volume') return UNIT_OPTIONS.volume;
  return null; // tidak bisa ganti satuan
}

/**
 * Konversi nilai dari stockUnit ke displayUnit untuk ditampilkan ke user
 */
function toDisplayUnit(valueInStock, stockUnit, displayUnit) {
  const sn = normalizeUnit(stockUnit);
  const dn = normalizeUnit(displayUnit);
  if (sn === dn) return valueInStock;
  const result = convertUnit(valueInStock, stockUnit, displayUnit);
  return result.converted ? result.value : valueInStock;
}

/**
 * Konversi nilai dari displayUnit ke stockUnit untuk disimpan
 */
function toStockUnit(valueInDisplay, displayUnit, stockUnit) {
  const sn = normalizeUnit(stockUnit);
  const dn = normalizeUnit(displayUnit);
  if (sn === dn) return valueInDisplay;
  const result = convertUnit(valueInDisplay, displayUnit, stockUnit);
  return result.converted ? result.value : valueInDisplay;
}

export default function SmartQtyInput({ value, onChange, stockUnit, placeholder = '0', className = '' }) {
  const unitOptions = getUnitOptions(stockUnit || 'pcs');
  const canSwitchUnit = unitOptions && unitOptions.length > 1;

  // inputUnit = satuan yang sedang user pakai untuk input
  const [inputUnit, setInputUnit] = useState(stockUnit || 'pcs');

  // rawInput = string yang tampil di kotak input (dalam inputUnit)
  // Saat pertama render, konversi value (dalam stockUnit) ke inputUnit
  const [rawInput, setRawInput] = useState(() => {
    if (!value) return '';
    const displayVal = toDisplayUnit(value, stockUnit || 'pcs', stockUnit || 'pcs');
    return displayVal ? String(formatQty(displayVal)) : '';
  });

  // Flag untuk tahu kapan stockUnit baru dipilih (item baru), reset state
  const prevStockUnitRef = useRef(stockUnit);
  const prevValueRef = useRef(value);

  useEffect(() => {
    const stockUnitChanged = prevStockUnitRef.current !== stockUnit;
    const valueChangedFromOutside = prevValueRef.current !== value;

    if (stockUnitChanged) {
      // Item baru dipilih — reset inputUnit dan rawInput
      setInputUnit(stockUnit || 'pcs');
      setRawInput(value ? formatQty(value) : '');
      prevStockUnitRef.current = stockUnit;
      prevValueRef.current = value;
    } else if (valueChangedFromOutside) {
      // Value diupdate dari luar (bukan dari typing user ini)
      // Konversi value (stockUnit) ke inputUnit yang sedang aktif
      if (!value) {
        setRawInput('');
      } else {
        const inInputUnit = toDisplayUnit(value, stockUnit || 'pcs', inputUnit);
        setRawInput(formatQty(inInputUnit));
      }
      prevValueRef.current = value;
    }
  }, [value, stockUnit, inputUnit]);

  const parsedRaw = parseUserInput(rawInput);

  // Note konversi untuk ditampilkan
  let conversionNote = null;
  if (canSwitchUnit && normalizeUnit(inputUnit) !== normalizeUnit(stockUnit) && parsedRaw > 0) {
    const inStock = toStockUnit(parsedRaw, inputUnit, stockUnit);
    conversionNote = `${formatQty(parsedRaw)} ${inputUnit} = ${formatQty(inStock)} ${stockUnit}`;
  }

  const handleInputChange = (e) => {
    // Ganti koma ke titik tapi tampilkan apa yang user ketik
    const raw = e.target.value;
    setRawInput(raw);

    const num = parseUserInput(raw);
    if (num <= 0 && raw !== '') {
      // masih ngetik, belum valid
      if (raw === '' || raw === '0') onChange(0);
      return;
    }

    // Konversi ke stockUnit baru emit
    const inStock = toStockUnit(num, inputUnit, stockUnit || 'pcs');
    prevValueRef.current = inStock; // jangan trigger sync dari luar
    onChange(inStock);
  };

  const handleUnitChange = (newUnit) => {
    // Konversi rawInput yang ada ke unit baru (tanpa mengubah nilai stockUnit)
    const currentNum = parseUserInput(rawInput);
    if (currentNum > 0) {
      // rawInput saat ini dalam inputUnit → konversi ke newUnit
      const inStock = toStockUnit(currentNum, inputUnit, stockUnit || 'pcs');
      const inNewUnit = toDisplayUnit(inStock, stockUnit || 'pcs', newUnit);
      setRawInput(formatQty(inNewUnit));
    }
    setInputUnit(newUnit);
  };

  return (
    <div className="space-y-1">
      <div className="flex gap-1.5">
        <Input
          type="text"
          inputMode="decimal"
          value={rawInput}
          onChange={handleInputChange}
          placeholder={placeholder}
          className={`h-8 text-sm flex-1 ${className}`}
        />
        {canSwitchUnit ? (
          <Select value={inputUnit} onValueChange={handleUnitChange}>
            <SelectTrigger className="h-8 w-20 text-xs shrink-0">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {unitOptions.map(u => (
                <SelectItem key={u} value={u} className="text-xs">{u}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : (
          <div className="h-8 px-3 flex items-center text-xs text-muted-foreground border rounded-md bg-muted/30 shrink-0">
            {stockUnit || 'pcs'}
          </div>
        )}
      </div>
      {conversionNote && (
        <div className="flex items-center gap-1 text-[11px] text-blue-600 bg-blue-50 px-2 py-1 rounded-md">
          <ArrowRightLeft className="w-3 h-3 shrink-0" />
          <span>{conversionNote}</span>
        </div>
      )}
    </div>
  );
}