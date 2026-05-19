import React, { useState, useEffect } from 'react';
import { Clock } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const TIMEZONES = [
  { value: 'Asia/Jakarta', label: 'WIB — Jakarta (UTC+7)' },
  { value: 'Asia/Makassar', label: 'WITA — Makassar (UTC+8)' },
  { value: 'Asia/Jayapura', label: 'WIT — Jayapura (UTC+9)' },
  { value: 'UTC', label: 'UTC / GMT (UTC+0)' },
  { value: 'Asia/Singapore', label: 'SGT — Singapura (UTC+8)' },
];

const TZ_KEY = 'satala_timezone';

export function useTimezone() {
  const [tz, setTzState] = useState(() => localStorage.getItem(TZ_KEY) || 'Asia/Jakarta');
  const setTz = (val) => {
    localStorage.setItem(TZ_KEY, val);
    setTzState(val);
  };
  return [tz, setTz];
}

export default function LiveClock() {
  const [tz, setTz] = useTimezone();
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  const timeStr = now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit', timeZone: tz });
  const dateStr = now.toLocaleDateString('id-ID', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric', timeZone: tz });
  const tzLabel = TIMEZONES.find(t => t.value === tz)?.label?.split(' — ')[0] || tz;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button className="hidden md:flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors px-2 py-1 rounded-md hover:bg-muted/60 cursor-pointer select-none">
          <Clock className="w-3.5 h-3.5 shrink-0" />
          <span className="font-mono font-medium tabular-nums">{timeStr}</span>
          <span className="text-muted-foreground/60">{dateStr}</span>
          <span className="text-[10px] bg-muted px-1.5 py-0.5 rounded font-medium">{tzLabel}</span>
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-4" align="start">
        <p className="text-sm font-semibold mb-1">Zona Waktu</p>
        <p className="text-xs text-muted-foreground mb-3">Pilih zona waktu lokal kamu. Ini hanya memengaruhi tampilan jam di navbar.</p>
        <Select value={tz} onValueChange={setTz}>
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {TIMEZONES.map(t => (
              <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="mt-3 bg-muted/50 rounded-lg p-3 text-center">
          <p className="font-mono text-2xl font-bold tabular-nums">{timeStr}</p>
          <p className="text-xs text-muted-foreground mt-0.5">{dateStr}</p>
        </div>
      </PopoverContent>
    </Popover>
  );
}