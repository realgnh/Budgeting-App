import { addZMonths, startOfZDay, startOfZMonth, zdate, zparts } from './time';
import type { BudgetConfig, Category, Currency, FxRates, Transaction, TransactionType } from '../types/finance';

/** Swatches tuned to read on both light and dark surfaces (colorblind-checked order). */
export const CATEGORY_SWATCHES = [
  '#2a78d6', '#eb6834', '#1baf7a', '#eda100', '#e87ba4', '#16a34a', '#7c6ce8', '#e34948',
  '#0ea5b7', '#b7791f', '#9d5cd6', '#64748b',
];

export const DEFAULT_CATEGORIES: Category[] = [
  { id: 'food', name: 'Food & Dining', type: 'expense', color: '#2a78d6', icon: 'utensils', isDefault: true },
  { id: 'groceries', name: 'Groceries', type: 'expense', color: '#eb6834', icon: 'shopping-basket', isDefault: true },
  { id: 'transport', name: 'Transport', type: 'expense', color: '#1baf7a', icon: 'car', isDefault: true },
  { id: 'housing', name: 'Housing & Utilities', type: 'expense', color: '#eda100', icon: 'house', isDefault: true },
  { id: 'subscriptions', name: 'Subscriptions', type: 'expense', color: '#e87ba4', icon: 'repeat', isDefault: true },
  { id: 'shopping', name: 'Shopping', type: 'expense', color: '#16a34a', icon: 'shopping-bag', isDefault: true },
  { id: 'health', name: 'Health', type: 'expense', color: '#7c6ce8', icon: 'heart-pulse', isDefault: true },
  { id: 'entertainment', name: 'Entertainment', type: 'expense', color: '#e34948', icon: 'clapperboard', isDefault: true },
  { id: 'other-expense', name: 'Other Expense', type: 'expense', color: '#64748b', icon: 'circle-ellipsis', isDefault: true },
  { id: 'salary', name: 'Salary', type: 'income', color: '#1baf7a', icon: 'briefcase', isDefault: true },
  { id: 'freelance', name: 'Freelance', type: 'income', color: '#2a78d6', icon: 'laptop', isDefault: true },
  { id: 'allowance', name: 'Allowance', type: 'income', color: '#eda100', icon: 'gift', isDefault: true },
  { id: 'investments', name: 'Investments', type: 'income', color: '#7c6ce8', icon: 'trending-up', isDefault: true },
  { id: 'other-income', name: 'Other Income', type: 'income', color: '#64748b', icon: 'circle-ellipsis', isDefault: true },
];

export const DEMO_BUDGETS: BudgetConfig = {
  overallMonthlyLimit: { amount: 9000, currency: 'SAR' },
  categoryMonthlyLimits: {
    food: { amount: 900, currency: 'SAR' },
    groceries: { amount: 1100, currency: 'SAR' },
    transport: { amount: 500, currency: 'SAR' },
    housing: { amount: 4200, currency: 'SAR' },
    subscriptions: { amount: 40, currency: 'USD' },
    shopping: { amount: 6000, currency: 'EGP' },
    entertainment: { amount: 600, currency: 'SAR' },
    health: { amount: 400, currency: 'SAR' },
  },
};

