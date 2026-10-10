export const Skeleton = ({ className = '' }) => <div className={`skeleton ${className}`} aria-hidden="true" />;

// Goes inside a <tbody> while the first page of data is loading.
export function TableSkeleton({ rows = 6, cols = 6 }) {
  return Array.from({ length: rows }).map((_, r) => (
    <tr key={r}>
      {Array.from({ length: cols }).map((__, c) => (
        <td key={c} className="td"><Skeleton className="h-4 w-full max-w-[8rem]" /></td>
      ))}
    </tr>
  ));
}
