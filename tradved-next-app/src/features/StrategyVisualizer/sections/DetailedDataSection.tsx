// src/features/StrategyVisualizer/sections/DetailedDataSection.tsx

"use client"; // This component uses hooks and state, so it must be a Client Component.

import React, { useMemo, useCallback } from "react";

// Import the new SCSS module for locally-scoped styling.
import styles from "./DetailedDataSection.module.scss";

// Import shared UI components using the recommended Next.js alias for clean, absolute paths.
import Button from "@/components/Button/Button";
import Checkbox from "@/components/Checkbox/Checkbox";

// Import utilities and constants from their respective locations.
import { calculateProjectedStrategyData } from "@/lib/payoffDataCalculator";
import {
  DEFAULT_VOLATILITY,
  GLOBAL_IV_OFFSET_STEP,
  IV_ADJUSTMENT_STEP,
} from "@/config";

// --- Type Definitions (Fully Typed and Preserved from Original File) ---
export type LegType = "option" | "future";
export type BuySell = "Buy" | "Sell";
export type OptionType = "CE" | "PE";

export interface InstrumentDetails {
  token: string;
  legTypeDb: LegType;
  iv?: number | string;
  strike?: number;
  optionType?: OptionType;
  instrumentSymbol?: string;
  symbol?: string;
  expiry?: string;
}

export interface StrategyLeg {
  id: string;
  token: string;
  selected: boolean;
  legType: LegType;
  instrumentSymbol: string;
  strike?: number;
  optionType?: OptionType;
  expiry?: string;
  iv?: number;
  [key: string]: any; // Allow other properties
}

interface StrikewiseIVDisplayItem {
  id: string;
  token: string;
  instrumentSymbol: string;
  effectiveIVDisplay: string;
  originalIV: string;
  chg: string;
  currentIndividualAdjustment: number;
}

interface SDInfo {
  level: string;
  points: string;
  priceLow: string;
  priceHigh: string;
}

interface TargetDayFuturesInfo {
  date: string;
  price: string;
  sd: SDInfo[];
}

interface ProjectedStrategyData {
  totals: {
    delta: number;
    gamma: number;
    theta: number;
    vega: number;
  };
}

interface DetailedDataSectionProps {
  strategyLegs: StrategyLeg[];
  currentUnderlying: string;
  getInstrumentByToken: (token: string) => InstrumentDetails | undefined;
  riskFreeRate: number;
  underlyingSpotPrice: number | null;
  projectedNiftyTarget: string | number;
  projectedTargetDate: string | null;
  individualIvAdjustments: Record<string, number>;
  onIndividualIvAdjustmentChange: (token: string, value: number) => void;
  globalIvOffset: number;
  onGlobalIvOffsetChange: (updater: (prevOffset: number) => number) => void;
  onResetAllIvAdjustments: () => void;
  getScenarioIV: (token: string) => number;
  multiplyByLotSize: boolean;
  onMultiplyByLotSizeChange: (checked: boolean) => void;
  multiplyByNumLots: boolean;
  onMultiplyByNumLotsChange: (checked: boolean) => void;
  sdDays: number;
  multiplier?: number;
}

