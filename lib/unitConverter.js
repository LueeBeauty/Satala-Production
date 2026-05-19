/**
 * Smart Unit Converter — Sistem kepintaran konversi satuan
 * Handles: kg ↔ g, liter ↔ ml, kg ↔ ml (approximate for liquids ~1g/ml)
 */

// Kelompok satuan berat
const WEIGHT_UNITS = ['kg', 'gram', 'g', 'mg'];
// Kelompok satuan volume
const VOLUME_UNITS = ['liter', 'l', 'ml', 'cc'];

// Konversi semua ke base unit (gram untuk berat, ml untuk volume)
const TO_BASE = {
  kg: 1000,    // 1 kg = 1000 gram
  gram: 1,
  g: 1,
  mg: 0.001,
  liter: 1000, // 1 liter = 1000 ml
  l: 1000,
  ml: 1,
  cc: 1,
};

/**
 * Normalize satuan ke lowercase trim
 */
export function normalizeUnit(unit) {
  if (!unit) return '';
  return unit.toLowerCase().trim();
}

/**
 * Cek apakah dua satuan dalam kelompok yang sama (bisa dikonversi)
 */
export function isSameFamily(unitA, unitB) {
  const a = normalizeUnit(unitA);
  const b = normalizeUnit(unitB);
  const inWeight = u => WEIGHT_UNITS.includes(u);
  const inVolume = u => VOLUME_UNITS.includes(u);
  return (inWeight(a) && inWeight(b)) || (inVolume(a) && inVolume(b));
}

/**
 * Konversi nilai dari satu satuan ke satuan lain
 * Return: { value: number, unit: string, converted: boolean }
 */
export function convertUnit(value, fromUnit, toUnit) {
  const from = normalizeUnit(fromUnit);
  const to = normalizeUnit(toUnit);

  if (!from || !to || from === to) {
    return { value, unit: toUnit, converted: false };
  }

  if (!isSameFamily(from, to)) {
    return { value, unit: fromUnit, converted: false };
  }

  const baseFactorFrom = TO_BASE[from];
  const baseFactorTo = TO_BASE[to];

  if (!baseFactorFrom || !baseFactorTo) {
    return { value, unit: fromUnit, converted: false };
  }

  const converted = (value * baseFactorFrom) / baseFactorTo;
  return { value: converted, unit: toUnit, converted: true };
}

/**
 * Format angka agar tidak menampilkan decimal yang tidak perlu
 * Menggunakan locale id-ID: titik sebagai pemisah ribuan, koma sebagai desimal
 */
export function formatQty(value, maxDec = 4) {
  if (value == null) return '0';
  const num = Number(value);
  if (Number.isInteger(num)) {
    return new Intl.NumberFormat('id-ID').format(num);
  }
  // Hapus trailing zeros, tapi tetap pakai locale ID
  const rounded = parseFloat(num.toFixed(maxDec));
  return new Intl.NumberFormat('id-ID', { maximumFractionDigits: maxDec }).format(rounded);
}

/**
 * Smart display: tampilkan stok dalam satuan paling mudah dibaca
 * Contoh: 1500g → "1.5 kg", 0.5kg → "500 g", 1500ml → "1.5 liter"
 */
export function smartDisplayQty(value, unit) {
  if (value == null) return { display: '—', unit: unit || '' };
  const u = normalizeUnit(unit);
  const num = Number(value);

  // Berat
  if (WEIGHT_UNITS.includes(u)) {
    const grams = num * (TO_BASE[u] || 1);
    if (grams >= 1000) {
      return { display: formatQty(grams / 1000, 3), unit: 'kg' };
    } else {
      return { display: formatQty(grams, 2), unit: 'g' };
    }
  }

  // Volume
  if (VOLUME_UNITS.includes(u)) {
    const ml = num * (TO_BASE[u] || 1);
    if (ml >= 1000) {
      return { display: formatQty(ml / 1000, 2), unit: 'liter' };
    } else {
      return { display: formatQty(ml, 2), unit: 'ml' };
    }
  }

  return { display: formatQty(num, 2), unit: unit || '' };
}

/**
 * Cek apakah qty yang dimasukkan cukup, meski beda satuan
 * Contoh: stok 3kg, kebutuhan 500g → TRUE (cukup)
 * Return: { sufficient: boolean, stockInInputUnit: number, note: string | null }
 */
