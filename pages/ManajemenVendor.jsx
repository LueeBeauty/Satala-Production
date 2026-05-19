import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import VendorList from '@/components/vendor/VendorList';
import VendorForm from '@/components/vendor/VendorForm';
import HargaVendorTab from '@/components/vendor/HargaVendorTab';
import KomparasiHarga from '@/components/vendor/KomparasiHarga';
import { Building2, DollarSign, BarChart3, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function ManajemenVendor() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('vendor');
  const [showVendorForm, setShowVendorForm] = useState(false);
  const [editingVendor, setEditingVendor] = useState(null);

  const { data: vendorList = [], isLoading: loadingVendor } = useQuery({
    queryKey: ['vendor'],
    queryFn: () => base44.entities.Vendor.list('-created_date'),
  });

  const { data: hargaVendorList = [], isLoading: loadingHarga } = useQuery({
    queryKey: ['harga-vendor'],
    queryFn: () => base44.entities.HargaVendor.list('-updated_date'),
  });

  const { data: bahanList = [] } = useQuery({
    queryKey: ['bahan-cair'],
    queryFn: () => base44.entities.BahanCair.list(),
  });

  const createVendorMutation = useMutation({
    mutationFn: (data) => base44.entities.Vendor.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vendor'] });
      setShowVendorForm(false);
      setEditingVendor(null);
    },
  });

  const updateVendorMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Vendor.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vendor'] });
      setShowVendorForm(false);
      setEditingVendor(null);
    },
  });

  const deleteVendorMutation = useMutation({
    mutationFn: (id) => base44.entities.Vendor.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['vendor'] }),
  });

  const handleSaveVendor = (formData) => {
    if (editingVendor) {
      updateVendorMutation.mutate({ id: editingVendor.id, data: formData });
    } else {
      createVendorMutation.mutate(formData);
    }
  };

  const handleEditVendor = (vendor) => {
    setEditingVendor(vendor);
    setShowVendorForm(true);
  };

  const handleNewVendor = () => {
    setEditingVendor(null);
    setShowVendorForm(true);
  };

  const activeCount = vendorList.filter(v => v.aktif !== false).length;

  return (
    <div className="space-y-6 pb-20">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold text-foreground">Manajemen Vendor</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Kelola pemasok bahan baku & bandingkan harga antar vendor
          </p>
        </div>
        {activeTab === 'vendor' && (
          <Button onClick={handleNewVendor} className="gap-2 bg-accent hover:bg-accent/90 text-accent-foreground">
            <Plus className="w-4 h-4" /> Tambah Vendor
          </Button>
        )}
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Total Vendor', value: vendorList.length, sub: `${activeCount} aktif`, icon: Building2, color: 'text-primary' },
          { label: 'Data Harga', value: hargaVendorList.length, sub: 'entri harga vendor', icon: DollarSign, color: 'text-accent' },
          { label: 'Bahan Dipantau', value: [...new Set(hargaVendorList.map(h => h.bahan_id))].length, sub: 'jenis bahan', icon: BarChart3, color: 'text-emerald-600' },
        ].map((s) => {
          const Icon = s.icon;
          return (
            <div key={s.label} className="bg-card border border-border rounded-2xl p-4 shadow-sm">
              <div className="flex items-center gap-2 mb-1">
                <Icon className={`w-4 h-4 ${s.color}`} />
                <span className="text-xs text-muted-foreground">{s.label}</span>
              </div>
              <p className="text-2xl font-bold text-foreground">{s.value}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{s.sub}</p>
            </div>
          );
        })}
      </div>

      {/* Form Vendor (inline) */}
      {showVendorForm && (
        <VendorForm
          vendor={editingVendor}
          onSave={handleSaveVendor}
          onCancel={() => { setShowVendorForm(false); setEditingVendor(null); }}
          isSaving={createVendorMutation.isPending || updateVendorMutation.isPending}
        />
      )}

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid grid-cols-3 w-full max-w-md">
          <TabsTrigger value="vendor" className="gap-1.5 text-xs">
            <Building2 className="w-3.5 h-3.5" /> Daftar Vendor
          </TabsTrigger>
          <TabsTrigger value="harga" className="gap-1.5 text-xs">
            <DollarSign className="w-3.5 h-3.5" /> Harga Vendor
          </TabsTrigger>
          <TabsTrigger value="komparasi" className="gap-1.5 text-xs">
            <BarChart3 className="w-3.5 h-3.5" /> Komparasi
          </TabsTrigger>
        </TabsList>

        <TabsContent value="vendor" className="mt-4">
          <VendorList
            vendorList={vendorList}
            hargaVendorList={hargaVendorList}
            isLoading={loadingVendor}
            onEdit={handleEditVendor}
            onDelete={(id) => deleteVendorMutation.mutate(id)}
          />
        </TabsContent>

        <TabsContent value="harga" className="mt-4">
          <HargaVendorTab
            vendorList={vendorList}
            bahanList={bahanList}
            hargaVendorList={hargaVendorList}
            isLoading={loadingHarga}
          />
        </TabsContent>

        <TabsContent value="komparasi" className="mt-4">
          <KomparasiHarga
            vendorList={vendorList}
            bahanList={bahanList}
            hargaVendorList={hargaVendorList}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}