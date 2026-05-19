const TZ_KEY = 'satala_timezone';

export function getUserTimezone() {
  return localStorage.getItem(TZ_KEY) || 'Asia/Jakarta';
}

/**
 * Format ISO timestamp menjadi relatif + jam absolut berdasarkan timezone user.
 * Contoh: "5 menit lalu (08:20)", "2 jam lalu", "3 hari lalu, 02/05 08:20"
 */
export function formatRelativeTime(isoString) {
  if (!isoString) return null;
  const tz = getUserTimezone();
  // Pastikan string selalu diparsing sebagai UTC (tambahkan 'Z' jika belum ada)
  const normalized = typeof isoString === 'string' && !isoString.endsWith('Z') && !isoString.includes('+')
    ? isoString + 'Z'
    : isoString;
  const date = new Date(normalized);
  const now = new Date();
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);
  const diffWeeks = Math.floor(diffDays / 7);
  const diffMonths = Math.floor(diffDays / 30);

  const timeStr = date.toLocaleTimeString('id-ID', {
    hour: '2-digit', minute: '2-digit', timeZone: tz,
  });
  const dateStr = date.toLocaleDateString('id-ID', {
    day: '2-digit', month: '2-digit', year: 'numeric', timeZone: tz,
  });

  if (diffMins < 1) return `Baru saja (${timeStr})`;
  if (diffMins < 60) return `${diffMins} menit lalu (${timeStr})`;
  if (diffHours < 24) return `${diffHours} jam lalu (${timeStr})`;
  if (diffDays < 7) return `${diffDays} hari lalu, ${dateStr} ${timeStr}`;
  if (diffWeeks < 5) return `${diffWeeks} minggu lalu, ${dateStr}`;
  if (diffMonths < 12) return `${diffMonths} bulan lalu, ${dateStr}`;
  return `${dateStr} ${timeStr}`;
}