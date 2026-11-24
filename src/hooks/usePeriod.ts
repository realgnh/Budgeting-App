import { useMemo } from 'react';
import { useFinanceStore } from '../store/useFinanceStore';
import { useUi } from '../store/useUi';
import { getPreviousWindow, getWindow, isCurrentPeriod, type Period } from '../lib/timeframes';
import { inWindow } from '../lib/analytics';
import { parseDayKey } from '../lib/time';
import { useNow } from './useNow';

/**
 * The selected day / month / year, its transactions and the period before it. With no pinned date
 * it follows the current time, so the "today" view starts fresh at 00:00 Cairo time.
 */
export function usePeriod() {
  const transactions = useFinanceStore((s) => s.transactions);
  const unit = useFinanceStore((s) => s.periodUnit);
  const anchorKey = useUi((s) => s.periodAnchor);
  const now = useNow();
  return useMemo(() => {
    const period: Period = { unit, anchor: anchorKey ? parseDayKey(anchorKey) : now };
    const window = getWindow(period);
    const prevWindow = getPreviousWindow(period);
    return {
      now, unit, period, window, prevWindow, isCurrent: isCurrentPeriod(period, now),
      current: inWindow(transactions, window),
      previous: inWindow(transactions, prevWindow),
    };
  }, [transactions, unit, anchorKey, now]);
}
