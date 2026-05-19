import React, { useState, useRef, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Building2, Upload, CheckCircle, Loader2, ImageIcon, Trash2, Save, Lock } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { useSession } from '@/lib/SessionContext';
import { canEditCompanySettings } from '@/lib/AuthSession';

const AssetUploadCard = ({ label, description, currentUrl, onUpload, onRemove, uploading, readOnly }) => {
  const fileRef = useRef();

  return (
    <div className="border border-border rounded-xl p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <p className="font-semibold text-sm">{label}</p>
          <p className="text-xs text-muted-foreground">{description}</p>
        </div>
        {currentUrl && !readOnly && (
          <Button variant="ghost" size="icon" className="w-8 h-8 text-destructive hover:text-destructive" onClick={onRemove}>
            <Trash2 className="w-4 h-4" />
          </Button>
        )}
      </div>

      {currentUrl ? (
        <div className="relative bg-muted/30 rounded-lg p-3 flex items-center justify-center min-h-[100px]">
          <img src={currentUrl} alt={label} className="max-h-[100px] max-w-full object-contain" />
          <div className="absolute top-2 right-2">
            <span className="bg-green-100 text-green-700 text-xs px-2 py-0.5 rounded-full flex items-center gap-1">
              <CheckCircle className="w-3 h-3" /> Tersimpan
            </span>
          </div>
        </div>
      ) : (
        <div
          className={`border-2 border-dashed border-border rounded-lg p-6 flex flex-col items-center justify-center gap-2 ${readOnly ? 'opacity-50' : 'cursor-pointer hover:bg-muted/20 transition-colors'}`}
          onClick={() => !readOnly && fileRef.current?.click()}
        >
          <ImageIcon className="w-8 h-8 text-muted-foreground" />
          <p className="text-xs text-muted-foreground text-center">
            {readOnly ? 'Tidak ada gambar' : 'Klik untuk unggah gambar\n(PNG, JPG, WebP — maks 5MB)'}
          </p>
        </div>
      )}

      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file && onUpload) onUpload(file);
          e.target.value = '';
        }}
      />

      {!readOnly && (
        <Button
          variant="outline"
          size="sm"
          className="w-full gap-2"
          disabled={uploading}
          onClick={() => fileRef.current?.click()}
        >
          {uploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
          {uploading ? 'Mengunggah...' : currentUrl ? 'Ganti Gambar' : 'Unggah Gambar'}
        </Button>
      )}
    </div>
  );
};

