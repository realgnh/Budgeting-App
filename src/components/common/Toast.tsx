import { create } from 'zustand';
import { CheckCircle2, AlertTriangle } from 'lucide-react';

interface ToastState { msg: string | null; tone: 'ok' | 'error'; key: number; show: (msg: string, tone?: 'ok' | 'error') => void }
let timer: ReturnType<typeof setTimeout> | undefined;

export const useToast = create<ToastState>((set) => ({
  msg: null, tone: 'ok', key: 0,
  show: (msg, tone = 'ok') => {
    clearTimeout(timer);
    set((s) => ({ msg, tone, key: s.key + 1 }));
    timer = setTimeout(() => set({ msg: null }), tone === 'error' ? 4200 : 2400);
  },
}));
export const toast = (msg: string, tone: 'ok' | 'error' = 'ok') => useToast.getState().show(msg, tone);

export function ToastHost() {
  const { msg, tone, key } = useToast();
  if (!msg) return null;
  return (
    <div key={key} role="status" className="toast-in fixed bottom-5 left-1/2 z-[80] flex items-center gap-2 rounded-[9px] bg-fg px-3.5 py-2 text-[12.5px] font-medium text-bg shadow-pop">
      {tone === 'ok' ? <CheckCircle2 size={15} /> : <AlertTriangle size={15} />}{msg}
    </div>
  );
}
