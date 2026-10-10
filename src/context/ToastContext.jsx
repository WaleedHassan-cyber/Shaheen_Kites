import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { CheckCircle2, XCircle } from 'lucide-react';

const Ctx = createContext(null);
export const useToast = () => useContext(Ctx);

export function ToastProvider({ children }) {
  const [list, setList] = useState([]);
  const push = useCallback((type, text) => {
    const id = Date.now() + Math.random();
    setList((l) => [...l, { id, type, text }]);
    setTimeout(() => setList((l) => l.filter((t) => t.id !== id)), 3800);
  }, []);
  const api = useMemo(() => ({ success: (t) => push('ok', t), error: (t) => push('err', t) }), [push]);

  return (
    <Ctx.Provider value={api}>
      {children}
      <div aria-live="polite" className="pointer-events-none fixed inset-x-4 bottom-20 z-50 flex flex-col items-end gap-2 md:inset-x-auto md:bottom-6 md:right-6">
        {list.map((t) => (
          <div key={t.id} className={`animate-toast pointer-events-auto flex max-w-sm items-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold text-white shadow-lg ${t.type === 'ok' ? 'bg-ink' : 'bg-kred'}`}>
            {t.type === 'ok' ? <CheckCircle2 size={18} className="shrink-0 text-kite" /> : <XCircle size={18} className="shrink-0" />}
            {t.text}
          </div>
        ))}
      </div>
    </Ctx.Provider>
  );
}
