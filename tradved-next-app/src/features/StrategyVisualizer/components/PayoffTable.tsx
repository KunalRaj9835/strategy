// src/features/StrategyVisualizer/components/PayoffTable.tsx

'use client'; // This component receives props and renders UI, making it a Client Component.

import React from 'react';

// Import the new SCSS module for locally-scoped styling.
import styles from './PayoffTable.module.scss';

// Assuming a formatter utility exists at this path.
import { formatDisplayValue } from '@/lib/formatters';

// --- Type Definitions (Fully Typed and Preserved) ---
interface PayoffRowData {
  targetPrice: number | string;
  pnlAtTargetDate: number;
  pnlAtExpiry: number;
  isCurrentTarget?: boolean;
}

interface PayoffTableProps {
  payoffData: PayoffRowData[];
  targetDate?: string | Date;
  multiplier?: number;
}

// --- Main Component (Fully Corrected with Best Practices) ---
const PayoffTable: React.FC<PayoffTableProps> = ({
  payoffData,
  targetDate,
  multiplier = 1, // Default value for multiplier is a good practice.[3]
}) => {
  // Gracefully handle empty or invalid data by showing a placeholder.
  if (!payoffData || payoffData.length === 0) {
    return (
      <div className={styles.payoffTablePlaceholder}>
        No payoff data to display for the current selection.
      </div>
    );
  }

  // Format the target date for display in the table header.
  const targetDateLabel: string = targetDate
    ? new Date(targetDate).toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      })
    : 'Target Date';

  return (
    <div className={styles.payoffTableContainer}>
      <table className={styles.payoffTable}>
        <thead>
          <tr>
            <th>Target Price (Underlying)</th>
            <th>P&L @ {targetDateLabel}</th>
            <th>P&L @ Expiry</th>
          </tr>
        </thead>
        <tbody>
          {payoffData.map((row: PayoffRowData, index: number) => {
            // BEST PRACTICE CORRECTION: Using template literals to build dynamic class lists
            // is cleaner and more maintainable than conditional rendering of strings.
            const pnlTargetDateClass = row.pnlAtTargetDate >= 0 ? styles.profitValue : styles.lossValue;
            const pnlExpiryClass = row.pnlAtExpiry >= 0 ? styles.profitValue : styles.lossValue;
            const rowClass = row.isCurrentTarget ? styles.highlightedRow : '';

            return (
              <tr key={index} className={rowClass}>
                <td>
                  {/* Assuming formatDisplayValue handles currency formatting. */}
                  {formatDisplayValue(Number(row.targetPrice), 'currency', { digits: 0, prefix: '' })}
                </td>
                <td className={pnlTargetDateClass}>
                  {formatDisplayValue(row.pnlAtTargetDate * multiplier, 'currency_pnl', { prefix: '₹', showSign: true })}
                </td>
                <td className={pnlExpiryClass}>
                  {formatDisplayValue(row.pnlAtExpiry * multiplier, 'currency_pnl', { prefix: '₹', showSign: true })}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

// Using React.memo for performance optimization, as this table could receive new props frequently
// without its content actually changing, preventing unnecessary re-renders.
export default React.memo(PayoffTable);
