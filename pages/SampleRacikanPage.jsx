import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Plus, Search, Edit2, Trash2, FlaskConical, BookOpen,
  ChevronRight, ChevronDown, CheckCircle2, RotateCcw, XCircle, Clock,
  ArrowUpDown, ChevronDown as ChevronDownSort, Package, AlertTriangle, Database,
  UserCircle2
} from 'lucide-react';
import { needsLiterConversion, formatGramMl } from '@/lib/unitConverter';
import SampleForm from '@/components/sample/SampleForm';
import RacikanForm from '@/components/sample/RacikanForm';
import DatabaseBahanForm from '@/components/sample/DatabaseBahanForm';
import LastUpdated from '@/components/ui/LastUpdated';
import { useSession } from '@/lib/SessionContext';
import { getPageAccess } from '@/lib/AuthSession';

// ── Helpers ────────────────────────────────────────────────────────────────

const STATUS_CONFIG = {
  pending:  { label: 'Pending',  cls: 'bg-amber-100 text-amber-700',   icon: Clock },
  acc:      { label: 'ACC ✓',    cls: 'bg-green-100 text-green-700',   icon: CheckCircle2 },
  revisi:   { label: 'Revisi',   cls: 'bg-blue-100 text-blue-700',     icon: RotateCcw },
  ditolak:  { label: 'Ditolak',  cls: 'bg-red-100 text-red-700',       icon: XCircle },
};

const KATEGORI_SAMPLE_BADGE = {
  SPL:         'bg-purple-100 text-purple-700',
  'Tes Aroma': 'bg-pink-100 text-pink-700',
  Lainnya:     'bg-slate-100 text-slate-700',
};

const SORT_OPTIONS = [
  { key: 'terbaru', label: 'Terbaru' },
  { key: 'terlama', label: 'Terlama' },
  { key: 'az', label: 'A → Z (Brand)' },
  { key: 'za', label: 'Z → A (Brand)' },
];

