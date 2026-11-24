import { Database, Plus, WalletCards } from 'lucide-react';
import { useFinanceStore } from '../../store/useFinanceStore';
import { useUi } from '../../store/useUi';
import { toast } from './Toast';

export function EmptyState() {
  const loadDemoData = useFinanceStore((s) => s.loadDemoData);
  const openNew = useUi((s) => s.openNewTransaction);
  return (
    <div className="anim-fade-up flex flex-col items-center gap-3 rounded-2xl border border-dashed border-line-strong bg-surface px-5 py-10 text-center text-fg-2">
      <div className="grid h-12 w-12 place-items-center rounded-2xl bg-accent-soft text-accent"><WalletCards size={24} /></div>
      <h3 className="font-display text-[17px] font-extrabold text-fg">No transactions yet</h3>
      <p className="max-w-[46ch]">Log your first income or expense in EGP, SAR or USD, or load 14 months of sample data to explore every chart.</p>
      <div className="flex flex-wrap justify-center gap-2">
        <button type="button" className="btn btn-primary" onClick={openNew}><Plus size={15} />Add first transaction</button>
        <button type="button" className="btn" onClick={() => { loadDemoData(); toast('Demo data loaded'); }}><Database size={15} />Load demo data</button>
      </div>
    </div>
  );
}

export function ChartEmpty({ label, height = 200 }: { label: string; height?: number }) {
  return <div className="grid place-items-center rounded-xl border border-dashed border-line text-[12.5px] text-muted" style={{ height }}>{label}</div>;
}
