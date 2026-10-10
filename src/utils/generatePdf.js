import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import qrcode from 'qrcode-generator';
import { BUSINESS } from '../config';
import { fmtDate } from './format';

// Colours taken from the Shaheen Lahori Kites invoice design.
const NAVY = [14, 42, 71];
const YELLOW = [255, 194, 14];
const RED = [215, 38, 61];
const GREEN = [22, 163, 74];
const LEAF = [22, 128, 60];
const PANEL = [243, 246, 250];
const LINE = [221, 228, 238];
const SOFT = [84, 98, 117];

const W = 210;
const H = 297;
const rs = (n) => `Rs ${Number(n || 0).toLocaleString('en-PK')}`;
const num = (n) => Number(n || 0).toLocaleString('en-PK');
const alpha = (doc, a) => doc.setGState(new doc.GState({ opacity: a }));

/** A kite made of four coloured triangles, rotated, with an optional curly tail. */
function kite(doc, cx, cy, hw, hh, deg, cols, tail = true) {
  const a = (deg * Math.PI) / 180;
  const P = (x, y) => [cx + x * Math.cos(a) - y * Math.sin(a), cy + x * Math.sin(a) + y * Math.cos(a)];
  const top = P(0, -hh), right = P(hw, 0), bottom = P(0, hh), left = P(-hw, 0);
  const tri = (p, q, c) => {
    doc.setFillColor(...c).setDrawColor(...c).setLineWidth(0.15);
    doc.triangle(cx, cy, p[0], p[1], q[0], q[1], 'FD');
  };
  tri(top, right, cols[0]); tri(right, bottom, cols[1]); tri(bottom, left, cols[2]); tri(left, top, cols[3]);
  if (tail) {
    doc.setDrawColor(...(cols[4] || [255, 255, 255])).setLineWidth(0.45);
    doc.lines([[-hw * 0.5, hh * 0.5, hw * 0.4, hh * 0.9, -hw * 0.2, hh * 1.4]], bottom[0], bottom[1], [1, 1], 'S');
    doc.setFillColor(...(cols[4] || [255, 255, 255]));
    doc.triangle(bottom[0] - hw * 0.35, bottom[1] + hh * 0.75, bottom[0] - hw * 0.05, bottom[1] + hh * 0.6, bottom[0] - hw * 0.2, bottom[1] + hh * 0.95, 'F');
  }
}

function pin(doc, x, y, c = NAVY) {
  doc.setFillColor(...c).circle(x, y - 1, 1.8, 'F');
  doc.triangle(x - 1.5, y - 0.2, x + 1.5, y - 0.2, x, y + 2.4, 'F');
  doc.setFillColor(255, 255, 255).circle(x, y - 1, 0.65, 'F');
}

const HH = 44; // header height
const mix = (a, b, t) => a.map((v, k) => Math.round(v + (b[k] - v) * t));

/** Draws a QR code as vector squares (crisp at any size) on a white card so it always scans. */
function drawQr(doc, text, x, y, size) {
  const qr = qrcode(0, 'M');
  qr.addData(text);
  qr.make();
  const n = qr.getModuleCount();
  const m = size / n;
  doc.setFillColor(255, 255, 255).roundedRect(x - 2, y - 2, size + 4, size + 4, 1.5, 1.5, 'F');
  doc.setFillColor(...NAVY);
  for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) if (qr.isDark(r, c)) doc.rect(x + c * m, y + r * m, m + 0.05, m + 0.05, 'F');
}

