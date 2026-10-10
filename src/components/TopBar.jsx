import { useEffect, useState } from 'react';
import { subscribePending } from '../api';

// Thin yellow bar at the top that runs whenever the app is talking to the server.
// It waits 150ms first so quick requests don't make it flicker.
export default function TopBar() {
  const [n, setN] = useState(0);
  const [show, setShow] = useState(false);
  useEffect(() => subscribePending(setN), []);
  useEffect(() => {
    if (n > 0) {
      const t = setTimeout(() => setShow(true), 150);
      return () => clearTimeout(t);
    }
    setShow(false);
  }, [n]);
  if (!show) return null;
  return (
    <div role="progressbar" aria-label="Loading" className="fixed inset-x-0 top-0 z-50 h-1 overflow-hidden bg-kite/30">
      <div className="h-full w-1/3 animate-bar bg-kite" />
    </div>
  );
}