function mulberry32(seed: number) {
  return () => {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Plausible historical USD→EGP rate drifting toward today's value. */
function snapshotAt(d: Date, now: Date, live: FxRates): FxRates {
  const monthsAgo = (now.getTime() - d.getTime()) / (30 * 86_400_000);
  const egp = live.EGP - monthsAgo * 0.11 + Math.sin(monthsAgo) * 0.35;
  return { USD: 1, EGP: Math.round(egp * 100) / 100, SAR: 3.75 };
}

/**
 * Generates ~140 realistic transactions over 14 months: SAR salary and rent, USD subscriptions
 * and freelance income, and EGP spending on visits to Cairo. Includes activity today and in the
 * last few days so every timeframe has data.
 */
export function generateDemoTransactions(now: Date = new Date(), liveRates: FxRates = { USD: 1, EGP: 48.6, SAR: 3.75 }): Transaction[] {
  const r = mulberry32(20261124);
  const out: Transaction[] = [];
  let n = 0;
  const add = (type: TransactionType, categoryId: string, amount: number, currency: Currency, title: string, when: Date, notes?: string) => {
    if (when.getTime() > now.getTime()) return;
    out.push({
      id: `demo-${++n}`, type, categoryId, amount: Math.round(amount * 100) / 100, currency, title,
      ...(notes ? { notes } : {}), timestampIso: when.toISOString(), fxSnapshot: snapshotAt(when, now, liveRates),
    });
  };
  /** `days` after `base`, at h:m in Cairo time. */
  const at = (base: Date, days: number, h: number, m: number) => { const p = zparts(base); return zdate(p.y, p.m, p.d + days, h, m); };

  for (let k = 13; k >= 0; k--) {
    const m0 = addZMonths(startOfZMonth(now), -k);
    add('income', 'salary', 14500, 'SAR', 'Monthly salary', at(m0, 0, 9, 5), 'Payroll · Riyadh office');
    add('expense', 'housing', 3800, 'SAR', 'Apartment rent', at(m0, 1, 10, 30));
    add('expense', 'housing', 280 + r() * 120, 'SAR', 'Electricity & water', at(m0, 9, 18, 12));
    add('expense', 'subscriptions', 15.99, 'USD', 'Netflix Premium', at(m0, 4, 3, 0));
    add('expense', 'subscriptions', 20, 'USD', 'Cloud storage plan', at(m0, 6, 3, 0));
    add('expense', 'groceries', 380 + r() * 260, 'SAR', 'Danube supermarket', at(m0, 7, 19, 40));
    add('expense', 'groceries', 260 + r() * 200, 'SAR', 'Panda hypermarket', at(m0, 20, 20, 5));
    if (k % 2 === 0) add('income', 'freelance', 450 + r() * 700, 'USD', 'Upwork · dashboard project', at(m0, 14, 16, 20), 'Milestone payout');
    if (k % 3 === 1) add('expense', 'shopping', 6500 + r() * 6000, 'EGP', 'City Stars · clothing', at(m0, 17, 17, 45), 'Visit to Cairo');
    if (k % 3 === 1) add('expense', 'food', 1800 + r() * 1400, 'EGP', 'Zooba & Sachi dinners', at(m0, 18, 21, 30));
    if (k % 4 === 2) add('income', 'investments', 120 + r() * 160, 'USD', 'Dividend · VT ETF', at(m0, 24, 12, 0));
    if (k % 5 === 0) add('expense', 'health', 300 + r() * 500, 'SAR', 'Dr. Sulaiman Al Habib clinic', at(m0, 12, 11, 15));
    if (k % 4 === 3) add('income', 'allowance', 5000, 'EGP', 'Family allowance', at(m0, 11, 13, 0));
  }

  const today = startOfZDay(now);
  const recent: [number, TransactionType, string, number, Currency, string, number, number][] = [
    [-27, 'expense', 'transport', 85, 'SAR', 'Careem rides', 8, 40],
    [-24, 'expense', 'entertainment', 45, 'USD', 'Steam game', 22, 10],
    [-21, 'expense', 'food', 140, 'SAR', 'Al Baik + coffee', 13, 25],
    [-18, 'expense', 'transport', 210, 'SAR', 'Fuel', 7, 55],
    [-15, 'expense', 'entertainment', 160, 'SAR', 'Riyadh Season tickets', 19, 0],
    [-12, 'expense', 'food', 95, 'SAR', 'Brunch with team', 11, 30],
    [-10, 'expense', 'shopping', 89.5, 'USD', 'Amazon · headphones', 15, 5],
    [-8, 'expense', 'other-expense', 1500, 'EGP', 'Gift for Mama', 18, 20],
    [-6, 'expense', 'transport', 60, 'SAR', 'Metro top-up', 8, 15],
    [-4, 'expense', 'food', 120, 'SAR', 'Shawarmer & juice', 14, 10],
    [-3, 'income', 'freelance', 320, 'USD', 'Upwork · logo refresh', 10, 45],
    [-2, 'expense', 'health', 75, 'SAR', 'Pharmacy · Nahdi', 20, 30],
    [-1, 'expense', 'groceries', 210, 'SAR', 'Tamimi Markets', 19, 5],
    [-1, 'expense', 'entertainment', 2400, 'EGP', 'Concert tickets (Cairo)', 22, 40],
  ];
  for (const [d, type, cat, amt, cur, title, h, m] of recent) add(type, cat, amt, cur, title, at(today, d, h, m));

  // Today: spread across the hours that have already passed so the 1D chart always has data.
  const minutesToday = Math.max(1, Math.floor((now.getTime() - today.getTime()) / 60000));
  const todays: [string, number, Currency, string, number][] = [
    ['food', 38, 'SAR', 'Morning coffee', 0.25],
    ['transport', 42, 'SAR', 'Uber to office', 0.45],
    ['food', 65, 'SAR', 'Lunch · Hashi Basha', 0.8],
  ];
  for (const [cat, amt, cur, title, frac] of todays) {
    add('expense', cat, amt, cur, title, new Date(today.getTime() + Math.floor(minutesToday * frac) * 60000));
  }
  return out.sort((a, b) => b.timestampIso.localeCompare(a.timestampIso));
}
