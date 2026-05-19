import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Badge } from '@/components/ui/badge';
import { User, ChevronDown, X, UserPlus } from 'lucide-react';

/**
 * PicSelector — Komponen pilih PIC yang terintegrasi dengan data TeamMember (Manajemen Tim).
 *
 * Props:
 *   value       — nama PIC yang dipilih (string, full_name dari TeamMember)
 *   onChange    — (name: string) => void
 *   label       — label atas (default: "Penanggung Jawab (PIC)")
 *   placeholder — placeholder input (default: "Cari dan pilih orang...")
 *   allowedRoles — array role yang boleh dipilih (default: semua kecuali developer/owner)
 */

const DEFAULT_ALLOWED_ROLES = [
  'admin',
  'supervisor_office',
  'supervisor',
  'operator_office',
  'operator_produksi',
];

const DEFAULT_ROLE_LABELS = {
  admin: 'Admin',
  supervisor_office: 'Supervisor Office',
  supervisor: 'Supervisor Produksi',
  operator_office: 'Operator Office',
  operator_produksi: 'Operator Produksi',
};

export default function PicSelector({
  value,
  onChange,
  label = 'Penanggung Jawab (PIC)',
  placeholder = 'Cari dan pilih orang...',
  allowedRoles = DEFAULT_ALLOWED_ROLES,
  roleLabelMap = DEFAULT_ROLE_LABELS,
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [filterRole, setFilterRole] = useState('');
  const containerRef = useRef(null);

  // Ambil SEMUA member (aktif & nonaktif) agar bisa deteksi jika PIC tersimpan tapi sudah nonaktif
  const { data: allMembers = [] } = useQuery({
    queryKey: ['team-members'],
    queryFn: () => base44.entities.TeamMember.list(),
  });

  // Hanya yang aktif & role diizinkan yang bisa dipilih
  const eligibleMembers = useMemo(
    () => allMembers.filter(m => m.status === 'aktif' && allowedRoles.includes(m.role)),
    [allMembers, allowedRoles]
  );

  // Semua member untuk lookup (termasuk nonaktif, agar bisa tampilkan badge nonaktif)
  const members = allMembers;

  const availableRoles = useMemo(() => {
    const roles = new Set(eligibleMembers.map(m => m.role));
    return allowedRoles.filter(r => roles.has(r));
  }, [eligibleMembers, allowedRoles]);

  const filteredMembers = useMemo(() => {
    return eligibleMembers.filter(m => {
      const matchRole = !filterRole || m.role === filterRole;
      const q = search.toLowerCase();
      const matchSearch =
        !search ||
        m.full_name?.toLowerCase().includes(q) ||
        m.position?.toLowerCase().includes(q);
      return matchRole && matchSearch;
    });
  }, [eligibleMembers, filterRole, search]);

  // Match by full_name (dari semua member termasuk nonaktif)
  const selectedMember = members.find(m => m.full_name === value);
  const isSelectedInactive = selectedMember && selectedMember.status !== 'aktif';

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleSelect = (member) => {
    onChange(member.full_name);
    setOpen(false);
    setSearch('');
    setFilterRole('');
  };

  const handleClear = (e) => {
    e.stopPropagation();
    onChange('');
    setSearch('');
  };

  return (
    <div className="space-y-1.5" ref={containerRef}>
      {label && (
        <label className="text-sm font-medium leading-none">{label}</label>
      )}

      {/* Trigger */}
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg border text-sm transition-colors text-left ${
          open ? 'border-primary ring-1 ring-ring' : 'border-input hover:border-primary/50'
        } bg-transparent`}
      >
        {selectedMember ? (
          <>
            <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 ${isSelectedInactive ? 'bg-red-100' : 'bg-primary/10'}`}>
              <User className={`w-3.5 h-3.5 ${isSelectedInactive ? 'text-red-400' : 'text-primary'}`} />
            </div>
            <span className={`flex-1 font-medium truncate ${isSelectedInactive ? 'text-muted-foreground line-through' : ''}`}>
              {selectedMember.full_name}
              {selectedMember.position ? ` · ${selectedMember.position}` : ''}
            </span>
            {isSelectedInactive ? (
              <Badge className="text-[10px] shrink-0 bg-red-100 text-red-600 border-red-200">Nonaktif</Badge>
            ) : (
              <Badge variant="outline" className="text-[10px] shrink-0">
                {roleLabelMap[selectedMember.role] || selectedMember.role}
              </Badge>
            )}
            <button
              type="button"
              onClick={handleClear}
              className="text-muted-foreground hover:text-destructive transition-colors ml-1 shrink-0"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </>
        ) : value ? (
          // Nilai lama (email atau nama) yang tidak cocok dengan member mana pun
          <>
            <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center shrink-0">
              <User className="w-3.5 h-3.5 text-muted-foreground" />
            </div>
            <span className="flex-1 truncate text-foreground">{value}</span>
            <button
              type="button"
              onClick={handleClear}
              className="text-muted-foreground hover:text-destructive transition-colors ml-1 shrink-0"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </>
        ) : (
          <>
            <User className="w-4 h-4 text-muted-foreground shrink-0" />
            <span className="flex-1 text-muted-foreground">{placeholder}</span>
            <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform shrink-0 ${open ? 'rotate-180' : ''}`} />
          </>
        )}
      </button>

      {/* Dropdown */}
      {open && (
        <div className="border rounded-xl bg-background shadow-lg z-50 overflow-hidden">
          {/* Search input */}
          <div className="p-2 border-b">
            <input
              autoFocus
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Ketik untuk cari nama..."
              className="w-full text-sm px-3 py-1.5 rounded-lg border border-input focus:outline-none focus:ring-1 focus:ring-ring bg-transparent"
            />
          </div>

          {/* Role filter chips — selalu tampil */}
          {availableRoles.length >= 0 && (
            <div className="flex flex-wrap gap-1.5 px-2 py-2 border-b bg-muted/20">
              <button
                type="button"
                onClick={() => setFilterRole('')}
                className={`px-2.5 py-1 rounded-full text-xs font-medium transition-all ${
                  !filterRole
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
                }`}
              >
                Semua
              </button>
              {availableRoles.map(r => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setFilterRole(filterRole === r ? '' : r)}
                  className={`px-2.5 py-1 rounded-full text-xs font-medium transition-all ${
                    filterRole === r
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
                  }`}
                >
                  {roleLabelMap[r] || r}
                </button>
              ))}
            </div>
          )}

          {/* Member list */}
          <div className="max-h-48 overflow-y-auto">
            {eligibleMembers.length === 0 ? (
              <div className="flex flex-col items-center gap-1 py-6 text-muted-foreground">
                <UserPlus className="w-5 h-5 opacity-40" />
                <p className="text-xs">Belum ada anggota tim aktif</p>
              </div>
            ) : filteredMembers.length === 0 ? (
              <div className="flex flex-col items-center gap-1 py-6 text-muted-foreground">
                <UserPlus className="w-5 h-5 opacity-40" />
                <p className="text-xs">Tidak ditemukan</p>
              </div>
            ) : (
              filteredMembers.map(m => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => handleSelect(m)}
                  className={`w-full flex items-center gap-2.5 px-3 py-2.5 hover:bg-muted/60 transition-colors text-left text-sm ${
                    value === m.full_name ? 'bg-primary/5 font-semibold' : ''
                  }`}
                >
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 text-xs font-bold ${
                    value === m.full_name ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
                  }`}>
                    {(m.full_name || '?')[0].toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{m.full_name}</p>
                    {m.position && <p className="text-xs text-muted-foreground truncate">{m.position}</p>}
                  </div>
                  <Badge variant="outline" className="text-[10px] shrink-0">
                    {roleLabelMap[m.role] || m.role}
                  </Badge>
                </button>
              ))
            )}
          </div>

          {/* Footer */}
          <div className="border-t px-3 py-2 text-center">
            <p className="text-[10px] text-muted-foreground">
              Tambah anggota tim di halaman <strong>Manajemen Tim</strong>
            </p>
          </div>
        </div>
      )}
    </div>
  );
}