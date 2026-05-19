import React, { useState, useMemo, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useSession } from '@/lib/SessionContext';
import { canManagePO } from '@/lib/AuthSession';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  ArrowLeft, Edit2, Trash2, Save, CheckCircle2, Truck,
  ShoppingCart, Clock, Lock, Plus, FileText
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import ProgressRing from '@/components/production/ProgressRing';
import StatusBadge from '@/components/production/StatusBadge';
import { smartDisplayQty, checkSufficiency } from '@/lib/unitConverter';
import POComponentItem from '@/components/production/POComponentItem';
import AdditionalComponentSection from '@/components/production/AdditionalComponentSection';
import NeedBuySection from '@/components/production/NeedBuySection';
import RacikanFormulaSection from '@/components/production/RacikanFormulaSection';
import SelesaiKirimModal from '@/components/production/SelesaiKirimModal';
import SuratJalanPrint from '@/components/production/SuratJalanPrint';
import TambahTugasSection from '@/components/production/TambahTugasSection';
import { deductStockForPO } from '@/lib/stockDeduction';
const CORE_CATEGORIES = ['botol', 'bibit', 'tutup', 'spray'];

const makeComp = (category) => ({
  category,
  inventory_item_id: '',
  item_name: '',
  vendor: '',
  qty_needed: 0,
  stock_available: 0,
  unit: 'pcs',
  status: 'pending',
  item_notes: '',
  is_integrated: true,
  color_code: '',
  target_qty: 0,
  current_qty: 0,
  name: '',
});

// Ambil hanya komponen core (botol/bibit/tutup/spray) dari data DB
// Komponen lainnya diabaikan
function parseCoreComponents(components) {
  const list = components || [];
  return CORE_CATEGORIES.map(cat => {
    const forCat = list.filter(c => c.category === cat && c.inventory_item_id);
    if (forCat.length > 0) {
      return forCat.map(c => ({ ...makeComp(cat), ...c, category: cat, is_integrated: true }));
    }
    return [makeComp(cat)];
  });
}