function header(doc) {
  doc.setFillColor(...NAVY).rect(0, 0, W, HH, 'F');

  // Sky on the right (light blue at the horizon). The navy fades into it between x=100 and x=150.
  // Every cell is drawn solid, so there are no see-through seams or stripes.
  const SKY_TOP = [86, 160, 230], SKY_BOT = [196, 224, 245];
  const rows = 22, rh = HH / rows, cols = 40, cw = 50 / cols;
  for (let r = 0; r < rows; r++) {
    const sky = mix(SKY_TOP, SKY_BOT, r / (rows - 1));
    doc.setFillColor(...sky).rect(150, r * rh, 60, rh + 0.2, 'F');
    for (let c = 0; c < cols; c++) {
      doc.setFillColor(...mix(sky, NAVY, 1 - (c + 0.5) / cols)).rect(100 + c * cw, r * rh, cw + 0.2, rh + 0.2, 'F');
    }
  }
  alpha(doc, 0.6);
  doc.setFillColor(255, 255, 255);
  [[160, 8, 9, 3], [178, 4, 8, 2.5], [200, 26, 8, 2.5], [182, 33, 10, 2.5]].forEach(([x, y, rx, ry]) => doc.ellipse(x, y, rx, ry, 'F'));
  alpha(doc, 1);

  // Old Lahore skyline (low buildings and a minaret) along the bottom right.
  doc.setFillColor(150, 64, 56).rect(150, 39, 60, 5, 'F');
  [[158, 4], [170, 5], [183, 4]].forEach(([x, r]) => doc.ellipse(x, 39, r, r * 0.8, 'F'));
  doc.rect(199, 21, 6, 23, 'F');
  doc.setFillColor(120, 48, 44).rect(199, 27, 6, 1.1, 'F').rect(199, 34, 6, 1.1, 'F');
  doc.setFillColor(150, 64, 56).ellipse(202, 21, 3.6, 3, 'F');
  doc.triangle(200, 18.6, 204, 18.6, 202, 14, 'F');

  // Kites in the sky.
  kite(doc, 166, 13, 14, 16, 28, [[20, 20, 25], RED, YELLOW, YELLOW, [30, 30, 40]], false);
  kite(doc, 140, 27, 8.5, 9.5, -20, [RED, YELLOW, YELLOW, RED, [255, 255, 255]]);
  kite(doc, 189, 21, 5, 6.5, 12, [[124, 58, 237], [91, 33, 182], [124, 58, 237], [91, 33, 182]], false);
  kite(doc, 195, 9, 4.5, 6, -10, [[249, 115, 22], [253, 186, 60], [249, 115, 22], [253, 186, 60]], false);

  // Logo kite + brand name.
  kite(doc, 22, 19, 10, 12, -20, [RED, YELLOW, YELLOW, RED, YELLOW]);
  doc.setFont('helvetica', 'bolditalic').setFontSize(29).setTextColor(...YELLOW).text(BUSINESS.name.replace(/\s*Kites$/i, ''), 40, 26);
  doc.setFont('helvetica', 'bold').setFontSize(12).setTextColor(255, 255, 255).text('KITES', 67, 34.5, { charSpace: 3 });
  doc.setDrawColor(255, 255, 255).setLineWidth(0.5).line(50, 33.5, 62, 33.5).line(96, 33.5, 108, 33.5);
  doc.setFont('helvetica', 'normal').setFontSize(9).setTextColor(255, 255, 255).text(BUSINESS.tagline.replace(/\s*\|\s*/g, '   |   '), 40, 41);

  doc.setFillColor(...YELLOW).rect(0, HH, W, 1.2, 'F');
}

// Faint kites bottom-left, drawn first so the invoice content sits over them.
function watermark(doc) {
  alpha(doc, 0.12);
  kite(doc, 24, 248, 10, 13, -12, [NAVY, NAVY, [90, 130, 180], [90, 130, 180], NAVY]);
  kite(doc, 47, 259, 6.5, 8.5, 10, [NAVY, NAVY, [90, 130, 180], [90, 130, 180], NAVY]);
  alpha(doc, 1);
}

const FH = 22; // footer height

