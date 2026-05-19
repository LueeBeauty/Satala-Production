import { useState, useEffect } from 'react';
import { formatRelativeTime } from '@/lib/timeUtils';

/**
 * Hook untuk mendapatkan waktu relatif ("5 menit lalu", "2 jam lalu", dll.)
 * yang sinkron dengan LiveClock di navbar.
 * - Menggunakan timezone yang sama dari timeUtils (localStorage)
 * - Ticker di-update setiap detik agar selalu akurat
 */
export function useRelativeTime(dateInput) {
  const [, setTick] = useState(0);

  // Update setiap detik — sama persis dengan interval di LiveClock
  useEffect(() => {
    const interval = setInterval(() => setTick(t => t + 1), 1000);
    return () => clearInterval(interval);
  }, []);

  if (!dateInput) return null;
  return formatRelativeTime(typeof dateInput === 'object' ? dateInput.toISOString() : dateInput);
}

/**
 * Mengambil tanggal updated_date terbaru dari array data.
 * Gunakan ini untuk mendapatkan timestamp "terakhir update" dari kumpulan records.
 */
export function getLatestUpdatedDate(dataArrays) {
  let latest = null;
  for (const arr of dataArrays) {
    if (!Array.isArray(arr)) continue;
    for (const item of arr) {
      const d = item.updated_date || item.created_date;
      if (!d) continue;
      const parsed = new Date(d);
      if (!latest || parsed > latest) latest = parsed;
    }
  }
  return latest;
}