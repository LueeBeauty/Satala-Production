/**
 * stockDeduction.js
 * Utility terpusat untuk pengurangan stok otomatis dari PO.
 * Dipakai di ProductionDetail saat status → in_progress ATAU saat Selesai & Kirim.
 * Mencegah double-deduction dengan flag `stock_deducted` pada PO.
 */

import { base44 } from '@/api/base44Client';

/**
 * Kurangi stok untuk satu PO.
 * @param {object} order - data ProductionOrder lengkap (termasuk components & racikan_digunakan)
 * @param {Array}  inventoryItems - array gabungan inventori (dari botol/tutup/spray/bahan/InventoryItem)
 * @param {Array}  bahanList - array BahanCair (untuk lookup nama bahan cair)
 * @param {string} trigger - 'in_progress' | 'done' | 'manual'
 * @returns {{ deducted: number, errors: number, skipped: boolean }}
 */
export async function deductStockForPO(order, inventoryItems, bahanList, trigger = 'done') {
  // Guard: jika stok sudah pernah dikurangi, skip
  if (order.stock_deducted) {
    return { deducted: 0, errors: 0, skipped: true };
  }

  let deducted = 0;
  let errors = 0;

  // ── 1. Packaging: kurangi dari components (botol, tutup, spray, bibit terintegrasi) ──
  const integratedComps = (order.components || []).filter(
    c => c.inventory_item_id && (c.qty_needed || 0) > 0
  );

  for (const comp of integratedComps) {
    const qty = comp.qty_needed || 0;
    const invItem = inventoryItems.find(i => i.id === comp.inventory_item_id);
    if (invItem && qty > 0) {
      const newStock = Math.max(0, (invItem.total_stock || 0) - qty);
      if (invItem._entity === 'Botol')       await base44.entities.Botol.update(invItem._stokId, { stok: newStock });
      else if (invItem._entity === 'Tutup')  await base44.entities.Tutup.update(invItem._stokId, { stok: newStock });
      else if (invItem._entity === 'Spray')  await base44.entities.Spray.update(invItem._stokId, { stok: newStock });
      else if (invItem._entity === 'BahanCair') await base44.entities.BahanCair.update(invItem._stokId, { stok: newStock });
      else await base44.entities.InventoryItem.update(comp.inventory_item_id, { total_stock: newStock });
      deducted++;
    } else if (qty > 0) {
      errors++;
    }
  }

  // ── 2. Bahan Cair: kurangi dari racikan_digunakan ──
  const racikan = order.racikan_digunakan || [];
  for (const r of racikan) {
    if (!r.nama_bahan || !(r.kebutuhan_nilai > 0)) continue;
    const nameLower = r.nama_bahan.toLowerCase().trim();

    const bahanItem = bahanList.find(b => {
      const bNama = (b.nama || '').toLowerCase().trim();
      return bNama === nameLower || bNama.includes(nameLower) || nameLower.includes(bNama);
    });

    if (bahanItem) {
      // Konversi ke satuan bahan (kg default)
      let kebutuhan = r.kebutuhan_nilai || 0;
      const satuan = (r.kebutuhan_satuan || '').toLowerCase();
      // Bahan disimpan dalam kg; konversi g/ml → kg
      if (satuan === 'g' || satuan === 'gram') kebutuhan = kebutuhan / 1000;
      else if (satuan === 'ml') kebutuhan = kebutuhan / 1000;
      else if (satuan === 'l' || satuan === 'liter') kebutuhan = kebutuhan; // 1L ≈ 1kg

      const newStock = Math.max(0, (bahanItem.stok || 0) - kebutuhan);
      await base44.entities.BahanCair.update(bahanItem.id, { stok: newStock });
      deducted++;
    } else {
      errors++;
    }
  }

  // ── 3. Tandai PO sudah pernah dikurangi stoknya ──
  await base44.entities.ProductionOrder.update(order.id, {
    stock_deducted: true,
    stock_deducted_at: new Date().toISOString(),
    stock_deducted_trigger: trigger,
  });

  return { deducted, errors, skipped: false };
}