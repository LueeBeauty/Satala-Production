import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, Search, X, Plus } from 'lucide-react';

export default function SearchableSelect({ options = [], value, onChange, placeholder = 'Pilih...', displayKey = 'label', valueKey = 'value', renderOption, renderSelected, disabled = false, onAddNew }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [dropdownStyle, setDropdownStyle] = useState({});
  const triggerRef = useRef(null);
  const dropdownRef = useRef(null);

  // Hitung posisi dropdown berdasarkan trigger button
  const updatePosition = () => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom;
    const spaceAbove = rect.top;
    const dropdownHeight = 240;

    if (spaceBelow >= dropdownHeight || spaceBelow >= spaceAbove) {
      setDropdownStyle({
        top: rect.bottom + 4,
        left: rect.left,
        width: rect.width,
        maxHeight: Math.min(dropdownHeight, spaceBelow - 8),
      });
    } else {
      setDropdownStyle({
        bottom: window.innerHeight - rect.top + 4,
        top: 'auto',
        left: rect.left,
        width: rect.width,
        maxHeight: Math.min(dropdownHeight, spaceAbove - 8),
      });
    }
  };

  useEffect(() => {
    if (open) {
      updatePosition();
      window.addEventListener('scroll', updatePosition, true);
      window.addEventListener('resize', updatePosition);
    }
    return () => {
      window.removeEventListener('scroll', updatePosition, true);
      window.removeEventListener('resize', updatePosition);
    };
  }, [open]);

  // Tutup dropdown jika klik di luar
  useEffect(() => {
    const handler = (e) => {
      if (
        triggerRef.current && !triggerRef.current.contains(e.target) &&
        dropdownRef.current && !dropdownRef.current.contains(e.target)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const filtered = options.filter(opt => {
    const label = typeof opt === 'string' ? opt : opt[displayKey] ?? '';
    return label.toLowerCase().includes(search.toLowerCase());
  });

  const selected = value ? options.find(opt => {
    const v = typeof opt === 'string' ? opt : opt[valueKey];
    return v === value;
  }) : null;

  const getLabel = (opt) => typeof opt === 'string' ? opt : opt[displayKey] ?? '';
  const getValue = (opt) => typeof opt === 'string' ? opt : opt[valueKey];

  const dropdown = open ? createPortal(
    <div
      ref={dropdownRef}
      style={{
        position: 'fixed',
        zIndex: 9999,
        top: dropdownStyle.top,
        bottom: dropdownStyle.bottom,
        left: dropdownStyle.left,
        width: dropdownStyle.width,
      }}
    >
      <div className="bg-card border border-border rounded-lg shadow-2xl overflow-hidden">
        <div className="p-2 border-b border-border">
          <div className="relative">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <input
              autoFocus
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Ketik untuk cari..."
              className="w-full pl-7 pr-3 py-1.5 text-sm bg-muted/50 rounded-md outline-none focus:ring-1 focus:ring-accent/50"
            />
          </div>
        </div>
        <div style={{ maxHeight: dropdownStyle.maxHeight || 200 }} className="overflow-y-auto">
          {filtered.length === 0 ? (
            <p className="text-center text-sm text-muted-foreground py-4">Tidak ditemukan</p>
          ) : (
            filtered.map((opt, i) => (
              <button
                key={i}
                type="button"
                onMouseDown={e => { e.preventDefault(); onChange(getValue(opt)); setOpen(false); setSearch(''); }}
                className={`w-full text-left px-3 py-2 text-sm transition-colors hover:bg-accent/10 ${getValue(opt) === value ? 'bg-accent/15 text-accent font-medium' : ''}`}
              >
                {renderOption ? renderOption(opt) : getLabel(opt)}
              </button>
            ))
          )}
          {onAddNew && (
            <button
              type="button"
              onMouseDown={e => { e.preventDefault(); setOpen(false); setSearch(''); onAddNew(search); }}
              className="w-full text-left px-3 py-2 text-sm text-accent font-medium border-t border-border flex items-center gap-2 hover:bg-accent/10 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              {search.trim() ? `Tambah "${search.trim()}"` : 'Tambah item baru...'}
            </button>
          )}
        </div>
      </div>
    </div>,
    document.body
  ) : null;

  return (
    <div className="relative" ref={triggerRef}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => { setOpen(!open); setSearch(''); }}
        className={`w-full flex items-center justify-between px-3 py-2 text-sm border border-border rounded-lg bg-background text-left transition-colors ${disabled ? 'opacity-50 cursor-not-allowed' : 'hover:border-accent cursor-pointer'} ${open ? 'border-accent ring-1 ring-accent/30' : ''}`}
      >
        <span className={`truncate ${selected ? 'text-foreground' : 'text-muted-foreground'}`}>
          {selected ? (renderSelected ? renderSelected(selected) : getLabel(selected)) : placeholder}
        </span>
        <div className="flex items-center gap-1 shrink-0">
          {value && !disabled && (
            <span
              onMouseDown={e => { e.stopPropagation(); e.preventDefault(); onChange(null); setOpen(false); }}
              className="hover:text-destructive text-muted-foreground"
            >
              <X className="w-3 h-3" />
            </span>
          )}
          <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${open ? 'rotate-180' : ''}`} />
        </div>
      </button>
      {dropdown}
    </div>
  );
}