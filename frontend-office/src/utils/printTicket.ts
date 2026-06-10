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

function fmtUK(input?: string | null): string {
  if (!input) return '—';
  const d = new Date(input);
  if (isNaN(d.getTime())) return String(input);
  return d.toLocaleDateString('en-GB', {
    day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'Europe/London',
  });
}

function fmtUKDateTime(input?: string | null): string {
  if (!input) return '—';
  const d = new Date(input);
  if (isNaN(d.getTime())) return String(input);
  return d.toLocaleString('en-GB', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit', timeZone: 'Europe/London',
  });
}

function fmtChatTime(input: string): string {
  const d = new Date(input);
  if (isNaN(d.getTime())) return input;
  return d.toLocaleString('en-GB', {
    day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
    timeZone: 'Europe/London',
  });
}

export function printTicket(ticket: Ticket, origin: string, messages: Message[] = []) {
  const items = getLineItems(ticket);
  const totalQty = items.reduce((s, i) => s + i.quantity, 0);

  const deliveryRequested = ticket.delivery_request?.type === 'specific_date'
    ? fmtUK(ticket.delivery_request.date)
    : 'Next delivery';

  const statusLabel: Record<string, string> = {
    pending: 'Pending', query: 'Query', ordered: 'Ordered', archived: 'Completed',
  };
  const statusDot: Record<string, string> = {
    pending: '#0a0a0a', query: '#c81e1e', ordered: '#15803d', archived: '#737373',
  };

  const requestedRows = items.map((i, idx) => {
    const reason = escapeHtml(REASON_LABEL[i.reason] || i.reason);
    return `
      <tr>
        <td class="num">${String(idx + 1).padStart(2, '0')}</td>
        <td>
          <div class="desc">${escapeHtml(i.description)}</div>
          <div class="reason">${reason}</div>
        </td>
        <td class="qty">×${i.quantity}</td>
      </tr>`;
  }).join('');

  const orderedItems = ticket.ordered_items ?? [];
  const orderedRows = orderedItems.map((i, idx) => `
    <tr>
      <td class="num">${String(idx + 1).padStart(2, '0')}</td>
      <td>
        ${i.sap_code ? `<span class="mono code">${escapeHtml(i.sap_code)}</span>` : ''}
        <div class="desc">${escapeHtml(i.description)}</div>
      </td>
      <td class="qty">×${i.quantity}</td>
    </tr>`).join('');

  const orderedBlock = (ticket.po_number || orderedItems.length) ? `
    <section class="sec">
      <div class="sec-head">
        <span class="sec-label">What was ordered</span>
        <span class="sec-aux">${orderedItems.length} line${orderedItems.length === 1 ? '' : 's'}</span>
      </div>
      <div class="po-grid">
        <div><div class="k">Order number</div><div class="v mono">${escapeHtml(ticket.po_number || '—')}</div></div>
        <div><div class="k">Delivery date</div><div class="v tnum">${fmtUK(ticket.delivery_date)}</div></div>
      </div>
      ${orderedItems.length ? `
        <table class="items">
          <tbody>${orderedRows}</tbody>
        </table>` : ''}
    </section>` : '';

  const imageBlock = ticket.images.length ? `
    <section class="sec">
      <div class="sec-head">
        <span class="sec-label">Photos</span>
        <span class="sec-aux">${ticket.images.length} attached</span>
      </div>
      <div class="photos">${ticket.images.map((u, i) =>
        `<img src="${origin}${escapeHtml(u)}" alt="Photo ${i + 1}" />`).join('')}
      </div>
    </section>` : '';

  const messageBlock = messages.length ? `
    <section class="sec">
      <div class="sec-head">
        <span class="sec-label">Conversation</span>
        <span class="sec-aux">${messages.length} message${messages.length === 1 ? '' : 's'}</span>
      </div>
      <div class="chat">
        ${messages.map(m => {
          const isOffice = m.sender === 'office';
          const sender = isOffice ? 'Office' : 'Manager';
          const when = escapeHtml(fmtChatTime(m.created_at));
          const queryFlag = m.is_query ? `<span class="flag">Query</span>` : '';
          const parts: string[] = [];
          if (m.text) parts.push(`<p class="mtext">${escapeHtml(m.text)}</p>`);
          if (m.image_path) parts.push(`<img class="mimg" src="${origin}${escapeHtml(m.image_path)}" alt="Attachment" />`);
          if (m.audio_path) parts.push(`<p class="maudio">Voice note (not printable)</p>`);
          return `
            <div class="msg ${isOffice ? 'me' : 'them'}">
              <div class="mhead">
                <span class="msender">${sender}</span>
                <span class="mtime">${when}</span>
                ${queryFlag}
              </div>
              <div class="mbody">${parts.join('')}</div>
            </div>`;
        }).join('')}
      </div>
    </section>` : '';

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8" />
<title>Remedial Ticket ${escapeHtml(ticket.ref)}</title>
<style>
  :root {
    --ink: #0a0a0a;
    --muted: #525252;
    --subtle: #737373;
    --faint: #a3a3a3;
    --ghost: #d4d4d4;
    --line: #ededed;
    --line-2: #d4d4d4;
    --ordered: #15803d;
    --query: #c81e1e;
    --inbox: #a16207;
    --surface-2: #fafafa;
  }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    font-family: 'Inter', 'SF Pro Text', -apple-system, system-ui, sans-serif;
    font-feature-settings: 'cv11', 'ss01', 'ss03', 'ss07';
    letter-spacing: -0.011em;
    font-size: 13.5px;
    line-height: 1.5;
    color: var(--ink);
    background: #fff;
    -webkit-font-smoothing: antialiased;
  }
  .mono, .tnum { font-variant-numeric: tabular-nums; }
  .mono { font-family: 'JetBrains Mono', ui-monospace, SFMono-Regular, Menlo, monospace; }

  .page { max-width: 800px; margin: 0 auto; padding: 36px 48px 24px; }

  /* Header */
  .head {
    display: flex; align-items: flex-start; justify-content: space-between;
    gap: 24px; padding-bottom: 18px; border-bottom: 1px solid var(--line);
  }
  .head-l { display: flex; gap: 14px; align-items: center; }
  .mark {
    width: 44px; height: 44px; border-radius: 10px;
    background: var(--ink); color: #fff;
    display: grid; place-items: center; font-weight: 700; font-size: 18px;
  }
  .brand h1 { font-size: 18px; font-weight: 600; letter-spacing: -0.015em; line-height: 1.15; }
  .brand .sub {
    font-size: 11.5px; color: var(--ordered); font-weight: 500;
    display: inline-flex; align-items: center; gap: 5px; margin-top: 4px;
  }
  .brand .sub::before {
    content: ''; width: 5px; height: 5px; border-radius: 50%; background: var(--ordered);
  }
  .ref-block { text-align: right; }
  .ref-label {
    font-size: 10px; color: var(--faint); text-transform: uppercase;
    letter-spacing: 0.06em; font-weight: 600;
  }
  .ref-num {
    font-family: 'JetBrains Mono', ui-monospace, monospace;
    font-size: 17px; font-weight: 600; color: var(--ink); margin-top: 2px;
  }
  .status {
    margin-top: 6px; font-size: 11px;
    display: inline-flex; align-items: center; gap: 5px; color: var(--muted);
  }
  .status::before {
    content: ''; width: 7px; height: 7px; border-radius: 50%;
    background: ${statusDot[ticket.status] || '#737373'};
  }

  /* Title block */
  .title {
    padding: 22px 0 18px; border-bottom: 1px solid var(--line);
  }
  .title h2 {
    font-size: 24px; font-weight: 600; letter-spacing: -0.022em; line-height: 1.1;
    margin-bottom: 4px;
  }
  .title .where {
    font-size: 13px; color: var(--subtle);
    display: flex; gap: 10px;
  }
  .title .where span + span::before {
    content: '·'; margin-right: 10px; color: var(--ghost);
  }

  /* Meta grid */
  .meta {
    display: grid; grid-template-columns: repeat(4, 1fr);
    gap: 0; padding: 16px 0; border-bottom: 1px solid var(--line);
  }
  .meta .cell { padding-right: 12px; }
  .meta .k {
    font-size: 10px; color: var(--faint); text-transform: uppercase;
    letter-spacing: 0.06em; font-weight: 600;
  }
  .meta .v { font-size: 13px; font-weight: 500; color: var(--ink); margin-top: 3px; }
  .meta .v.mono { font-family: 'JetBrains Mono', ui-monospace, monospace; }

  /* Sections */
  .sec { padding: 22px 0; border-bottom: 1px solid var(--line); }
  .sec:last-of-type { border-bottom: 0; }
  .sec-head {
    display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 12px;
  }
  .sec-label {
    font-size: 10.5px; color: var(--faint); text-transform: uppercase;
    letter-spacing: 0.06em; font-weight: 600;
  }
  .sec-aux { font-size: 11.5px; color: var(--subtle); font-variant-numeric: tabular-nums; }

  /* Items table */
  table.items { width: 100%; border-collapse: collapse; }
  table.items td { padding: 12px 0; border-bottom: 1px solid var(--line); vertical-align: top; }
  table.items tr:last-child td { border-bottom: 0; }
  table.items td.num {
    width: 36px; font-family: 'JetBrains Mono', ui-monospace, monospace;
    font-size: 11px; color: var(--faint); font-weight: 500; padding-top: 14px;
  }
  table.items td.qty {
    width: 60px; text-align: right;
    font-family: 'JetBrains Mono', ui-monospace, monospace;
    font-size: 13px; font-weight: 500; color: var(--ink); padding-top: 14px;
  }
  table.items .code {
    font-size: 11px; color: var(--ordered); font-weight: 600; display: block;
  }
  table.items .desc { font-size: 13.5px; font-weight: 500; color: var(--ink); margin-top: 2px; }
  table.items .reason { font-size: 12px; color: var(--subtle); margin-top: 2px; }

  .totals {
    display: flex; justify-content: flex-end; gap: 16px;
    padding-top: 10px; font-size: 11.5px; color: var(--subtle);
  }
  .totals .tval {
    font-family: 'JetBrains Mono', ui-monospace, monospace;
    color: var(--ink); font-weight: 600; font-size: 13px;
  }

  /* Order info */
  .po-grid {
    display: grid; grid-template-columns: 1fr 1fr; gap: 16px;
    padding-bottom: 4px;
  }
  .po-grid .k {
    font-size: 10px; color: var(--faint); text-transform: uppercase;
    letter-spacing: 0.06em; font-weight: 600;
  }
  .po-grid .v { font-size: 14px; font-weight: 600; color: var(--ink); margin-top: 3px; }
  .po-grid .v.mono { font-family: 'JetBrains Mono', ui-monospace, monospace; }

  /* Photos */
  .photos { display: grid; grid-template-columns: repeat(4, 1fr); gap: 6px; }
  .photos img {
    width: 100%; aspect-ratio: 1; object-fit: cover;
    border: 1px solid var(--line); border-radius: 4px;
  }

  /* Chat */
  .chat { display: flex; flex-direction: column; gap: 10px; }
  .msg { max-width: 78%; page-break-inside: avoid; }
  .msg.them { align-self: flex-start; }
  .msg.me { align-self: flex-end; }
  .mhead {
    display: flex; gap: 8px; align-items: center;
    font-size: 10.5px; color: var(--faint); margin-bottom: 3px;
    font-family: 'JetBrains Mono', ui-monospace, monospace;
  }
  .msender { font-weight: 600; color: var(--muted); text-transform: lowercase; }
  .flag {
    background: var(--query); color: #fff; padding: 1px 6px; border-radius: 6px;
    font-family: 'Inter', sans-serif; font-weight: 600; letter-spacing: 0.04em; font-size: 9px; text-transform: uppercase;
  }
  .mbody {
    border: 1px solid var(--line); border-radius: 12px; padding: 10px 13px;
    font-size: 13px; color: var(--ink); line-height: 1.5;
  }
  .msg.me .mbody {
    background: var(--ink); color: #fff; border-color: var(--ink);
  }
  .mtext { white-space: pre-wrap; }
  .mimg { display: block; max-width: 220px; max-height: 220px; margin-top: 6px; border-radius: 6px; }
  .maudio { font-size: 11.5px; color: var(--faint); font-style: italic; margin-top: 4px; }

  /* Footer */
  .foot {
    margin-top: 24px; padding-top: 14px; border-top: 1px solid var(--line);
    display: flex; justify-content: space-between; align-items: flex-start;
    font-size: 10.5px; color: var(--faint); line-height: 1.5;
  }
  .foot .legal strong { color: var(--muted); font-weight: 600; }
  .foot .printed { text-align: right; font-variant-numeric: tabular-nums; }
  .foot .printed strong { color: var(--muted); font-weight: 600; }

  @media print {
    body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    .page { padding: 18px 28px; }
    .sec, .msg, .photos img { page-break-inside: avoid; }
  }
