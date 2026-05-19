import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { X, Plus, ShoppingCart } from 'lucide-react';

/**
 * Modal untuk menambah item baru ke Stok & Inventori
 * Props:
 *  - type: 'botol' | 'tutup' | 'spray' | 'bahan'
 *  - initialName: string (pre-fill nama dari search)
 *  - initialVendor: string (untuk bibit)
 *  - initialKategori: string (untuk bahan: Bibit, Alkohol, DPG, dll)
 *  - onClose: () => void
 *  - onCreated: (newItem) => void — dipanggil setelah item berhasil dibuat
 */

const KATEGORI_BAHAN = ['Bibit', 'Alkohol', 'Aqua Des', 'DPG', 'IPM', 'Lainnya'];
const SATUAN_BAHAN = ['kg', 'liter', 'gram', 'ml'];
const SPRAY_TYPES = ['Biasa', 'Continuous'];

export default function AddNewItemModal({ type, initialName = '', initialVendor = '', initialKategori = 'Bibit', onClose, onCreated }) {
  const queryClient = useQueryClient();

  const [form, setForm] = useState({
    nama: initialName,
    vendor: initialVendor,
    kategori: initialKategori,
    harga_rupiah: '',
    harga_dollar: '',
    ukuran_label_ml: '',
    ukuran_aktual_ml: '',
    catatan_teknis: '',
    catatan: '',
    stok: '0',
    satuan: 'kg',
    tipe_spray: 'Biasa',
  });

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const isBahan = type === 'bahan';
  const isBibit = form.kategori === 'Bibit';
  const isPackaging = type === 'botol' || type === 'tutup' || type === 'spray';

  const typeLabel = {
    botol: 'Botol',
    tutup: 'Tutup',
    spray: 'Spray',
    bahan: 'Bahan Cair',
  }[type] || 'Item';

  const mutation = useMutation({
    mutationFn: async () => {
      const hargaRupiah = form.harga_rupiah ? parseFloat(form.harga_rupiah) : 0;
      const hargaDollar = form.harga_dollar ? parseFloat(form.harga_dollar) : undefined;

      if (type === 'botol') {
        return base44.entities.Botol.create({
          nama: form.nama,
          harga_rupiah: hargaRupiah,
          harga_dollar: hargaDollar,
          ukuran_label_ml: parseFloat(form.ukuran_label_ml) || 30,
          ukuran_aktual_ml: form.ukuran_aktual_ml ? parseFloat(form.ukuran_aktual_ml) : undefined,
          catatan_teknis: form.catatan_teknis || undefined,
          vendor: form.vendor || undefined,
          stok: 0,
        });
      } else if (type === 'tutup') {
        return base44.entities.Tutup.create({
          nama: form.nama,
          harga_rupiah: hargaRupiah,
          harga_dollar: hargaDollar,
          catatan: form.catatan || undefined,
          vendor: form.vendor || undefined,
          stok: 0,
        });
      } else if (type === 'spray') {
        return base44.entities.Spray.create({
          nama: form.nama,
          harga_rupiah: hargaRupiah,
          harga_dollar: hargaDollar,
          tipe: form.tipe_spray,
          vendor: form.vendor || undefined,
          stok: 0,
        });
      } else if (type === 'bahan') {
        return base44.entities.BahanCair.create({
          nama: form.nama,
          kategori: form.kategori,
          vendor: form.vendor || undefined,
          harga_rupiah: hargaRupiah,
          harga_dollar: hargaDollar,
          satuan: form.satuan,
          stok: 0,
        });
      }
    },
    onSuccess: (data) => {
      // Invalidate semua query terkait
      queryClient.invalidateQueries({ queryKey: ['botol'] });
      queryClient.invalidateQueries({ queryKey: ['tutup'] });
      queryClient.invalidateQueries({ queryKey: ['spray'] });
      queryClient.invalidateQueries({ queryKey: ['bahan-cair'] });
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
      onCreated(data);
    },
  });

  const handleSubmit = () => {
    if (!form.nama.trim()) return;
    if (isBahan && isBibit && !form.vendor.trim()) return;
    mutation.mutate();
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-border">
          <div>
            <h3 className="font-semibold text-base flex items-center gap-2">
              <Plus className="w-4 h-4 text-accent" />
              Tambah {typeLabel} Baru
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
              <ShoppingCart className="w-3 h-3" />
              Item akan masuk ke Stok &amp; Inventori (harga bisa diisi nanti)
            </p>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}><X className="w-4 h-4" /></Button>
        </div>

        <div className="p-5 space-y-4">
          {/* Kategori (hanya untuk bahan) */}
          {isBahan && (
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Kategori *</label>
              <div className="flex flex-wrap gap-2">
                {KATEGORI_BAHAN.map(k => (
                  <button
                    key={k} type="button"
                    onClick={() => set('kategori', k)}
                    className={`px-3 py-1.5 rounded-lg border text-xs font-medium transition-all ${form.kategori === k ? 'bg-accent text-accent-foreground border-accent' : 'border-border text-muted-foreground hover:border-accent/50'}`}
                  >{k}</button>
                ))}
              </div>
            </div>
          )}

          {/* Vendor (wajib untuk bibit) */}
          {isBahan && (
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">
                Vendor / Supplier {isBibit && <span className="text-destructive">*</span>}
              </label>
              <Input
                value={form.vendor}
                onChange={e => set('vendor', e.target.value)}
                placeholder={isBibit ? 'Contoh: LUZI, Iberchem, Superfine...' : 'Opsional'}
                required={isBibit}
              />
              {isBibit && <p className="text-xs text-muted-foreground mt-1">Vendor wajib diisi untuk bibit karena aroma berbeda antar vendor</p>}
            </div>
          )}

          {/* Vendor untuk packaging */}
          {isPackaging && (
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">
                Vendor / Supplier <span className="font-normal">(opsional)</span>
              </label>
              <Input
                value={form.vendor}
                onChange={e => set('vendor', e.target.value)}
                placeholder="Nama vendor / supplier packaging"
              />
            </div>
          )}

          {/* Nama */}
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">
              Nama {typeLabel} *
            </label>
            <Input
              value={form.nama}
              onChange={e => set('nama', e.target.value)}
              placeholder={
                type === 'botol' ? 'Contoh: Botol Kaca Slim 30ml' :
                type === 'tutup' ? 'Contoh: Tutup Gold Magnetic' :
                type === 'spray' ? 'Contoh: Spray Aluminium' :
                'Contoh: 9PM, Baccarat Rouge 540'
              }
              required
            />
          </div>

          {/* Tipe Spray */}
          {type === 'spray' && (
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Tipe Spray *</label>
              <div className="flex gap-2">
                {SPRAY_TYPES.map(t => (
                  <button key={t} type="button" onClick={() => set('tipe_spray', t)}
                    className={`flex-1 py-2 rounded-xl border text-sm font-medium transition-all ${form.tipe_spray === t ? 'bg-accent text-accent-foreground border-accent' : 'border-border text-muted-foreground hover:border-accent/50'}`}
                  >{t}</button>
                ))}
              </div>
            </div>
          )}

          {/* Ukuran botol */}
          {type === 'botol' && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Ukuran Label (ml) *</label>
                <Input type="number" value={form.ukuran_label_ml} onChange={e => set('ukuran_label_ml', e.target.value)} placeholder="30" required />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Ukuran Aktual (ml)</label>
                <Input type="number" value={form.ukuran_aktual_ml} onChange={e => set('ukuran_aktual_ml', e.target.value)} placeholder="Opsional" />
              </div>
            </div>
          )}

          {/* Catatan Teknis botol */}
          {type === 'botol' && (
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Catatan Teknis</label>
              <Input value={form.catatan_teknis} onChange={e => set('catatan_teknis', e.target.value)} placeholder="Opsional" />
            </div>
          )}

          {/* Satuan bahan */}
          {isBahan && (
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Satuan *</label>
              <div className="flex gap-2">
                {SATUAN_BAHAN.map(s => (
                  <button key={s} type="button" onClick={() => set('satuan', s)}
                    className={`flex-1 py-2 rounded-lg border text-xs font-medium transition-all ${form.satuan === s ? 'bg-accent text-accent-foreground border-accent' : 'border-border text-muted-foreground hover:border-accent/50'}`}
                  >{s}</button>
                ))}
              </div>
            </div>
          )}

          {/* Harga — opsional */}
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">
              Harga Rupiah (Rp) <span className="text-muted-foreground font-normal">(bisa diisi nanti)</span>
            </label>
            <Input
              type="number"
              value={form.harga_rupiah}
              onChange={e => set('harga_rupiah', e.target.value)}
              placeholder="0 (kosongkan jika belum tahu)"
            />
          </div>

          {/* Catatan tutup */}
          {type === 'tutup' && (
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Catatan</label>
              <Input value={form.catatan} onChange={e => set('catatan', e.target.value)} placeholder="Opsional" />
            </div>
          )}

          {/* Info banner */}
          <div className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-2.5 text-xs text-amber-700">
            💡 Item ini akan langsung muncul di <strong>Stok &amp; Inventori</strong> dengan stok 0. Tim yang bertugas bisa melengkapi harga dan stok setelah barang diterima.
          </div>

          <div className="flex gap-2 pt-1">
            <Button type="button" variant="outline" onClick={onClose} className="flex-1">Batal</Button>
            <Button
              type="button"
              onClick={handleSubmit}
              disabled={mutation.isPending || !form.nama.trim() || (isBahan && isBibit && !form.vendor.trim())}
              className="flex-1 bg-accent hover:bg-accent/90 text-accent-foreground"
            >
              {mutation.isPending ? 'Menyimpan...' : 'Tambah & Pilih'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}