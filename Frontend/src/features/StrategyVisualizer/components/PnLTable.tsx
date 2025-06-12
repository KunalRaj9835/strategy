// src/features/StrategyVisualizer/components/PnLTable.tsx
import React from 'react';
import './PnLTable.scss';

// Type definitions
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

const formatValue = (
  value: number | null | undefined, 
  digits: number = 2, 
  notApplicableString: string = '-'
): React.ReactNode | string => {
  if (value === null || value === undefined || isNaN(Number(value))) {
    return notApplicableString;
  }
  // Color P&L values
  if (digits === 2 && value !== 0) { // Assuming P&L values are typically 2 digits
      const numValue: number = Number(value);
      const className: string = numValue > 0 ? 'pnl-value-positive' : numValue < 0 ? 'pnl-value-negative' : '';
      return <span className={className}>{numValue.toFixed(digits)}</span>;
  }
  return Number(value).toFixed(digits);
};

const PnLTable: React.FC<PnLTableProps> = ({ projectedLegsData, totals, multiplier }) => {
  if (!projectedLegsData || projectedLegsData.length === 0) {
    return <div className="pnl-table-container no-data-message">Add strategy legs and set target to view P&L.</div>;
  }
  
  console.log(projectedLegsData);
  
  // Calculate summed prices for the total row if needed (as per UI, though less common)
  const summedPrices: SummedPrices = projectedLegsData.reduce((acc: SummedPrices, leg: ProjectedLegData) => {
      acc.targetPrice += Number(leg.projectedValue) || 0;
      acc.entryPrice += Number(leg.entryPrice) || 0;
      acc.ltp += Number(leg.ltp) || 0;
      return acc;
  }, {targetPrice: 0, entryPrice: 0, ltp: 0});

  return (
    <div className="pnl-table-container">
      <table>
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
          {projectedLegsData.map((leg: ProjectedLegData) => (
            <tr key={leg.id}>
              <td>{leg.instrumentSymbolConcise}</td>
              <td>{formatValue(leg.projectedPnL * multiplier)}</td> {/* Per-share P&L */}
              <td>{formatValue(leg.projectedValue * multiplier)}</td>
              <td>{formatValue(leg.entryPrice * multiplier)}</td>
              <td>{formatValue(leg.ltp * multiplier)}</td>
            </tr>
          ))}
          {(projectedLegsData.length > 0 && totals) && (
            <tr className="pnl-total-row">
              <td>Total <span className="projected-label">Projected</span> <span className="info-icon" title="Total P&L based on target spot and date, scaled by lots/lot size if selected.">ⓘ</span></td>
              <td>{formatValue(totals.projectedPnL * multiplier)}</td> {/* This total is already scaled */}
              <td>{formatValue(summedPrices.targetPrice * multiplier)}</td>
              <td>{formatValue(summedPrices.entryPrice * multiplier)}</td>
              <td>{formatValue(summedPrices.ltp * multiplier)}</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
};

export default React.memo(PnLTable);