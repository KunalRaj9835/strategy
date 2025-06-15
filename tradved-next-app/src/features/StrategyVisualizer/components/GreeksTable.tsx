// src/features/StrategyVisualizer/components/GreeksTable.tsx

'use client'; // Required for components with event handlers or state

import React from 'react';
// Import the SCSS module. 'styles' is a conventional name.
import styles from './GreeksTable.module.scss';

// --- Interface Definitions (Unchanged) ---
interface ProjectedGreeks {
  delta: number;
  gamma: number;
  theta: number;
  vega: number;
}

interface LegData {
  id: string;
  instrumentSymbolConcise: string;
  buySell: 'Buy' | 'Sell';
  projectedGreeks: ProjectedGreeks;
}

interface GreeksTotals {
  delta: number;
  gamma: number;
  theta: number;
  vega: number;
}

interface GreeksTableProps {
  projectedLegsData: LegData[];
  totals: GreeksTotals;
  multiplier: number;
}

// --- Helper Function (Unchanged) ---
const formatGreekValue = (value: number | null | undefined, digits: number = 2, notApplicableString: string = '-'): string => {
  if (value === null || value === undefined || isNaN(Number(value))) {
    return notApplicableString;
  }
  return Number(value).toFixed(digits);
};

// --- Component Implementation (Updated) ---
const GreeksTable: React.FC<GreeksTableProps> = ({ projectedLegsData, totals, multiplier }) => {
  if (!projectedLegsData || projectedLegsData.length === 0) {
    // Apply multiple classes using a template literal
    return <div className={`${styles.greeksTableContainer} ${styles.noDataMessage}`}>Add strategy legs and set target to view Greeks.</div>;
  }

  return (
    // Use the styles object to apply the root class
    <div className={styles.greeksTableContainer}>
      <table>
        <thead>
          <tr>
            <th>Instrument</th>
            <th>Delta</th>
            <th>Gamma</th>
            <th>Theta</th>
            <th>Vega</th>
          </tr>
        </thead>
        <tbody>
          {projectedLegsData.map((leg) => {
            if (!leg || !leg.projectedGreeks) {
                console.warn("GreeksTable: Skipping leg with missing data", leg);
                return <tr key={leg?.id || Math.random()}><td colSpan={5}>Leg data incomplete</td></tr>;
            }
            const direction = leg.buySell === 'Buy' ? 1 : -1;
            return (
              <tr key={leg.id}>
                <td>{leg.instrumentSymbolConcise}</td>
                <td>{formatGreekValue(leg.projectedGreeks.delta * direction * multiplier, 2)}</td>
                <td>{formatGreekValue(leg.projectedGreeks.gamma * multiplier, 4)}</td>
                <td>{formatGreekValue(leg.projectedGreeks.theta * direction * multiplier, 2)}</td>
                <td>{formatGreekValue(leg.projectedGreeks.vega * multiplier * direction ? (leg.projectedGreeks.vega) * direction * multiplier : null, 2)}</td>
              </tr>
            );
          })}
          {(projectedLegsData.length > 0 && totals) && (
            // Apply the total row class using the styles object
            <tr className={styles.greeksTotalRow}>
              <td>Total</td>
              <td>{formatGreekValue(totals.delta * multiplier, 2)}</td>
              <td>{formatGreekValue(totals.gamma * multiplier, 4)}</td>
              <td>{formatGreekValue(totals.theta * multiplier, 2)}</td>
              <td>{formatGreekValue(totals.vega ? totals.vega * multiplier : null, 2)}</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
};

export default React.memo(GreeksTable);