function footer(doc) {
  const y0 = H - FH;
  doc.setFillColor(...NAVY).rect(0, y0, W, FH, 'F');
  doc.setFillColor(...YELLOW).rect(0, y0 - 1.4, W, 1.4, 'F');
  doc.setDrawColor(...YELLOW).setLineWidth(1.1);
  doc.lines([[26, -1.8, 54, -1.8, 80, -0.4]], 0, H - 2.2, [1, 1], 'S');

  // Skyline silhouette, kept clear of the text on both sides.
  alpha(doc, 0.55);
  doc.setFillColor(130, 160, 195);
  [[117, 4, 6], [122, 5, 9], [128, 3, 12], [138, 5, 8], [144, 4, 6]].forEach(([x, w, h]) => doc.rect(x, H - h, w, h, 'F'));
  doc.rect(131.4, H - 18, 1.7, 18, 'F');
  doc.triangle(130.2, H - 18, 134.3, H - 18, 132.2, H - 22, 'F');
  doc.ellipse(136, H - 6, 2.4, 2, 'F');
  alpha(doc, 1);

  pin(doc, 18, H - 12, YELLOW);
  doc.setFont('helvetica', 'bold').setFontSize(10).setTextColor(255, 255, 255).text(BUSINESS.city, 25, H - 12);
  doc.setFont('helvetica', 'normal').setFontSize(8.8).text(BUSINESS.tagline.replace(/\s*\|\s*/g, '  |  '), 25, H - 6.8);

  kite(doc, 153, H - 11, 5, 7, 0, [YELLOW, [240, 170, 0], YELLOW, [240, 170, 0], YELLOW], false);
  doc.setFont('helvetica', 'bolditalic').setFontSize(12).setTextColor(...YELLOW);
  doc.text('Kite Urao', W - 14, H - 12.5, { align: 'right' });
  doc.text('Khushiyan Bitao', W - 14, H - 6.5, { align: 'right' });
  doc.setDrawColor(...YELLOW).setLineWidth(0.6);
  doc.lines([[14, -2, 32, -2, 46, -0.8]], W - 60, H - 3.6, [1, 1], 'S');
}

