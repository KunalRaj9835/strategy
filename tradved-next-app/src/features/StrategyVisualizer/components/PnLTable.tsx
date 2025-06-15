// src/features/StrategyVisualizer/components/PnLTable.tsx

'use client'; // This component receives props and renders UI, making it a Client Component.

import React from 'react';

// Import the new SCSS module for locally-scoped styling.
import styles from './PnLTable.module.scss';

// --- Type Definitions (Fully Typed and Preserved) ---
interface ProjectedLegData {
  id: string | number;
  instrumentSymbolConcise: string;
  projectedPnL: number;
  projectedValue: number;
  entryPrice: number;
  ltp: number;
}

interface Totals {
  projectedPnL: number;
}

interface SummedPrices {
  targetPrice: number;
  entryPrice: number;
  ltp: number;
}

interface PnLTableProps {
  projectedLegsData: ProjectedLegData[];
  totals?: Totals;
  multiplier: number;
}

// BEST PRACTICE CORRECTION: A helper function should not return JSX.
// This refactored function now only handles formatting the number to a string.
// The component itself will be responsible for applying styling.
const formatNumber = (
  value: number | null | undefined,
  digits: number = 2,
  notApplicableString: string = '-'
): string => {
  if (value === null || value === undefined || isNaN(Number(value))) {
    return notApplicableString;
  }
  return Number(value).toFixed(digits);
};

// --- Main Component (Fully Corrected with Best Practices) ---
const PnLTable: React.FC<PnLTableProps> = ({ projectedLegsData, totals, multiplier }) => {
  // Gracefully handle empty or invalid data by showing a placeholder.
  if (!projectedLegsData || projectedLegsData.length === 0) {
    return (
      <div className={`${styles.pnlTableContainer} ${styles.noDataMessage}`}>
        Add strategy legs and set target to view P&L.
      </div>
    );
  }

  // Calculate summed prices for the total row. This logic is preserved from the original file.
  const summedPrices: SummedPrices = projectedLegsData.reduce(
    (acc: SummedPrices, leg: ProjectedLegData) => {
      acc.targetPrice += Number(leg.projectedValue) || 0;
      acc.entryPrice += Number(leg.entryPrice) || 0;
      acc.ltp += Number(leg.ltp) || 0;
      return acc;
    },
    { targetPrice: 0, entryPrice: 0, ltp: 0 }
  );

  return (
    <div className={styles.pnlTableContainer}>
      <table className={styles.pnlTable}>
        <thead>
          <tr>
            <th>Instrument</th>
            <th>Target P&L</th>
            <th>Target Price</th>
            <th>Entry Price</th>
            <th>LTP</th>
          </tr>
        </thead>
        <tbody>
          {projectedLegsData.map((leg: ProjectedLegData) => {
            const pnlValue = leg.projectedPnL * multiplier;
            const pnlClass = pnlValue > 0 ? styles.pnlValuePositive : pnlValue < 0 ? styles.pnlValueNegative : '';
            return (
              <tr key={leg.id}>
                <td>{leg.instrumentSymbolConcise}</td>
                <td className={pnlClass}>{formatNumber(pnlValue)}</td>
                <td>{formatNumber(leg.projectedValue * multiplier)}</td>
                <td>{formatNumber(leg.entryPrice * multiplier)}</td>
                <td>{formatNumber(leg.ltp * multiplier)}</td>
              </tr>
            );
          })}
          {projectedLegsData.length > 0 && totals && (
            <tr className={styles.pnlTotalRow}>
              <td>
                Total
                <span className={styles.projectedLabel}>Projected</span>
                <span className={styles.infoIcon} title="Total P&L based on target spot and date, scaled by lots/lot size if selected.">
                  ⓘ
                </span>
              </td>
              <td className={totals.projectedPnL * multiplier >= 0 ? styles.pnlValuePositive : styles.pnlValueNegative}>
                {formatNumber(totals.projectedPnL * multiplier)}
              </td>
              <td>{formatNumber(summedPrices.targetPrice * multiplier)}</td>
              <td>{formatNumber(summedPrices.entryPrice * multiplier)}</td>
              <td>{formatNumber(summedPrices.ltp * multiplier)}</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
};

// Using React.memo for performance optimization to prevent unnecessary re-renders.
export default React.memo(PnLTable);
