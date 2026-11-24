import type { Theme } from '../store/useFinanceStore';

export interface ChartTheme { grid: string; axis: string; tick: string; income: string; expense: string; accent: string; surface: string; ink: string; muted: string; hover: string }

const LIGHT: ChartTheme = { grid: '#edf0ee', axis: '#d0d6d3', tick: '#828b87', income: '#1baf7a', expense: '#eb6834', accent: '#1e6654', surface: '#ffffff', ink: '#141816', muted: '#9aa39f', hover: 'rgba(20,24,22,0.045)' };
const DARK: ChartTheme = { grid: '#232a28', axis: '#38413e', tick: '#7d8783', income: '#199e70', expense: '#d95926', accent: '#5cc4a0', surface: '#161a19', ink: '#ecf0ee', muted: '#6f7a76', hover: 'rgba(236,240,238,0.06)' };

export const chartTheme = (t: Theme): ChartTheme => (t === 'dark' ? DARK : LIGHT);

/** Shared motion settings so every chart eases the same way. */
export const CHART_ANIM = { animationDuration: 650, animationEasing: 'ease-out' as const };
