import React, { useState } from 'react';
import { useKurs } from '@/hooks/useKurs';
import { DollarSign, Wifi, WifiOff, Check, X, Edit2, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export default function KursBar() {
  const { kurs, liveKurs, isManual, setManualKurs, isSaving, setLive, isSettingLive } = useKurs();
  const [editing, setEditing] = useState(false);
  const [val, setVal] = useState('');

  const openEdit = () => {
    setVal(String(kurs));
    setEditing(true);
  };

  const handleSave = () => {
    const num = parseInt(val, 10);
    if (num > 0) {
      setManualKurs(num);
      setEditing(false);
    }
  };

  const handleLive = () => {
    setLive();
    setEditing(false);
  };

  return (
    <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden min-w-[300px]">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-border bg-muted/40">
        <div className="flex items-center gap-2">
          <DollarSign className="w-3.5 h-3.5 text-amber-600" />
          <span className="text-xs font-semibold text-foreground">Kurs USD/IDR</span>
        </div>
        {/* Badge status */}
        {isManual ? (
          <span className="flex items-center gap-1 text-[10px] font-medium text-amber-600 bg-amber-50 border border-amber-200 rounded-full px-2 py-0.5">
            <WifiOff className="w-2.5 h-2.5" /> Manual
          </span>
        ) : (
          <span className="flex items-center gap-1 text-[10px] font-medium text-green-600 bg-green-50 border border-green-200 rounded-full px-2 py-0.5">
            <Wifi className="w-2.5 h-2.5" /> Live Auto
          </span>
        )}
      </div>

      {/* Body */}
      <div className="px-4 py-3 space-y-3">
        {/* Nilai kurs */}
        <p className="text-lg font-bold text-foreground">
          1 USD = Rp {kurs.toLocaleString('id-ID')}
        </p>

        {/* Input manual (hanya tampil saat editing) */}
        {editing && (
          <div className="space-y-2">
            <p className="text-[10px] text-muted-foreground">
              Input kurs manual (Rp per 1 USD):
              {liveKurs && <span className="ml-1 text-green-600">Live saat ini: Rp {liveKurs.toLocaleString('id-ID')}</span>}
            </p>
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-muted-foreground shrink-0">Rp</span>
              <Input
                type="number"
                value={val}
                onChange={e => setVal(e.target.value)}
                className="h-8 text-sm font-bold flex-1"
                autoFocus
                onKeyDown={e => {
                  if (e.key === 'Enter') handleSave();
                  if (e.key === 'Escape') setEditing(false);
                }}
              />
              <Button size="icon" className="w-8 h-8 shrink-0" onClick={handleSave} disabled={isSaving}>
                {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
              </Button>
              <Button size="icon" variant="ghost" className="w-8 h-8 shrink-0" onClick={() => setEditing(false)}>
                <X className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>
        )}

        {/* Tombol aksi */}
        {!editing && (
          <div className="flex gap-2">
            {/* Tombol Live Kurs */}
            <Button
              size="sm"
              variant={isManual ? 'outline' : 'default'}
              className={`h-7 text-[11px] px-3 gap-1.5 flex-1 ${!isManual ? 'bg-green-600 hover:bg-green-700 text-white border-0' : 'text-green-700 border-green-300 hover:bg-green-50'}`}
              onClick={handleLive}
              disabled={isSettingLive || !isManual}
            >
              {isSettingLive
                ? <Loader2 className="w-3 h-3 animate-spin" />
                : <Wifi className="w-3 h-3" />
              }
              {isManual ? `Live${liveKurs ? ` (${liveKurs.toLocaleString('id-ID')})` : ''}` : 'Live Aktif'}
            </Button>

            {/* Tombol Input Manual */}
            <Button
              size="sm"
              variant={isManual ? 'default' : 'outline'}
              className="h-7 text-[11px] px-3 gap-1.5 flex-1"
              onClick={openEdit}
            >
              <Edit2 className="w-3 h-3" />
              {isManual ? 'Ubah Manual' : 'Set Manual'}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}