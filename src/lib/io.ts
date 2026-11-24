import { format } from 'date-fns';
import { CURRENCIES, SCHEMA_VERSION, type AppState, type Category, type Currency, type Transaction } from '../types/finance';
import { transactionToBase } from './fx';

function csvCell(v: string | number): string {
  const s = String(v);
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function transactionsToCsv(transactions: Transaction[], categories: Category[], base: Currency): string {
  const byId = new Map(categories.map((c) => [c.id, c.name]));
  const header = ['id', 'date', 'time', 'type', 'category', 'title', 'notes', 'native_amount', 'native_currency',
    `amount_${base.toLowerCase()}`, 'fx_usd_egp', 'fx_usd_sar'];
  const rows = [...transactions]
    .sort((a, b) => a.timestampIso.localeCompare(b.timestampIso))
    .map((t) => {
      const d = new Date(t.timestampIso);
      return [t.id, format(d, 'yyyy-MM-dd'), format(d, 'HH:mm'), t.type, byId.get(t.categoryId) ?? t.categoryId, t.title, t.notes ?? '',
        t.amount.toFixed(2), t.currency, transactionToBase(t, base).toFixed(2), t.fxSnapshot.EGP, t.fxSnapshot.SAR].map(csvCell).join(',');
    });
  return [header.join(','), ...rows].join('\r\n');
}

export interface Backup { app: 'mizan'; exportedAtIso: string; state: AppState }

export function buildBackup(state: AppState, now = new Date()): Backup {
  return { app: 'mizan', exportedAtIso: now.toISOString(), state };
}

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
const isCur = (v: unknown): v is Currency => typeof v === 'string' && (CURRENCIES as readonly string[]).includes(v);
const isType = (v: unknown) => v === 'income' || v === 'expense';
const isRates = (v: unknown) => isObj(v) && v.USD === 1 && typeof v.EGP === 'number' && v.EGP > 0 && typeof v.SAR === 'number' && v.SAR > 0;
const isLimit = (v: unknown) => isObj(v) && typeof v.amount === 'number' && v.amount > 0 && isCur(v.currency);

/** Validates an imported backup. Throws an Error with a readable message on any problem. */
export function parseBackup(text: string): AppState {
  let raw: unknown;
  try { raw = JSON.parse(text); } catch { throw new Error('This file is not valid JSON.'); }
  const state = isObj(raw) && isObj(raw.state) ? raw.state : raw;
  if (!isObj(state)) throw new Error('The file does not contain a Mizan backup.');
  if (state.schemaVersion !== SCHEMA_VERSION) {
    throw new Error(`Unsupported backup version ${String(state.schemaVersion)}. This app reads version ${SCHEMA_VERSION}.`);
  }
  if (!isCur(state.baseCurrency)) throw new Error('Backup has an invalid base currency.');
  if (!Array.isArray(state.categories) || !Array.isArray(state.transactions)) throw new Error('Backup is missing categories or transactions.');
  const categories = state.categories as unknown[];
  categories.forEach((c, i) => {
    if (!isObj(c) || typeof c.id !== 'string' || typeof c.name !== 'string' || !isType(c.type) || typeof c.color !== 'string' || typeof c.icon !== 'string') {
      throw new Error(`Category #${i + 1} is malformed.`);
    }
  });
  const catIds = new Set(categories.map((c) => (c as Category).id));
  (state.transactions as unknown[]).forEach((t, i) => {
    if (!isObj(t) || typeof t.id !== 'string' || !isType(t.type) || typeof t.amount !== 'number' || !(t.amount > 0) || !isCur(t.currency)
      || typeof t.categoryId !== 'string' || typeof t.title !== 'string' || typeof t.timestampIso !== 'string'
      || Number.isNaN(Date.parse(t.timestampIso)) || !isRates(t.fxSnapshot)) {
      throw new Error(`Transaction #${i + 1} is malformed.`);
    }
    if (!catIds.has(t.categoryId)) throw new Error(`Transaction #${i + 1} points to a missing category.`);
  });
  const b = state.budgets;
  if (!isObj(b) || !(b.overallMonthlyLimit === null || isLimit(b.overallMonthlyLimit)) || !isObj(b.categoryMonthlyLimits)
    || !Object.values(b.categoryMonthlyLimits).every(isLimit)) {
    throw new Error('Backup has invalid budgets.');
  }
  const fx = state.fx;
  if (!isObj(fx) || !isRates(fx.rates) || (fx.source !== 'live' && fx.source !== 'fallback')) throw new Error('Backup has invalid exchange rates.');
  const range = ['1D', '5D', '1M', '1Y', 'ALL'].includes(state.activeRange as string) ? state.activeRange : '1M';
  return { ...(state as unknown as AppState), activeRange: range as AppState['activeRange'] };
}

type SaveOutcome = 'saved' | 'declined' | 'failed';
interface HostDownloads { save: (r: { filename: string; data: string | Blob }) => Promise<unknown> }
interface HostBridge { use: (name: 'downloads') => Promise<HostDownloads | null> }

/**
 * Saves a text file. Inside the claude.ai artifact viewer (which blocks normal downloads) it goes
 * through the viewer's save dialog; everywhere else it is a regular browser download.
 */
export async function saveTextFile(filename: string, text: string, mime: string): Promise<SaveOutcome> {
  const host = (window as unknown as { claude?: HostBridge }).claude;
  if (host?.use) {
    try {
      const downloads = await host.use('downloads');
      if (downloads) {
        await downloads.save({ filename, data: new Blob([text], { type: mime }) });
        return 'saved';
      }
    } catch (e) {
      return (e as { code?: string })?.code === 'declined' ? 'declined' : 'failed';
    }
  }
  downloadText(filename, text, mime);
  return 'saved';
}

export function downloadText(filename: string, text: string, mime: string): void {
  const blob = new Blob([text], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
