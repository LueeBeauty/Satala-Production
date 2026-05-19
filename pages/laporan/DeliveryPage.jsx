import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Trash2, TruckIcon, Search, ArrowDownCircle, ArrowUpCircle, Clock, CheckCircle2, Package } from 'lucide-react';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';
import DeliveryItemForm from '@/components/delivery/DeliveryItemForm';

const STATUS_CONFIG = {
  sedang_po: { label: 'Sedang PO', cls: 'bg-blue-100 text-blue-700', icon: Clock },
  dalam_perjalanan: { label: 'Dalam Perjalanan', cls: 'bg-amber-100 text-amber-700', icon: TruckIcon },
  sudah_sampai: { label: 'Sudah Sampai', cls: 'bg-green-100 text-green-700', icon: CheckCircle2 },
};

export default function DeliveryPage() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('masuk');
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [formJenis, setFormJenis] = useState('masuk');

  const { data: botolList = [] } = useQuery({ queryKey: ['botol'], queryFn: () => base44.entities.Botol.list() });
  const { data: tutupList = [] } = useQuery({ queryKey: ['tutup'], queryFn: () => base44.entities.Tutup.list() });
  const { data: sprayList = [] } = useQuery({ queryKey: ['spray'], queryFn: () => base44.entities.Spray.list() });
  const { data: bahanList = [] } = useQuery({ queryKey: ['bahan-cair'], queryFn: () => base44.entities.BahanCair.list() });

  const inventoryOptions = [
    ...botolList.map(i => ({ id: `botol-${i.id}`, _stokId: i.id, _entity: 'Botol', nama: i.nama, kategori: 'botol', stok: i.stok ?? 0, satuan: 'pcs' })),
    ...tutupList.map(i => ({ id: `tutup-${i.id}`, _stokId: i.id, _entity: 'Tutup', nama: i.nama, kategori: 'tutup', stok: i.stok ?? 0, satuan: 'pcs' })),
    ...sprayList.map(i => ({ id: `spray-${i.id}`, _stokId: i.id, _entity: 'Spray', nama: i.nama, kategori: 'spray', stok: i.stok ?? 0, satuan: 'pcs' })),
    ...bahanList.map(i => ({ id: `bahan-${i.id}`, _stokId: i.id, _entity: 'BahanCair', nama: i.nama, kategori: i.kategori?.toLowerCase() || 'bahan cair', stok: i.stok ?? 0, satuan: i.satuan || 'kg' })),
  ];

  const { data: deliveryItems = [], isLoading } = useQuery({
    queryKey: ['delivery-items'],
    queryFn: () => base44.entities.DeliveryItem.list('-tanggal'),
  });

  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: ['delivery-items'] });
    queryClient.invalidateQueries({ queryKey: ['botol'] });
    queryClient.invalidateQueries({ queryKey: ['tutup'] });
    queryClient.invalidateQueries({ queryKey: ['spray'] });
    queryClient.invalidateQueries({ queryKey: ['bahan-cair'] });
  };

  const createMutation = useMutation({
    mutationFn: async ({ tanggal, no_po, catatan, status, items }) => {
      // Buat 1 DeliveryItem per item
      for (const item of items) {
        await base44.entities.DeliveryItem.create({
          jenis: formJenis,
          tanggal,
          no_po: no_po || undefined,
          catatan: catatan || undefined,
          status,
          nama_item: item.nama_item,
          kategori: item.kategori,
          jumlah: item.jumlah,
          satuan: item.satuan,
          vendor: item.vendor || undefined,
          inventory_item_id: item.inventory_item_id,
        });
        // Update stok
        if (status === 'sudah_sampai') {
          await updateInventoryStock(item, formJenis === 'masuk' ? 'tambah' : 'kurangi');
        }
      }
    },
    onSuccess: () => { invalidateAll(); setShowForm(false); },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.DeliveryItem.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['delivery-items'] }),
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ item, newStatus }) => {
      await base44.entities.DeliveryItem.update(item.id, { status: newStatus });
      // Jika status berubah ke sudah_sampai, update stok inventori
      if (item.inventory_item_id && item.status !== 'sudah_sampai' && newStatus === 'sudah_sampai') {
        if (item.jenis === 'masuk') await updateInventoryStock(item, 'tambah');
        else await updateInventoryStock(item, 'kurangi');
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['delivery-items'] });
      queryClient.invalidateQueries({ queryKey: ['botol'] });
      queryClient.invalidateQueries({ queryKey: ['tutup'] });
      queryClient.invalidateQueries({ queryKey: ['spray'] });
      queryClient.invalidateQueries({ queryKey: ['bahan-cair'] });
    },
  });

  const updateInventoryStock = async (item, mode) => {
    // item bisa dari inventoryOptions (dengan id) atau dari form baru (dengan inventory_item_id)
    const invId = item.inventory_item_id || item.id;
    const invItem = inventoryOptions.find(i => i.id === invId);
    if (!invItem) return;
    const currentStok = invItem.stok || 0;
    const jumlah = Number(item.jumlah) || 0;
    const newStok = mode === 'tambah' ? currentStok + jumlah : Math.max(0, currentStok - jumlah);
    if (invItem._entity === 'Botol') await base44.entities.Botol.update(invItem._stokId, { stok: newStok });
    else if (invItem._entity === 'Tutup') await base44.entities.Tutup.update(invItem._stokId, { stok: newStok });
    else if (invItem._entity === 'Spray') await base44.entities.Spray.update(invItem._stokId, { stok: newStok });
    else if (invItem._entity === 'BahanCair') await base44.entities.BahanCair.update(invItem._stokId, { stok: newStok });
  };

  const filtered = deliveryItems.filter(d => d.jenis === activeTab)
    .filter(d => !search || d.nama_item?.toLowerCase().includes(search.toLowerCase()) || d.vendor?.toLowerCase().includes(search.toLowerCase()));

  const totalMasuk = deliveryItems.filter(d => d.jenis === 'masuk').length;
  const totalKeluar = deliveryItems.filter(d => d.jenis === 'keluar').length;
  const sedangPO = deliveryItems.filter(d => d.status === 'sedang_po').length;
  const dalamPerjalanan = deliveryItems.filter(d => d.status === 'dalam_perjalanan').length;

  return (
    <div className="space-y-5">
      {/* Stats mini */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Barang Masuk', value: totalMasuk, icon: ArrowDownCircle, color: 'text-green-600' },
          { label: 'Barang Keluar', value: totalKeluar, icon: ArrowUpCircle, color: 'text-red-500' },
          { label: 'Sedang PO', value: sedangPO, icon: Clock, color: 'text-blue-600' },
          { label: 'Dalam Perjalanan', value: dalamPerjalanan, icon: TruckIcon, color: 'text-amber-600' },
        ].map(s => (
          <Card key={s.label}>
            <CardContent className="p-3 flex items-center gap-3">
              <s.icon className={`w-8 h-8 ${s.color} shrink-0`} />
              <div>
                <p className="text-2xl font-bold">{s.value}</p>
                <p className="text-xs text-muted-foreground">{s.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Tabs Masuk/Keluar */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <div className="flex items-center justify-between flex-wrap gap-3">
          <TabsList>
            <TabsTrigger value="masuk" className="gap-2">
              <ArrowDownCircle className="w-3.5 h-3.5" /> Barang Masuk
            </TabsTrigger>
            <TabsTrigger value="keluar" className="gap-2">
              <ArrowUpCircle className="w-3.5 h-3.5" /> Barang Keluar
            </TabsTrigger>
          </TabsList>
          <div className="flex gap-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
              <Input placeholder="Cari..." className="pl-8 h-8 w-40" value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            <Button size="sm" onClick={() => { setFormJenis(activeTab); setShowForm(true); }} className="gap-1.5">
              <Plus className="w-3.5 h-3.5" /> Tambah
            </Button>
          </div>
        </div>

        <TabsContent value="masuk" className="mt-4">
          <ItemList items={filtered} onDelete={(id) => { if (confirm('Hapus item ini?')) deleteMutation.mutate(id); }} onUpdateStatus={(item, status) => updateStatusMutation.mutate({ item, newStatus: status })} isLoading={isLoading} jenis="masuk" />
        </TabsContent>
        <TabsContent value="keluar" className="mt-4">
          <ItemList items={filtered} onDelete={(id) => { if (confirm('Hapus item ini?')) deleteMutation.mutate(id); }} onUpdateStatus={(item, status) => updateStatusMutation.mutate({ item, newStatus: status })} isLoading={isLoading} jenis="keluar" />
        </TabsContent>
      </Tabs>

      {/* Form Dialog */}
      <Dialog open={showForm} onOpenChange={(open) => { if (!open) setShowForm(false); }}>
        <DialogContent className="max-w-2xl max-h-[94vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {formJenis === 'masuk'
                ? <ArrowDownCircle className="w-5 h-5 text-green-600" />
                : <ArrowUpCircle className="w-5 h-5 text-red-500" />}
              Tambah Barang {formJenis === 'masuk' ? 'Masuk' : 'Keluar'}
            </DialogTitle>
          </DialogHeader>
          <DeliveryItemForm
            key={showForm ? formJenis : 'closed'}
            jenis={formJenis}
            inventoryOptions={inventoryOptions}
            onSave={(data) => createMutation.mutate(data)}
            onClose={() => setShowForm(false)}
            isPending={createMutation.isPending}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ItemList({ items, onDelete, onUpdateStatus, isLoading, jenis }) {
  if (isLoading) return <div className="text-center py-10 text-muted-foreground text-sm">Memuat...</div>;
  if (items.length === 0) return (
    <div className="text-center py-16 text-muted-foreground">
      <Package className="w-10 h-10 mx-auto mb-3 opacity-20" />
      <p>Belum ada data barang {jenis}.</p>
    </div>
  );

  return (
    <div className="space-y-2">
      {items.map(item => {
        const statusCfg = STATUS_CONFIG[item.status] || STATUS_CONFIG.sudah_sampai;
        const StatusIcon = statusCfg.icon;
        return (
          <Card key={item.id}>
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${jenis === 'masuk' ? 'bg-green-100' : 'bg-red-100'}`}>
                  {jenis === 'masuk' ? <ArrowDownCircle className="w-4 h-4 text-green-600" /> : <ArrowUpCircle className="w-4 h-4 text-red-500" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-sm">{item.nama_item}</span>
                    {item.kategori && <Badge variant="outline" className="text-xs capitalize">{item.kategori}</Badge>}
                    <span className={`inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full font-medium ${statusCfg.cls}`}>
                      <StatusIcon className="w-3 h-3" /> {statusCfg.label}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground flex-wrap">
                    <span className="font-semibold text-foreground">{item.jumlah} {item.satuan || 'pcs'}</span>
                    {item.tanggal && <span>{format(new Date(item.tanggal), 'dd MMM yyyy', { locale: id })}</span>}
                    {item.vendor && <span>· {item.vendor}</span>}
                    {item.no_po && <span>· PO: {item.no_po}</span>}
                    {item.harga_satuan && <span>· Rp {new Intl.NumberFormat('id-ID').format(item.harga_satuan)}/item</span>}
                  </div>
                  {item.catatan && <p className="text-xs text-muted-foreground mt-1 italic">{item.catatan}</p>}
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  {/* Quick status update */}
                  {item.status !== 'sudah_sampai' && (
                    <Select onValueChange={(val) => onUpdateStatus(item, val)} defaultValue={item.status}>
                      <SelectTrigger className="h-7 text-xs w-36 border-dashed">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="sedang_po">Sedang PO</SelectItem>
                        <SelectItem value="dalam_perjalanan">Dalam Perjalanan</SelectItem>
                        <SelectItem value="sudah_sampai">Sudah Sampai</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                  <Button variant="ghost" size="icon" className="w-8 h-8 text-destructive/60 hover:text-destructive" onClick={() => onDelete(item.id)}><Trash2 className="w-3.5 h-3.5" /></Button>
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}