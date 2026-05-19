import jsPDF from 'jspdf';

const fmt = (n) => n ? new Intl.NumberFormat('id-ID').format(Math.round(n)) : '0';

// Terbilang function
const terbilang = (n) => {
  const satuan = ['', 'Satu', 'Dua', 'Tiga', 'Empat', 'Lima', 'Enam', 'Tujuh', 'Delapan', 'Sembilan',
    'Sepuluh', 'Sebelas', 'Dua Belas', 'Tiga Belas', 'Empat Belas', 'Lima Belas', 'Enam Belas',
    'Tujuh Belas', 'Delapan Belas', 'Sembilan Belas'];
  const puluhan = ['', '', 'Dua Puluh', 'Tiga Puluh', 'Empat Puluh', 'Lima Puluh',
    'Enam Puluh', 'Tujuh Puluh', 'Delapan Puluh', 'Sembilan Puluh'];

  const convert = (num) => {
    if (num === 0) return '';
    if (num < 20) return satuan[num];
    if (num < 100) return puluhan[Math.floor(num / 10)] + (num % 10 !== 0 ? ' ' + satuan[num % 10] : '');
    if (num < 200) return 'Seratus ' + convert(num - 100);
    if (num < 1000) return satuan[Math.floor(num / 100)] + ' Ratus ' + convert(num % 100);
    if (num < 2000) return 'Seribu ' + convert(num - 1000);
    if (num < 1000000) return convert(Math.floor(num / 1000)) + ' Ribu ' + convert(num % 1000);
    if (num < 1000000000) return convert(Math.floor(num / 1000000)) + ' Juta ' + convert(num % 1000000);
    return convert(Math.floor(num / 1000000000)) + ' Miliar ' + convert(num % 1000000000);
  };

  const result = convert(Math.round(n)).trim().replace(/\s+/g, ' ');
  return result + ' Rupiah';
};