export default function PengaturanPerusahaan() {
  const { toast } = useToast();
  const { member } = useSession();
  const queryClient = useQueryClient();
  const [uploadingField, setUploadingField] = useState(null);
  const canEdit = canEditCompanySettings(member);

  const { data: settingsList = [], isLoading } = useQuery({
    queryKey: ['company-settings'],
    queryFn: () => base44.entities.CompanySettings.list(),
  });

  const settings = settingsList[0] || {};

  const [form, setForm] = useState({
    nama_perusahaan: '',
    alamat_perusahaan: '',
    nama_direktur: '',
    kota: '',
  });

  useEffect(() => {
    if (settingsList[0]) {
      setForm({
        nama_perusahaan: settingsList[0].nama_perusahaan || '',
        alamat_perusahaan: settingsList[0].alamat_perusahaan || '',
        nama_direktur: settingsList[0].nama_direktur || '',
        kota: settingsList[0].kota || '',
      });
    }
  }, [settingsList]);

  const saveMutation = useMutation({
    mutationFn: async (data) => {
      if (settings.id) {
        return base44.entities.CompanySettings.update(settings.id, data);
      } else {
        return base44.entities.CompanySettings.create(data);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['company-settings'] });
      toast({ title: 'Tersimpan', description: 'Pengaturan perusahaan berhasil disimpan.' });
    },
  });

  const handleUpload = async (file, field) => {
    setUploadingField(field);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    const updateData = { ...form, [field]: file_url };
    if (settings.id) {
      await base44.entities.CompanySettings.update(settings.id, { [field]: file_url });
    } else {
      await base44.entities.CompanySettings.create({ [field]: file_url });
    }
    queryClient.invalidateQueries({ queryKey: ['company-settings'] });
    toast({ title: 'Gambar diunggah', description: `${field === 'logo_url' ? 'Logo' : field === 'stempel_url' ? 'Stempel' : 'Tanda Tangan'} berhasil diunggah.` });
    setUploadingField(null);
  };

  const handleRemove = async (field) => {
    if (!settings.id) return;
    await base44.entities.CompanySettings.update(settings.id, { [field]: null });
    queryClient.invalidateQueries({ queryKey: ['company-settings'] });
    toast({ title: 'Dihapus', description: 'Gambar berhasil dihapus.' });
  };

  const handleSaveText = () => {
    saveMutation.mutate(form);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
          <Building2 className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h1 className="text-xl font-display font-bold">Pengaturan Perusahaan</h1>
          <p className="text-sm text-muted-foreground">Atur logo, stempel, dan tanda tangan yang akan muncul di invoice</p>
        </div>
        {!canEdit && (
          <span className="ml-auto flex items-center gap-1.5 text-xs text-muted-foreground bg-muted px-3 py-1.5 rounded-full">
            <Lock className="w-3 h-3" /> Hanya bisa melihat
          </span>
        )}
      </div>

      {/* Identitas Perusahaan */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold">Identitas Perusahaan</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-medium text-foreground mb-1.5 block">Nama Perusahaan</label>
              <Input
                value={form.nama_perusahaan}
                onChange={e => setForm(f => ({ ...f, nama_perusahaan: e.target.value }))}
                placeholder="PT. Satala Dermatech Essential"
                disabled={!canEdit}
              />
            </div>
            <div>
              <label className="text-xs font-medium text-foreground mb-1.5 block">Kota (untuk tanda tangan)</label>
              <Input
                value={form.kota}
                onChange={e => setForm(f => ({ ...f, kota: e.target.value }))}
                placeholder="Bogor"
                disabled={!canEdit}
              />
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-foreground mb-1.5 block">Alamat Perusahaan</label>
            <Input
              value={form.alamat_perusahaan}
              onChange={e => setForm(f => ({ ...f, alamat_perusahaan: e.target.value }))}
              placeholder="Jalan aster kavling Paspampres, Kota Batu, Kec. Ciomas..."
              disabled={!canEdit}
            />
          </div>
          <div>
            <label className="text-xs font-medium text-foreground mb-1.5 block">Nama Direktur</label>
            <Input
              value={form.nama_direktur}
              onChange={e => setForm(f => ({ ...f, nama_direktur: e.target.value }))}
              placeholder="Umar Syarif"
              disabled={!canEdit}
            />
          </div>
          {canEdit && (
            <Button
              size="sm"
              onClick={handleSaveText}
              disabled={saveMutation.isPending}
              className="gap-2 bg-primary hover:bg-primary/90"
            >
              {saveMutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
              Simpan Identitas
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Aset Visual Invoice */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold">Aset Visual Invoice</CardTitle>
          <p className="text-xs text-muted-foreground">Unggah satu kali, akan otomatis muncul di semua invoice</p>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <AssetUploadCard
            label="Logo Perusahaan"
            description="Muncul di kop atas invoice"
            currentUrl={settings.logo_url}
            onUpload={canEdit ? (file) => handleUpload(file, 'logo_url') : null}
            onRemove={canEdit ? () => handleRemove('logo_url') : null}
            uploading={uploadingField === 'logo_url'}
            readOnly={!canEdit}
          />
          <AssetUploadCard
            label="Stempel / Cap"
            description="Muncul di pojok kanan bawah"
            currentUrl={settings.stempel_url}
            onUpload={canEdit ? (file) => handleUpload(file, 'stempel_url') : null}
            onRemove={canEdit ? () => handleRemove('stempel_url') : null}
            uploading={uploadingField === 'stempel_url'}
            readOnly={!canEdit}
          />
          <AssetUploadCard
            label="Tanda Tangan Digital"
            description="Muncul di atas stempel"
            currentUrl={settings.ttd_url}
            onUpload={canEdit ? (file) => handleUpload(file, 'ttd_url') : null}
            onRemove={canEdit ? () => handleRemove('ttd_url') : null}
            uploading={uploadingField === 'ttd_url'}
            readOnly={!canEdit}
          />
        </CardContent>
      </Card>

      {/* Preview Info */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 text-xs text-blue-700">
        <p className="font-semibold mb-1">Cara kerja di Invoice PDF</p>
        <ul className="space-y-0.5 list-disc list-inside">
          <li>Logo akan muncul di <strong>kop atas kiri</strong> invoice</li>
          <li>Tanda tangan & stempel akan muncul di <strong>bawah kanan</strong>, di atas nama direktur</li>
          <li>Nama direktur, kota, dan identitas perusahaan diambil dari pengaturan ini</li>
        </ul>
      </div>
    </div>
  );
}