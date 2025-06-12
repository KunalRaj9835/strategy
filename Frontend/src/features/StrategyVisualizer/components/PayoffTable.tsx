// src/features/StrategyVisualizer/components/PayoffTable.tsx
import React from 'react';
import { formatDisplayValue } from '../../utils/formatters';
import './PayoffTable.scss';

// Type definitions
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

const PayoffTable: React.FC<PayoffTableProps> = ({ 
  payoffData, 
  targetDate,
  multiplier = 1 
}) => {
  if (!payoffData || payoffData.length === 0) {
    return <div className="payoff-table-placeholder">No payoff data to display for the current selection.</div>;
  }

  const targetDateLabel: string = targetDate 
    ? new Date(targetDate).toLocaleDateString("en-GB", {
        day: '2-digit', 
        month: 'short', 
        year: 'numeric'
      }) 
    : "Target Date";

  return (
    <div className="payoff-table-container">
      <table>
        <thead>
          <tr>
            <th>Target Price (Underlying)</th>
            <th>P&L @ {targetDateLabel}</th>
            <th>P&L @ Expiry</th>
          </tr>
        </thead>
        <tbody>
          {payoffData.map((row: PayoffRowData, index: number) => (
            <tr key={index} className={row.isCurrentTarget ? 'highlighted-row' : ''}>
              <td>
                {formatDisplayValue(Number(row.targetPrice), "currency", {digits: 0, prefix: ""})} 
              </td>
              <td className={row.pnlAtTargetDate >= 0 ? 'profit-value' : 'loss-value'}>
                {formatDisplayValue(row.pnlAtTargetDate * multiplier, "currency_pnl", {prefix: "₹", showSign: true})}
              </td>
              <td className={row.pnlAtExpiry >= 0 ? 'profit-value' : 'loss-value'}>
                {formatDisplayValue(row.pnlAtExpiry * multiplier, "currency_pnl", {prefix: "₹", showSign: true})}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default React.memo(PayoffTable);