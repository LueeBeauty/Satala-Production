import React from 'react';
import { Badge } from '@/components/ui/badge';

const statusConfig = {
  ready: { label: 'Ready', dot: 'bg-green-500', bg: 'bg-green-50 text-green-700 border-green-200' },
  in_progress: { label: 'In Progress', dot: 'bg-yellow-500', bg: 'bg-yellow-50 text-yellow-700 border-yellow-200' },
  pending: { label: 'Pending', dot: 'bg-gray-400', bg: 'bg-gray-50 text-gray-600 border-gray-200' },
  done: { label: 'Selesai', dot: 'bg-green-500', bg: 'bg-green-50 text-green-700 border-green-200' },
  diracik: { label: 'Diracik', dot: 'bg-purple-500', bg: 'bg-purple-50 text-purple-700 border-purple-200' },
  maserasi: { label: 'Maserasi', dot: 'bg-violet-500', bg: 'bg-violet-50 text-violet-700 border-violet-200' },
  filling: { label: 'Filling', dot: 'bg-blue-500', bg: 'bg-blue-50 text-blue-700 border-blue-200' },
  menunggu_packing: { label: 'Menunggu Packing', dot: 'bg-amber-500', bg: 'bg-amber-50 text-amber-700 border-amber-200' },
  packing: { label: 'Packing', dot: 'bg-orange-500', bg: 'bg-orange-50 text-orange-700 border-orange-200' },
  siap_kirim: { label: 'Siap Kirim', dot: 'bg-teal-500', bg: 'bg-teal-50 text-teal-700 border-teal-200' },
  qc: { label: 'QC', dot: 'bg-green-500', bg: 'bg-green-50 text-green-700 border-green-200' },
  acc: { label: 'ACC', dot: 'bg-green-500', bg: 'bg-green-50 text-green-700 border-green-200' },
  revision: { label: 'Revisi', dot: 'bg-yellow-500', bg: 'bg-yellow-50 text-yellow-700 border-yellow-200' },
  rejected: { label: 'Ditolak', dot: 'bg-red-500', bg: 'bg-red-50 text-red-700 border-red-200' },
};

export default function StatusBadge({ status, small = false }) {
  const config = statusConfig[status] || statusConfig.pending;

  return (
    <Badge variant="outline" className={`${config.bg} border ${small ? 'text-[10px] px-1.5 py-0' : 'text-xs px-2 py-0.5'} font-medium gap-1.5`}>
      <span className={`w-1.5 h-1.5 rounded-full ${config.dot}`} />
      {config.label}
    </Badge>
  );
}