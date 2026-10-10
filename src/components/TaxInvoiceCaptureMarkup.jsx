import PropTypes from 'prop-types';

function formatInvoiceDateLabel(iso) {
  const d = iso ? new Date(iso) : new Date();
  if (Number.isNaN(d.getTime())) return '';
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
}

/**
 * Plain DOM + inline styles for reliable html2canvas capture (bot widget + seller preview).
 */
export default function TaxInvoiceCaptureMarkup({
  businessName,
  phone,
  email,
  orderNo,
  invoiceDateIso,
  customerName,
  customerPhone,
  lines,
  total,
}) {
  const contactParts = [];
  if (phone) contactParts.push(`Mobile: ${phone}`);
  if (email) contactParts.push(`Email: ${email}`);
  const contactLine = contactParts.join(' | ');
  const hr = { border: 0, borderTop: '1px solid #cbd5e1', margin: '12px 0' };

  return (
    <div
      style={{
        width: 540,
        padding: '28px 24px',
        backgroundColor: '#ffffff',
        fontFamily: 'Arial, Helvetica, sans-serif',
        color: '#0f172a',
        boxSizing: 'border-box',
      }}
    >
      <div style={{ textAlign: 'center', fontSize: 22, fontWeight: 700, marginBottom: 8 }}>{businessName || 'Seller'}</div>
      {contactLine ? (
        <div style={{ textAlign: 'center', fontSize: 12, color: '#475569', marginBottom: 4 }}>{contactLine}</div>
      ) : null}
      <hr style={hr} />
      <div style={{ textAlign: 'center', fontSize: 15, fontWeight: 700, letterSpacing: '0.04em', margin: '10px 0' }}>ONLINE INVOICE</div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', fontSize: 12, gap: 16 }}>
        <div style={{ flex: 1 }}>
          <div style={{ marginBottom: 4 }}>
            <strong>Order No:</strong> {orderNo}
          </div>
          <div>
            <strong>Date:</strong> {formatInvoiceDateLabel(invoiceDateIso)}
          </div>
        </div>
        <div style={{ textAlign: 'right', flex: 1 }}>
          <div>
            <strong>Customer:</strong> {customerName || '—'}
          </div>
          {customerPhone ? (
            <div style={{ marginTop: 6 }}>
              <strong>Contact:</strong> {customerPhone}
            </div>
          ) : null}
        </div>
      </div>
      <hr style={hr} />
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12, border: '1px solid #cbd5e1' }}>
        <thead>
          <tr style={{ backgroundColor: '#f1f5f9' }}>
            {['Sr', 'Item', 'Qty', 'Rate', 'GST', 'Amount'].map((h) => (
              <th
                key={h}
                style={{
                  border: '1px solid #cbd5e1',
                  padding: '8px 6px',
                  textAlign: h === 'Item' ? 'left' : 'center',
                  fontWeight: 700,
                }}
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {(lines || []).map((row) => (
            <tr key={row.sr}>
              <td style={{ border: '1px solid #cbd5e1', padding: '8px 6px', textAlign: 'center' }}>{row.sr}</td>
              <td style={{ border: '1px solid #cbd5e1', padding: '8px 6px' }}>{row.item}</td>
              <td style={{ border: '1px solid #cbd5e1', padding: '8px 6px', textAlign: 'center' }}>{row.qty}</td>
              <td style={{ border: '1px solid #cbd5e1', padding: '8px 6px', textAlign: 'right' }}>₹{Number(row.rate).toFixed(2)}</td>
              <td style={{ border: '1px solid #cbd5e1', padding: '8px 6px', textAlign: 'center' }}>{Number(row.gstPct || 0).toFixed(2)}%</td>
              <td style={{ border: '1px solid #cbd5e1', padding: '8px 6px', textAlign: 'right' }}>₹{Number(row.amount).toFixed(2)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div style={{ textAlign: 'right', marginTop: 14, fontSize: 15, fontWeight: 700 }}>Total: ₹{Number(total).toFixed(2)}</div>
      <hr style={hr} />
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 28, fontSize: 12, color: '#334155' }}>
        <div>
          <div style={{ marginTop: 36, borderTop: '1px solid #94a3b8', paddingTop: 6, width: 180 }}>Customer Signature</div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontWeight: 700, marginBottom: 4 }}>{businessName || 'Seller'}</div>
          <div style={{ marginTop: 28, borderTop: '1px solid #94a3b8', paddingTop: 6, width: 200, marginLeft: 'auto' }}>Authorized Signature</div>
        </div>
      </div>
      <div style={{ textAlign: 'center', marginTop: 22, fontSize: 11, color: '#94a3b8' }}>Thank you for your business!</div>
    </div>
  );
}

TaxInvoiceCaptureMarkup.propTypes = {
  businessName: PropTypes.string,
  phone: PropTypes.string,
  email: PropTypes.string,
  orderNo: PropTypes.string,
  invoiceDateIso: PropTypes.string,
  customerName: PropTypes.string,
  customerPhone: PropTypes.string,
  lines: PropTypes.arrayOf(
    PropTypes.shape({
      sr: PropTypes.number,
      item: PropTypes.string,
      qty: PropTypes.number,
      rate: PropTypes.number,
      gstPct: PropTypes.number,
      amount: PropTypes.number,
    }),
  ),
  total: PropTypes.number,
};
