export const money = (n) => `Rs. ${Number(n || 0).toLocaleString('en-PK')}`;
export const fmtDate = (d) =>
  new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC' });
export const todayISO = () => new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Karachi' });

// Preview math for the form. The server recalculates everything on save.
export function calcTotals(lines, discountType, discountValue, paid) {
  const subtotal = lines.reduce((s, l) => s + l.lineTotal, 0);
  let discountAmount = discountType === 'percent' ? Math.round((subtotal * discountValue) / 100) : discountValue;
  discountAmount = Math.min(Math.max(discountAmount, 0), subtotal);
  const grandTotal = subtotal - discountAmount;
  return { subtotal, discountAmount, grandTotal, balance: grandTotal - paid };
}
