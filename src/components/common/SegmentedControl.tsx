import { useLayoutEffect, useRef, useState } from 'react';

interface Option<T extends string> { value: T; label: string }
interface Props<T extends string> {
  options: readonly Option<T>[];
  value: T;
  onChange: (v: T) => void;
  ariaLabel: string;
  size?: 'sm' | 'md';
  tone?: 'ink' | 'accent';
}

/** Pill toggle whose highlight slides between options. */
export function SegmentedControl<T extends string>({ options, value, onChange, ariaLabel, size = 'md', tone = 'ink' }: Props<T>) {
  const wrap = useRef<HTMLDivElement>(null);
  const [thumb, setThumb] = useState<{ x: number; w: number } | null>(null);

  useLayoutEffect(() => {
    const el = wrap.current;
    if (!el) return;
    const measure = () => {
      const btn = el.querySelector<HTMLButtonElement>(`[data-value="${CSS.escape(value)}"]`);
      if (btn) setThumb({ x: btn.offsetLeft, w: btn.offsetWidth });
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    void document.fonts?.ready.then(measure);
    return () => ro.disconnect();
  }, [value, options]);

  const pad = size === 'sm' ? 'h-6 px-2.5 text-[12px]' : 'h-7 px-3 text-[12.5px]';
  const activeText = tone === 'accent' ? 'text-accent' : 'text-fg';
  return (
    <div ref={wrap} role="radiogroup" aria-label={ariaLabel} className="relative inline-flex gap-0.5 rounded-[8px] bg-surface-2 p-0.5 ring-1 ring-inset ring-line">
      {thumb && (
        <span aria-hidden className="seg-thumb absolute left-0 top-0.5 bottom-0.5 rounded-[6px] bg-surface shadow-[0_1px_2px_rgb(0_0_0/0.08),0_0_0_1px_rgb(var(--line))]"
          style={{ transform: `translateX(${thumb.x}px)`, width: thumb.w }} />
      )}
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button key={o.value} type="button" role="radio" aria-checked={active} data-value={o.value} onClick={() => onChange(o.value)}
            className={`relative z-10 rounded-[6px] font-medium transition-colors duration-300 ${pad} ${active ? activeText : 'text-muted hover:text-fg'}`}>
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
