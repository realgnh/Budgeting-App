import { useRef, useState } from 'react';
import { dayKey } from '../../lib/time';
import { Database, Download, FileSpreadsheet, Trash2, Upload } from 'lucide-react';
import { selectAppState, useFinanceStore } from '../../store/useFinanceStore';
import { buildBackup, parseBackup, saveTextFile, transactionsToCsv } from '../../lib/io';
import { toast } from '../common/Toast';

export function DataControls() {
  const store = useFinanceStore();
  const fileRef = useRef<HTMLInputElement>(null);
  const [confirmReset, setConfirmReset] = useState(false);
  const [confirmDemo, setConfirmDemo] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const stamp = dayKey(new Date());
  const n = store.transactions.length;

  const report = (outcome: Awaited<ReturnType<typeof saveTextFile>>, okMsg: string) => {
    if (outcome === 'saved') toast(okMsg);
    else if (outcome === 'failed') toast('This view could not save the file. Open Mizan in a browser tab and try again.', 'error');
  };
  const exportCsv = async () => {
    if (!n) return toast('There are no transactions to export yet.', 'error');
    report(await saveTextFile(`mizan-transactions-${stamp}.csv`, transactionsToCsv(store.transactions, store.categories, store.baseCurrency), 'text/csv;charset=utf-8'), `Exported ${n} transactions to CSV`);
  };
  const exportJson = async () => {
    report(await saveTextFile(`mizan-backup-${stamp}.json`, JSON.stringify(buildBackup(selectAppState(useFinanceStore.getState())), null, 2), 'application/json'), 'Backup saved');
  };
  const onFile = async (f: File | undefined) => {
    if (!f) return;
    setImportError(null);
    try {
      const state = parseBackup(await f.text());
      store.importState(state);
      toast(`Restored ${state.transactions.length} transactions and ${state.categories.length} categories`);
    } catch (e) {
      setImportError(e instanceof Error ? e.message : 'Could not read this file.');
    } finally {
      if (fileRef.current) fileRef.current.value = '';
    }
  };
  const loadDemo = () => {
    if (n && !confirmDemo) return setConfirmDemo(true);
    store.loadDemoData();
    setConfirmDemo(false);
    toast(`Loaded ${useFinanceStore.getState().transactions.length} demo transactions`);
  };

  return (
    <section className="flex flex-col gap-5">
      <Block title="Demo data" desc="About 140 transactions over 14 months in EGP, SAR and USD, plus sample budgets, so every timeframe and chart has something to show.">
        {confirmDemo ? (
          <Confirm tone="warn" text={`This replaces your ${n} transactions and budgets with demo data. Custom categories are kept.`}
            yes="Replace with demo data" onYes={loadDemo} onNo={() => setConfirmDemo(false)} />
        ) : <button type="button" className="btn" onClick={loadDemo}><Database size={15} />Load demo data</button>}
      </Block>
      <Block title="Export" desc="CSV opens in Excel or Google Sheets and includes native and converted amounts. The JSON backup holds everything and can be restored later.">
        <div className="flex flex-wrap gap-2">
          <button type="button" className="btn" onClick={exportCsv}><FileSpreadsheet size={15} />Export CSV</button>
          <button type="button" className="btn" onClick={exportJson}><Download size={15} />Export JSON backup</button>
        </div>
      </Block>
      <Block title="Restore" desc="Replaces all current data with a Mizan JSON backup. The file is checked before anything changes.">
        <input ref={fileRef} type="file" accept="application/json,.json" hidden onChange={(e) => onFile(e.target.files?.[0])} />
        <button type="button" className="btn" onClick={() => fileRef.current?.click()}><Upload size={15} />Import JSON backup</button>
        {importError && <div className="anim-fade-up mt-2 rounded-lg bg-bad-soft px-3 py-2 text-[12.5px] font-semibold text-bad" role="alert">Import failed: {importError}</div>}
      </Block>
      <Block title="Reset" desc="Deletes all transactions, budgets and custom categories from this browser.">
        {confirmReset ? (
          <Confirm tone="bad" text={`Delete ${n} transactions, all budgets and custom categories? This can't be undone. Export a backup first if you might need it.`}
            yes="Delete everything" onYes={() => { store.resetAll(); setConfirmReset(false); toast('All data cleared'); }} onNo={() => setConfirmReset(false)} />
        ) : <button type="button" className="btn btn-danger" onClick={() => setConfirmReset(true)}><Trash2 size={15} />Reset all data</button>}
      </Block>
    </section>
  );
}

function Block({ title, desc, children }: { title: string; desc: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-2 border-b border-line pb-5 last:border-0">
      <h4 className="text-[14px] font-semibold">{title}</h4>
      <p className="text-[12.5px] text-fg-2">{desc}</p>
      <div>{children}</div>
    </div>
  );
}

function Confirm({ text, yes, onYes, onNo, tone }: { text: string; yes: string; onYes: () => void; onNo: () => void; tone: 'bad' | 'warn' }) {
  return (
    <div className={`anim-fade-up flex flex-col gap-2 rounded-[8px] border p-3 text-[12.5px] ${tone === 'bad' ? 'border-bad bg-bad-soft' : 'border-warn bg-warn-soft'}`}>
      <span className="font-semibold">{text}</span>
      <div className="flex gap-2"><button type="button" className={`btn ${tone === 'bad' ? 'btn-danger' : ''}`} onClick={onYes}>{yes}</button><button type="button" className="btn btn-ghost" onClick={onNo}>Cancel</button></div>
    </div>
  );
}
