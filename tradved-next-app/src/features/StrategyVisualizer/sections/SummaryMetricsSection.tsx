// src/features/StrategyVisualizer/sections/SummaryMetricsSection.tsx

"use client"; // This component uses hooks (useState, useMemo) and must be a Client Component.

import React, { useMemo, useState } from "react";

// Import the new SCSS module for locally-scoped styling.
import styles from "./SummaryMetricsSection.module.scss";

// Import shared UI components using the recommended Next.js alias for clean, absolute paths.
import MetricItem from "../components/MetricItem";
import Button from "@/components/Button/Button";

// --- Type Definitions (Fully Typed and Preserved from Original) ---
export type BuySell = "Buy" | "Sell";
export type OptionType = "CE" | "PE";
export type LegType = "option" | "future";

export interface StrategyLeg {
  token: string;
  price: number | string;
  lots: number;
  lotSize: number;
  buySell: BuySell;
  legType: LegType;
  strike?: number | string;
  optionType?: OptionType;
  selected?: boolean;
}

export interface Instrument {
  token: string;
  legTypeDb?: string;
  lastPrice?: string | number;
}

export interface PayoffGraphPoint {
  spot: number;
  pnlAtExpiry: number;
}

export interface PayoffGraphData {
  points?: PayoffGraphPoint[];
}

export interface SummaryMetricsSectionProps {
  strategyLegs: StrategyLeg[];
  underlyingSpotPrice: number | null;
  getInstrumentByToken?: (token: string) => Instrument | undefined;
  payoffGraphData?: PayoffGraphData;
}

// --- Constants (Preserved from Original) ---
const NOT_APPLICABLE = "N/A";
const UNLIMITED = "Unlimited";
const API_REQUIRED = "API Req.";

// --- Helper Functions (Preserved from Original, Fully Typed) ---
const formatDisplayValue = (
  value: number | string,
  options: {
    digits?: number;
    prefix?: string;
    suffix?: string;
    showSign?: boolean;
    useAbsolute?: boolean;
    noPrefixForZero?: boolean;
  } = {}
): string => {
  const {
    digits = 2,
    prefix = "₹",
    suffix = "",
    showSign = false,
    useAbsolute = false,
    noPrefixForZero = false,
  } = options;
  if (value === UNLIMITED) return value;
  if (
    value === null ||
    value === undefined ||
    (typeof value === "number" && isNaN(value))
  )
    return NOT_APPLICABLE;
  let numValue =
    typeof value === "string"
      ? parseFloat(value.replace(/[^0-9.-]+/g, ""))
      : value;
  if (typeof numValue !== "number" || isNaN(numValue)) return NOT_APPLICABLE;
  const displayPrefix = noPrefixForZero && numValue === 0 ? "" : prefix;
  let sign = "";
  if (showSign) {
    if (numValue > 1e-9) sign = "+";
    else if (numValue < -1e-9) sign = "-";
  } else if (numValue < -1e-9 && !useAbsolute) {
    sign = "-";
  }
  const valToFormat = useAbsolute ? Math.abs(numValue) : Math.abs(numValue);
  return `${sign}${displayPrefix}${valToFormat.toLocaleString(undefined, {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  })}${suffix}`;
};

const calculateTheoreticalLegPnl = (
  leg: StrategyLeg,
  spotAtExpiry: number
): number => {
  const entryPrice = parseFloat(String(leg.price));
  if (isNaN(entryPrice)) return 0;
  const contractMultiplier =
    (Number(leg.lots) || 1) * (Number(leg.lotSize) || 1);
  const direction = leg.buySell === "Buy" ? 1 : -1;
  let valueAtExpiry = 0;
  if (leg.legType === "option") {
    const strike = Number(leg.strike);
    if (isNaN(strike) || !leg.optionType) return 0;
    valueAtExpiry =
      leg.optionType === "CE"
        ? Math.max(0, spotAtExpiry - strike)
        : Math.max(0, strike - spotAtExpiry);
  } else if (leg.legType === "future") {
    valueAtExpiry = spotAtExpiry;
  }
  return (valueAtExpiry - entryPrice) * contractMultiplier * direction;
};

