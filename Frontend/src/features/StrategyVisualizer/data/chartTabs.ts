// Type definition for strategy chart tabs
interface StrategyChartTab {
  id: string;
  label: string;
}

export const STRATEGY_CHART_TABS: StrategyChartTab[] = [
  { id: 'payoffgraph', label: 'Payoff Graph' },
  { id: 'pnl_table', label: 'P&L Table (Projected)' },
  { id: 'greeks_table', label: 'Greeks Table (Projected)' },
] as const;