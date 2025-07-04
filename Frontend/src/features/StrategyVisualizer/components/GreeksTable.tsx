// src/features/StrategyVisualizer/components/GreeksTable.tsx
import React from 'react';
import './GreeksTable.scss';

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

const formatGreekValue = (value: number | null | undefined, digits: number = 2, notApplicableString: string = '-'): string => {
  if (value === null || value === undefined || isNaN(Number(value))) {
    return notApplicableString;
  }
  return Number(value).toFixed(digits);
};

const GreeksTable: React.FC<GreeksTableProps> = ({ projectedLegsData, totals, multiplier }) => {
  // console.log("GreeksTable received projectedLegsData:", projectedLegsData); // << DEBUG
  // console.log("GreeksTable received totals:", totals); // << DEBUG

  if (!projectedLegsData || projectedLegsData.length === 0) {
    return <div className="greeks-table-container no-data-message">Add strategy legs and set target to view Greeks.</div>;
  }

  return (
    <div className="greeks-table-container">
      <table>
        <thead>
          <tr>
            <th>Instrument</th>
            <th>Delta</th><th>Gamma</th><th>Theta</th><th>Vega</th>
          </tr>
        </thead>
        <tbody>
          {projectedLegsData.map((leg) => {
            if (!leg || !leg.projectedGreeks) { // Add a guard for leg and projectedGreeks
                console.warn("GreeksTable: Skipping leg with missing data", leg);
                return <tr key={leg?.id || Math.random()}><td colSpan={5}>Leg data incomplete</td></tr>;
            }
            // Individual leg greeks are NOT scaled by multipliers here.
            // They are per-contract, per-share, and their sign is per contract (e.g., short call delta is negative).
            // The `direction` (buy/sell) should apply if showing position greek for the leg.
            const direction = leg.buySell === 'Buy' ? 1 : -1;
            return (
              <tr key={leg.id}>
                <td>{leg.instrumentSymbolConcise}</td>
                <td>{formatGreekValue(leg.projectedGreeks.delta * direction * multiplier, 2)}</td>
                <td>{formatGreekValue(leg.projectedGreeks.gamma * multiplier, 4)}</td> {/* Gamma is usually displayed positive for the contract */}
                <td>{formatGreekValue(leg.projectedGreeks.theta * direction * multiplier, 2)}</td>
                {/* Vega from black76Greeks is raw, scale by /100 for per 1% display */}
                <td>{formatGreekValue(leg.projectedGreeks.vega * multiplier * direction ? (leg.projectedGreeks.vega) * direction * multiplier : null, 2)}</td>
              </tr>
            );
          })}
          {(projectedLegsData.length > 0 && totals) && (
            <tr className="greeks-total-row">
              <td>Total</td>
              {/* Totals are already scaled by multipliers and buy/sell direction in projectedStrategyData */}
              <td>{formatGreekValue(totals.delta * multiplier, 2)}</td>
              <td>{formatGreekValue(totals.gamma * multiplier, 4)}</td>
              <td>{formatGreekValue(totals.theta * multiplier, 2)}</td>
              {/* Total Vega is also raw, scale by /100 for per 1% display */}
              <td>{formatGreekValue(totals.vega ? totals.vega * multiplier : null, 2)}</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
};

export default React.memo(GreeksTable);