// Load image to base64
const loadImageAsBase64 = async (url) => {
  try {
    const resp = await fetch(url);
    const blob = await resp.blob();
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
};

// Ambil direct URL dari google drive
const getGDriveDirectUrl = (driveUrl) => {
  const match = driveUrl.match(/\/d\/([a-zA-Z0-9_-]+)/);
  if (match) return `https://drive.google.com/uc?export=download&id=${match[1]}`;
  return driveUrl;
};

// URL gambar diambil dari parameter, bukan hardcode

export const generateInvoicePDF = async ({ invoiceCode, record, bank, penanggungJawab, paymentTerm, companySettings = {}, dpPersen = 100, dpNominal = null, sisaNominal = null, totalTagihan = null }) => {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

  const pageW = 210;
  const marginL = 18;
  const marginR = 18;
  const contentW = pageW - marginL - marginR;

  // Load gambar dari CompanySettings (database)
  const logoUrl = companySettings.logo_url || null;
  const ttdUrl = companySettings.ttd_url || null;
  const stempelUrl = companySettings.stempel_url || null;

  const [logoB64, ttdB64, stempelB64] = await Promise.all([
    logoUrl ? loadImageAsBase64(logoUrl) : Promise.resolve(null),
    ttdUrl ? loadImageAsBase64(ttdUrl) : Promise.resolve(null),
    stempelUrl ? loadImageAsBase64(stempelUrl) : Promise.resolve(null),
  ]);

  // ─── HEADER ──────────────────────────────────────────────────────────────────
  let y = 16;

  // Logo
  if (logoB64) {
    doc.addImage(logoB64, 'PNG', marginL, y, 30, 18, '', 'FAST');
  } else {
    // Fallback: circle placeholder
    doc.setFillColor(180, 140, 80);
    doc.circle(marginL + 6, y + 8, 7, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text('S', marginL + 3.5, y + 11);
  }

  // Nama perusahaan (dari settings atau fallback)
  const namaPerusahaan = companySettings.nama_perusahaan || 'PT. Satala Dermatech Essential';
  const alamatPerusahaan = companySettings.alamat_perusahaan || 'Jalan aster kavling Paspampres, Kota Batu, Kec. Ciomas, Kabupaten Bogor, Jawa Barat';
  doc.setTextColor(30, 20, 10);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(17);
  doc.text(namaPerusahaan, marginL + 33, y + 7);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(100, 80, 60);
  doc.text(alamatPerusahaan, marginL + 33, y + 13, { maxWidth: contentW - 33 });

  // Garis bawah header
  y += 22;
  doc.setDrawColor(180, 140, 60);
  doc.setLineWidth(0.8);
  doc.line(marginL, y, pageW - marginR, y);
  doc.setLineWidth(0.3);
  doc.setDrawColor(200, 200, 200);
  doc.line(marginL, y + 0.8, pageW - marginR, y + 0.8);

  // ─── JUDUL INVOICE ────────────────────────────────────────────────────────────
  y += 10;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(30, 20, 10);
  doc.text('INVOICE', marginL, y);

  // ─── INFO INVOICE ─────────────────────────────────────────────────────────────
  y += 8;
  const infoRows = [
    ['Nomor', invoiceCode || '-'],
    ['Tanggal', record.tanggal ? new Date(record.tanggal).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: '2-digit' }) : '-'],
    ['Payment Term', paymentTerm || '-'],
    ['Penanggung Jawab', penanggungJawab || '-'],
  ];
  doc.setFontSize(9.5);
  infoRows.forEach(([label, val]) => {
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(90, 80, 70);
    doc.text(label, marginL, y);
    doc.setTextColor(30, 20, 10);
    doc.text(': ', marginL + 38, y);
    doc.setFont('helvetica', label === 'Nomor' ? 'bold' : 'normal');
    doc.text(val, marginL + 41, y);
    y += 6;
  });

  // ─── KEPADA ───────────────────────────────────────────────────────────────────
  y += 2;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(30, 20, 10);
  doc.text('Kepada:', marginL, y);
  y += 5;
  doc.setFont('helvetica', 'normal');
  doc.text(record.nama_brand || '-', marginL, y);
  y += 4.5;
  doc.text('Di Tempat.', marginL, y);

  // ─── SALAM ───────────────────────────────────────────────────────────────────
  y += 8;
  doc.setFont('helvetica', 'bold');
  doc.text('Dengan hormat,', marginL, y);
  y += 5;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(70, 60, 50);
  const salamText = `Berdasarkan kesepakatan bersama, dengan ini kami mengajukan invoice tersebut sebagai berikut :`;
  doc.text(salamText, marginL, y, { maxWidth: contentW });
  y += 8;

  // ─── TABEL PRODUK ─────────────────────────────────────────────────────────────
  const products = record.products || [];
  const legalitasList = record.legalitas || [];
  const totalProduk = products.reduce((s, p) => s + (p.total_harga_jual || p.total_hpp_product || 0), 0);
  const totalLegalitasPdf = legalitasList.reduce((s, l) => s + ((l.harga_jual || l.nominal || 0) * (l.qty_variant || 1)), 0);
  const totalJual = totalTagihan !== null ? totalTagihan : (totalProduk + totalLegalitasPdf);

  // Column widths
  const cols = [8, 48, 42, 12, 32, 32];
  const colX = cols.reduce((acc, w, i) => { acc.push(i === 0 ? marginL : acc[i - 1] + cols[i - 1]); return acc; }, []);
  const rowH = 7;

  // Header row
  doc.setFillColor(60, 40, 20);
  doc.rect(marginL, y, contentW, rowH, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  const headers = ['No', 'Nama Produk', 'Keterangan', 'Qty', 'Harga/Pcs', 'Subtotal'];
  headers.forEach((h, i) => doc.text(h, colX[i] + 2, y + 4.8));
  y += rowH;

  // Data rows
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  products.forEach((p, i) => {
    const bg = i % 2 === 0 ? [250, 247, 242] : [255, 255, 255];
    doc.setFillColor(...bg);
    doc.rect(marginL, y, contentW, rowH, 'F');
    doc.setDrawColor(220, 210, 200);
    doc.rect(marginL, y, contentW, rowH, 'S');
    doc.setTextColor(30, 20, 10);
    const keterangan = p.keterangan_custom !== undefined
      ? (p.keterangan_custom || '-')
      : (p.botol_nama ? `${p.botol_nama}${p.botol_ukuran_label ? ` (${p.botol_ukuran_label}ml)` : ''}` : '-');
    const hargaJualPcs = p.harga_jual_per_pcs || p.hpp_per_pcs_digunakan || p.hpp_per_pcs_label || 0;
    const subtotal = p.total_harga_jual || p.total_hpp_product || 0;
    const rowVals = [
      String(i + 1),
      (p.nama_product || '-').slice(0, 25),
      keterangan.slice(0, 22),
      String(p.qty || 0),
      `Rp ${fmt(hargaJualPcs)}`,
      `Rp ${fmt(subtotal)}`,
    ];
    rowVals.forEach((v, ci) => doc.text(v, colX[ci] + 2, y + 4.8));
    y += rowH;
  });

  // Legalitas rows (jika ada)
  if (legalitasList.length > 0) {
    legalitasList.forEach((l, i) => {
      const hargaJual = l.harga_jual || l.nominal || 0;
      const qty = l.qty_variant || 1;
      const subtotal = hargaJual * qty;
      const bg = i % 2 === 0 ? [250, 247, 242] : [255, 255, 255];
      doc.setFillColor(...bg);
      doc.rect(marginL, y, contentW, rowH, 'F');
      doc.setDrawColor(220, 210, 200);
      doc.rect(marginL, y, contentW, rowH, 'S');
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(30, 20, 10);
      const namaLegal = `${l.nama}${qty > 1 ? ` × ${qty} variant` : ''}`;
      doc.text(String(products.length + i + 1), colX[0] + 2, y + 4.8);
      doc.text(namaLegal.slice(0, 25), colX[1] + 2, y + 4.8);
      doc.text('Legalitas', colX[2] + 2, y + 4.8);
      doc.text(String(qty), colX[3] + 2, y + 4.8);
      doc.text(`Rp ${fmt(hargaJual)}`, colX[4] + 2, y + 4.8);
      doc.text(`Rp ${fmt(subtotal)}`, colX[5] + 2, y + 4.8);
      y += rowH;
    });
  }

  // Footer total row
  doc.setFillColor(245, 238, 225);
  doc.rect(marginL, y, contentW, rowH, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(30, 20, 10);
  doc.text('Total', colX[4] + 2, y + 4.8);
  doc.text(`Rp ${fmt(totalJual)}`, colX[5] + 2, y + 4.8);
  y += rowH;

  // DP / Sisa row (jika bukan 100%)
  if (dpPersen < 100 && dpNominal !== null) {
    doc.setFillColor(230, 250, 235);
    doc.rect(marginL, y, contentW, rowH, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(30, 100, 50);
    doc.text(`Dibayar (${dpPersen}%)`, colX[4] + 2, y + 4.8);
    doc.text(`Rp ${fmt(dpNominal)}`, colX[5] + 2, y + 4.8);
    y += rowH;

    doc.setFillColor(255, 245, 225);
    doc.rect(marginL, y, contentW, rowH, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(160, 80, 0);
    doc.text(`Sisa (${100 - dpPersen}%)`, colX[4] + 2, y + 4.8);
    doc.text(`Rp ${fmt(sisaNominal)}`, colX[5] + 2, y + 4.8);
    y += rowH;
  }

  y += 8;

  // ─── TERBILANG ───────────────────────────────────────────────────────────────
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(30, 20, 10);
  doc.text('Terbilang:', marginL, y);
  y += 5;
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(9);
  doc.setTextColor(50, 40, 30);
  const terbilangText = terbilang(dpPersen < 100 && dpNominal ? dpNominal : totalJual);
  doc.text(terbilangText, marginL, y, { maxWidth: contentW });
  y += terbilangText.length > 60 ? 10 : 6;

  // ─── NOTED ───────────────────────────────────────────────────────────────────
  y += 4;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(30, 20, 10);
  doc.text('Noted:', marginL, y);
  y += 5;
  doc.setFont('helvetica', 'normal');
  doc.text('Pembayaran Harap Mencantumkan Detail Invoice', marginL, y);

  // ─── INFO TRANSFER ────────────────────────────────────────────────────────────
  if (bank) {
    y += 8;
    const bankRows = [
      ['Alamat Transfer', ''],
      ['Account', bank.nama_pemilik],
      ['Bank', bank.nama_bank],
      ['No Rekening', bank.nomor_rekening],
    ];
    doc.setFontSize(9);
    bankRows.forEach(([label, val]) => {
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(90, 80, 70);
      doc.text(label, marginL, y);
      doc.text(': ', marginL + 30, y);
      doc.setFont('helvetica', val ? 'bold' : 'normal');
      doc.setTextColor(30, 20, 10);
      if (val) doc.text(val, marginL + 33, y);
      y += 5.5;
    });
  }

  // ─── TANDA TANGAN ─────────────────────────────────────────────────────────────
  const signX = pageW - marginR - 50;
  const signStartY = y - (bank ? 28 : 8);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(80, 70, 60);
  const tanggalStr = record.tanggal
    ? new Date(record.tanggal).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })
    : '';
  const kota = companySettings.kota || 'Bogor';
  doc.text(`${kota}, ${tanggalStr}`, signX, signStartY);

  // Stempel
  if (stempelB64) {
    doc.addImage(stempelB64, 'PNG', signX + 2, signStartY + 2, 30, 30, '', 'FAST');
  }

  // TTD
  if (ttdB64) {
    doc.addImage(ttdB64, 'PNG', signX + 6, signStartY + 8, 22, 18, '', 'FAST');
  }

  // Nama & jabatan penandatangan
  const namaDirektur = companySettings.nama_direktur || 'Umar Syarif';
  const signNameY = signStartY + 34;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(30, 20, 10);
  doc.text(namaDirektur, signX + 5, signNameY);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.text('Direktur', signX + 9, signNameY + 5);

  // Garis bawah halaman
  doc.setDrawColor(180, 140, 60);
  doc.setLineWidth(0.5);
  doc.line(marginL, 285, pageW - marginR, 285);

  // Save
  const filename = `${invoiceCode || 'invoice'}.pdf`.replace(/\//g, '-');
  doc.save(filename);
};