export function generateInvoicePdf(inv) {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  header(doc);
  if (!inv.verifyCode) watermark(doc); // the QR block sits where the faint kites would be

  /* ---- Title and business details (left) ---- */
  doc.setFont('helvetica', 'bold').setFontSize(29).setTextColor(...NAVY).text('INVOICE', 14, 62);
  doc.setFontSize(14.5).text(BUSINESS.name, 14, 70.5);
  doc.setFont('helvetica', 'normal').setFontSize(10).text('Quality Kites for Every Season', 14, 77);

  pin(doc, 17, 87);
  doc.setFontSize(10).setTextColor(...NAVY).text(BUSINESS.city, 25, 87);
  doc.setFillColor(...NAVY).roundedRect(15.6, 91.2, 2.8, 4.6, 0.8, 0.8, 'F');
  doc.setFillColor(255, 255, 255).rect(16.5, 92.1, 1, 2.2, 'F');
  doc.text(BUSINESS.phone, 25, 94.5);
  doc.setFillColor(...GREEN).circle(17, 101.2, 2.3, 'F');
  doc.setDrawColor(255, 255, 255).setLineWidth(0.35).circle(17, 101.2, 1.3, 'S');
  doc.text(`WhatsApp: ${BUSINESS.phone}`, 25, 102);

  /* ---- Invoice details (right) ---- */
  doc.setDrawColor(...LINE).setLineWidth(0.4).line(114, 52, 114, 106);
  const meta = [['Invoice No:', inv.invoiceNo], ['Date:', fmtDate(inv.orderDate)]];
  if (inv.paymentMethod) meta.push(['Payment Method:', inv.paymentMethod]);
  meta.push(['Handled By:', inv.createdBy?.name || inv.createdByName || '-']); // the team member the customer can contact
  let my = 61;
  meta.forEach(([k, v]) => {
    doc.setFont('helvetica', 'bold').setFontSize(10).setTextColor(...NAVY).text(k, 122, my);
    doc.setFont('helvetica', 'normal').text(String(v).slice(0, 22), 161, my);
    my += 8;
  });
  doc.setFont('helvetica', 'bold').setFontSize(10).setTextColor(...NAVY).text('Status:', 122, my);
  const label = { paid: 'PAID', partial: 'PARTIAL PAID', unpaid: 'UNPAID' }[inv.status] || '';
  doc.setFontSize(8.5);
  const pw = doc.getTextWidth(label) + 10;
  doc.setFillColor(...(inv.status === 'unpaid' ? RED : GREEN)).roundedRect(161, my - 4.8, pw, 6.6, 3.3, 3.3, 'F');
  doc.setTextColor(255, 255, 255).text(label, 161 + pw / 2, my - 0.3, { align: 'center' });

  /* ---- Customer details ---- */
  const rows = [['Name:', inv.customer.name, false], ['Phone:', inv.customer.phone || '-', true]];
  if (inv.customer.address) rows.push(['Address:', inv.customer.address, false]);
  const by = 110, bh = 13 + rows.length * 6.5;
  doc.setFillColor(...PANEL).roundedRect(14, by, 182, bh, 3, 3, 'F');
  doc.setFillColor(...NAVY).circle(22.5, by + 5.2, 1.8, 'F');
  doc.ellipse(22.5, by + 9.6, 3.3, 2.2, 'F');
  doc.setFont('helvetica', 'bold').setFontSize(12).setTextColor(...NAVY).text('Customer Details', 30, by + 8);
  rows.forEach(([k, v, bold], i) => {
    const y = by + 16 + i * 6.5;
    doc.setFont('helvetica', 'normal').setFontSize(10).setTextColor(...SOFT).text(k, 20, y);
    doc.setFont('helvetica', bold ? 'bold' : 'normal').setTextColor(...NAVY).text(String(v), 56, y);
  });

  /* ---- Items table ---- */
  autoTable(doc, {
    startY: by + bh + 6,
    margin: { left: 14, right: 14, top: 20, bottom: 30 },
    head: [['#', 'Kite Type', 'Quantity', 'Rate (PKR)', 'Amount (PKR)']],
    body: inv.items.map((it, i) => [i + 1, it.name, num(it.quantity), num(it.unitPrice), num(it.lineTotal)]),
    theme: 'plain',
    styles: { fontSize: 10, textColor: NAVY, cellPadding: { top: 2.4, bottom: 2.4, left: 4, right: 4 } },
    headStyles: { fillColor: NAVY, textColor: 255, fontStyle: 'bold', halign: 'center' },
    columnStyles: {
      0: { cellWidth: 14, halign: 'center' },
      1: { halign: 'left' },
      2: { cellWidth: 34, halign: 'center' },
      3: { cellWidth: 36, halign: 'center' },
      4: { cellWidth: 42, halign: 'center' },
    },
    didParseCell: (d) => { if (d.section === 'head' && d.column.index === 1) d.cell.styles.halign = 'left'; },
    didDrawCell: (d) => {
      if (d.section !== 'body') return;
      doc.setDrawColor(...LINE).setLineWidth(0.3).line(d.cell.x, d.cell.y + d.cell.height, d.cell.x + d.cell.width, d.cell.y + d.cell.height);
    },
  });

  /* ---- Notes (left) and totals (right) ---- */
  const hasDisc = inv.discountAmount > 0;
  const boxH = 34 + (hasDisc ? 14 : 0);
  let top = doc.lastAutoTable.finalY + 8;
  if (top + boxH + 24 > H - 24) { doc.addPage(); top = 20; }

  doc.setDrawColor(...NAVY).setLineWidth(0.5).roundedRect(14, top, 5.5, 7, 0.8, 0.8, 'S');
  doc.setLineWidth(0.3).line(15.4, top + 2.4, 18.1, top + 2.4).line(15.4, top + 4, 18.1, top + 4);
  doc.setFont('helvetica', 'bold').setFontSize(11).setTextColor(...NAVY).text('Notes', 23, top + 5);
  doc.setFont('helvetica', 'normal').setFontSize(10).setTextColor(...SOFT).text('Thank you for supporting', 23, top + 12);
  doc.setFont('helvetica', 'bold').setTextColor(...NAVY).text(`${BUSINESS.name}!`, 23, top + 17.5);
  doc.setFont('times', 'bolditalic').setFontSize(14).text('Fly High, Reach Your Dreams!', 24, top + 26, { angle: 3 });
  doc.setDrawColor(...YELLOW).setLineWidth(0.8).lines([[20, -2.5, 42, -2.5, 62, -4.5]], 26, top + 30, [1, 1], 'S');

  const bx = 112, bw = 84;
  doc.setFillColor(...PANEL).roundedRect(bx, top, bw, boxH, 3, 3, 'F');
  let ry = top + 8.5;
  const small = (k, v) => {
    doc.setFont('helvetica', 'normal').setFontSize(10).setTextColor(...NAVY).text(k, bx + 6, ry);
    doc.text(v, bx + bw - 6, ry, { align: 'right' });
    ry += 7;
  };
  if (hasDisc) {
    small('Subtotal', rs(inv.subtotal));
    small(`Discount${inv.discountType === 'percent' ? ` (${inv.discountValue}%)` : ''}`, `- ${rs(inv.discountAmount)}`);
  }
  const big = (k, v, color, strong, last) => {
    doc.setFont('helvetica', strong ? 'bold' : 'normal').setFontSize(10.5).setTextColor(...NAVY).text(k, bx + 6, ry);
    doc.setFont('helvetica', 'bold').setFontSize(strong ? 14 : 13).setTextColor(...color).text(v, bx + bw - 6, ry, { align: 'right' });
    if (!last) doc.setDrawColor(...LINE).setLineWidth(0.3).line(bx + 6, ry + 3.3, bx + bw - 6, ry + 3.3);
    ry += 10.5;
  };
  big('Total Bill', rs(inv.grandTotal), NAVY, true);
  big('Paid Amount', rs(inv.amountPaid), LEAF, false);
  big('Remaining Balance', rs(inv.balance), inv.balance > 0 ? RED : LEAF, false, true);

  /* ---- Signature ---- */
  const sy = Math.max(top + boxH + 9, H - 46);
  doc.setFont('times', 'italic').setFontSize(20).setTextColor(...NAVY).text(BUSINESS.name, 163, sy, { align: 'center' });
  doc.setDrawColor(...NAVY).setLineWidth(0.4).line(127, sy + 3.5, 199, sy + 3.5);
  doc.setFont('helvetica', 'normal').setFontSize(8.5).text('Authorized Signature', 163, sy + 8, { align: 'center' });

  /* ---- Verification: QR + code. Anyone can scan it to check the invoice is real ---- */
  if (inv.verifyCode) {
    drawQr(doc, `${window.location.origin}/verify/${inv.verifyCode}`, 16, sy - 9, 22);
    doc.setFont('helvetica', 'bold').setFontSize(8.5).setTextColor(...NAVY).text('Scan to verify this invoice', 44, sy - 4);
    doc.setFontSize(9.5).text(`Code: ${inv.verifyCode.match(/.{1,4}/g).join('-')}`, 44, sy + 1.5);
    doc.setFont('helvetica', 'normal').setFontSize(7.5).setTextColor(...SOFT).text("An invoice that can't be verified is not genuine.", 44, sy + 6.5);
    doc.text(`${window.location.host}/verify`, 44, sy + 10.5);
  }

  // Footer band on every page.
  for (let p = 1; p <= doc.getNumberOfPages(); p++) {
    doc.setPage(p);
    footer(doc);
  }

  doc.save(`${inv.invoiceNo}.pdf`);
}