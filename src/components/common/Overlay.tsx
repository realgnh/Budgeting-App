import { useEffect, useRef, useState, type ReactNode } from 'react';
import { X } from 'lucide-react';

function usePresence(open: boolean, exitMs: number) {
  const [mounted, setMounted] = useState(open);
  const [closing, setClosing] = useState(false);
  useEffect(() => {
    if (open) { setMounted(true); setClosing(false); return; }
    if (!mounted) return;
    setClosing(true);
    const t = setTimeout(() => { setMounted(false); setClosing(false); }, exitMs);
    return () => clearTimeout(t);
  }, [open, mounted, exitMs]);
  return { mounted, closing };
}

function useEscape(open: boolean, onClose: () => void) {
  useEffect(() => {
    if (!open) return;
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [open, onClose]);
}

interface Props { open: boolean; onClose: () => void; title: string; children: ReactNode; footer?: ReactNode; width?: number }

export function Modal({ open, onClose, title, children, footer, width = 520 }: Props) {
  const { mounted, closing } = usePresence(open, 170);
  useEscape(open, onClose);
  const panel = useRef<HTMLDivElement>(null);
  useEffect(() => { if (open) setTimeout(() => panel.current?.querySelector<HTMLElement>('[data-autofocus]')?.focus(), 30); }, [open]);
  if (!mounted) return null;
  return (
    <div className={`fixed inset-0 z-50 grid place-items-center bg-black/35 p-4 backdrop-blur-[2px] ${closing ? 'scrim-out' : 'scrim-in'}`} onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div ref={panel} role="dialog" aria-modal="true" aria-label={title} style={{ width: `min(${width}px, 100%)` }}
        className={`flex max-h-[calc(100vh-32px)] flex-col gap-4 overflow-auto rounded-[12px] border border-line bg-surface p-5 shadow-pop ${closing ? 'modal-out' : 'modal-in'}`}>
        <div className="flex items-center justify-between">
          <h3 className="text-[16px] font-semibold tracking-[-0.01em]">{title}</h3>
          <button type="button" className="btn btn-ghost btn-icon" onClick={onClose} aria-label="Close"><X size={16} /></button>
        </div>
        {children}
        {footer && <div className="flex justify-end gap-2">{footer}</div>}
      </div>
    </div>
  );
}

export function Drawer({ open, onClose, title, children }: Omit<Props, 'footer' | 'width'>) {
  const { mounted, closing } = usePresence(open, 210);
  useEscape(open, onClose);
  if (!mounted) return null;
  return (
    <>
      <div className={`fixed inset-0 z-50 bg-black/30 ${closing ? 'scrim-out' : 'scrim-in'}`} onMouseDown={onClose} />
      <aside role="dialog" aria-modal="true" aria-label={title}
        className={`fixed inset-y-0 right-0 z-50 flex w-[min(560px,100%)] flex-col overflow-y-auto border-l border-line bg-surface shadow-pop ${closing ? 'drawer-out' : 'drawer-in'}`}>
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-line bg-surface px-6 py-4">
          <h3 className="text-[16px] font-semibold tracking-[-0.01em]">{title}</h3>
          <button type="button" className="btn btn-ghost btn-icon" onClick={onClose} aria-label="Close"><X size={16} /></button>
        </div>
        <div className="flex flex-col gap-8 px-6 py-5">{children}</div>
      </aside>
    </>
  );
}