export default function ProductionDetail() {
  const id = window.location.pathname.split('/').pop();
  const { member } = useSession();
  const canEdit = canManagePO(member);
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState(null);
  const [markingDone, setMarkingDone] = useState(false);
  const [showSelesaiModal, setShowSelesaiModal] = useState(false);
  const [showSuratJalan, setShowSuratJalan] = useState(false);
  const [editingCore, setEditingCore] = useState(false);
  const [coreComponents, setCoreComponents] = useState(null);
  const [addons, setAddons] = useState([]);
  const [purchaseStatuses, setPurchaseStatuses] = useState({}); // { [inv_item_id]: status }

  const { data: settingsList = [] } = useQuery({
    queryKey: ['company-settings'],
    queryFn: () => base44.entities.CompanySettings.list(),
  });
  const companySettings = settingsList[0] || {};

  const { data: order, isLoading } = useQuery({
    queryKey: ['production-order', id],
    queryFn: async () => {
      const orders = await base44.entities.ProductionOrder.filter({ id });
      return orders[0];
    },
    enabled: !!id,
    staleTime: 0,
    refetchOnMount: 'always',
    refetchOnWindowFocus: true,
  });

  const { data: rawInventory = [] } = useQuery({
    queryKey: ['inventory'],
    queryFn: () => base44.entities.InventoryItem.list('item_name'),
  });
  const { data: botolList = [] } = useQuery({ queryKey: ['botol'], queryFn: () => base44.entities.Botol.list() });
  const { data: tutupList = [] } = useQuery({ queryKey: ['tutup'], queryFn: () => base44.entities.Tutup.list() });
  const { data: sprayList = [] } = useQuery({ queryKey: ['spray'], queryFn: () => base44.entities.Spray.list() });
  const { data: bahanList = [] } = useQuery({ queryKey: ['bahan-cair'], queryFn: () => base44.entities.BahanCair.list() });

  // Gabungkan stok & inventori ke format InventoryItem
  const inventoryItems = useMemo(() => {
    const fromStok = [
      ...botolList.map(i => ({ id: `botol-${i.id}`, _stokId: i.id, _entity: 'Botol', item_name: i.nama, category: 'botol', total_stock: i.stok ?? 0, unit: 'pcs', vendor: i.catatan || '', minimum_stock: 10 })),
      ...tutupList.map(i => ({ id: `tutup-${i.id}`, _stokId: i.id, _entity: 'Tutup', item_name: i.nama, category: 'tutup', total_stock: i.stok ?? 0, unit: 'pcs', vendor: i.catatan || '', minimum_stock: 10 })),
      ...sprayList.map(i => ({ id: `spray-${i.id}`, _stokId: i.id, _entity: 'Spray', item_name: i.nama, category: 'spray', total_stock: i.stok ?? 0, unit: 'pcs', vendor: i.tipe || '', minimum_stock: 10 })),
      ...bahanList.map(i => ({ id: `bahan-${i.id}`, _stokId: i.id, _entity: 'BahanCair', item_name: i.nama, category: i.kategori === 'Bibit' ? 'bibit' : 'bahan', total_stock: i.stok ?? 0, unit: i.satuan || 'kg', vendor: i.vendor || '', minimum_stock: 0.5 })),
    ];
    // Merge: prioritaskan stok, tambahkan rawInventory yang tidak duplikat
    const stokIds = new Set(fromStok.map(i => i.item_name?.toLowerCase()));
    const onlyRaw = rawInventory.filter(i => !stokIds.has(i.item_name?.toLowerCase()));
    return [...fromStok, ...onlyRaw];
  }, [botolList, tutupList, sprayList, bahanList, rawInventory]);

  // Sync coreComponents setiap kali data order berubah dari server (hard re-fetch)
  // Jangan sync saat sedang dalam mode edit (editingCore) agar input user tidak terhapus
  useEffect(() => {
    if (order && !editingCore) {
      setCoreComponents(parseCoreComponents(order.components));
      setAddons(order.additional_components || []);
      // Sync purchase statuses dari server
      if (order.purchase_statuses) {
        setPurchaseStatuses(order.purchase_statuses);
      }
    }
  }, [order]); // eslint-disable-line react-hooks/exhaustive-deps

  // Load BarangMasuk untuk sinkronisasi otomatis
  const { data: barangMasukList = [] } = useQuery({
    queryKey: ['barang-masuk'],
    queryFn: () => base44.entities.BarangMasuk.list('-created_date'),
  });

  // Auto-sinkron purchase statuses dari BarangMasuk
  // Jika item di need_buy sudah ada di BarangMasuk → otomatis set "sudah_datang"
  useEffect(() => {
    if (!barangMasukList.length || !coreComponents) return;

    const arrivedNames = new Set();
    barangMasukList.forEach(bm => {
      (bm.items || []).forEach(item => {
        const key = (item.nama_barang || '').toLowerCase().trim();
        if (key) arrivedNames.add(key);
      });
    });

    const allComps = (coreComponents || []).flat().filter(c => c.inventory_item_id);
    let changed = false;
    const newStatuses = { ...purchaseStatuses };

    allComps.forEach(comp => {
      const namaKey = (comp.item_name || '').toLowerCase().trim();
      const currentStatus = newStatuses[comp.inventory_item_id] || 'perlu_dibeli';
      const isArrived = ['sudah_datang', 'selesai'].includes(currentStatus);
      // Jika nama ada di BarangMasuk dan belum ditandai sudah datang → auto update
      if (arrivedNames.has(namaKey) && !isArrived) {
        newStatuses[comp.inventory_item_id] = 'sudah_datang';
        changed = true;
      }
    });

    if (changed) {
      setPurchaseStatuses(newStatuses);
      // Simpan ke DB secara silent
      base44.entities.ProductionOrder.update(id, { purchase_statuses: newStatuses }).catch(() => {});
    }
  }, [barangMasukList, coreComponents]); // eslint-disable-line react-hooks/exhaustive-deps

  const stockMap = useMemo(() => {
    const map = {};
    inventoryItems.forEach(item => { map[item.id] = item.total_stock || 0; });
    return map;
  }, [inventoryItems]);

  // Enrich dengan stok real-time + auto-sinkron dari BarangMasuk
  const enrichedCore = useMemo(() => {
    if (!coreComponents) return CORE_CATEGORIES.map(() => []);

    // Buat peta nama barang → total qty yang sudah masuk dari BarangMasuk
    const arrivedMap = {}; // { nama_barang_lower: total_jumlah }
    barangMasukList.forEach(bm => {
      (bm.items || []).forEach(item => {
        const key = (item.nama_barang || '').toLowerCase().trim();
        if (key) arrivedMap[key] = (arrivedMap[key] || 0) + (item.jumlah || 0);
      });
    });

    return coreComponents.map(catComps =>
      catComps.map(comp => {
        if (comp.inventory_item_id) {
          const realStock = stockMap[comp.inventory_item_id] ?? comp.stock_available ?? 0;
          const needed = comp.qty_needed || 0;

          // Cek apakah ada di BarangMasuk (barang sudah datang)
          const namaKey = (comp.item_name || '').toLowerCase().trim();
          const arrivedQty = arrivedMap[namaKey] || 0;

          let status = 'pending';
          // Stok kurang dari yang dibutuhkan → perlu beli
          if (needed > 0 && realStock < needed) status = 'need_buy';
          else if (needed > 0 && realStock >= needed) status = 'ready';
          else if (realStock <= 0) status = 'need_buy';

          return { ...comp, stock_available: realStock, status, arrived_qty: arrivedQty };
        }
        return comp;
      })
    );
  }, [coreComponents, stockMap, barangMasukList]);

  const allCoreFlat = enrichedCore.flat();
  const linkedComps = allCoreFlat.filter(c => c.inventory_item_id);

  // Hitung status efektif: jika purchase status sudah pending/arrived, gunakan itu
  const ARRIVED_STATUSES = ['sudah_datang', 'selesai'];
  const PENDING_PO_STATUSES = ['sudah_po', 'sudah_order', 'dalam_pengiriman', 'dalam_perjalanan'];

  const getEffectiveStatus = (comp) => {
    const ps = purchaseStatuses[comp.inventory_item_id];
    if (ARRIVED_STATUSES.includes(ps)) return 'ready';
    if (PENDING_PO_STATUSES.includes(ps)) return 'pending_po';
    return comp.status; // 'ready' | 'need_buy' | 'pending'
  };

  const readyCount = linkedComps.filter(c => getEffectiveStatus(c) === 'ready').length;
  // need_buy = stok kurang DAN belum ada PO / dalam pengiriman / sudah datang
  const needBuyComps = linkedComps.filter(c => c.status === 'need_buy' && !ARRIVED_STATUSES.includes(purchaseStatuses[c.inventory_item_id]) && !PENDING_PO_STATUSES.includes(purchaseStatuses[c.inventory_item_id]));

  // Hitung progress gabungan: core + addons
  const addonTotal = addons.length;
  const addonReady = addons.filter(a => a.status === 'sudah_diterima').length;
  const totalItems = linkedComps.length + addonTotal;
  const totalReady = readyCount + addonReady;
  const percentage = totalItems > 0 ? Math.round((totalReady / totalItems) * 100) : 0;

  // Items yang perlu ditampilkan di NeedBuySection:
  // 1. Stok kurang (need_buy) yang belum punya status PO
  // 2. Yang sedang dalam proses PO (pending status) — untuk tampilkan progress
  const allNeedAttentionComps = linkedComps.filter(c => {
    const ps = purchaseStatuses[c.inventory_item_id];
    // stok kurang
    if (c.status === 'need_buy') return true;
    // sedang dalam PO tapi belum sampai
    if (PENDING_PO_STATUSES.includes(ps)) return true;
    return false;
  });

  const updateMutation = useMutation({
    mutationFn: (data) => base44.entities.ProductionOrder.update(id, data),
    onSuccess: async (_, variables) => {
      // Hard re-fetch data terbaru dari server (bukan dari cache)
      await queryClient.refetchQueries({ queryKey: ['production-order', id] });
      queryClient.invalidateQueries({ queryKey: ['production-orders'] });
      if (variables.components !== undefined) {
        setEditingCore(false);
      }
    },
    onError: () => {
      toast.error('Gagal menyimpan ke database. Silakan coba lagi.');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => base44.entities.ProductionOrder.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['production-orders'] });
      window.history.back();
    },
  });

  const addInventoryItem = useMutation({
    mutationFn: (data) => base44.entities.InventoryItem.create(data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['inventory'] }),
  });

  // Edit Info PO
  const startEditing = () => {
    setEditForm({
      brand_name: order.brand_name,
      product_name: order.product_name || '',
      target_qty: order.target_qty || '',
      final_qty: order.final_qty || '',
      deadline: order.deadline || '',
      status: order.status,
      notes: order.notes || '',
      is_dynamic_qty: order.is_dynamic_qty || false,
    });
    setEditing(true);
  };

  const refreshAllInventory = () => {
    queryClient.invalidateQueries({ queryKey: ['production-order', id] });
    queryClient.invalidateQueries({ queryKey: ['production-orders'] });
    queryClient.invalidateQueries({ queryKey: ['bahan-cair'] });
    queryClient.invalidateQueries({ queryKey: ['botol'] });
    queryClient.invalidateQueries({ queryKey: ['tutup'] });
    queryClient.invalidateQueries({ queryKey: ['spray'] });
    queryClient.invalidateQueries({ queryKey: ['inventory'] });
  };

  const saveEdit = async () => {
    const prevStatus = order.status;
    const newStatus = editForm.status;

    await updateMutation.mutateAsync({
      ...editForm,
      target_qty: Number(editForm.target_qty) || 0,
      final_qty: Number(editForm.final_qty) || 0,
    });
    setEditing(false);

    // Kurangi stok otomatis saat status berubah ke in_progress (jika belum pernah dikurangi)
    if (prevStatus !== 'in_progress' && newStatus === 'in_progress') {
      if (order.stock_deducted) {
        toast.success('PO berhasil diperbarui. Stok tidak dikurangi lagi (sudah dikurangi sebelumnya).');
        return;
      }
      const orderWithNewStatus = { ...order, ...editForm };
      const { deducted, errors, skipped } = await deductStockForPO(orderWithNewStatus, inventoryItems, bahanList, 'in_progress');
      refreshAllInventory();
      if (skipped) toast.success('PO berhasil diperbarui');
      else if (errors > 0) toast.warning(`Status → In Progress. ${deducted} item stok berkurang, ${errors} item tidak ditemukan di inventori.`);
      else toast.success(`🚀 Status → In Progress! Stok ${deducted} item berhasil dikurangi otomatis.`);
    } else {
      toast.success('PO berhasil diperbarui');
    }
  };

  // Simpan komponen — hanya simpan yang sudah dipilih, tunggu konfirmasi DB
  const saveComponents = async () => {
    const allComponents = [];
    CORE_CATEGORIES.forEach((cat, catIdx) => {
      (coreComponents[catIdx] || []).forEach(comp => {
        if (comp.inventory_item_id) {
          allComponents.push({
            ...comp,
            name: comp.item_name || cat,
            category: cat,
            is_integrated: true,
            target_qty: comp.qty_needed || 0,
            current_qty: comp.current_qty || 0,
            color_code: comp.color_code || '',
          });
        }
      });
    });
    await updateMutation.mutateAsync({ components: allComponents });
    toast.success('Komponen berhasil disimpan ke database');
  };

  const cancelEditCore = () => {
    setEditingCore(false);
    setCoreComponents(parseCoreComponents(order.components));
  };

  const handleAddonsChange = async (newAddons) => {
    setAddons(newAddons);
    await updateMutation.mutateAsync({ additional_components: newAddons });
    toast.success('Komponen tambahan disimpan');
  };

  // Handle update status pembelian item perlu dibeli
  const handlePurchaseStatusChange = async (inventoryItemId, newStatus) => {
    const updated = { ...purchaseStatuses, [inventoryItemId]: newStatus };
    setPurchaseStatuses(updated);

    // Jika status selesai, tambah stok inventori untuk item tsb agar terhitung ready
    // dan update progress PO dengan menyimpan ke DB
    await updateMutation.mutateAsync({ purchase_statuses: updated });

    // Jika semua need_buy item sudah selesai → refresh agar progress terupdate
    const allCompsFlat = (coreComponents || []).flat();
    const needBuys = allCompsFlat.filter(c => c.inventory_item_id && c.status === 'need_buy');
    const allArrived = needBuys.every(c => ['sudah_datang','selesai'].includes(updated[c.inventory_item_id] || 'perlu_dibeli'));
    if (allArrived && needBuys.length > 0) {
      toast.success('Semua item sudah datang! Progress PO diupdate.');
      queryClient.invalidateQueries({ queryKey: ['production-orders'] });
    } else {
      const statusLabel = { perlu_dibeli: 'Perlu Dibeli', sudah_po: 'Sudah PO (Pending)', dalam_pengiriman: 'Dalam Pengiriman (Pending)', sudah_datang: 'Sudah Datang (Ready)', sudah_order: 'Sudah Order', dalam_perjalanan: 'Dalam Perjalanan', selesai: 'Selesai' };
      toast.success(`Status diperbarui: ${statusLabel[newStatus] || newStatus}`);
    }
  };

  // Core comp handlers
  const addCoreComp = (catIdx) => {
    setCoreComponents(prev => {
      const updated = [...prev];
      updated[catIdx] = [...updated[catIdx], makeComp(CORE_CATEGORIES[catIdx])];
      return updated;
    });
  };

  const removeCoreComp = (catIdx, compIdx) => {
    setCoreComponents(prev => {
      const updated = [...prev];
      updated[catIdx] = updated[catIdx].filter((_, i) => i !== compIdx);
      if (updated[catIdx].length === 0) updated[catIdx] = [makeComp(CORE_CATEGORIES[catIdx])];
      return updated;
    });
  };

  const updateCoreComp = (catIdx, compIdx, updatedComp) => {
    setCoreComponents(prev => {
      const updated = [...prev];
      updated[catIdx] = updated[catIdx].map((c, i) => i === compIdx ? updatedComp : c);
      return updated;
    });
  };

  // Mark done — kurangi stok packaging + bahan cair sekaligus (jika belum pernah dikurangi)
  const handleMarkDone = async ({ shipping_via, ongkir_payer, ongkir_amount, pic } = {}) => {
    if (!order || markingDone) return;
    setMarkingDone(true);

    // Kurangi stok hanya jika belum pernah dikurangi sebelumnya
    const { deducted, errors, skipped } = await deductStockForPO(order, inventoryItems, bahanList, 'done');

    // Update PO menjadi done + shipped
    await base44.entities.ProductionOrder.update(id, {
      status: 'done',
      is_shipped: true,
      shipped_at: new Date().toISOString().split('T')[0],
      ...(shipping_via && { shipping_via }),
      ...(ongkir_payer && { ongkir_payer }),
      ...(ongkir_amount !== undefined && { ongkir_amount }),
      ...(pic && { pic }),
    });

    refreshAllInventory();
    setMarkingDone(false);
    setShowSelesaiModal(false);

    if (skipped) {
      toast.success('PO selesai & dikirim! (Stok sudah dikurangi sebelumnya saat In Progress)');
    } else if (errors > 0) {
      toast.warning(`PO selesai! ${deducted} item stok dikurangi, ${errors} item tidak ditemukan di inventori.`);
    } else {
      toast.success(`✅ PO selesai & dikirim! Stok ${deducted} item (packaging + bahan cair) berhasil dikurangi otomatis.`);
    }
  };

  if (isLoading || !coreComponents) return (
    <div className="flex items-center justify-center py-20">
      <div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin" />
    </div>
  );

  if (!order) return (
    <div className="text-center py-20">
      <p className="text-muted-foreground">PO tidak ditemukan</p>
      <Link to="/"><Button variant="outline" className="mt-4">Kembali</Button></Link>
    </div>
  );

  const catColor = { botol: 'bg-blue-50 border-blue-200 text-blue-700', bibit: 'bg-green-50 border-green-200 text-green-700', tutup: 'bg-purple-50 border-purple-200 text-purple-700', spray: 'bg-orange-50 border-orange-200 text-orange-700' };
  const catIcon = { botol: '🧴', bibit: '🌿', tutup: '🔒', spray: '💨' };
  const scColor = { ready: 'bg-green-100 text-green-700 border-green-200', pending: 'bg-yellow-100 text-yellow-700 border-yellow-200', need_buy: 'bg-red-100 text-red-700 border-red-200' };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Back + Actions */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <Link to="/">
          <Button variant="ghost" size="sm" className="gap-2 text-muted-foreground">
            <ArrowLeft className="w-4 h-4" /> Kembali
          </Button>
        </Link>
        <div className="flex gap-2 flex-wrap">
          {canEdit && !editing && (
            <Button variant="outline" size="sm" className="gap-2" onClick={startEditing}>
              <Edit2 className="w-3 h-3" /> Edit Info
            </Button>
          )}
          {canEdit && editing && (
            <>
              <Button size="sm" className="gap-2" onClick={saveEdit} disabled={updateMutation.isPending}>
                <Save className="w-3 h-3" /> Simpan Info
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setEditing(false)}>Batal</Button>
            </>
          )}
          {!editing && !order.is_shipped && (
            <>
              <Button size="sm" variant="outline" className="gap-2"
                onClick={() => setShowSuratJalan(true)}
              >
                <FileText className="w-3 h-3" /> Surat Jalan
              </Button>
              {canEdit && (
                <Button size="sm" className="gap-2 bg-green-600 hover:bg-green-700"
                  onClick={() => setShowSelesaiModal(true)}
                  disabled={markingDone}
                >
                  <Truck className="w-3 h-3" />
                  {markingDone ? 'Memproses...' : 'Selesai & Kirim'}
                </Button>
              )}
            </>
          )}
          {!editing && order.is_shipped && (
            <Button size="sm" variant="outline" className="gap-2"
              onClick={() => setShowSuratJalan(true)}
            >
              <FileText className="w-3 h-3" /> Surat Jalan
            </Button>
          )}
          {canEdit && (
            <Button variant="outline" size="sm" className="gap-2 text-destructive hover:text-destructive"
              onClick={() => { if (confirm('Hapus PO ini?')) deleteMutation.mutate(); }}>
              <Trash2 className="w-3 h-3" /> Hapus
            </Button>
          )}
        </div>
      </div>

      {/* Shipped banner */}
      {order.is_shipped && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-center gap-3">
          <CheckCircle2 className="w-5 h-5 text-green-600 shrink-0" />
          <div className="flex-1">
            <p className="font-semibold text-green-800">PO Sudah Dikirim</p>
            <p className="text-sm text-green-600">
              Dikirim: {order.shipped_at ? new Date(order.shipped_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }) : '-'}
            </p>
          </div>
          {order.stock_deducted && (
            <div className="text-right shrink-0">
              <span className="inline-flex items-center gap-1.5 text-xs bg-green-100 text-green-700 border border-green-200 px-2.5 py-1 rounded-full font-medium">
                <CheckCircle2 className="w-3 h-3" />
                Stok Sudah Dikurangi
                {order.stock_deducted_trigger === 'in_progress' ? ' (saat In Progress)' : ' (saat Selesai)'}
              </span>
            </div>
          )}
        </div>
      )}

      {/* Need buy section dengan tracking status pembelian */}
      {allNeedAttentionComps.length > 0 && !order.is_shipped && (
        <NeedBuySection
          needBuyComps={allNeedAttentionComps}
          purchaseStatuses={purchaseStatuses}
          onStatusChange={handlePurchaseStatusChange}
        />
      )}

      {/* Header Card */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row items-start gap-6">
            <ProgressRing percentage={percentage} size={100} strokeWidth={7} />
            <div className="flex-1">
              {editing ? (
                <div className="space-y-3">
                  <div><Label className="text-xs">Nama Brand</Label><Input value={editForm.brand_name} onChange={e => setEditForm(f => ({...f, brand_name: e.target.value}))} className="font-display font-bold mt-1" /></div>
                  <div><Label className="text-xs">Nama Produk</Label><Input value={editForm.product_name} onChange={e => setEditForm(f => ({...f, product_name: e.target.value}))} placeholder="Nama produk" className="mt-1" /></div>
                  <div className="grid grid-cols-2 gap-3">
                    <div><Label className="text-xs">Target Qty</Label><Input type="number" value={editForm.target_qty} onChange={e => setEditForm(f => ({...f, target_qty: e.target.value}))} className="mt-1" /></div>
                    <div><Label className="text-xs">Final Qty</Label><Input type="number" value={editForm.final_qty} onChange={e => setEditForm(f => ({...f, final_qty: e.target.value}))} className="mt-1" /></div>
                  </div>
                  <div><Label className="text-xs">Deadline</Label><Input type="date" value={editForm.deadline} onChange={e => setEditForm(f => ({...f, deadline: e.target.value}))} className="mt-1" /></div>
                  <div>
                    <Label className="text-xs">Status</Label>
                    <Select value={editForm.status} onValueChange={v => setEditForm(f => ({...f, status: v}))}>
                      <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {['pending','in_progress','diracik','maserasi','filling','menunggu_packing','packing','siap_kirim','done'].map(s => (
                          <SelectItem key={s} value={s}>{s.replace(/_/g,' ').toUpperCase()}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-center gap-3">
                    <Switch checked={editForm.is_dynamic_qty} onCheckedChange={v => setEditForm(f => ({...f, is_dynamic_qty: v}))} />
                    <Label className="font-normal text-sm">Dynamic Qty</Label>
                  </div>
                  <div><Label className="text-xs">Catatan</Label><Textarea value={editForm.notes} onChange={e => setEditForm(f => ({...f, notes: e.target.value}))} placeholder="Catatan..." className="mt-1 resize-none" rows={2} /></div>
                </div>
              ) : (
                <>
                  <div className="flex items-center gap-3 mb-1 flex-wrap">
                    <span className="text-sm font-mono text-muted-foreground">#{order.order_number}</span>
                    <StatusBadge status={order.status} />
                    {order.is_dynamic_qty && <span className="inline-flex items-center gap-1 text-xs text-muted-foreground"><Lock className="w-3 h-3" /> Dynamic Qty</span>}
                  </div>
                  <h1 className="font-display text-3xl font-bold">{order.brand_name}</h1>
                  {order.product_name && <p className="text-muted-foreground">{order.product_name}</p>}
                  <div className="flex flex-wrap gap-4 mt-3 text-sm text-muted-foreground">
                   {order.target_qty > 0 && <span>Target: <strong className="text-foreground">{order.target_qty?.toLocaleString()} pcs</strong></span>}
                   {order.final_qty > 0 && <span>Final: <strong className="text-foreground">{order.final_qty?.toLocaleString()} pcs</strong></span>}
                   {order.deadline && <span>Deadline: <strong className="text-foreground">{new Date(order.deadline).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' })}</strong></span>}
                   {order.pic_marketing && <span>PIC: <strong className="text-primary">👤 {order.pic_marketing}</strong></span>}
                  </div>
                  {order.notes && <p className="mt-3 text-sm bg-muted/50 rounded-lg p-3">{order.notes}</p>}

                </>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ===== KOMPONEN UTAMA ===== */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="font-display text-lg">Komponen Utama</CardTitle>
              <p className="text-xs text-muted-foreground mt-0.5">Botol, Bibit, Tutup, Spray — terintegrasi dengan inventori.</p>
            </div>
            {canEdit && !editingCore && (
              <Button variant="outline" size="sm" className="gap-1.5 text-xs h-8" onClick={() => setEditingCore(true)}>
                <Edit2 className="w-3 h-3" /> Edit Komponen
              </Button>
            )}
            {editingCore && (
              <div className="flex gap-2">
                <Button size="sm" className="gap-1.5 text-xs h-8 bg-green-600 hover:bg-green-700" onClick={saveComponents} disabled={updateMutation.isPending}>
                  <Save className="w-3 h-3" /> Simpan
                </Button>
                <Button variant="ghost" size="sm" className="text-xs h-8" onClick={cancelEditCore}>
                  Batal
                </Button>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {/* MODE VIEW: locked, tampilkan summary */}
          {!editingCore && (
            <div className="space-y-2">
              {CORE_CATEGORIES.map((cat, catIdx) => {
                const comps = enrichedCore[catIdx].filter(c => c.inventory_item_id);
                const catLabel = cat.charAt(0).toUpperCase() + cat.slice(1);
                if (comps.length === 0) {
                  return (
                    <div key={cat} className="flex items-center gap-3 py-2.5 px-3 rounded-lg bg-muted/30 border border-dashed border-border/50">
                      <span className="text-base">{catIcon[cat]}</span>
                      <span className="text-sm font-medium text-muted-foreground">{catLabel}</span>
                      <span className="text-xs text-muted-foreground ml-auto italic">Belum dipilih</span>
                    </div>
                  );
                }
                return (
                  <div key={cat} className="space-y-1.5">
                    {comps.map((comp, i) => (
                      <div key={i} className={`flex items-center gap-3 py-2.5 px-3 rounded-lg border ${catColor[cat]}`}>
                        <span className="text-base shrink-0">{catIcon[cat]}</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold truncate">{comp.item_name || catLabel}</p>
                          {comp.vendor && <p className="text-xs opacity-70 truncate">{comp.vendor}</p>}
                        </div>
                        <div className="text-right shrink-0">
                          {(() => {
                            const { display: qDisp, unit: qUnit } = smartDisplayQty(comp.qty_needed || 0, comp.unit || 'pcs');
                            return <p className="text-sm font-medium">{qDisp} {qUnit}</p>;
                          })()}
                          {(() => {
                            const { display, unit: du } = smartDisplayQty(comp.stock_available || 0, comp.unit || 'pcs');
                            return <p className="text-xs opacity-70">Stok: {display} {du}</p>;
                          })()}
                        </div>
                        <span className={`text-[11px] px-2 py-0.5 rounded-full border font-medium shrink-0 ${scColor[comp.status] || scColor.pending}`}>
                          {comp.status === 'ready' ? 'Ready' : comp.status === 'need_buy' ? 'Beli' : 'Pending'}
                        </span>
                        <Lock className="w-3 h-3 opacity-40 shrink-0" title="Terkunci" />
                      </div>
                    ))}
                  </div>
                );
              })}
            </div>
          )}

          {/* MODE EDIT: pilih item inventori */}
          {editingCore && (
            <div className="space-y-4">
              {CORE_CATEGORIES.map((cat, catIdx) => (
                <div key={cat} className="space-y-2">
                  {coreComponents[catIdx].map((comp, compIdx) => (
                    <POComponentItem
                      key={`${cat}-${compIdx}`}
                      comp={comp}
                      inventoryItems={inventoryItems}
                      onChange={(updated) => updateCoreComp(catIdx, compIdx, updated)}
                      onRemove={() => removeCoreComp(catIdx, compIdx)}
                      isCore={coreComponents[catIdx].length === 1}
                      onAddNewItem={(newItemData) => addInventoryItem.mutateAsync(newItemData)}
                    />
                  ))}
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="text-xs text-muted-foreground hover:text-primary gap-1 h-7 px-2"
                    onClick={() => addCoreComp(catIdx)}
                  >
                    <Plus className="w-3 h-3" /> Tambah {cat.charAt(0).toUpperCase() + cat.slice(1)} Lain
                  </Button>
                </div>
              ))}
              <Button
                className="w-full h-10 font-semibold bg-green-600 hover:bg-green-700 mt-2"
                onClick={saveComponents}
                disabled={updateMutation.isPending}
              >
                {updateMutation.isPending ? 'Menyimpan...' : '✓ Simpan Komponen'}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ===== TUGAS PRODUKSI ===== */}
      <TambahTugasSection order={order} />

      {/* ===== RACIKAN / FORMULA ===== */}
      <RacikanFormulaSection
        order={order}
        isSaving={updateMutation.isPending}
        onSave={async (newRacikan) => {
          await updateMutation.mutateAsync({ racikan_digunakan: newRacikan });
        }}
      />

      {/* ===== KOMPONEN TAMBAHAN ===== */}
      <AdditionalComponentSection
        addons={addons}
        onChange={handleAddonsChange}
        isShipped={false}
      />

      {/* Modal Selesai Kirim */}
      {showSelesaiModal && (
        <SelesaiKirimModal
          order={order}
          onConfirm={handleMarkDone}
          onCancel={() => setShowSelesaiModal(false)}
          isLoading={markingDone}
        />
      )}

      {/* Surat Jalan Print Preview */}
      {showSuratJalan && (
        <SuratJalanPrint
          order={order}
          companySettings={companySettings}
          onClose={() => setShowSuratJalan(false)}
        />
      )}
    </div>
  );
}