export function checkSufficiency(stockValue, stockUnit, neededValue, neededUnit) {
  const sUnit = normalizeUnit(stockUnit);
  const nUnit = normalizeUnit(neededUnit);

  if (!stockValue || !neededValue) return { sufficient: false, stockInNeededUnit: stockValue, note: null };

  // Sama satuan — langsung bandingkan
  if (sUnit === nUnit) {
    return {
      sufficient: stockValue >= neededValue,
      stockInNeededUnit: stockValue,
      note: null,
    };
  }

  // Beda satuan tapi satu keluarga → konversi stok ke satuan kebutuhan
  if (isSameFamily(sUnit, nUnit)) {
    const { value: stockConverted, converted } = convertUnit(stockValue, sUnit, nUnit);
    return {
      sufficient: stockConverted >= neededValue,
      stockInNeededUnit: stockConverted,
      note: converted ? `Stok ${formatQty(stockValue)} ${stockUnit} = ${formatQty(stockConverted)} ${neededUnit}` : null,
    };
  }

  // Tidak bisa dikonversi
  return { sufficient: false, stockInNeededUnit: stockValue, note: null };
}

/**
 * Parse input user yang mungkin pakai koma (0,5 → 0.5)
 */
export function parseUserInput(str) {
  if (!str && str !== 0) return 0;
  return parseFloat(String(str).replace(',', '.')) || 0;
}

// ─── Konversi Liter ↔ Gram (densitas alkohol/aqua des ~0.8) ─────────────────
// Bahan cair bersatuan "liter" disimpan & diinput dalam GRAM di sistem
// Konversi: gram * 0.8 = ml yang sebenarnya dibutuhkan saat meracik
// Kebalikan: ml / 0.8 = gram yang perlu ditimbang/diambil dari stok

export const LITER_DENSITY = 0.8; // densitas alkohol parfum ~0.8 g/ml

// Kategori bahan yang umumnya bersatuan liter (bukan bibit)
const LITER_KATEGORI = ['alkohol', 'aqua des', 'air', 'pengencer', 'dpg', 'ipm', 'peg', 'sustain'];

/**
 * Cek apakah bahan ini perlu konversi liter→gram
 * Bisa digunakan dengan satuan (dari BahanCair entity) atau kategori nama saja
 * - Jika ada satuan: cek satuan === 'liter' && bukan bibit
 * - Jika hanya kategori (SampleForm): cek berdasarkan nama kategori
 */
export function needsLiterConversion(satuan, kategori) {
  const s = (satuan || '').toLowerCase().trim();
  const k = (kategori || '').toLowerCase().trim();
  if (k === 'bibit') return false;
  // Jika ada info satuan liter → konversi
  if (s === 'liter') return true;
  // Jika tidak ada satuan tapi kategorinya termasuk bahan cair liter
  if (!satuan || s === '') {
    return LITER_KATEGORI.some(cat => k === cat || k.startsWith(cat));
  }
  return false;
}

/**
 * Hitung gram dari volume ml yang dibutuhkan
 * ml / 0.8 = gram
 */
export function mlToGram(ml) {
  if (!ml || ml <= 0) return 0;
  return ml / LITER_DENSITY;
}

/**
 * Hitung ml dari gram yang ditimbang
 * gram * 0.8 = ml
 */
export function gramToMl(gram) {
  if (!gram || gram <= 0) return 0;
  return gram * LITER_DENSITY;
}

const fmtLocal = (n, dec = 2) =>
  new Intl.NumberFormat('id-ID', { maximumFractionDigits: dec }).format(n);

/**
 * Format konversi untuk display dengan titik ribuan (id-ID locale)
 * Contoh: 26250g / 21000ml → "26.250g / 21.000ml", atau kalau >=1000g → "26,25kg / 21L"
 */
export function formatGramMl(ml) {
  if (!ml || ml <= 0) return null;
  const gram = mlToGram(ml);

  // gramLabel: < 1000 → tampilkan gram, >= 1000 → tampilkan kg saja
  let gramLabel;
  if (gram >= 1000) {
    const kg = gram / 1000;
    gramLabel = `${fmtLocal(kg, 3)}kg`;
  } else {
    gramLabel = `${fmtLocal(gram)}g`;
  }

  // mlLabel: < 1000 → ml, >= 1000 → L saja
  let mlLabel;
  if (ml >= 1000) {
    const L = ml / 1000;
    mlLabel = `${fmtLocal(L, 2)}L`;
  } else {
    mlLabel = `${fmtLocal(ml)}ml`;
  }

  return {
    gram: parseFloat(gram.toFixed(4)),
    ml: parseFloat(ml.toFixed(4)),
    label: `${gramLabel} / ${mlLabel}`,
    gramLabel,
    mlLabel,
  };
}