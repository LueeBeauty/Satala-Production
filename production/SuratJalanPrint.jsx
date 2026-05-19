import React, { useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Printer, X } from 'lucide-react';

function formatTanggal(dateStr) {
  if (!dateStr) return '-';
  const d = new Date(dateStr + (dateStr.includes('T') ? '' : 'T00:00:00'));
  return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
}

function formatRupiah(val) {
  if (!val && val !== 0) return '-';
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(val);
}

export default function SuratJalanPrint({ order, companySettings, onClose }) {
  const printRef = useRef();

  const handlePrint = () => {
    const content = printRef.current.innerHTML;
    const win = window.open('', '_blank', 'width=794,height=1123');
    win.document.write(`
      <!DOCTYPE html>
      <html lang="id">
      <head>
        <meta charset="UTF-8"/>
        <title>Surat Jalan — ${order.brand_name}</title>
        <style>
          * { box-sizing: border-box; margin: 0; padding: 0; }
          body { font-family: 'Arial', sans-serif; color: #1a1a1a; background: #fff; padding: 32px; font-size: 12px; }
          .page { max-width: 720px; margin: 0 auto; }
          .header { display: flex; align-items: flex-start; justify-content: space-between; border-bottom: 2.5px solid #111; padding-bottom: 16px; margin-bottom: 16px; }
          .logo-area img { max-height: 64px; max-width: 180px; object-fit: contain; }
          .logo-area .company-name { font-size: 18px; font-weight: 800; letter-spacing: -0.5px; color: #111; }
          .logo-area .company-addr { font-size: 10px; color: #555; margin-top: 3px; max-width: 260px; line-height: 1.5; }
          .doc-title-area { text-align: right; }
          .doc-title-area h1 { font-size: 22px; font-weight: 900; letter-spacing: 1px; text-transform: uppercase; color: #111; }
          .doc-title-area .doc-no { font-size: 11px; color: #555; margin-top: 4px; }
          .meta-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 20px; }
          .meta-box { background: #f9f9f9; border: 1px solid #e0e0e0; border-radius: 8px; padding: 12px 14px; }
          .meta-box h3 { font-size: 9px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; color: #888; margin-bottom: 6px; }
          .meta-row { display: flex; gap: 8px; margin-bottom: 3px; }
          .meta-label { font-size: 10px; color: #666; min-width: 90px; }
          .meta-value { font-size: 10px; font-weight: 600; color: #111; }
          .table-wrap { margin-bottom: 24px; }
          .table-wrap h3 { font-size: 9px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; color: #888; margin-bottom: 8px; }
          table { width: 100%; border-collapse: collapse; }
          thead th { background: #111; color: #fff; padding: 8px 10px; font-size: 10px; font-weight: 700; text-align: left; letter-spacing: 0.5px; }
          thead th:last-child { text-align: center; }
          tbody tr:nth-child(even) { background: #f5f5f5; }
          tbody td { padding: 8px 10px; font-size: 11px; border-bottom: 1px solid #e8e8e8; vertical-align: middle; }
          tbody td.qty { text-align: center; font-weight: 700; font-size: 12px; }
          .no-col { width: 36px; color: #888; font-size: 10px; }
          .footer-sign { display: flex; justify-content: flex-end; margin-top: 32px; }
          .sign-box { text-align: center; min-width: 180px; }
          .sign-box .sign-date { font-size: 10px; color: #555; margin-bottom: 52px; }
          .sign-box .sign-line { border-top: 1.5px solid #333; width: 100%; margin: 0 auto; }
          .sign-box .sign-name { font-size: 10px; font-weight: 700; margin-top: 4px; }
          .sign-box .sign-title { font-size: 9px; color: #666; }
          .notes-box { background: #fffbeb; border: 1px solid #fde68a; border-radius: 6px; padding: 10px 12px; margin-bottom: 20px; font-size: 10px; color: #92400e; }
          .stamp-area img { max-height: 80px; max-width: 80px; object-fit: contain; opacity: 0.85; }
          @media print {
            body { padding: 16px; }
            @page { margin: 12mm; size: A4; }
          }
        </style>
      </head>
      <body>
        <div class="page">${content}</div>
        <script>window.onload = () => { window.print(); window.close(); }<\/script>
      </body>
      </html>
    `);
    win.document.close();
  };

  const today = new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
  const orderDate = order.shipped_at ? formatTanggal(order.shipped_at) : today;

  // Kumpulkan item produk untuk surat jalan
  const items = [];

  // Komponen utama (botol, tutup, spray) — yang menjadi produk fisik
  const botolComps = (order.components || []).filter(c => c.category === 'botol' && c.item_name);
  botolComps.forEach(comp => {
    const ukuran = order.ukuran_botol_ml ? `${order.ukuran_botol_ml} ml` : '-';
    items.push({
      nama: `${order.product_name || order.brand_name}`,
      keterangan: ukuran,
      qty: order.final_qty || order.target_qty || comp.qty_needed || 0,
      satuan: 'pcs',
    });
  });

  // Jika tidak ada komponen botol, pakai data PO langsung
  if (items.length === 0) {
    items.push({
      nama: order.product_name || order.brand_name,
      keterangan: order.ukuran_botol_ml ? `${order.ukuran_botol_ml} ml` : '-',
      qty: order.final_qty || order.target_qty || 0,
      satuan: 'pcs',
    });
  }

  const noSurat = `SJ-${(order.order_number || '').toString().padStart(3, '0')}-${new Date().getFullYear()}`;
  const via = order.shipping_via || order.courier || '-';
  const kompanyName = companySettings?.nama_perusahaan || 'PT. Satala Dermatech Essential';
  const kompanyAddr = companySettings?.alamat_perusahaan || '';
  const kota = companySettings?.kota || '';
  const direktur = companySettings?.nama_direktur || '';
  const logoUrl = companySettings?.logo_url || '';
  const stempelUrl = companySettings?.stempel_url || '';
  const ttdUrl = companySettings?.ttd_url || '';

  const html = (
    <div>
      {/* HEADER */}
      <div className="header">
        <div className="logo-area">
          {logoUrl ? (
            <img src={logoUrl} alt="Logo" />
          ) : (
            <div className="company-name">{kompanyName}</div>
          )}
          {logoUrl && <div className="company-name" style={{fontSize:'14px',marginTop:'6px'}}>{kompanyName}</div>}
          {kompanyAddr && <div className="company-addr">{kompanyAddr}</div>}
        </div>
        <div className="doc-title-area">
          <h1>Surat Jalan</h1>
          <div className="doc-no">No: {noSurat}</div>
          <div className="doc-no">Tanggal: {orderDate}</div>
        </div>
      </div>

      {/* META INFO */}
      <div className="meta-grid">
        <div className="meta-box">
          <h3>Informasi Pengiriman</h3>
          <div className="meta-row"><span className="meta-label">Kepada</span><span className="meta-value">{order.brand_name}</span></div>
          <div className="meta-row"><span className="meta-label">Via</span><span className="meta-value">{via}</span></div>
          {order.tracking_number && (
            <div className="meta-row"><span className="meta-label">No. Resi</span><span className="meta-value">{order.tracking_number}</span></div>
          )}
          {order.shipping_address && (
            <div className="meta-row"><span className="meta-label">Alamat</span><span className="meta-value">{order.shipping_address}</span></div>
          )}
        </div>
        <div className="meta-box">
          <h3>Detail PO</h3>
          <div className="meta-row"><span className="meta-label">No. PO</span><span className="meta-value">#{order.order_number}</span></div>
          <div className="meta-row"><span className="meta-label">Produk</span><span className="meta-value">{order.product_name || order.brand_name}</span></div>
          {order.deadline && (
            <div className="meta-row"><span className="meta-label">Deadline</span><span className="meta-value">{formatTanggal(order.deadline)}</span></div>
          )}
          {order.notes && (
            <div className="meta-row"><span className="meta-label">Catatan</span><span className="meta-value">{order.notes}</span></div>
          )}
        </div>
      </div>

      {/* TABLE */}
      <div className="table-wrap">
        <h3>Rincian Barang</h3>
        <table>
          <thead>
            <tr>
              <th className="no-col">No.</th>
              <th>Nama Produk</th>
              <th>Keterangan (Ukuran)</th>
              <th style={{textAlign:'center'}}>Qty</th>
              <th style={{textAlign:'center'}}>Satuan</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, idx) => (
              <tr key={idx}>
                <td className="no-col">{idx + 1}</td>
                <td style={{fontWeight: 600}}>{item.nama}</td>
                <td>{item.keterangan}</td>
                <td className="qty">{item.qty > 0 ? item.qty.toLocaleString('id-ID') : '-'}</td>
                <td className="qty" style={{fontWeight: 400, color: '#555'}}>{item.satuan}</td>
              </tr>
            ))}
            {/* Row kosong dekoratif */}
            {Array(Math.max(0, 4 - items.length)).fill(0).map((_, i) => (
              <tr key={`empty-${i}`}><td>&nbsp;</td><td></td><td></td><td></td><td></td></tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Catatan */}
      {order.notes && (
        <div className="notes-box">
          <strong>Catatan:</strong> {order.notes}
        </div>
      )}

      {/* TANDA TANGAN */}
      <div className="footer-sign">
        <div className="sign-box">
          <div className="sign-date">{kota ? `${kota},` : ''} {orderDate}</div>
          {ttdUrl && (
            <div style={{textAlign:'center', marginBottom: '4px'}}>
              <img src={ttdUrl} alt="TTD" style={{maxHeight:'56px', maxWidth:'120px', objectFit:'contain', opacity: 0.85}} />
            </div>
          )}
          {stempelUrl && (
            <div className="stamp-area" style={{textAlign:'center', marginBottom:'4px'}}>
              <img src={stempelUrl} alt="Stempel" />
            </div>
          )}
          <div className="sign-line" />
          <div className="sign-name">{direktur || kompanyName}</div>
          <div className="sign-title">Pengirim</div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-background rounded-2xl shadow-2xl w-full max-w-3xl border border-border flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border shrink-0">
          <h2 className="font-display font-bold text-lg">Preview Surat Jalan</h2>
          <div className="flex items-center gap-2">
            <Button onClick={handlePrint} className="gap-2 bg-primary hover:bg-primary/90">
              <Printer className="w-4 h-4" /> Cetak / Simpan PDF
            </Button>
            <button onClick={onClose} className="w-8 h-8 rounded-lg hover:bg-muted flex items-center justify-center text-muted-foreground">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Preview */}
        <div className="flex-1 overflow-auto p-6 bg-muted/20">
          <div
            ref={printRef}
            className="bg-white shadow-xl rounded-xl p-8 max-w-[720px] mx-auto"
            style={{ fontFamily: 'Arial, sans-serif', color: '#1a1a1a', fontSize: '12px', minHeight: '900px' }}
          >
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', borderBottom: '2.5px solid #111', paddingBottom: '16px', marginBottom: '16px' }}>
              <div>
                {logoUrl ? (
                  <img src={logoUrl} alt="Logo" style={{ maxHeight: '64px', maxWidth: '180px', objectFit: 'contain' }} />
                ) : null}
                <div style={{ fontSize: logoUrl ? '14px' : '18px', fontWeight: 800, marginTop: logoUrl ? '6px' : '0', letterSpacing: '-0.5px' }}>{kompanyName}</div>
                {kompanyAddr && <div style={{ fontSize: '10px', color: '#555', marginTop: '3px', maxWidth: '260px', lineHeight: 1.5 }}>{kompanyAddr}</div>}
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '22px', fontWeight: 900, letterSpacing: '1px', textTransform: 'uppercase' }}>Surat Jalan</div>
                <div style={{ fontSize: '11px', color: '#555', marginTop: '4px' }}>No: {noSurat}</div>
                <div style={{ fontSize: '11px', color: '#555' }}>Tanggal: {orderDate}</div>
              </div>
            </div>

            {/* Meta */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '20px' }}>
              {[
                {
                  title: 'Informasi Pengiriman',
                  rows: [
                    ['Kepada', order.brand_name],
                    ['Via', via],
                    order.tracking_number ? ['No. Resi', order.tracking_number] : null,
                    order.shipping_address ? ['Alamat', order.shipping_address] : null,
                  ].filter(Boolean),
                },
                {
                  title: 'Detail PO',
                  rows: [
                    ['No. PO', `#${order.order_number}`],
                    ['Produk', order.product_name || order.brand_name],
                    order.deadline ? ['Deadline', formatTanggal(order.deadline)] : null,
                  ].filter(Boolean),
                },
              ].map((box, bi) => (
                <div key={bi} style={{ background: '#f9f9f9', border: '1px solid #e0e0e0', borderRadius: '8px', padding: '12px 14px' }}>
                  <div style={{ fontSize: '9px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', color: '#888', marginBottom: '6px' }}>{box.title}</div>
                  {box.rows.map(([label, value], ri) => (
                    <div key={ri} style={{ display: 'flex', gap: '8px', marginBottom: '3px' }}>
                      <span style={{ fontSize: '10px', color: '#666', minWidth: '90px' }}>{label}</span>
                      <span style={{ fontSize: '10px', fontWeight: 600 }}>{value}</span>
                    </div>
                  ))}
                </div>
              ))}
            </div>

            {/* Table */}
            <div style={{ marginBottom: '24px' }}>
              <div style={{ fontSize: '9px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', color: '#888', marginBottom: '8px' }}>Rincian Barang</div>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    {['No.', 'Nama Produk', 'Keterangan (Ukuran)', 'Qty', 'Satuan'].map((h, hi) => (
                      <th key={hi} style={{ background: '#111', color: '#fff', padding: '8px 10px', fontSize: '10px', fontWeight: 700, textAlign: hi > 2 ? 'center' : 'left', letterSpacing: '0.5px' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {items.map((item, idx) => (
                    <tr key={idx} style={{ background: idx % 2 === 1 ? '#f5f5f5' : '#fff' }}>
                      <td style={{ padding: '8px 10px', fontSize: '10px', color: '#888', width: '36px', borderBottom: '1px solid #e8e8e8' }}>{idx + 1}</td>
                      <td style={{ padding: '8px 10px', fontSize: '11px', fontWeight: 600, borderBottom: '1px solid #e8e8e8' }}>{item.nama}</td>
                      <td style={{ padding: '8px 10px', fontSize: '11px', borderBottom: '1px solid #e8e8e8' }}>{item.keterangan}</td>
                      <td style={{ padding: '8px 10px', fontSize: '12px', fontWeight: 700, textAlign: 'center', borderBottom: '1px solid #e8e8e8' }}>{item.qty > 0 ? item.qty.toLocaleString('id-ID') : '-'}</td>
                      <td style={{ padding: '8px 10px', fontSize: '11px', textAlign: 'center', color: '#555', borderBottom: '1px solid #e8e8e8' }}>{item.satuan}</td>
                    </tr>
                  ))}
                  {Array(Math.max(0, 4 - items.length)).fill(0).map((_, i) => (
                    <tr key={`e-${i}`} style={{ background: (items.length + i) % 2 === 1 ? '#f5f5f5' : '#fff' }}>
                      <td style={{ padding: '8px 10px', borderBottom: '1px solid #e8e8e8', height: '32px' }}></td>
                      <td style={{ padding: '8px 10px', borderBottom: '1px solid #e8e8e8' }}></td>
                      <td style={{ padding: '8px 10px', borderBottom: '1px solid #e8e8e8' }}></td>
                      <td style={{ padding: '8px 10px', borderBottom: '1px solid #e8e8e8' }}></td>
                      <td style={{ padding: '8px 10px', borderBottom: '1px solid #e8e8e8' }}></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Notes */}
            {order.notes && (
              <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: '6px', padding: '10px 12px', marginBottom: '20px', fontSize: '10px', color: '#92400e' }}>
                <strong>Catatan:</strong> {order.notes}
              </div>
            )}

            {/* Signature */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '32px' }}>
              <div style={{ textAlign: 'center', minWidth: '180px' }}>
                <div style={{ fontSize: '10px', color: '#555', marginBottom: '52px' }}>{kota ? `${kota},` : ''} {orderDate}</div>
                {ttdUrl && <img src={ttdUrl} alt="TTD" style={{ maxHeight: '56px', maxWidth: '120px', objectFit: 'contain', opacity: 0.85, display: 'block', margin: '0 auto 4px' }} />}
                {stempelUrl && <img src={stempelUrl} alt="Stempel" style={{ maxHeight: '80px', maxWidth: '80px', objectFit: 'contain', opacity: 0.85, display: 'block', margin: '0 auto 4px' }} />}
                <div style={{ borderTop: '1.5px solid #333', width: '100%' }} />
                <div style={{ fontSize: '10px', fontWeight: 700, marginTop: '4px' }}>{direktur || kompanyName}</div>
                <div style={{ fontSize: '9px', color: '#666' }}>Pengirim</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}