</style>
</head>
<body>
<div class="page">

  <header class="head">
    <div class="head-l">
      <div class="mark">R</div>
      <div class="brand">
        <h1>Remedial</h1>
        <div class="sub">Operations Control</div>
      </div>
    </div>
    <div class="ref-block">
      <div class="ref-label">Reference</div>
      <div class="ref-num">${escapeHtml(ticket.ref)}</div>
      <div class="status">${escapeHtml(statusLabel[ticket.status] || ticket.status)}</div>
    </div>
  </header>

  <div class="title">
    <h2>${escapeHtml(ticket.developer)}</h2>
    <div class="where">
      <span>${escapeHtml(ticket.site)}</span>
      <span>Plot ${escapeHtml(ticket.plot_number)}</span>
    </div>
  </div>

  <div class="meta">
    <div class="cell">
      <div class="k">Date raised</div>
      <div class="v tnum">${fmtUK(ticket.created_at)}</div>
    </div>
    <div class="cell">
      <div class="k">Last update</div>
      <div class="v tnum">${fmtUK(ticket.updated_at)}</div>
    </div>
    <div class="cell">
      <div class="k">Delivery requested</div>
      <div class="v tnum">${deliveryRequested}</div>
    </div>
    <div class="cell">
      <div class="k">Total items</div>
      <div class="v mono">×${totalQty}</div>
    </div>
  </div>

  <section class="sec">
    <div class="sec-head">
      <span class="sec-label">What was requested</span>
      <span class="sec-aux">${items.length} line${items.length === 1 ? '' : 's'}</span>
    </div>
    <table class="items">
      <tbody>${requestedRows}</tbody>
    </table>
  </section>

  ${orderedBlock}
  ${imageBlock}
  ${messageBlock}

  <div class="foot">
    <div class="legal">
      <strong>${escapeHtml(brand.legalName)}</strong> &middot; ${escapeHtml(brand.tagline)}<br/>
      System-generated. No signature required.
    </div>
    <div class="printed">
      <strong>Printed</strong> ${escapeHtml(fmtUKDateTime(new Date().toISOString()))}<br/>
      <strong>Ref</strong> <span class="mono">${escapeHtml(ticket.ref)}</span>
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
