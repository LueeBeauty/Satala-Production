import React from 'react';
import { RefreshCw } from 'lucide-react';
import { useRelativeTime } from '@/hooks/useRelativeTime';
import { getUserTimezone } from '@/lib/timeUtils';

/**
 * Komponen "Terakhir Update" per card — sinkron dengan LiveClock.
 * Gunakan updated_date atau created_date dari record individual.
 *
 * Props:
 *   date      — ISO string atau Date dari record (updated_date / created_date)
 *   className — kelas tambahan
 */
export default function LastUpdated({ date, className = '' }) {
  const relative = useRelativeTime(date);

  if (!relative) return null;

  const normalized = date && typeof date === 'string' && !date.endsWith('Z') && !date.includes('+')
    ? date + 'Z'
    : date;
  const fullDate = normalized
    ? new Date(normalized).toLocaleString('id-ID', { timeZone: getUserTimezone() })
    : '';

  return (
    <span
      className={`inline-flex items-center gap-1 text-[10px] text-muted-foreground/70 select-none ${className}`}
      title={fullDate}
    >
      <RefreshCw className="w-2.5 h-2.5 opacity-50 shrink-0" />
      <span>{relative}</span>
    </span>
  );
}