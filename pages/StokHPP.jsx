import React, { useState, useMemo, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { smartDisplayQty } from '@/lib/unitConverter';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Plus, Search, Edit2, Trash2, Droplets, Package2, AlertTriangle, DollarSign, Box, Tag, ArrowUpDown, ChevronDown, ChevronRight, FileText } from 'lucide-react';
import KursBar from '@/components/hpp/KursBar';
import { useKurs } from '@/hooks/useKurs';
import PackagingForm from '@/components/stok/PackagingForm';
import StokBahanForm from '@/components/stok/StokBahanForm';
import ItemTambahanForm from '@/components/stok/ItemTambahanForm';
import LastUpdated from '@/components/ui/LastUpdated';
import { useNavigate } from 'react-router-dom';
import { useSession } from '@/lib/SessionContext';
import { getPageAccess } from '@/lib/AuthSession';

const fmt = (n) => n != null ? new Intl.NumberFormat('id-ID').format(Math.round(n)) : '—';

const TABS = [
  { key: 'packaging', label: 'Packaging', icon: Package2, desc: 'Botol, tutup & spray' },
  { key: 'bahan', label: 'Bahan Cair', icon: Droplets, desc: 'Bibit, alkohol & pelarut' },
  { key: 'item-tambahan', label: 'Item Tambahan', icon: Tag, desc: 'Stiker, dus, gift card & lainnya' },
];

const PACKAGING_TYPE_BADGE = {
  botol: { label: 'Botol', cls: 'bg-blue-100 text-blue-700' },
  tutup: { label: 'Tutup', cls: 'bg-purple-100 text-purple-700' },
  spray: { label: 'Spray', cls: 'bg-green-100 text-green-700' },
};

const ITEM_KATEGORI_BADGE = {
  Stiker: { cls: 'bg-pink-100 text-pink-700' },
  Dus: { cls: 'bg-amber-100 text-amber-700' },
  'Gift Card': { cls: 'bg-emerald-100 text-emerald-700' },
  Lainnya: { cls: 'bg-slate-100 text-slate-700' },
};

const ITEM_TAMBAHAN_KATEGORI = ['Stiker', 'Dus', 'Gift Card', 'Lainnya'];
const BAHAN_KATEGORI = ['Bibit', 'Alkohol', 'Aqua Des', 'DPG', 'Peg', 'Sustain', 'Lainnya'];

const SORT_OPTIONS = [
  { key: 'terbaru', label: 'Terbaru' },
  { key: 'terlama', label: 'Terlama' },
  { key: 'termahal', label: 'Termahal' },
  { key: 'termurah', label: 'Termurah' },
  { key: 'abjad_az', label: 'A → Z' },
  { key: 'abjad_za', label: 'Z → A' },
  { key: 'stok_terbanyak', label: 'Stok Terbanyak' },
  { key: 'stok_tersedikit', label: 'Stok Tersedikit' },
];

// Sort helper
function applySort(list, sortKey, priceField = 'harga_rupiah') {
  const arr = [...list];
  switch (sortKey) {
    case 'terbaru': return arr.sort((a, b) => new Date(b.created_date || 0) - new Date(a.created_date || 0));
    case 'terlama': return arr.sort((a, b) => new Date(a.created_date || 0) - new Date(b.created_date || 0));
    case 'termahal': return arr.sort((a, b) => (b[priceField] || 0) - (a[priceField] || 0));
    case 'termurah': return arr.sort((a, b) => (a[priceField] || 0) - (b[priceField] || 0));
    case 'abjad_az': return arr.sort((a, b) => (a.nama || '').localeCompare(b.nama || '', 'id'));
    case 'abjad_za': return arr.sort((a, b) => (b.nama || '').localeCompare(a.nama || '', 'id'));
    case 'stok_terbanyak': return arr.sort((a, b) => (b.stok || b.total_stock || 0) - (a.stok || a.total_stock || 0));
    case 'stok_tersedikit': return arr.sort((a, b) => (a.stok || a.total_stock || 0) - (b.stok || b.total_stock || 0));
    default: return arr;
  }
}