// --- Main Component (Fully Corrected with Best Practices) ---
const DetailedDataSection: React.FC<DetailedDataSectionProps> = ({
  strategyLegs,
  currentUnderlying,
  getInstrumentByToken,
  riskFreeRate,
  underlyingSpotPrice,
  projectedNiftyTarget,
  projectedTargetDate,
  individualIvAdjustments,
  onIndividualIvAdjustmentChange,
  globalIvOffset,
  onGlobalIvOffsetChange,
  onResetAllIvAdjustments,
  getScenarioIV,
  multiplyByLotSize,
  onMultiplyByLotSizeChange,
  multiplyByNumLots,
  onMultiplyByNumLotsChange,
  sdDays,
  multiplier = 1,
}) => {
  const handleLocalGlobalIvOffsetChange = useCallback(
    (increment: number): void => {
      onGlobalIvOffsetChange((prevOffset) => prevOffset + increment);
    },
    [onGlobalIvOffsetChange]
  );

  const handleLocalIndividualIvAdjust = useCallback(
    (token: string, currentAdjustment: number, increment: number): void => {
      const newValue = parseFloat((currentAdjustment + increment).toFixed(1));
      onIndividualIvAdjustmentChange(token, newValue);
    },
    [onIndividualIvAdjustmentChange]
  );

  const strikewiseIVsDisplayData = useMemo((): StrikewiseIVDisplayItem[] => {
    return strategyLegs
      .filter((leg) => leg.selected && leg.token && leg.legType === "option")
      .map((leg): StrikewiseIVDisplayItem => {
        const instrumentDetails = getInstrumentByToken(leg.token);
        if (
          !instrumentDetails ||
          instrumentDetails.legTypeDb !== "option" ||
          instrumentDetails.iv === undefined
        ) {
          return {
            id: leg.id,
            token: leg.token,
            instrumentSymbol: leg.instrumentSymbol || "N/A",
            effectiveIVDisplay: "N/A",
            originalIV: "N/A",
            chg: "N/A",
            currentIndividualAdjustment: 0,
          };
        }
        const originalIV = parseFloat(instrumentDetails.iv.toString());
        const individualAdjustment = individualIvAdjustments[leg.token] || 0;
        const effectiveIV = originalIV + individualAdjustment + globalIvOffset;
        return {
          id: leg.id,
          token: leg.token,
          instrumentSymbol:
            instrumentDetails.instrumentSymbol ||
            instrumentDetails.symbol ||
            `${instrumentDetails.strike}${instrumentDetails.optionType}`,
          effectiveIVDisplay: effectiveIV.toFixed(2),
          originalIV: originalIV.toFixed(2),
          currentIndividualAdjustment: individualAdjustment,
          chg: (effectiveIV - originalIV).toFixed(1),
        };
      });
  }, [
    strategyLegs,
    getInstrumentByToken,
    globalIvOffset,
    individualIvAdjustments,
  ]);

  const greeksSourceLabel = useMemo((): string => {
    const numericProjectedTarget = parseFloat(String(projectedNiftyTarget));
    return projectedTargetDate &&
      !isNaN(numericProjectedTarget) &&
      numericProjectedTarget > 0
      ? "Projected Scenario"
      : "Live Scenario (IV Adj.)";
  }, [projectedNiftyTarget, projectedTargetDate]);

  const singleScenarioPerLegData = useMemo((): ProjectedStrategyData => {
    return calculateProjectedStrategyData({
      strategyLegs,
      niftyTarget: String(projectedNiftyTarget),
      targetDate: projectedTargetDate ?? "",
      getInstrumentByToken,
      riskFreeRate,
      getScenarioIV,
      multiplyByLotSize,
      multiplyByNumLots,
    });
  }, [
    strategyLegs,
    projectedNiftyTarget,
    projectedTargetDate,
    getInstrumentByToken,
    riskFreeRate,
    getScenarioIV,
    multiplyByLotSize,
    multiplyByNumLots,
  ]);

  const targetDayFuturesInfo = useMemo((): TargetDayFuturesInfo => {
    const spotPriceToUse =
      underlyingSpotPrice !== null && underlyingSpotPrice > 0
        ? underlyingSpotPrice
        : currentUnderlying === "BANKNIFTY"
        ? 48000
        : currentUnderlying === "NIFTY"
        ? 23000
        : 0;
    let sdVolatility = DEFAULT_VOLATILITY;
    const firstOptionLeg = strategyLegs.find(
      (l) => l.selected && l.token && l.legType === "option"
    );
    if (firstOptionLeg) {
      const ivForFirstLeg = getScenarioIV(firstOptionLeg.token);
      if (ivForFirstLeg > 0) sdVolatility = ivForFirstLeg;
    }
    const TTM = sdDays / 365.25;
    const oneSdPoints = spotPriceToUse * sdVolatility * Math.sqrt(TTM);
    const targetDisplayDate = new Date();
    targetDisplayDate.setDate(targetDisplayDate.getDate() + Number(sdDays));

    return {
      date: targetDisplayDate.toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
      }),
      price: spotPriceToUse > 0 ? spotPriceToUse.toFixed(2) : "N/A",
      sd:
        spotPriceToUse > 0 && oneSdPoints > 0 && !isNaN(oneSdPoints)
          ? [
              {
                level: "1 SD",
                points: `${oneSdPoints.toFixed(1)} (${(
                  (oneSdPoints / spotPriceToUse) *
                  100
                ).toFixed(1)}%)`,
                priceLow: (spotPriceToUse - oneSdPoints).toFixed(1),
                priceHigh: (spotPriceToUse + oneSdPoints).toFixed(1),
              },
              {
                level: "2 SD",
                points: `${(oneSdPoints * 2).toFixed(1)} (${(
                  ((oneSdPoints * 2) / spotPriceToUse) *
                  100
                ).toFixed(1)}%)`,
                priceLow: (spotPriceToUse - oneSdPoints * 2).toFixed(1),
                priceHigh: (spotPriceToUse + oneSdPoints * 2).toFixed(1),
              },
            ]
          : [],
    };
  }, [
    strategyLegs,
    getScenarioIV,
    currentUnderlying,
    sdDays,
    underlyingSpotPrice,
  ]);

  return (
    <section className={styles.svDetailedDataSection}>
      <div className={`${styles.dataColumn} ${styles.strikewiseIvsColumn}`}>
        <h4>
          Strikewise IVs (Options Only){" "}
          <Button
            variant="tertiary"
            size="small"
            onClick={onResetAllIvAdjustments}
          >
            Reset All
          </Button>
        </h4>
        <div className={styles.offsetControl}>
          <span>Global Offset</span>
          <div>
            <Button
              variant="tertiary"
              size="small"
              onClick={() =>
                handleLocalGlobalIvOffsetChange(-GLOBAL_IV_OFFSET_STEP)
              }
            >
              –
            </Button>
            <span className={styles.offsetValue}>
              {globalIvOffset.toFixed(1)}%
            </span>
            <Button
              variant="tertiary"
              size="small"
              onClick={() =>
                handleLocalGlobalIvOffsetChange(GLOBAL_IV_OFFSET_STEP)
              }
            >
              +
            </Button>
          </div>
        </div>
        <table>
          <thead>
            <tr>
              <th>Instrument</th>
              <th>Effective IV</th>
              <th>Chg</th>
              <th>Adjust</th>
            </tr>
          </thead>
          <tbody>
            {strikewiseIVsDisplayData.map((item) => (
              <tr key={item.id}>
                <td title={`Token: ${item.token}`}>{item.instrumentSymbol}</td>
                <td>
                  {item.effectiveIVDisplay === "N/A"
                    ? "N/A"
                    : `${item.effectiveIVDisplay}%`}
                </td>
                <td>{item.chg === "N/A" ? "N/A" : `${item.chg}%`}</td>
                <td className={styles.ivAdjustCell}>
                  <Button
                    variant="tertiary"
                    size="small"
                    onClick={() =>
                      handleLocalIndividualIvAdjust(
                        item.token,
                        item.currentIndividualAdjustment,
                        -IV_ADJUSTMENT_STEP
                      )
                    }
                  >
                    –
                  </Button>
                  <span className={styles.individualOffsetValue}>
                    {(item.currentIndividualAdjustment || 0).toFixed(1)}%
                  </span>
                  <Button
                    variant="tertiary"
                    size="small"
                    onClick={() =>
                      handleLocalIndividualIvAdjust(
                        item.token,
                        item.currentIndividualAdjustment,
                        IV_ADJUSTMENT_STEP
                      )
                    }
                  >
                    +
                  </Button>
                </td>
              </tr>
            ))}
            {strikewiseIVsDisplayData.length === 0 && (
              <tr>
                <td colSpan={4} className={styles.noDataRow}>
                  No option legs selected.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <div className={`${styles.dataColumn} ${styles.greeksSummaryColumn}`}>
        <h4>
          Greeks{" "}
          <span className={styles.greeksSourceLabel}>
            ({greeksSourceLabel})
          </span>
        </h4>
        <Checkbox
          label="Lot Size / Contract Multiplier"
          checked={multiplyByLotSize}
          onChange={(e) =>
            onMultiplyByLotSizeChange(
              typeof e.target.checked === "boolean" ? e.target.checked : false
            )
          }
          className={styles.greeksCheckbox}
        />
        <Checkbox
          label="Num Lots"
          checked={multiplyByNumLots}
          onChange={(e) =>
            onMultiplyByNumLotsChange(
              typeof e.target.checked === "boolean" ? e.target.checked : false
            )
          }
          className={styles.greeksCheckbox}
        />
        <table>
          <tbody>
            <tr>
              <td>Delta</td>
              <td>
                {(singleScenarioPerLegData.totals.delta * multiplier)?.toFixed(
                  2
                ) || "-"}
              </td>
            </tr>
            <tr>
              <td>Gamma</td>
              <td>
                {(singleScenarioPerLegData.totals.gamma * multiplier)?.toFixed(
                  4
                ) || "-"}
              </td>
            </tr>
            <tr>
              <td>Theta</td>
              <td>
                {(singleScenarioPerLegData.totals.theta * multiplier)?.toFixed(
                  2
                ) || "-"}
              </td>
            </tr>
            <tr>
              <td>Vega</td>
              <td>
                {(singleScenarioPerLegData.totals.vega * multiplier)?.toFixed(
                  2
                ) || "-"}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <div className={`${styles.dataColumn} ${styles.targetDayFuturesColumn}`}>
        <h4>Futures & SD ({sdDays}D Est.)</h4>
        {targetDayFuturesInfo.price &&
          targetDayFuturesInfo.price !== "0.00" &&
          targetDayFuturesInfo.price !== "N/A" && (
            <p className={styles.futuresPriceDisplay}>
              Live Spot{" "}
              <span className={styles.priceValue}>
                {targetDayFuturesInfo.price}
              </span>
            </p>
          )}
        <table>
          <thead>
            <tr>
              <th>SD</th>
              <th>Points</th>
              <th>Range</th>
            </tr>
          </thead>
          <tbody>
            {targetDayFuturesInfo.sd.length > 0 ? (
              targetDayFuturesInfo.sd.map((item, index) => (
                <tr key={index}>
                  <td>{item.level}</td>
                  <td>{item.points}</td>
                  <td>
                    {item.priceLow} - {item.priceHigh}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={3} className={styles.noDataRow}>
                  SD data unavailable.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
};

export default React.memo(DetailedDataSection);
