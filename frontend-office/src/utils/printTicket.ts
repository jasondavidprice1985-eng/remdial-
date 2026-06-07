import { brand } from '@shared/brand';
import { Message, Ticket } from '@shared/types';
import { REASON_LABEL } from '../constants/reasons';

function escapeHtml(s: string): string {
  const d = document.createElement('div');
  d.textContent = s;
  return d.innerHTML;
}

function getLineItems(ticket: Ticket) {
  if (ticket.line_items?.length) return ticket.line_items;
  return [{ description: ticket.items, quantity: ticket.quantity, reason: ticket.reason }];
}

function fmt(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' });
}

function fmtDateTime(dateStr: string) {
  return new Date(dateStr).toLocaleString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });
}

export function printTicket(ticket: Ticket, origin: string, messages: Message[] = []) {
  const items = getLineItems(ticket);
  const totalQty = items.reduce((s, i) => s + i.quantity, 0);

  const rows = items.map((i, idx) => `
    <tr class="${idx % 2 === 1 ? 'alt' : ''}">
      <td class="desc">${escapeHtml(i.description)}</td>
      <td class="center">${i.quantity}</td>
      <td>${escapeHtml(REASON_LABEL[i.reason] || i.reason)}</td>
    </tr>`).join('');

  const deliveryType = ticket.delivery_request?.type === 'specific_date' ? 'Specific Date' : 'Next Delivery';

  const orderBlock = ticket.po_number ? `
    <div class="order-box">
      <div class="order-row"><span class="order-label">Order Number</span><span class="order-val">${escapeHtml(ticket.po_number)}</span></div>
      <div class="order-row"><span class="order-label">Delivery</span><span class="order-val">${ticket.delivery_date ? fmt(ticket.delivery_date) : deliveryType}</span></div>
    </div>` : '';

  const imageBlock = ticket.images.length ? `
    <div class="section-title">Supporting Images</div>
    <div class="images">${ticket.images.map((u, i) =>
      `<img src="${origin}${u}" alt="Photo ${i + 1}" />`).join('')}
    </div>` : '';

  const messageBlock = messages.length ? `
    <div class="section-title">Messages</div>
    <div class="messages">
      ${messages.map(m => {
        const sender = escapeHtml(m.sender === 'office' ? 'Office' : 'Manager');
        const when = escapeHtml(fmtDateTime(m.created_at));
        const queryFlag = m.is_query
          ? `<span class="msg-flag">Needs Clarification</span>`
          : '';
        const body: string[] = [];
        if (m.text) body.push(`<p class="msg-text">${escapeHtml(m.text)}</p>`);
        if (m.image_path) body.push(`<img class="msg-image" src="${origin}${escapeHtml(m.image_path)}" alt="Attachment" />`);
        if (m.audio_path) body.push(`<p class="msg-audio">🔊 Voice note (audio not printable)</p>`);
        return `
          <div class="msg ${m.sender === 'office' ? 'office' : 'manager'}">
            <div class="msg-header">
              <span class="msg-sender">${sender}</span>
              <span class="msg-time">${when}</span>
              ${queryFlag}
            </div>
            ${body.join('')}
          </div>`;
      }).join('')}
    </div>` : '';

  const statusLabel: Record<string, string> = {
    pending: 'Pending', query: 'Query', ordered: 'Ordered', archived: 'Completed',
  };
  const statusColor: Record<string, string> = {
    pending: '#2563eb', query: '#dc2626', ordered: '#16a34a', archived: '#6b7280',
  };

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8" />
<title>Works Order ${escapeHtml(ticket.ref)}</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Arial', sans-serif; font-size: 12px; color: #1a1a1a; background: #fff; }

  .page { max-width: 780px; margin: 0 auto; padding: 32px 40px; }

  /* Header */
  .header { display: flex; justify-content: space-between; align-items: flex-start; padding-bottom: 20px; border-bottom: 3px solid #1e293b; margin-bottom: 24px; }
  .brand { font-size: 22px; font-weight: 900; letter-spacing: -0.5px; color: #1e293b; text-transform: uppercase; }
  .brand span { color: #c5a572; }
  .doc-title { font-size: 11px; color: #64748b; font-weight: 600; letter-spacing: 1.5px; text-transform: uppercase; margin-top: 3px; }
  .ref-block { text-align: right; }
  .ref-num { font-size: 20px; font-weight: 900; font-family: 'Courier New', monospace; color: #1e293b; letter-spacing: 1px; }
  .ref-label { font-size: 10px; color: #94a3b8; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 2px; }

  /* Meta grid */
  .meta-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 0; margin-bottom: 24px; border: 1px solid #e2e8f0; border-radius: 6px; overflow: hidden; }
  .meta-cell { padding: 10px 14px; border-right: 1px solid #e2e8f0; border-bottom: 1px solid #e2e8f0; }
  .meta-cell:nth-child(even) { border-right: none; }
  .meta-cell:nth-last-child(-n+2) { border-bottom: none; }
  .meta-label { font-size: 9px; text-transform: uppercase; letter-spacing: 1px; color: #94a3b8; font-weight: 700; margin-bottom: 3px; }
  .meta-val { font-size: 13px; font-weight: 600; color: #1e293b; }

  /* Status badge */
  .status-badge { display: inline-block; padding: 2px 10px; border-radius: 100px; font-size: 11px; font-weight: 700; letter-spacing: 0.5px; color: #fff; background: ${statusColor[ticket.status] || '#64748b'}; }

  /* Table */
  .section-title { font-size: 9px; text-transform: uppercase; letter-spacing: 1.5px; color: #94a3b8; font-weight: 700; margin-bottom: 8px; margin-top: 20px; }
  table { width: 100%; border-collapse: collapse; border: 1px solid #e2e8f0; border-radius: 6px; overflow: hidden; }
  thead tr { background: #1e293b; }
  thead th { padding: 9px 12px; text-align: left; font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; color: #94a3b8; }
  thead th.center { text-align: center; }
  tbody tr { border-top: 1px solid #f1f5f9; }
  tbody tr.alt { background: #f8fafc; }
  tbody td { padding: 9px 12px; color: #334155; font-size: 12px; }
  tbody td.center { text-align: center; font-weight: 600; color: #1e293b; }
  tbody td.desc { font-weight: 500; color: #1e293b; }
  .table-footer { display: flex; justify-content: flex-end; padding: 8px 12px; border-top: 2px solid #e2e8f0; background: #f8fafc; }
  .total-label { font-size: 10px; text-transform: uppercase; letter-spacing: 1px; color: #64748b; font-weight: 700; margin-right: 16px; }
  .total-val { font-size: 13px; font-weight: 900; color: #1e293b; }

  /* Order box */
  .order-box { border: 1px solid #bbf7d0; background: #f0fdf4; border-radius: 6px; padding: 12px 16px; margin-top: 16px; }
  .order-row { display: flex; justify-content: space-between; padding: 3px 0; }
  .order-label { font-size: 10px; text-transform: uppercase; letter-spacing: 1px; color: #16a34a; font-weight: 700; }
  .order-val { font-size: 12px; font-weight: 700; color: #14532d; }

  /* Images */
  .images { display: flex; gap: 10px; flex-wrap: wrap; margin-top: 8px; }
  .images img { width: 110px; height: 110px; object-fit: cover; border: 1px solid #e2e8f0; border-radius: 4px; }

  /* Messages */
  .messages { display: flex; flex-direction: column; gap: 8px; margin-top: 8px; }
  .msg { border: 1px solid #e2e8f0; border-radius: 6px; padding: 8px 10px; background: #fff; page-break-inside: avoid; }
  .msg.office { background: #f8fafc; border-color: #cbd5e1; }
  .msg.manager { background: #eff6ff; border-color: #bfdbfe; }
  .msg-header { display: flex; align-items: center; gap: 8px; margin-bottom: 4px; font-size: 10px; }
  .msg-sender { font-weight: 700; color: #1e293b; text-transform: uppercase; letter-spacing: 0.5px; }
  .msg-time { color: #94a3b8; }
  .msg-flag { background: #dc2626; color: #fff; padding: 1px 6px; border-radius: 100px; font-size: 9px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; }
  .msg-text { font-size: 12px; color: #1e293b; white-space: pre-wrap; }
  .msg-image { display: block; max-width: 200px; max-height: 200px; margin-top: 4px; border-radius: 4px; border: 1px solid #e2e8f0; }
  .msg-audio { font-size: 11px; color: #64748b; font-style: italic; margin-top: 2px; }

  /* Footer */
  .footer { margin-top: 32px; padding-top: 12px; border-top: 1px solid #e2e8f0; display: flex; justify-content: space-between; }
  .footer-col { font-size: 10px; color: #94a3b8; line-height: 1.7; }
  .footer-col strong { color: #64748b; }

  @media print {
    body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    .page { padding: 16px 24px; }
    .msg { page-break-inside: avoid; }
    .images img { page-break-inside: avoid; }
  }
</style>
</head>
<body>
<div class="page">

  <div class="header">
    <div>
      <div class="brand">System<span>22</span></div>
      <div class="doc-title">${escapeHtml(brand.copy.worksOrder)}</div>
    </div>
    <div class="ref-block">
      <div class="ref-label">Reference</div>
      <div class="ref-num">${escapeHtml(ticket.ref)}</div>
    </div>
  </div>

  <div class="meta-grid">
    <div class="meta-cell">
      <div class="meta-label">Developer</div>
      <div class="meta-val">${escapeHtml(ticket.developer)}</div>
    </div>
    <div class="meta-cell">
      <div class="meta-label">Status</div>
      <div class="meta-val"><span class="status-badge">${escapeHtml(statusLabel[ticket.status] || ticket.status)}</span></div>
    </div>
    <div class="meta-cell">
      <div class="meta-label">Site</div>
      <div class="meta-val">${escapeHtml(ticket.site)}</div>
    </div>
    <div class="meta-cell">
      <div class="meta-label">Plot Number</div>
      <div class="meta-val">${escapeHtml(ticket.plot_number)}</div>
    </div>
    <div class="meta-cell">
      <div class="meta-label">Date Raised</div>
      <div class="meta-val">${fmt(ticket.created_at)}</div>
    </div>
    <div class="meta-cell">
      <div class="meta-label">Delivery Request</div>
      <div class="meta-val">${deliveryType}</div>
    </div>
  </div>

  <div class="section-title">Line Items</div>
  <table>
    <thead>
      <tr>
        <th>Description</th>
        <th class="center" style="width:60px">Qty</th>
        <th style="width:180px">Reason</th>
      </tr>
    </thead>
    <tbody>${rows}</tbody>
  </table>
  <div class="table-footer">
    <span class="total-label">Total Items</span>
    <span class="total-val">${totalQty}</span>
  </div>

  ${orderBlock}
  ${imageBlock}
  ${messageBlock}

  <div class="footer">
    <div class="footer-col">
      <strong>${escapeHtml(brand.legalName)}</strong> · ${escapeHtml(brand.tagline)}<br/>
      This document is system-generated and does not require a signature.
    </div>
    <div class="footer-col" style="text-align:right">
      <strong>Printed</strong> ${new Date().toLocaleString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}<br/>
      <strong>Last Updated</strong> ${fmt(ticket.updated_at)}
    </div>
  </div>

</div>
</body>
</html>`;

  const win = window.open('', '_blank');
  if (!win) return;
  win.document.write(html);
  win.document.close();
  win.focus();
  win.print();
}
