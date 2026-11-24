import { useMemo, useState } from 'react';
import { Check, Pencil, Plus, Trash2 } from 'lucide-react';
import { useFinanceStore } from '../../store/useFinanceStore';
import type { Category, TransactionType } from '../../types/finance';
import { CATEGORY_SWATCHES } from '../../lib/seed';
import { CATEGORY_ICONS, CategoryIcon } from '../common/CategoryIcon';
import { SegmentedControl } from '../common/SegmentedControl';
import { toast } from '../common/Toast';

interface Draft { name: string; color: string; icon: string }

export function CategoryEditor() {
  const { categories, transactions, addCategory, updateCategory, deleteCategory } = useFinanceStore();
  const [type, setType] = useState<TransactionType>('expense');
  const [draft, setDraft] = useState<Draft>({ name: '', color: CATEGORY_SWATCHES[0], icon: 'sparkles' });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<{ id: string; to: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const list = categories.filter((c) => c.type === type);
  const counts = useMemo(() => {
    const m = new Map<string, number>();
    for (const t of transactions) m.set(t.categoryId, (m.get(t.categoryId) ?? 0) + 1);
    return m;
  }, [transactions]);

  const resetDraft = () => { setDraft({ name: '', color: CATEGORY_SWATCHES[(list.length + 1) % CATEGORY_SWATCHES.length], icon: 'sparkles' }); setEditingId(null); setError(null); };
  const nameTaken = (name: string) => categories.some((c) => c.type === type && c.id !== editingId && c.name.trim().toLowerCase() === name.trim().toLowerCase());

  const submit = () => {
    const name = draft.name.trim();
    if (!name) return setError('Give the category a name.');
    if (name.length > 32) return setError('Keep the name under 32 characters.');
    if (nameTaken(name)) return setError(`There is already a ${type} category called “${name}”.`);
    if (editingId) { updateCategory(editingId, { name, color: draft.color, icon: draft.icon }); toast(`Updated “${name}”`); }
    else { addCategory({ name, type, color: draft.color, icon: draft.icon }); toast(`Added “${name}”`); }
    resetDraft();
  };
  const startEdit = (c: Category) => { setEditingId(c.id); setDraft({ name: c.name, color: c.color, icon: c.icon }); setError(null); setDeleting(null); };
  const startDelete = (c: Category) => {
    setError(null);
    if (list.length <= 1) return setError(`Keep at least one ${type} category.`);
    setDeleting({ id: c.id, to: list.find((x) => x.id !== c.id)!.id });
  };
  const confirmDelete = (c: Category) => {
    try {
      const n = counts.get(c.id) ?? 0;
      deleteCategory(c.id, n ? deleting!.to : undefined);
      const dest = categories.find((x) => x.id === deleting!.to);
      toast(n ? `Deleted “${c.name}” and moved ${n} ${n === 1 ? 'transaction' : 'transactions'} to “${dest?.name}”` : `Deleted “${c.name}”`);
      setDeleting(null);
      if (editingId === c.id) resetDraft();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not delete this category.');
    }
  };

  return (
    <section className="flex flex-col gap-4">
      <SegmentedControl<TransactionType> ariaLabel="Category type" size="sm" value={type} onChange={(t) => { setType(t); resetDraft(); setDeleting(null); }}
        options={[{ value: 'expense', label: 'Expense categories' }, { value: 'income', label: 'Income categories' }]} />

      <ul className="flex flex-col gap-1">
        {list.map((c) => {
          const n = counts.get(c.id) ?? 0;
          const isDel = deleting?.id === c.id;
          return (
            <li key={c.id} className={`anim-fade-up rounded-xl border px-3 py-2 transition-colors ${isDel ? 'border-bad bg-bad-soft' : editingId === c.id ? 'border-accent bg-accent-soft' : 'border-line'}`}>
              <div className="flex items-center gap-3">
                <span className="grid h-8 w-8 place-items-center rounded-[9px]" style={{ background: `${c.color}22`, color: c.color }}><CategoryIcon name={c.icon} size={15} /></span>
                <span className="flex-1"><span className="font-semibold">{c.name}</span><span className="block text-[11.5px] text-muted">{n} {n === 1 ? 'transaction' : 'transactions'}{c.isDefault ? ' · built-in' : ' · custom'}</span></span>
                <button type="button" className="btn btn-ghost btn-icon" aria-label={`Edit ${c.name}`} onClick={() => startEdit(c)}><Pencil size={14} /></button>
                <button type="button" className="btn btn-ghost btn-icon hover:!text-bad" aria-label={`Delete ${c.name}`} onClick={() => startDelete(c)}><Trash2 size={14} /></button>
              </div>
              {isDel && (
                <div className="anim-fade-up mt-2.5 flex flex-col gap-2 border-t border-bad/30 pt-2.5 text-[12.5px]">
                  {n > 0 ? (
                    <label className="flex flex-wrap items-center gap-2">
                      <span>Move its {n} {n === 1 ? 'transaction' : 'transactions'} to</span>
                      <select className="input" value={deleting.to} onChange={(e) => setDeleting({ id: c.id, to: e.target.value })}>
                        {list.filter((x) => x.id !== c.id).map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}
                      </select>
                    </label>
                  ) : <span>No transactions use this category. Its budget limit, if any, is removed too.</span>}
                  <div className="flex gap-2">
                    <button type="button" className="btn btn-danger" onClick={() => confirmDelete(c)}>{n ? 'Move and delete' : 'Delete category'}</button>
                    <button type="button" className="btn btn-ghost" onClick={() => setDeleting(null)}>Cancel</button>
                  </div>
                </div>
              )}
            </li>
          );
        })}
      </ul>

      <div className="flex flex-col gap-3 rounded-xl border border-line bg-surface-2 p-4">
        <div className="flex items-center justify-between">
          <h4 className="label-caps">{editingId ? 'Edit category' : `New ${type} category`}</h4>
          {editingId && <button type="button" className="btn btn-ghost" onClick={resetDraft}>Cancel edit</button>}
        </div>
        <div className="flex items-center gap-2">
          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-[9px] transition-colors" style={{ background: `${draft.color}22`, color: draft.color }}><CategoryIcon name={draft.icon} size={15} /></span>
          <input className="input flex-1" placeholder={type === 'expense' ? 'e.g. Education' : 'e.g. Rental income'} value={draft.name} maxLength={32}
            onChange={(e) => setDraft({ ...draft, name: e.target.value })} onKeyDown={(e) => { if (e.key === 'Enter') submit(); }} aria-label="Category name" />
        </div>
        <div>
          <div className="label-caps mb-1.5">Color</div>
          <div className="flex flex-wrap items-center gap-1.5">
            {CATEGORY_SWATCHES.map((s) => (
              <button key={s} type="button" aria-label={`Color ${s}`} aria-pressed={draft.color === s} onClick={() => setDraft({ ...draft, color: s })}
                className={`grid h-7 w-7 place-items-center rounded-full transition-transform hover:scale-110 ${draft.color === s ? 'scale-110 ring-2 ring-fg ring-offset-2 ring-offset-surface-2' : ''}`} style={{ background: s }}>
                {draft.color === s && <Check size={13} className="text-white" />}
              </button>
            ))}
            <label className="relative ml-1 flex h-7 cursor-pointer items-center gap-1.5 rounded-full border border-line bg-surface px-2.5 text-[12px] font-semibold text-fg-2 hover:border-line-strong">
              Custom
              <input type="color" className="absolute inset-0 cursor-pointer opacity-0" value={draft.color} onChange={(e) => setDraft({ ...draft, color: e.target.value })} aria-label="Custom color" />
            </label>
          </div>
        </div>
        <div>
          <div className="label-caps mb-1.5">Icon</div>
          <div className="grid grid-cols-[repeat(auto-fill,minmax(32px,1fr))] gap-1">
            {Object.keys(CATEGORY_ICONS).map((k) => (
              <button key={k} type="button" aria-label={`Icon ${k}`} aria-pressed={draft.icon === k} onClick={() => setDraft({ ...draft, icon: k })}
                className={`grid h-8 place-items-center rounded-lg transition-colors ${draft.icon === k ? 'bg-accent text-accent-ink' : 'text-fg-2 hover:bg-surface hover:text-fg'}`}>
                <CategoryIcon name={k} size={15} />
              </button>
            ))}
          </div>
        </div>
        {error && <div className="anim-fade-up rounded-lg bg-bad-soft px-3 py-2 text-[12.5px] font-semibold text-bad" role="alert">{error}</div>}
        <button type="button" className="btn btn-primary self-end" onClick={submit}>{editingId ? <><Check size={15} />Save category</> : <><Plus size={15} />Add category</>}</button>
      </div>
    </section>
  );
}