// --- Main Component (Fully Corrected with Best Practices) ---
const SummaryMetricsSection: React.FC<SummaryMetricsSectionProps> = ({
  strategyLegs,
  underlyingSpotPrice,
  getInstrumentByToken,
  payoffGraphData,
}) => {
  const [showRewardRisk, setShowRewardRisk] = useState(false);

  // BEST PRACTICE NOTE: The complex logic within this useMemo hook is preserved exactly as provided.
  // In a large-scale application, this could be refactored into smaller, dedicated custom hooks
  // for better readability and testing (e.g., `usePnlAnalytics`, `useIntrinsicValue`).
  const {
    intrinsicValue,
    timeValue,
    maxProfit,
    maxLoss,
    breakevenPoints,
    riskRewardRatio,
  } = useMemo(() => {
    let totalIntrinsicForOptions = 0;
    let totalTimeValueForOptions = 0;
    let rawMaxProfitFromGraph: number | string = NOT_APPLICABLE;
    let rawMaxLossFromGraph: number | string = NOT_APPLICABLE;
    const breakevens = new Set<string>();

    const allSelectedStrategyLegs = Array.isArray(strategyLegs)
      ? strategyLegs.filter(
          (leg) =>
            leg?.selected &&
            leg.legType &&
            typeof leg.price === "number" &&
            typeof leg.lots === "number" &&
            typeof leg.lotSize === "number"
        )
      : [];

    const selectedOptionLegsForIVTV = allSelectedStrategyLegs.filter(
      (leg) =>
        leg.legType === "option" &&
        leg.strike !== undefined &&
        !isNaN(Number(leg.strike)) &&
        ["CE", "PE"].includes(leg.optionType as string)
    );

    if (
      selectedOptionLegsForIVTV.length > 0 &&
      underlyingSpotPrice !== null &&
      typeof underlyingSpotPrice === "number" &&
      underlyingSpotPrice > 0
    ) {
      selectedOptionLegsForIVTV.forEach((leg) => {
        const legStrike = Number(leg.strike);
        const currentSpot = Number(underlyingSpotPrice);
        const intrinsicPerShare =
          leg.optionType === "CE"
            ? Math.max(0, currentSpot - legStrike)
            : Math.max(0, legStrike - currentSpot);
        const instrumentDetails = getInstrumentByToken?.(leg.token);
        let marketPricePerShare = parseFloat(String(leg.price));
        if (instrumentDetails?.lastPrice !== undefined)
          marketPricePerShare = parseFloat(String(instrumentDetails.lastPrice));
        const timeValuePerShare = marketPricePerShare - intrinsicPerShare;
        const totalContractsForLeg = leg.lots * leg.lotSize;
        const directionMultiplier = leg.buySell === "Buy" ? 1 : -1;
        totalIntrinsicForOptions +=
          intrinsicPerShare * totalContractsForLeg * directionMultiplier;
        totalTimeValueForOptions +=
          timeValuePerShare * totalContractsForLeg * directionMultiplier;
      });
    }

    let analyticallyUnlimitedProfit = false,
      analyticallyUnlimitedLoss = false;
    if (allSelectedStrategyLegs.length > 0) {
      let netLongCallExposure = 0,
        netShortCallExposure = 0,
        netLongPutExposure = 0,
        netShortPutExposure = 0,
        netLongFutureExposure = 0,
        netShortFutureExposure = 0;
      allSelectedStrategyLegs.forEach((leg) => {
        const quantityEffect = leg.lots * leg.lotSize;
        if (leg.legType === "option") {
          if (leg.optionType === "CE") {
            if (leg.buySell === "Buy") netLongCallExposure += quantityEffect;
            else netShortCallExposure += quantityEffect;
          } else if (leg.optionType === "PE") {
            if (leg.buySell === "Buy") netLongPutExposure += quantityEffect;
            else netShortPutExposure += quantityEffect;
          }
        } else if (leg.legType === "future") {
          if (leg.buySell === "Buy") netLongFutureExposure += quantityEffect;
          else netShortFutureExposure += quantityEffect;
        }
      });
      if (
        netLongFutureExposure > netShortFutureExposure ||
        netLongCallExposure > netShortCallExposure
      )
        analyticallyUnlimitedProfit = true;
      if (
        netShortFutureExposure > netLongFutureExposure ||
        netShortPutExposure > netLongPutExposure ||
        netShortCallExposure > netLongCallExposure
      )
        analyticallyUnlimitedLoss = true;
    }

    if (payoffGraphData?.points?.length) {
      const pnlValues = payoffGraphData.points
        .map((p) => p.pnlAtExpiry)
        .filter((pnl): pnl is number => typeof pnl === "number" && !isNaN(pnl));
      if (pnlValues.length > 0) {
        rawMaxProfitFromGraph = Math.max(...pnlValues);
        rawMaxLossFromGraph = Math.min(...pnlValues);
      }
      payoffGraphData.points.forEach((point, index) => {
        if (index === 0) return;
        const prev = payoffGraphData.points![index - 1];
        if (
          typeof prev.pnlAtExpiry !== "number" ||
          typeof point.pnlAtExpiry !== "number"
        )
          return;
        if (
          prev.pnlAtExpiry * point.pnlAtExpiry < 0 ||
          Math.abs(prev.pnlAtExpiry) < 1e-9
        ) {
          if (Math.abs(point.pnlAtExpiry - prev.pnlAtExpiry) > 1e-9) {
            const breakeven =
              prev.spot -
              (prev.pnlAtExpiry * (point.spot - prev.spot)) /
                (point.pnlAtExpiry - prev.pnlAtExpiry);
            if (!isNaN(breakeven)) breakevens.add(breakeven.toFixed(0));
          } else if (Math.abs(prev.pnlAtExpiry) < 1e-9) {
            breakevens.add(prev.spot.toFixed(0));
          }
        }
      });
    }

    let finalMaxProfit = rawMaxProfitFromGraph;
    let finalMaxLoss = rawMaxLossFromGraph;
    if (!analyticallyUnlimitedProfit && allSelectedStrategyLegs.length > 0) {
      let theoreticalProfitAtZero = allSelectedStrategyLegs.reduce(
        (sum, leg) => sum + calculateTheoreticalLegPnl(leg, 0),
        0
      );
      finalMaxProfit = Math.max(
        typeof rawMaxProfitFromGraph === "number"
          ? rawMaxProfitFromGraph
          : -Infinity,
        theoreticalProfitAtZero
      );
    }
    if (!analyticallyUnlimitedLoss && allSelectedStrategyLegs.length > 0) {
      let theoreticalLossAtZero = allSelectedStrategyLegs.reduce(
        (sum, leg) => sum + calculateTheoreticalLegPnl(leg, 0),
        0
      );
      finalMaxLoss = Math.min(
        typeof rawMaxLossFromGraph === "number"
          ? rawMaxLossFromGraph
          : Infinity,
        theoreticalLossAtZero
      );
    }

    if (analyticallyUnlimitedProfit) finalMaxProfit = UNLIMITED;
    if (analyticallyUnlimitedLoss) finalMaxLoss = UNLIMITED;

    let ratio: string = NOT_APPLICABLE;
    const numericProfit =
      finalMaxProfit === UNLIMITED
        ? Infinity
        : typeof finalMaxProfit === "number"
        ? finalMaxProfit
        : NaN;
    const absoluteLoss = Math.abs(
      finalMaxLoss === UNLIMITED
        ? -Infinity
        : typeof finalMaxLoss === "number"
        ? finalMaxLoss
        : NaN
    );
    if (!isNaN(numericProfit) && !isNaN(absoluteLoss)) {
      if (numericProfit === Infinity && absoluteLoss === Infinity)
        ratio = `${UNLIMITED}/${UNLIMITED}`;
      else if (numericProfit === Infinity) ratio = `${UNLIMITED} Reward`;
      else if (absoluteLoss === Infinity) ratio = `${UNLIMITED} Risk`;
      else if (absoluteLoss < 1e-9 && numericProfit < 1e-9) ratio = "0.00X";
      else if (absoluteLoss < 1e-9 && numericProfit > 0) ratio = "∞";
      else if (numericProfit <= 0 && absoluteLoss > 0) ratio = "0.00X";
      else if (absoluteLoss > 0 && numericProfit > 0) {
        ratio = showRewardRisk
          ? `${(numericProfit / absoluteLoss).toFixed(2)}X`
          : `${(absoluteLoss / numericProfit).toFixed(2)}X`;
      }
    }

    return {
      intrinsicValue: formatDisplayValue(totalIntrinsicForOptions, {
        showSign: true,
        noPrefixForZero: true,
      }),
      timeValue: formatDisplayValue(totalTimeValueForOptions, {
        showSign: true,
        noPrefixForZero: true,
      }),
      maxProfit:
        finalMaxProfit === UNLIMITED
          ? UNLIMITED
          : formatDisplayValue(numericProfit, { noPrefixForZero: true }),
      maxLoss:
        finalMaxLoss === UNLIMITED
          ? UNLIMITED
          : formatDisplayValue(absoluteLoss, { noPrefixForZero: true }),
      breakevenPoints:
        breakevens.size > 0
          ? Array.from(breakevens)
              .sort((a, b) => Number(a) - Number(b))
              .join(" & ")
          : NOT_APPLICABLE,
      riskRewardRatio: ratio,
    };
  }, [
    strategyLegs,
    underlyingSpotPrice,
    getInstrumentByToken,
    payoffGraphData,
    showRewardRisk,
  ]);

  return (
    <section className={styles.svSummaryMetricsSection}>
      <div className={styles.metricsGrid}>
        <div className={styles.metricRow}>
          <MetricItem
            label="Max. Profit"
            value={maxProfit}
            valueClass={
              maxProfit === UNLIMITED
                ? styles.unlimitedValue
                : styles.profitValue
            }
          />
          <MetricItem
            label="Max. Loss"
            value={maxLoss}
            valueClass={
              maxLoss === UNLIMITED ? styles.unlimitedValue : styles.lossValue
            }
          />
          <MetricItem
            label="Breakeven(s)"
            value={breakevenPoints}
            infoIconTitle="Price points where strategy breaks even at expiry"
          />
        </div>

        <div className={styles.metricRow}>
          <div>
            <Button
              onClick={() => setShowRewardRisk(!showRewardRisk)}
              className={styles.rewardRiskToggleBtn}
              variant="tertiary"
              size="small"
            >
              {showRewardRisk ? "Reward / Risk" : "Risk / Reward"}
            </Button>
            <MetricItem
              value={riskRewardRatio}
              valueClass={
                riskRewardRatio.includes("Reward") || riskRewardRatio === "∞"
                  ? styles.profitValue
                  : riskRewardRatio.includes("Risk")
                  ? styles.lossValue
                  : styles.neutralValue
              }
            />
          </div>
          <MetricItem
            label="Intrinsic Value"
            value={intrinsicValue}
            infoIconTitle="Current intrinsic value of selected OPTION positions"
          />
          <MetricItem
            label="Time Value"
            value={timeValue}
            infoIconTitle="Remaining time value in selected OPTION positions"
          />
        </div>

        <div className={styles.metricRow}>
          <MetricItem
            label="Funds & Margin"
            value={API_REQUIRED}
            infoIconTitle="Estimated funds & total margin (SPAN + Exposure)"
          />
          <MetricItem
            label="Funds Required"
            value={API_REQUIRED}
            infoIconTitle="Approximate funds needed for this strategy"
          />
          <MetricItem
            label="Standalone Margin"
            value={API_REQUIRED}
            infoIconTitle="Margin if this was the only position (indicative)"
          />
        </div>

        <div className={`${styles.metricRow} ${styles.singleMetric}`}>
          <MetricItem
            label="POP"
            value={API_REQUIRED}
            infoIconTitle="Probability of Profit (estimated)"
          />
        </div>
      </div>
    </section>
  );
};

export default SummaryMetricsSection;
