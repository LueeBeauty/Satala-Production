import { useEffect } from "react";
import { base44 } from "@/api/base44Client";

/**
 * Hook ini secara otomatis mengecek PO dengan status 'maserasi'
 * dan memperbarui statusnya menjadi 'menunggu_filling'
 * jika durasi maserasi sudah habis.
 * Dicek setiap 5 menit.
 */
export function useMaserasiAutoUpdate(onUpdated) {
  useEffect(() => {
    const checkAndUpdate = async () => {
      const orders = await base44.entities.ProductionOrder.filter({ status: "maserasi" });
      const now = Date.now();

      for (const po of orders) {
        if (!po.maserasi_start) continue;

        const startMs = new Date(po.maserasi_start).getTime();
        const durasiJam = (po.maserasi_durasi_hari || 0) * 24 + (po.maserasi_durasi_jam || 0);

        if (durasiJam <= 0) continue;

        const selesaiMs = startMs + durasiJam * 60 * 60 * 1000;

        if (now >= selesaiMs) {
          await base44.entities.ProductionOrder.update(po.id, {
            status: "menunggu_filling",
            maserasi_end: new Date(selesaiMs).toISOString(),
          });
          onUpdated?.();
        }
      }
    };

    // Cek langsung saat mount
    checkAndUpdate();

    // Cek setiap 5 menit
    const interval = setInterval(checkAndUpdate, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);
}