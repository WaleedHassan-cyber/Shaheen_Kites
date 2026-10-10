const STYLE = {
  paid: 'bg-leaf/10 text-leaf',
  partial: 'bg-kite/25 text-ink',
  unpaid: 'bg-kred/10 text-kred',
  deleted: 'bg-ink/10 text-ink/70',
};
const LABEL = { paid: 'Paid', partial: 'Partly paid', unpaid: 'Unpaid', deleted: 'Deleted' };

export default function StatusBadge({ status }) {
  return <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${STYLE[status]}`}>{LABEL[status]}</span>;
}
