import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';

async function fetchLiveKurs() {
  try {
    const res = await fetch('https://open.er-api.com/v6/latest/USD');
    const data = await res.json();
    if (data?.rates?.IDR) return Math.round(data.rates.IDR);
  } catch {}
  return null;
}

export function useKurs() {
  const queryClient = useQueryClient();

  // Fetch settings dari DB
  const { data: settingsList = [] } = useQuery({
    queryKey: ['kurs-settings'],
    queryFn: () => base44.entities.KursSettings.list('-updated_date', 1),
  });

  // Fetch live kurs (cache 10 menit)
  const { data: liveKurs } = useQuery({
    queryKey: ['live-kurs'],
    queryFn: fetchLiveKurs,
    staleTime: 10 * 60 * 1000,
    retry: 1,
  });

  const record = settingsList[0] ?? null;
  const isManual = record?.is_manual === true;

  // Nilai kurs aktual yang dipakai
  const kurs = isManual
    ? (record?.kurs_dollar ?? liveKurs ?? 17500)
    : (liveKurs ?? record?.kurs_dollar ?? 17500);

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['kurs-settings'] });

  // Simpan kurs manual
  const saveMutation = useMutation({
    mutationFn: async (newKurs) => {
      if (record?.id) {
        return base44.entities.KursSettings.update(record.id, {
          kurs_dollar: newKurs,
          is_manual: true,
        });
      }
      return base44.entities.KursSettings.create({
        kurs_dollar: newKurs,
        is_manual: true,
      });
    },
    onSuccess: invalidate,
  });

  // Reset ke live
  const liveMutation = useMutation({
    mutationFn: async () => {
      if (record?.id) {
        return base44.entities.KursSettings.update(record.id, {
          is_manual: false,
        });
      }
      // Belum ada record, buat dengan is_manual: false
      return base44.entities.KursSettings.create({
        kurs_dollar: liveKurs ?? 17500,
        is_manual: false,
      });
    },
    onSuccess: invalidate,
  });

  return {
    kurs,
    liveKurs,
    isManual,
    setManualKurs: saveMutation.mutate,
    isSaving: saveMutation.isPending,
    setLive: liveMutation.mutate,
    isSettingLive: liveMutation.isPending,
  };
}