function SortDropdown({ value, onChange }) {
  const [open, setOpen] = useState(false);
  const current = SORT_OPTIONS.find(s => s.key === value);
  return (
    <div className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border bg-background text-xs font-medium text-muted-foreground hover:border-accent/60 transition-all"
      >
        <ArrowUpDown className="w-3.5 h-3.5" />
        {current?.label || 'Urutkan'}
        <ChevronDown className="w-3 h-3" />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full mt-1 z-20 bg-card border border-border rounded-xl shadow-lg py-1 min-w-[150px]">
            {SORT_OPTIONS.map(opt => (
              <button
                key={opt.key}
                onClick={() => { onChange(opt.key); setOpen(false); }}
                className={`w-full text-left px-3 py-2 text-sm hover:bg-muted/60 transition-colors ${value === opt.key ? 'text-accent font-semibold' : 'text-foreground'}`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

export default function StokHPP() {
  const queryClient = useQueryClient();
  const { kurs } = useKurs();
  const navigate = useNavigate();

  // Baca tab dari URL query param (dari notifikasi)
  const urlTab = new URLSearchParams(window.location.search).get('tab');
  const [activeTab, setActiveTab] = useState(urlTab || 'packaging');
  
  const { member } = useSession();
  const canEdit = getPageAccess(member, "stok_inventori") === "edit";

  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [editTipe, setEditTipe] = useState('botol');
  const [packFilter, setPackFilter] = useState('semua');
  const [bahanFilter, setBahanFilter] = useState('semua');
  const [itemFilter, setItemFilter] = useState('semua');
  const [itemBrandFilter, setItemBrandFilter] = useState('semua');
  const [packSort, setPackSort] = useState('terbaru');
  const [bahanSort, setBahanSort] = useState('terbaru');
  const [itemSort, setItemSort] = useState('terbaru');

  const { data: botolList = [] } = useQuery({ queryKey: ['botol'], queryFn: () => base44.entities.Botol.list() });
  const { data: tutupList = [] } = useQuery({ queryKey: ['tutup'], queryFn: () => base44.entities.Tutup.list() });
  const { data: sprayList = [] } = useQuery({ queryKey: ['spray'], queryFn: () => base44.entities.Spray.list() });
  const { data: bahanList = [] } = useQuery({ queryKey: ['bahan-cair'], queryFn: () => base44.entities.BahanCair.list() });
  const { data: itemTambahanList = [] } = useQuery({ queryKey: ['item-tambahan'], queryFn: () => base44.entities.ItemTambahan.list() });

  const delBotol = useMutation({ mutationFn: id => base44.entities.Botol.delete(id), onSuccess: () => queryClient.invalidateQueries({ queryKey: ['botol'] }) });
  const delTutup = useMutation({ mutationFn: id => base44.entities.Tutup.delete(id), onSuccess: () => queryClient.invalidateQueries({ queryKey: ['tutup'] }) });
  const delSpray = useMutation({ mutationFn: id => base44.entities.Spray.delete(id), onSuccess: () => queryClient.invalidateQueries({ queryKey: ['spray'] }) });
  const delBahan = useMutation({ mutationFn: id => base44.entities.BahanCair.delete(id), onSuccess: () => queryClient.invalidateQueries({ queryKey: ['bahan-cair'] }) });
  const delItem = useMutation({ mutationFn: id => base44.entities.ItemTambahan.delete(id), onSuccess: () => queryClient.invalidateQueries({ queryKey: ['item-tambahan'] }) });

  const handleSaved = () => {
    setShowForm(false);
    setEditItem(null);
    ['botol', 'tutup', 'spray', 'bahan-cair', 'item-tambahan'].forEach(k =>
      queryClient.invalidateQueries({ queryKey: [k] })
    );
  };

  const packagingAll = [
    ...botolList.map(i => ({ ...i, _tipe: 'botol' })),
    ...tutupList.map(i => ({ ...i, _tipe: 'tutup' })),
    ...sprayList.map(i => ({ ...i, _tipe: 'spray' })),
  ];

  // Brand list untuk item tambahan
  const itemBrands = useMemo(() => {
    const set = new Set(itemTambahanList.map(i => i.brand).filter(Boolean));
    return Array.from(set).sort();
  }, [itemTambahanList]);

  const q = search.toLowerCase();

  const packagingFiltered = useMemo(() => {
    const filtered = packagingAll
      .filter(i => packFilter === 'semua' || i._tipe === packFilter)
      .filter(i => i.nama?.toLowerCase().includes(q));
    return applySort(filtered, packSort);
  }, [packagingAll, packFilter, q, packSort]);

  const bahanFiltered = useMemo(() => {
    const filtered = bahanList
      .filter(i => bahanFilter === 'semua' || i.kategori === bahanFilter)
      .filter(i => i.nama?.toLowerCase().includes(q) || i.vendor?.toLowerCase().includes(q));
    return applySort(filtered, bahanSort);
  }, [bahanList, bahanFilter, q, bahanSort]);

  const itemFiltered = useMemo(() => {
    const filtered = itemTambahanList
      .filter(i => itemFilter === 'semua' || i.kategori === itemFilter)
      .filter(i => itemBrandFilter === 'semua' || i.brand === itemBrandFilter)
      .filter(i => i.nama?.toLowerCase().includes(q) || i.brand?.toLowerCase().includes(q) || i.vendor?.toLowerCase().includes(q));
    return applySort(filtered, itemSort);
  }, [itemTambahanList, itemFilter, itemBrandFilter, q, itemSort]);

  const lowPackaging = packagingAll.filter(i => i.stok != null && i.stok < 10);
  const lowBahan = bahanList.filter(i => i.stok != null && i.stok < 0.5);
  const lowItem = itemTambahanList.filter(i => i.stok != null && i.stok < 10);
  const lowAll = [...lowPackaging, ...lowBahan, ...lowItem];

  const handleDelete = (item) => {
    if (!confirm(`Hapus ${item.nama}?`)) return;
    if (item._tipe === 'botol') delBotol.mutate(item.id);
    else if (item._tipe === 'tutup') delTutup.mutate(item.id);
    else if (item._tipe === 'spray') delSpray.mutate(item.id);
    else if (item._isItemTambahan) delItem.mutate(item.id);
    else delBahan.mutate(item.id);
  };

  const handleEdit = (item, tipe) => {
    const { _tipe, _isItemTambahan, ...cleanItem } = item;
    setEditItem(cleanItem);
    setEditTipe(tipe);
    setShowForm(true);
  };

  const handleDetail = (item, tipe) => {
    // Navigate ke halaman detail
    navigate(`/stok-detail?id=${item.id}&tipe=${tipe}`);
  };

  const handleAdd = () => {
    setEditItem(null);
    if (activeTab === 'bahan') setEditTipe('bahan');
    else if (activeTab === 'item-tambahan') setEditTipe('item-tambahan');
    else setEditTipe(packFilter !== 'semua' ? packFilter : 'botol');
    setShowForm(true);
  };

  const totalCount =
    activeTab === 'packaging' ? packagingAll.length :
    activeTab === 'item-tambahan' ? itemTambahanList.length :
    bahanList.length;

  const currentSort = activeTab === 'packaging' ? packSort : activeTab === 'bahan' ? bahanSort : itemSort;
  const setCurrentSort = activeTab === 'packaging' ? setPackSort : activeTab === 'bahan' ? setBahanSort : setItemSort;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-display font-bold text-foreground">Stok & Inventori</h1>
          <p className="text-muted-foreground text-sm mt-1">Kelola semua komponen produksi — {totalCount} item</p>
        </div>
        <KursBar />
      </div>

      {/* Hint */}
      <p className="text-xs text-muted-foreground -mt-2">Klik card untuk melihat detail & brand yang memakai item.</p>

      {/* Low stock warning */}
      {lowAll.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4">
          <div className="flex items-center gap-2 text-red-700 font-semibold text-sm mb-2">
            <AlertTriangle className="w-4 h-4" />
            {lowAll.length} item stok menipis!
          </div>
          <div className="flex flex-wrap gap-2">
            {lowAll.map(i => {
              const { display, unit: du } = smartDisplayQty(i.stok, i.satuan || 'pcs');
              const tipe = i._tipe || (i._isItemTambahan ? null : 'bahan');
              return (
                <button
                  key={i.id + (i._tipe || '')}
                  onClick={tipe ? () => handleDetail(i, tipe) : undefined}
                  className={`bg-red-100 text-red-700 text-xs px-2.5 py-1 rounded-full font-medium ${tipe ? 'hover:bg-red-200 cursor-pointer' : ''}`}
                >
                  {i.nama} — {display} {du}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-2 flex-wrap">
        {TABS.map(tab => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.key}
              onClick={() => { setActiveTab(tab.key); setSearch(''); }}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-medium transition-all ${activeTab === tab.key ? 'bg-primary text-primary-foreground shadow-sm' : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'}`}
            >
              <Icon className="w-3.5 h-3.5" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Sub-filter packaging */}
      {activeTab === 'packaging' && (
        <div className="flex gap-2 flex-wrap">
          {['semua', 'botol', 'tutup', 'spray'].map(f => (
            <button key={f} onClick={() => setPackFilter(f)}
              className={`px-3 py-1 rounded-lg border text-xs font-medium transition-all capitalize ${packFilter === f ? 'bg-accent text-accent-foreground border-accent' : 'border-border text-muted-foreground hover:border-accent/50'}`}
            >
              {f === 'semua' ? `Semua (${packagingAll.length})` : `${f.charAt(0).toUpperCase() + f.slice(1)} (${packagingAll.filter(i => i._tipe === f).length})`}
            </button>
          ))}
        </div>
      )}

      {/* Sub-filter bahan cair */}
      {activeTab === 'bahan' && (
        <div className="flex gap-2 flex-wrap">
          <button onClick={() => setBahanFilter('semua')}
            className={`px-3 py-1 rounded-lg border text-xs font-medium transition-all ${bahanFilter === 'semua' ? 'bg-accent text-accent-foreground border-accent' : 'border-border text-muted-foreground hover:border-accent/50'}`}
          >
            Semua ({bahanList.length})
          </button>
          {BAHAN_KATEGORI.map(k => (
            <button key={k} onClick={() => setBahanFilter(k)}
              className={`px-3 py-1 rounded-lg border text-xs font-medium transition-all ${bahanFilter === k ? 'bg-accent text-accent-foreground border-accent' : 'border-border text-muted-foreground hover:border-accent/50'}`}
            >
              {k} ({bahanList.filter(i => i.kategori === k).length})
            </button>
          ))}
        </div>
      )}

      {/* Sub-filter item tambahan — kategori + brand */}
      {activeTab === 'item-tambahan' && (
        <div className="space-y-2">
          <div className="flex gap-2 flex-wrap">
            <button onClick={() => setItemFilter('semua')}
              className={`px-3 py-1 rounded-lg border text-xs font-medium transition-all ${itemFilter === 'semua' ? 'bg-accent text-accent-foreground border-accent' : 'border-border text-muted-foreground hover:border-accent/50'}`}
            >
              Semua Kategori ({itemTambahanList.length})
            </button>
            {ITEM_TAMBAHAN_KATEGORI.map(k => (
              <button key={k} onClick={() => setItemFilter(k)}
                className={`px-3 py-1 rounded-lg border text-xs font-medium transition-all ${itemFilter === k ? 'bg-accent text-accent-foreground border-accent' : 'border-border text-muted-foreground hover:border-accent/50'}`}
              >
                {k} ({itemTambahanList.filter(i => i.kategori === k).length})
              </button>
            ))}
          </div>
          {itemBrands.length > 0 && (
            <div className="flex gap-2 flex-wrap items-center">
              <span className="text-xs text-muted-foreground font-medium">Brand:</span>
              <button onClick={() => setItemBrandFilter('semua')}
                className={`px-3 py-1 rounded-lg border text-xs font-medium transition-all ${itemBrandFilter === 'semua' ? 'bg-primary/10 text-primary border-primary/30' : 'border-border text-muted-foreground hover:border-primary/30'}`}
              >
                Semua
              </button>
              {itemBrands.map(b => (
                <button key={b} onClick={() => setItemBrandFilter(b)}
                  className={`px-3 py-1 rounded-lg border text-xs font-medium transition-all ${itemBrandFilter === b ? 'bg-primary/10 text-primary border-primary/30' : 'border-border text-muted-foreground hover:border-primary/30'}`}
                >
                  {b}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Search + Sort + Add */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder={
              activeTab === 'packaging' ? 'Cari packaging...' :
              activeTab === 'item-tambahan' ? 'Cari nama, brand, vendor...' :
              'Cari bahan atau vendor...'
            }
            className="pl-9"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <SortDropdown value={currentSort} onChange={setCurrentSort} />
        {canEdit && (
          <Button onClick={handleAdd} className="gap-2 shrink-0">
            <Plus className="w-4 h-4" /> Tambah
          </Button>
        )}
      </div>

      {/* List */}
      <div className="grid gap-2">
        {(activeTab === 'packaging' ? packagingFiltered :
          activeTab === 'item-tambahan' ? itemFiltered.map(i => ({ ...i, _isItemTambahan: true })) :
          bahanFiltered
        ).length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            <Box className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p>Belum ada data. Klik Tambah untuk memulai.</p>
          </div>
        ) : (
          (activeTab === 'packaging' ? packagingFiltered :
            activeTab === 'item-tambahan' ? itemFiltered.map(i => ({ ...i, _isItemTambahan: true })) :
            bahanFiltered
          ).map(item => (
            <Card
              key={item.id + (item._tipe || '') + (item._isItemTambahan ? '-it' : '')}
              className="cursor-pointer hover:border-primary/40 hover:shadow-sm transition-all"
              onClick={() => handleDetail(item, item._isItemTambahan ? 'item-tambahan' : (item._tipe || 'bahan'))}
            >
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <div className="flex-1 min-w-0">
                    {/* Packaging item */}
                    {item._tipe && (() => {
                      const badge = PACKAGING_TYPE_BADGE[item._tipe];
                      return (
                        <>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-semibold text-sm">{item.nama}</span>
                            <Badge className={`text-xs ${badge.cls}`}>{badge.label}</Badge>
                            {item._tipe === 'botol' && item.ukuran_label_ml && (
                              <Badge variant="outline" className="text-xs">{item.ukuran_label_ml}ml</Badge>
                            )}
                            {item._tipe === 'botol' && item.ukuran_aktual_ml && item.ukuran_aktual_ml !== item.ukuran_label_ml && (
                              <Badge className="text-xs bg-amber-100 text-amber-700 border-amber-200">Aktual: {item.ukuran_aktual_ml}ml</Badge>
                            )}
                            {item._tipe === 'spray' && (
                              <Badge className={`text-xs ${item.tipe === 'Continuous' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'}`}>{item.tipe}</Badge>
                            )}
                          </div>
                          {item.catatan_teknis && <p className="text-xs text-amber-600 mt-0.5 italic flex items-center gap-1"><FileText className="w-3 h-3 shrink-0" />{item.catatan_teknis}</p>}
                          {item.catatan && <p className="text-xs text-muted-foreground mt-0.5 italic">{item.catatan}</p>}
                          <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground flex-wrap">
                            {item.harga_dollar
                              ? <span className="flex items-center gap-1"><DollarSign className="w-3 h-3" />${item.harga_dollar} <span className="opacity-60">≈</span> Rp {fmt(item.harga_dollar * kurs)}</span>
                              : <span className="flex items-center gap-1"><DollarSign className="w-3 h-3" />Rp {fmt(item.harga_rupiah)}</span>
                            }
                            <span className={`font-medium ${item.stok != null && item.stok < 10 ? 'text-red-600' : 'text-foreground'}`}>
                              Stok: {item.stok ?? '—'} pcs
                            </span>
                          </div>
                          <div className="mt-1"><LastUpdated date={item.updated_date || item.created_date} /></div>
                        </>
                      );
                    })()}

                    {/* Item Tambahan */}
                    {item._isItemTambahan && (() => {
                      const badge = ITEM_KATEGORI_BADGE[item.kategori] || ITEM_KATEGORI_BADGE['Lainnya'];
                      return (
                        <>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-semibold text-sm">{item.nama}</span>
                            <Badge className={`text-xs ${badge.cls}`}>{item.kategori}</Badge>
                            {item.brand && <Badge className="text-xs bg-primary/10 text-primary border-primary/20">{item.brand}</Badge>}
                            {item.vendor && <Badge className="text-xs bg-purple-100 text-purple-700">{item.vendor}</Badge>}
                          </div>
                          {item.catatan && <p className="text-xs text-muted-foreground mt-0.5 italic">{item.catatan}</p>}
                          <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground flex-wrap">
                            <span>Rp {fmt(item.harga_rupiah)}/pcs</span>
                            <span className={`font-medium ${item.stok != null && item.stok < 10 ? 'text-red-600' : 'text-foreground'}`}>
                              Stok: {item.stok ?? '—'} pcs
                            </span>
                          </div>
                          <div className="mt-1"><LastUpdated date={item.updated_date || item.created_date} /></div>
                        </>
                      );
                    })()}

                    {/* Bahan cair item */}
                    {!item._tipe && !item._isItemTambahan && (
                      <>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-sm">{item.nama}</span>
                          <Badge variant="outline" className="text-xs">{item.kategori}</Badge>
                          {item.vendor && <Badge className="text-xs bg-purple-100 text-purple-700">{item.vendor}</Badge>}
                          {item.grade && <Badge className="text-xs bg-amber-100 text-amber-700 border border-amber-200">{item.grade}</Badge>}
                        </div>
                        <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground flex-wrap">
                          {item.harga_dollar
                            ? <span>${item.harga_dollar}/{item.satuan} <span className="opacity-60">≈</span> Rp {fmt(item.harga_dollar * kurs)}/{item.satuan}</span>
                            : <span>Rp {fmt(item.harga_rupiah)}/{item.satuan}</span>
                          }
                          <span className={`font-medium ${item.stok != null && item.stok < 0.5 ? 'text-red-600' : 'text-foreground'}`}>
                            {(() => {
                              const { display, unit: du } = smartDisplayQty(item.stok, item.satuan);
                              return `Stok: ${display} ${du}`;
                            })()}
                          </span>
                        </div>
                        <div className="mt-1"><LastUpdated date={item.updated_date || item.created_date} /></div>
                      </>
                    )}
                  </div>

                  {/* Actions */}
                  {canEdit && (
                    <div className="flex gap-1 shrink-0 items-center">
                      <Button variant="ghost" size="icon" className="w-8 h-8"
                        onClick={(e) => { e.stopPropagation(); handleEdit(item, item._isItemTambahan ? 'item-tambahan' : (item._tipe || 'bahan')); }}>
                        <Edit2 className="w-3.5 h-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="w-8 h-8 text-destructive/60 hover:text-destructive"
                        onClick={(e) => { e.stopPropagation(); handleDelete(item); }}>
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                      <ChevronRight className="w-4 h-4 text-muted-foreground/50" />
                    </div>
                  )}
                  {!canEdit && (
                    <div className="flex gap-1 shrink-0 items-center">
                       <ChevronRight className="w-4 h-4 text-muted-foreground/50" />
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Forms */}
      {showForm && activeTab === 'packaging' && (
        <PackagingForm
          item={editItem}
          tipeAwal={editTipe}
          kurs={kurs}
          onClose={() => { setShowForm(false); setEditItem(null); }}
          onSaved={handleSaved}
        />
      )}
      {showForm && activeTab === 'bahan' && (
        <StokBahanForm
          item={editItem}
          kurs={kurs}
          onClose={() => { setShowForm(false); setEditItem(null); }}
          onSaved={handleSaved}
        />
      )}
      {showForm && activeTab === 'item-tambahan' && (
        <ItemTambahanForm
          item={editItem}
          onClose={() => { setShowForm(false); setEditItem(null); }}
          onSaved={handleSaved}
        />
      )}
    </div>
  );
}