function applySort(list, sortKey) {
  const arr = [...list];
  switch (sortKey) {
    case 'terbaru': return arr.sort((a, b) => new Date(b.created_date || 0) - new Date(a.created_date || 0));
    case 'terlama': return arr.sort((a, b) => new Date(a.created_date || 0) - new Date(b.created_date || 0));
    case 'az': return arr.sort((a, b) => (a.nama_brand || '').localeCompare(b.nama_brand || '', 'id'));
    case 'za': return arr.sort((a, b) => (b.nama_brand || '').localeCompare(a.nama_brand || '', 'id'));
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
        className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-border bg-background text-xs font-medium text-muted-foreground hover:border-accent/60 transition-all"
      >
        <ArrowUpDown className="w-3.5 h-3.5" />
        {current?.label || 'Urutkan'}
        <ChevronDownSort className="w-3 h-3" />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full mt-1 z-20 bg-card border border-border rounded-xl shadow-lg py-1 min-w-[160px]">
            {SORT_OPTIONS.map(opt => (
              <button key={opt.key} onClick={() => { onChange(opt.key); setOpen(false); }}
                className={`w-full text-left px-3 py-2 text-sm hover:bg-muted/60 transition-colors ${value === opt.key ? 'text-accent font-semibold' : 'text-foreground'}`}>
                {opt.label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// ── Sub: Sample ────────────────────────────────────────────────────────────

function SampleTab() {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('semua');
  const [sort, setSort] = useState('terbaru');
  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [expandedId, setExpandedId] = useState(null);
  const [accingId, setAccingId] = useState(null);
  const [dupNotif, setDupNotif] = useState(null); // { id, brand, varian }

  const { member } = useSession();
  const canEdit = getPageAccess(member, "sample_racikan") === "edit";

  const { data: sampleList = [], isLoading } = useQuery({
    queryKey: ['sample-racikan'],
    queryFn: () => base44.entities.SampleRacikan.list('-created_date'),
  });

  const { data: racikanDbList = [] } = useQuery({
    queryKey: ['racikan-database'],
    queryFn: () => base44.entities.RacikanDatabase.list(),
  });

  const delMut = useMutation({
    mutationFn: id => base44.entities.SampleRacikan.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['sample-racikan'] }),
  });

  const statusMut = useMutation({
    mutationFn: ({ id, status, catatan_review }) =>
      base44.entities.SampleRacikan.update(id, { status, catatan_review }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['sample-racikan'] }),
  });

  const createRacikanMut = useMutation({
    mutationFn: (data) => base44.entities.RacikanDatabase.create(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['racikan-database'] });
      setAccingId(null);
    },
  });

  const updateRacikanMut = useMutation({
    mutationFn: ({ id, data }) => base44.entities.RacikanDatabase.update(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['racikan-database'] });
      setAccingId(null);
      setDupNotif(null);
    },
  });

  // ACC logic: mark status=acc, then save/update racikan database
  const handleAcc = (item) => {
    const existing = racikanDbList.find(
      r => r.nama_brand?.toLowerCase() === item.nama_brand?.toLowerCase()
        && r.nama_varian?.toLowerCase() === item.nama_produk?.toLowerCase()
    );
    if (existing) {
      setDupNotif({ sampleId: item.id, existingId: existing.id, brand: item.nama_brand, varian: item.nama_produk, item });
    } else {
      doAcc(item, null);
    }
  };

  const doAcc = (item, existingId) => {
    setAccingId(item.id);
    statusMut.mutate({ id: item.id, status: 'acc', catatan_review: item.catatan_review || '' });
    const racikanPayload = {
      nama_brand: item.nama_brand,
      nama_varian: item.nama_produk,
      ukuran_ml: item.ukuran_ml,
      racikan: item.racikan || [],
      catatan: item.catatan || '',
      pic: item.pic || '',
      status: 'aktif',
    };
    if (existingId) {
      updateRacikanMut.mutate({ id: existingId, data: racikanPayload });
    } else {
      createRacikanMut.mutate(racikanPayload);
    }
  };

  const q = search.toLowerCase();
  const filtered = useMemo(() => {
    const base = sampleList
      .filter(s => statusFilter === 'semua' || s.status === statusFilter)
      .filter(s =>
        s.nama_brand?.toLowerCase().includes(q) ||
        s.nama_produk?.toLowerCase().includes(q)
      );
    return applySort(base, sort);
  }, [sampleList, statusFilter, q, sort]);

  const handleDelete = (item) => {
    if (!confirm(`Hapus sample ${item.nama_brand} - ${item.nama_produk} (${item.label})?`)) return;
    delMut.mutate(item.id);
  };

  return (
    <div className="space-y-4">
      {/* Dup confirmation banner */}
      {dupNotif && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
          <div className="flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-semibold text-amber-800">Data duplikat ditemukan!</p>
              <p className="text-xs text-amber-700 mt-0.5">
                Database Racikan sudah memiliki <strong>{dupNotif.brand} — {dupNotif.varian}</strong>.
                Apakah ingin menimpa data lama dengan racikan sample ini?
              </p>
              <div className="flex gap-2 mt-3">
                <Button size="sm" className="bg-amber-600 hover:bg-amber-700 text-white text-xs gap-1"
                  onClick={() => doAcc(dupNotif.item, dupNotif.existingId)}>
                  Ya, timpa data lama
                </Button>
                <Button size="sm" variant="outline" className="text-xs"
                  onClick={() => {
                    // Just ACC the status, don't update db
                    setAccingId(dupNotif.sampleId);
                    statusMut.mutate({ id: dupNotif.sampleId, status: 'acc', catatan_review: dupNotif.item.catatan_review || '' });
                    setDupNotif(null);
                  }}>
                  ACC saja, jangan timpa
                </Button>
                <Button size="sm" variant="ghost" className="text-xs text-muted-foreground" onClick={() => setDupNotif(null)}>
                  Batal
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Toolbar */}
      <div className="flex gap-2 flex-wrap items-center">
        <div className="relative flex-1 min-w-[180px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Cari brand atau produk..." className="pl-9" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <SortDropdown value={sort} onChange={setSort} />
        {canEdit && (
          <Button onClick={() => { setEditItem(null); setShowForm(true); }} className="gap-2 shrink-0">
            <Plus className="w-4 h-4" /> Tambah Sample
          </Button>
        )}
      </div>

      {/* Status filter */}
      <div className="flex gap-2 flex-wrap">
        {['semua', 'pending', 'acc', 'revisi', 'ditolak'].map(s => (
          <button key={s} onClick={() => setStatusFilter(s)}
            className={`px-3 py-1 rounded-lg border text-xs font-medium transition-all capitalize ${statusFilter === s ? 'bg-accent text-accent-foreground border-accent' : 'border-border text-muted-foreground hover:border-accent/50'}`}>
            {s === 'semua' ? `Semua (${sampleList.length})` : `${STATUS_CONFIG[s]?.label} (${sampleList.filter(i => i.status === s).length})`}
          </button>
        ))}
      </div>

      {/* List */}
      {isLoading ? (
        <div className="text-center py-10 text-muted-foreground text-sm">Memuat...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <FlaskConical className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p>Belum ada sample. Klik Tambah Sample untuk memulai.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(item => {
            const statusCfg = STATUS_CONFIG[item.status] || STATUS_CONFIG.pending;
            const isExpanded = expandedId === item.id;
            const totalPersen = (item.racikan || []).reduce((s, r) => s + (r.persentase || 0), 0);
            const isAccing = accingId === item.id;

            return (
              <Card key={item.id} className="overflow-hidden">
                <CardContent className="p-0">
                  {/* Header baris */}
                  <div className="flex items-center gap-3 p-4">
                    {/* Label badge */}
                    <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center text-primary font-bold text-base shrink-0">
                      {item.label || '?'}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-sm">{item.nama_brand}</span>
                        <span className="text-muted-foreground text-sm">·</span>
                        <span className="text-sm text-muted-foreground">{item.nama_produk}</span>
                        <Badge variant="outline" className="text-xs">{item.ukuran_ml}ml</Badge>
                        <Badge className={`text-xs ${KATEGORI_SAMPLE_BADGE[item.kategori] || ''}`}>{item.kategori}</Badge>
                        <Badge className={`text-xs ${statusCfg.cls}`}>{statusCfg.label}</Badge>
                      </div>
                      <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                        <p className="text-xs text-muted-foreground">
                          {item.racikan?.length || 0} bahan · {totalPersen.toFixed(1)}%
                          {item.catatan && ` · ${item.catatan}`}
                        </p>
                        {item.pic && (
                          <span className="inline-flex items-center gap-1 text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full font-medium">
                            <UserCircle2 className="w-3 h-3" />{item.pic}
                          </span>
                        )}
                        <LastUpdated date={item.updated_date || item.created_date} />
                      </div>
                    </div>

                    <div className="flex gap-1 shrink-0 items-center">
                      {/* ACC button per card */}
                      {item.status !== 'acc' && canEdit && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-xs gap-1 text-green-700 border-green-300 hover:bg-green-50 hover:border-green-500"
                          disabled={isAccing}
                          onClick={() => handleAcc(item)}
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          {isAccing ? '...' : 'ACC'}
                        </Button>
                      )}
                      <Button variant="ghost" size="icon" className="w-8 h-8"
                        onClick={() => setExpandedId(isExpanded ? null : item.id)}>
                        {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                      </Button>
                      {canEdit && (
                        <>
                          <Button variant="ghost" size="icon" className="w-8 h-8"
                            onClick={() => { setEditItem(item); setShowForm(true); }}>
                            <Edit2 className="w-3.5 h-3.5" />
                          </Button>
                          <Button variant="ghost" size="icon" className="w-8 h-8 text-destructive/60 hover:text-destructive"
                            onClick={() => handleDelete(item)}>
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Expanded detail */}
                  {isExpanded && (
                    <div className="border-t border-border bg-muted/20 p-4 space-y-4">
                      {item.catatan_review && (
                        <div className="bg-blue-50 border border-blue-200 rounded-lg px-3 py-2 text-xs text-blue-700">
                          Catatan Review: {item.catatan_review}
                        </div>
                      )}
                      {item.racikan?.length > 0 ? (
                        <div>
                          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Komposisi Racikan</p>
                          <div className="rounded-xl border border-border overflow-hidden">
                            <table className="w-full text-sm">
                              <thead className="bg-muted/50">
                                <tr>
                                  <th className="text-left px-3 py-2 text-xs font-semibold text-muted-foreground">Kategori</th>
                                  <th className="text-left px-3 py-2 text-xs font-semibold text-muted-foreground">Vendor</th>
                                  <th className="text-left px-3 py-2 text-xs font-semibold text-muted-foreground">Bahan</th>
                                  <th className="text-right px-3 py-2 text-xs font-semibold text-muted-foreground">%</th>
                                  <th className="text-right px-3 py-2 text-xs font-semibold text-muted-foreground">Volume</th>
                                </tr>
                              </thead>
                              <tbody>
                                {item.racikan.map((r, i) => {
                                  const isLiter = needsLiterConversion('', r.kategori_bahan);
                                  const gramMl = isLiter && r.volume_ml > 0 ? formatGramMl(r.volume_ml) : null;
                                  return (
                                    <tr key={i} className="border-t border-border/50">
                                      <td className="px-3 py-2 text-xs"><Badge variant="outline" className="text-xs">{r.kategori_bahan}</Badge></td>
                                      <td className="px-3 py-2 text-xs text-muted-foreground">
                                        {r.vendor || '—'}
                                        {r.grade && <Badge className="ml-1 text-[10px] bg-amber-100 text-amber-700">{r.grade}</Badge>}
                                      </td>
                                      <td className="px-3 py-2 text-xs font-medium">{r.nama_bahan}</td>
                                      <td className="px-3 py-2 text-xs text-right font-semibold">{r.persentase}%</td>
                                      <td className="px-3 py-2 text-xs text-right">
                                        {gramMl ? (
                                          <span className="text-orange-600 font-semibold">{gramMl.gramLabel} / {gramMl.mlLabel}</span>
                                        ) : (
                                          <span className="text-muted-foreground">{r.volume_ml}ml</span>
                                        )}
                                      </td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      ) : (
                        <p className="text-xs text-muted-foreground">Belum ada racikan dicatat.</p>
                      )}

                      {/* Update status */}
                      {canEdit && (
                        <div>
                          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Update Status Review</p>
                          <div className="flex gap-2 flex-wrap">
                            {['pending', 'acc', 'revisi', 'ditolak'].map(s => {
                              const cfg = STATUS_CONFIG[s];
                              return (
                                <button key={s}
                                  onClick={() => {
                                    if (s === 'acc') { handleAcc(item); }
                                    else statusMut.mutate({ id: item.id, status: s, catatan_review: item.catatan_review || '' });
                                  }}
                                  disabled={statusMut.isPending}
                                  className={`px-3 py-1.5 rounded-lg border text-xs font-medium transition-all ${item.status === s ? cfg.cls + ' border-current' : 'border-border text-muted-foreground hover:border-accent/50'}`}>
                                  {cfg.label}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {showForm && (
        <SampleForm
          item={editItem}
          onClose={() => { setShowForm(false); setEditItem(null); }}
          onSaved={() => { setShowForm(false); setEditItem(null); qc.invalidateQueries({ queryKey: ['sample-racikan'] }); }}
        />
      )}
    </div>
  );
}

// ── Sub: Racikan Database ──────────────────────────────────────────────────

function RacikanDatabaseTab() {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState('az');
  const [selectedBrand, setSelectedBrand] = useState(null);
  const [selectedVarian, setSelectedVarian] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState(null);

  const { member } = useSession();
  const canEdit = getPageAccess(member, "sample_racikan") === "edit";

  const { data: racikanList = [], isLoading } = useQuery({
    queryKey: ['racikan-database'],
    queryFn: () => base44.entities.RacikanDatabase.list('nama_brand'),
  });

  const delMut = useMutation({
    mutationFn: id => base44.entities.RacikanDatabase.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['racikan-database'] });
      setSelectedVarian(null);
    },
  });

  const brands = useMemo(() => {
    const map = {};
    racikanList.forEach(r => {
      if (!map[r.nama_brand]) map[r.nama_brand] = [];
      map[r.nama_brand].push(r);
    });
    return map;
  }, [racikanList]);

  const brandNames = useMemo(() => {
    const q = search.toLowerCase();
    const names = Object.keys(brands).filter(b => b.toLowerCase().includes(q));
    if (sort === 'az') return names.sort();
    if (sort === 'za') return names.sort().reverse();
    if (sort === 'terbaru') return names.sort((a, b) => {
      const aLatest = Math.max(...(brands[a] || []).map(r => new Date(r.created_date || 0)));
      const bLatest = Math.max(...(brands[b] || []).map(r => new Date(r.created_date || 0)));
      return bLatest - aLatest;
    });
    return names;
  }, [brands, search, sort]);

  const varianList = selectedBrand ? (brands[selectedBrand] || []) : [];
  const detailItem = selectedVarian;

  const handleDeleteVarian = (item) => {
    if (!confirm(`Hapus racikan ${item.nama_brand} - ${item.nama_varian}?`)) return;
    delMut.mutate(item.id);
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-2 items-center">
        {selectedBrand && (
          <Button variant="ghost" size="sm" className="gap-1 text-muted-foreground" onClick={() => { setSelectedBrand(null); setSelectedVarian(null); }}>
            ← Semua Brand
          </Button>
        )}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Cari brand..." className="pl-9" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        {!selectedBrand && <SortDropdown value={sort} onChange={setSort} />}
        {canEdit && (
          <Button onClick={() => { setEditItem(null); setShowForm(true); }} className="gap-2 shrink-0">
            <Plus className="w-4 h-4" /> Tambah Racikan
          </Button>
        )}
      </div>

      {isLoading ? (
        <div className="text-center py-10 text-muted-foreground text-sm">Memuat...</div>
      ) : !selectedBrand ? (
        brandNames.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            <BookOpen className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p>Belum ada database racikan. Klik Tambah Racikan untuk memulai.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {brandNames.map(brand => {
              const varians = brands[brand];
              const aktif = varians.filter(v => v.status === 'aktif').length;
              const latest = varians.reduce((a, b) => new Date(a.updated_date || a.created_date || 0) > new Date(b.updated_date || b.created_date || 0) ? a : b, varians[0]);
              return (
                <button key={brand} onClick={() => { setSelectedBrand(brand); setSelectedVarian(null); }}
                  className="text-left bg-card border border-border rounded-2xl p-4 hover:border-accent/60 hover:shadow-md transition-all group">
                  <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center mb-3">
                    <BookOpen className="w-5 h-5 text-accent" />
                  </div>
                  <p className="font-semibold text-sm">{brand}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{varians.length} varian · {aktif} aktif</p>
                  <div className="mt-1"><LastUpdated date={latest?.updated_date || latest?.created_date} /></div>
                  <div className="flex items-center gap-1 mt-2 text-xs text-accent group-hover:underline">
                    Lihat Varian <ChevronRight className="w-3.5 h-3.5" />
                  </div>
                </button>
              );
            })}
          </div>
        )
      ) : !selectedVarian ? (
        <div className="space-y-3">
          <p className="text-sm font-semibold text-muted-foreground">
            Brand: <span className="text-foreground">{selectedBrand}</span> — {varianList.length} varian
          </p>
          <div className="grid gap-2">
            {varianList.map(varian => (
              <Card key={varian.id} className="cursor-pointer hover:border-accent/50 transition-all" onClick={() => setSelectedVarian(varian)}>
                <CardContent className="p-4 flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                   <div className="flex items-center gap-2 flex-wrap">
                     <span className="font-semibold text-sm">{varian.nama_varian}</span>
                     {varian.ukuran_ml && <Badge variant="outline" className="text-xs">{varian.ukuran_ml}ml</Badge>}
                     <Badge className={`text-xs ${varian.status === 'aktif' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-600'}`}>
                       {varian.status}
                     </Badge>
                     {varian.pic && (
                       <span className="inline-flex items-center gap-1 text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full font-medium">
                         <UserCircle2 className="w-3 h-3" />{varian.pic}
                       </span>
                     )}
                   </div>
                   <div className="flex items-center gap-3 mt-0.5">
                     <p className="text-xs text-muted-foreground">
                       {varian.racikan?.length || 0} bahan
                       {varian.catatan ? ` · ${varian.catatan}` : ''}
                     </p>
                     <LastUpdated date={varian.updated_date || varian.created_date} />
                   </div>
                  </div>
                  <div className="flex gap-1">
                    {canEdit && (
                      <>
                        <Button variant="ghost" size="icon" className="w-8 h-8" onClick={e => { e.stopPropagation(); setEditItem(varian); setShowForm(true); }}>
                          <Edit2 className="w-3.5 h-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" className="w-8 h-8 text-destructive/60 hover:text-destructive" onClick={e => { e.stopPropagation(); handleDeleteVarian(varian); }}>
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </>
                    )}
                    <ChevronRight className="w-4 h-4 text-muted-foreground self-center" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" className="gap-1 text-muted-foreground" onClick={() => setSelectedVarian(null)}>
              ← {selectedBrand}
            </Button>
            <span className="text-muted-foreground">/</span>
            <span className="text-sm font-semibold">{detailItem.nama_varian}</span>
          </div>

          <Card>
            <CardContent className="p-5 space-y-4">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-lg font-bold">{detailItem.nama_brand} — {detailItem.nama_varian}</h3>
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    {detailItem.ukuran_ml && <Badge variant="outline">{detailItem.ukuran_ml}ml</Badge>}
                    <Badge className={detailItem.status === 'aktif' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-600'}>
                      {detailItem.status}
                    </Badge>
                    {detailItem.pic && (
                      <span className="inline-flex items-center gap-1.5 text-xs bg-primary/10 text-primary px-2.5 py-1 rounded-full font-medium">
                        <UserCircle2 className="w-3.5 h-3.5" />{detailItem.pic}
                      </span>
                    )}
                  </div>
                  {detailItem.catatan && <p className="text-sm text-muted-foreground mt-1">{detailItem.catatan}</p>}
                  <div className="mt-1"><LastUpdated date={detailItem.updated_date || detailItem.created_date} /></div>
                </div>
                {canEdit && (
                  <Button size="sm" variant="outline" onClick={() => { setEditItem(detailItem); setShowForm(true); }} className="gap-1.5">
                    <Edit2 className="w-3.5 h-3.5" /> Edit
                  </Button>
                )}
              </div>

              {detailItem.racikan?.length > 0 ? (
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Komposisi Racikan</p>
                  <div className="rounded-xl border border-border overflow-hidden">
                    <table className="w-full text-sm">
                      <thead className="bg-muted/50">
                        <tr>
                          <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground">Kategori</th>
                          <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground">Vendor</th>
                          <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground">Nama Bahan</th>
                          <th className="text-right px-4 py-2.5 text-xs font-semibold text-muted-foreground">%</th>
                          <th className="text-right px-4 py-2.5 text-xs font-semibold text-muted-foreground">Volume</th>
                        </tr>
                      </thead>
                      <tbody>
                        {detailItem.racikan.map((r, i) => {
                          const isLiter = needsLiterConversion('', r.kategori_bahan);
                          const gramMl = isLiter && r.volume_ml > 0 ? formatGramMl(r.volume_ml) : null;
                          return (
                            <tr key={i} className="border-t border-border/50 hover:bg-muted/30 transition-colors">
                              <td className="px-4 py-2.5"><Badge variant="outline" className="text-xs">{r.kategori_bahan}</Badge></td>
                              <td className="px-4 py-2.5 text-xs text-muted-foreground">
                                {r.vendor || '—'}
                                {r.grade && <Badge className="ml-1 text-[10px] bg-amber-100 text-amber-700">{r.grade}</Badge>}
                              </td>
                              <td className="px-4 py-2.5 text-sm font-medium">{r.nama_bahan}</td>
                              <td className="px-4 py-2.5 text-sm font-bold text-right text-accent">{r.persentase}%</td>
                              <td className="px-4 py-2.5 text-sm text-right">
                                {gramMl ? (
                                  <span className="text-orange-600 font-semibold">{gramMl.gramLabel} / {gramMl.mlLabel}</span>
                                ) : (
                                  <span className="text-muted-foreground">{r.volume_ml}ml</span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                      <tfoot className="bg-muted/30 border-t border-border">
                        <tr>
                          <td colSpan={3} className="px-4 py-2 text-xs font-semibold text-muted-foreground">Total</td>
                          <td className="px-4 py-2 text-sm font-bold text-right text-accent">
                            {detailItem.racikan.reduce((s, r) => s + (r.persentase || 0), 0).toFixed(1)}%
                          </td>
                          <td className="px-4 py-2 text-sm text-right text-muted-foreground font-medium">
                            {detailItem.racikan.reduce((s, r) => s + (r.volume_ml || 0), 0).toFixed(2)}ml
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-6">Belum ada komposisi racikan.</p>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {showForm && (
        <RacikanForm
          item={editItem}
          onClose={() => { setShowForm(false); setEditItem(null); }}
          onSaved={() => {
            setShowForm(false);
            setEditItem(null);
            qc.invalidateQueries({ queryKey: ['racikan-database'] });
          }}
        />
      )}
    </div>
  );
}

// ── Sub: Database Bahan ────────────────────────────────────────────────────

function DatabaseBahanTab() {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState('az');
  const [selectedBrand, setSelectedBrand] = useState(null);
  const [selectedVarian, setSelectedVarian] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState(null);

  const { member } = useSession();
  const canEdit = getPageAccess(member, "sample_racikan") === "edit";

  const { data: dbList = [], isLoading } = useQuery({
    queryKey: ['database-bahan'],
    queryFn: () => base44.entities.DatabaseBahan.list('nama_brand'),
  });

  const delMut = useMutation({
    mutationFn: id => base44.entities.DatabaseBahan.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['database-bahan'] });
      setSelectedVarian(null);
    },
  });

  const brands = useMemo(() => {
    const map = {};
    dbList.forEach(r => {
      if (!map[r.nama_brand]) map[r.nama_brand] = [];
      map[r.nama_brand].push(r);
    });
    return map;
  }, [dbList]);

  const brandNames = useMemo(() => {
    const q = search.toLowerCase();
    const names = Object.keys(brands).filter(b => b.toLowerCase().includes(q));
    if (sort === 'az') return names.sort();
    if (sort === 'za') return names.sort().reverse();
    return names;
  }, [brands, search, sort]);

  const varianList = selectedBrand ? (brands[selectedBrand] || []) : [];

  return (
    <div className="space-y-4">
      <div className="flex gap-2 items-center">
        {selectedBrand && (
          <Button variant="ghost" size="sm" className="gap-1 text-muted-foreground" onClick={() => { setSelectedBrand(null); setSelectedVarian(null); }}>
            ← Semua Brand
          </Button>
        )}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Cari brand atau varian..." className="pl-9" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        {!selectedBrand && <SortDropdown value={sort} onChange={setSort} />}
        {canEdit && (
          <Button onClick={() => { setEditItem(null); setShowForm(true); }} className="gap-2 shrink-0">
            <Plus className="w-4 h-4" /> Tambah
          </Button>
        )}
      </div>

      {isLoading ? (
        <div className="text-center py-10 text-muted-foreground text-sm">Memuat...</div>
      ) : !selectedBrand ? (
        brandNames.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            <Database className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p>Belum ada database bahan. Klik Tambah untuk memulai.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {brandNames.map(brand => {
              const varians = brands[brand];
              const latest = varians.reduce((a, b) => new Date(a.updated_date || a.created_date || 0) > new Date(b.updated_date || b.created_date || 0) ? a : b, varians[0]);
              return (
                <button key={brand} onClick={() => { setSelectedBrand(brand); setSelectedVarian(null); }}
                  className="text-left bg-card border border-border rounded-2xl p-4 hover:border-accent/60 hover:shadow-md transition-all group">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center mb-3">
                    <Package className="w-5 h-5 text-primary" />
                  </div>
                  <p className="font-semibold text-sm">{brand}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{varians.length} varian</p>
                  <div className="mt-1"><LastUpdated date={latest?.updated_date || latest?.created_date} /></div>
                  <div className="flex items-center gap-1 mt-2 text-xs text-accent group-hover:underline">
                    Lihat Varian <ChevronRight className="w-3.5 h-3.5" />
                  </div>
                </button>
              );
            })}
          </div>
        )
      ) : !selectedVarian ? (
        <div className="space-y-3">
          <p className="text-sm font-semibold text-muted-foreground">
            Brand: <span className="text-foreground">{selectedBrand}</span> — {varianList.length} varian
          </p>
          <div className="grid gap-2">
            {varianList.map(varian => (
              <Card key={varian.id} className="cursor-pointer hover:border-accent/50 transition-all" onClick={() => setSelectedVarian(varian)}>
                <CardContent className="p-4 flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-sm">{varian.nama_varian}</span>
                      {varian.botol_ukuran_label_ml && <Badge variant="outline" className="text-xs">{varian.botol_ukuran_label_ml}ml</Badge>}
                      <Badge className={`text-xs ${varian.status === 'aktif' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-600'}`}>
                        {varian.status}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                      {varian.botol_nama && <span className="text-xs text-muted-foreground">{varian.botol_nama}</span>}
                      {varian.tutup_nama && <span className="text-xs text-muted-foreground">· Tutup: {varian.tutup_nama}</span>}
                      {varian.spray_nama && <span className="text-xs text-muted-foreground">· Spray: {varian.spray_nama}</span>}
                    </div>
                    <div className="mt-0.5"><LastUpdated date={varian.updated_date || varian.created_date} /></div>
                  </div>
                  <div className="flex gap-1">
                    {canEdit && (
                      <>
                        <Button variant="ghost" size="icon" className="w-8 h-8" onClick={e => { e.stopPropagation(); setEditItem(varian); setShowForm(true); }}>
                          <Edit2 className="w-3.5 h-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" className="w-8 h-8 text-destructive/60 hover:text-destructive" onClick={e => { e.stopPropagation(); if (confirm(`Hapus?`)) delMut.mutate(varian.id); }}>
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </>
                    )}
                    <ChevronRight className="w-4 h-4 text-muted-foreground self-center" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" className="gap-1 text-muted-foreground" onClick={() => setSelectedVarian(null)}>
              ← {selectedBrand}
            </Button>
            <span className="text-muted-foreground">/</span>
            <span className="text-sm font-semibold">{selectedVarian.nama_varian}</span>
          </div>
          <Card>
            <CardContent className="p-5 space-y-4">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-lg font-bold">{selectedVarian.nama_brand} — {selectedVarian.nama_varian}</h3>
                  <div className="mt-1"><LastUpdated date={selectedVarian.updated_date || selectedVarian.created_date} /></div>
                </div>
                {canEdit && (
                  <Button size="sm" variant="outline" onClick={() => { setEditItem(selectedVarian); setShowForm(true); }} className="gap-1.5">
                    <Edit2 className="w-3.5 h-3.5" /> Edit
                  </Button>
                )}
              </div>

              {/* Botol info */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="bg-muted/30 rounded-xl p-3">
                  <p className="text-xs text-muted-foreground font-medium mb-1">Botol</p>
                  <p className="text-sm font-semibold">{selectedVarian.botol_nama || '—'}</p>
                  {selectedVarian.botol_ukuran_label_ml && (
                    <p className="text-xs text-muted-foreground">Label: {selectedVarian.botol_ukuran_label_ml}ml
                      {selectedVarian.botol_ukuran_aktual_ml && selectedVarian.botol_ukuran_aktual_ml !== selectedVarian.botol_ukuran_label_ml
                        ? ` · Aktual: ${selectedVarian.botol_ukuran_aktual_ml}ml` : ''}
                    </p>
                  )}
                </div>
                <div className="bg-muted/30 rounded-xl p-3">
                  <p className="text-xs text-muted-foreground font-medium mb-1">Tutup</p>
                  <p className="text-sm font-semibold">{selectedVarian.tutup_nama || '—'}</p>
                </div>
                <div className="bg-muted/30 rounded-xl p-3">
                  <p className="text-xs text-muted-foreground font-medium mb-1">Spray</p>
                  <p className="text-sm font-semibold">{selectedVarian.spray_nama || '—'}</p>
                </div>
              </div>

              {/* Item Tambahan */}
              {selectedVarian.item_tambahan?.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Item Tambahan</p>
                  <div className="rounded-xl border border-border overflow-hidden">
                    <table className="w-full text-sm">
                      <thead className="bg-muted/50">
                        <tr>
                          <th className="text-left px-3 py-2 text-xs text-muted-foreground font-semibold">Nama</th>
                          <th className="text-left px-3 py-2 text-xs text-muted-foreground font-semibold">Kategori</th>
                          <th className="text-right px-3 py-2 text-xs text-muted-foreground font-semibold">Qty/pcs</th>
                          <th className="text-left px-3 py-2 text-xs text-muted-foreground font-semibold">Catatan</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedVarian.item_tambahan.map((it, i) => (
                          <tr key={i} className="border-t border-border/50">
                            <td className="px-3 py-2 text-xs font-medium">{it.nama}</td>
                            <td className="px-3 py-2 text-xs"><Badge variant="outline" className="text-xs">{it.kategori}</Badge></td>
                            <td className="px-3 py-2 text-xs text-right">{it.qty_per_pcs}</td>
                            <td className="px-3 py-2 text-xs text-muted-foreground">{it.catatan || '—'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
              {selectedVarian.catatan && (
                <p className="text-sm text-muted-foreground italic">{selectedVarian.catatan}</p>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {showForm && (
        <DatabaseBahanForm
          item={editItem}
          onClose={() => { setShowForm(false); setEditItem(null); }}
          onSaved={() => { setShowForm(false); setEditItem(null); qc.invalidateQueries({ queryKey: ['database-bahan'] }); }}
        />
      )}
    </div>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────

const TABS = [
  { key: 'sample',   label: 'Sample',            icon: FlaskConical, desc: 'Tes SPL, aroma & evaluasi sample' },
  { key: 'racikan',  label: 'Database Racikan',  icon: BookOpen,     desc: 'Racikan final tersimpan per brand' },
  { key: 'bahan',    label: 'Database Bahan',    icon: Database,     desc: 'Botol, tutup, spray & item per varian' },
];

export default function SampleRacikanPage() {
  const [activeTab, setActiveTab] = useState('sample');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-display font-bold text-foreground">Sample & Racikan</h1>
        <p className="text-muted-foreground text-sm mt-1">Manajemen sample pengujian & database racikan brand</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 flex-wrap">
        {TABS.map(tab => {
          const Icon = tab.icon;
          return (
            <button key={tab.key} onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-medium transition-all ${activeTab === tab.key ? 'bg-primary text-primary-foreground shadow-sm' : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'}`}>
              <Icon className="w-3.5 h-3.5" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {activeTab === 'sample'  && <SampleTab />}
      {activeTab === 'racikan' && <RacikanDatabaseTab />}
      {activeTab === 'bahan'   && <DatabaseBahanTab />}
    </div>
  );
}