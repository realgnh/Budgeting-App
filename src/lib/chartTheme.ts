import type { Theme } from '../store/useFinanceStore';

export interface ChartTheme { grid: string; axis: string; tick: string; income: string; expense: string; accent: string; surface: string; ink: string; inkInverse: string; muted: string }

const LIGHT: ChartTheme = { grid: '#e9ecea', axis: '#cdd5d1', tick: '#808c87', income: '#1baf7a', expense: '#eb6834', accent: '#1f6b57', surface: '#ffffff', ink: '#111614', inkInverse: '#f4f6f5', muted: '#808c87' };
const DARK: ChartTheme = { grid: '#222a27', axis: '#34403c', tick: '#808b87', income: '#199e70', expense: '#d95926', accent: '#4cc39d', surface: '#161b1a', ink: '#edf1ef', inkInverse: '#0e1211', muted: '#808b87' };

export const chartTheme = (t: Theme): ChartTheme => (t === 'dark' ? DARK : LIGHT);
