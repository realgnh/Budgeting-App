import { useMemo } from 'react';
import { useFinanceStore } from '../store/useFinanceStore';
import { earliestTimestamp, getPreviousWindow, getWindow } from '../lib/timeframes';
import { inWindow } from '../lib/analytics';
import { useNow } from './useNow';

/** The active timeframe window, its transactions, and the comparison window. */
export function usePeriod() {
  const transactions = useFinanceStore((s) => s.transactions);
  const range = useFinanceStore((s) => s.activeRange);
  const now = useNow();
  return useMemo(() => {
    const window = getWindow(range, now, earliestTimestamp(transactions));
    const prevWindow = getPreviousWindow(range, window);
    return {
      now, range, window, prevWindow,
      current: inWindow(transactions, window),
      previous: prevWindow ? inWindow(transactions, prevWindow) : [],
    };
  }, [transactions, range, now]);
}
