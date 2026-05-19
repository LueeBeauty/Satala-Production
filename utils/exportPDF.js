import jsPDF from 'jspdf';
import 'jspdf-autotable';

export const exportToPDF = ({ title, subtitle, filename, columns, rows }) => {
  const doc = new jsPDF('landscape');
  
  // Title
  doc.setFontSize(16);
  doc.text(title || 'Laporan', 14, 15);
  
  // Subtitle
  if (subtitle) {
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(subtitle, 14, 22);
  }
  
  // Table headers
  const head = [columns.map(col => col.label)];
  
  // Table body
  const body = rows.map(row => {
    return columns.map(col => {
      if (col.render) {
        return col.render(row) || '-';
      }
      return row[col.key] || '-';
    });
  });
  
  doc.autoTable({
    head: head,
    body: body,
    startY: subtitle ? 28 : 22,
    styles: { fontSize: 8 },
    headStyles: { fillColor: [34, 197, 94] },
  });
  
  const dateStr = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  doc.save(`${filename || 'export'}_${dateStr}.pdf`);
};
