// src/features/StrategyVisualizer/utils/payoffGraphUtils.ts

import { black76Price, timeToExpiry } from "./optionPricingUtils";
import { 
    DEFAULT_VOLATILITY, 
    RISK_FREE_RATE,
    PAYOFF_GRAPH_POINTS as CONFIG_PAYOFF_GRAPH_POINTS,
    PAYOFF_GRAPH_INTERVAL_STEP as CONFIG_PAYOFF_GRAPH_INTERVAL_STEP,
    PAYOFF_CHART_XAXIS_STRIKE_PADDING_FACTOR
} from "@/config";

// Type definitions
export interface StrategyLeg {
  selected: boolean;
  token: string;
  price: number;
  legType: 'option' | 'future';
  optionType?: 'CE' | 'PE';
  strike?: number;
  buySell: 'Buy' | 'Sell';
  lots?: number;
  lotSize?: number;
}

export interface InstrumentDetails {
  strike?: number;
  expiry?: string;
  expiryDate?: string;
  optionType?: 'CE' | 'PE';
  legTypeDb: 'option' | 'future';
}

export interface MarketData {
  iv?: string | number;
  oi?: string | number;
}

export interface FullInstrumentChainData {
  legTypeDb: 'option' | 'future';
  strike?: number;
  optionType?: 'CE' | 'PE';
  marketData?: MarketData;
}

export interface PayoffPoint {
  spot: number;
  pnlAtExpiry: number;
  pnlAtTargetDate: number;
  pnlAtExpiryPct?: number;
  pnlAtTargetDatePct?: number;
  callOI: number;
  putOI: number;
  isCurrentSpot: boolean;
}

export interface SDBands {
  center: number;
  minus2SD: number;
  minus1SD: number;
  plus1SD: number;
  plus2SD: number;
}

export interface PayoffGraphData {
  points: PayoffPoint[];
  sdBands: SDBands | null;
}

export interface GeneratePayoffGraphDataParams {
  strategyLegs: StrategyLeg[];
  niftyTargetString: string;
  displaySpotForSlider: number;
  targetDateISO: string;
  riskFreeRate?: number;
  getScenarioIV: (token: string) => number;
  getInstrumentByToken: (token: string) => InstrumentDetails | null;
  PAYOFF_GRAPH_POINTS?: number;
  underlyingSpotPrice: number;
  showPercentage?: boolean;
  sdDays?: number;
  fullInstrumentChainData?: FullInstrumentChainData[];
}

// --- Calculation Helpers ---

/**
 * Calculates the value of a single leg at its own expiry.
 */
function calculateLegValueAtExpiry(
  leg: StrategyLeg, 
  spotAtExpiry: number, 
  instrumentDetails: InstrumentDetails | null
): number {
  if (leg.legType === 'option') {
    const strike = Number(instrumentDetails?.strike !== undefined ? instrumentDetails.strike : leg.strike);
    if (isNaN(strike) || !leg.optionType) return 0;
    if (leg.optionType === "CE") return Math.max(0, spotAtExpiry - strike);
    if (leg.optionType === "PE") return Math.max(0, strike - spotAtExpiry);
  } else if (leg.legType === 'future') {
    return spotAtExpiry;
  }
  return 0;
}

/**
 * Calculates the Profit/Loss of a single leg at its own expiry.
 */
function calculateLegPnLAtExpiry(
  leg: StrategyLeg, 
  spotAtExpiry: number, 
  instrumentDetails: InstrumentDetails | null
): number {
  const entryPrice = parseFloat(String(leg.price));
  if (isNaN(entryPrice)) return 0;
  const contractMultiplier = (Number(leg.lots) || 1) * (Number(leg.lotSize) || 1);
  const direction = leg.buySell === "Buy" ? 1 : -1;
  
  if (leg.legType === 'option') {
    const valueAtExpiry = calculateLegValueAtExpiry(leg, spotAtExpiry, instrumentDetails);
    const pnlPerShare = valueAtExpiry - entryPrice;
    return pnlPerShare * contractMultiplier * direction;
  } else if (leg.legType === 'future') {
    const pnlPerShare = spotAtExpiry - entryPrice;
    return pnlPerShare * contractMultiplier * direction;
  }
  return 0;
}

/**
 * Calculates the theoretical price of a leg at a given scenario target date.
 */
function calculateLegTheoreticalPrice(
  leg: StrategyLeg,
  spotAtScenarioTargetDate: number,
  scenarioTargetDateISO: string,
  riskFreeRate: number,
  getScenarioIV: (token: string) => number,
  getInstrumentByToken: (token: string) => InstrumentDetails | null
): number {
  const instrumentDetails = getInstrumentByToken(leg.token);
  if (!instrumentDetails) return parseFloat(String(leg.price));
  
  if (leg.legType === 'option') {
    if (!instrumentDetails.expiry || instrumentDetails.strike === undefined || !instrumentDetails.optionType || instrumentDetails.legTypeDb !== 'option') {
      return parseFloat(String(leg.price));
    }
    const scenarioIV = getScenarioIV(leg.token);
    const TTE_option = timeToExpiry(instrumentDetails.expiry, new Date(scenarioTargetDateISO));
    if (TTE_option <= 1e-9) return calculateLegValueAtExpiry(leg, spotAtScenarioTargetDate, instrumentDetails);
    if (scenarioIV <= 1e-9) return calculateLegValueAtExpiry(leg, spotAtScenarioTargetDate, instrumentDetails);
    const forwardPriceForOption = spotAtScenarioTargetDate * Math.exp(riskFreeRate * TTE_option);
    return black76Price(
      forwardPriceForOption, Number(instrumentDetails.strike), TTE_option, riskFreeRate, scenarioIV, instrumentDetails.optionType
    );
  } else if (leg.legType === 'future') {
    if (!instrumentDetails.expiryDate && !instrumentDetails.expiry) {
      console.warn(`Future leg ${leg.token} missing expiry information.`);
      return spotAtScenarioTargetDate;
    }
    const futureActualExpiryDate = new Date(instrumentDetails.expiryDate || instrumentDetails.expiry!);
    const scenarioTargetDate = new Date(scenarioTargetDateISO);
    if (scenarioTargetDate >= futureActualExpiryDate) {
      return spotAtScenarioTargetDate;
    } else {
      const TTE_future_from_scenario_target = timeToExpiry(futureActualExpiryDate, scenarioTargetDate);
      if (TTE_future_from_scenario_target <= 1e-9) {
        return spotAtScenarioTargetDate;
      }
      return spotAtScenarioTargetDate * Math.exp(riskFreeRate * TTE_future_from_scenario_target);
    }
  }
  return parseFloat(String(leg.price));
}

/**
 * Calculates the P&L of a single leg at the scenario target date.
 */
function calculateLegPnLAtTargetDate(
  leg: StrategyLeg,
  spotAtScenarioTargetDate: number,
  scenarioTargetDateISO: string,
  riskFreeRate: number,
  getScenarioIV: (token: string) => number,
  getInstrumentByToken: (token: string) => InstrumentDetails | null
): number {
  const theoreticalPriceAtTargetDate = calculateLegTheoreticalPrice(
    leg, spotAtScenarioTargetDate, scenarioTargetDateISO, riskFreeRate, getScenarioIV, getInstrumentByToken
  );
  const entryPrice = parseFloat(String(leg.price));
  if (isNaN(theoreticalPriceAtTargetDate) || isNaN(entryPrice)) return 0;
  const contractMultiplier = (Number(leg.lots) || 1) * (Number(leg.lotSize) || 1);
  const direction = leg.buySell === "Buy" ? 1 : -1;
  const pnlPerShare = theoreticalPriceAtTargetDate - entryPrice;
  return pnlPerShare * contractMultiplier * direction;
}

function snapToInterval(spot: number, interval: number): number {
  if (interval === 0 || isNaN(interval) || isNaN(spot)) return spot;
  return Math.round(spot / interval) * interval;
}

// --- Main Payoff Graph Data Generator ---
export function generatePayoffGraphData({
  strategyLegs,
  niftyTargetString,
  displaySpotForSlider,
  targetDateISO,
  riskFreeRate = RISK_FREE_RATE,
  getScenarioIV,
  getInstrumentByToken,
  PAYOFF_GRAPH_POINTS = CONFIG_PAYOFF_GRAPH_POINTS,
  underlyingSpotPrice,
  showPercentage = false,
  sdDays = 30,
  fullInstrumentChainData = [],
}: GeneratePayoffGraphDataParams): PayoffGraphData {
  const selectedLegs = strategyLegs.filter(
    (l): l is StrategyLeg => l.selected && !!l.token && typeof l.price === "number" && !!l.legType
  );

  const rawScenarioSpot =
    niftyTargetString !== "" && !isNaN(parseFloat(niftyTargetString))
      ? parseFloat(niftyTargetString)
      : typeof displaySpotForSlider === "number" && displaySpotForSlider > 0
      ? displaySpotForSlider
      : underlyingSpotPrice > 0 ? underlyingSpotPrice : 0;
  
  const centerForCalculations = rawScenarioSpot > 0 ? rawScenarioSpot : (underlyingSpotPrice > 0 ? underlyingSpotPrice : 0);
  
  if (centerForCalculations === 0 && selectedLegs.length === 0 && (!Array.isArray(fullInstrumentChainData) || fullInstrumentChainData.length === 0)) {
    return { points: [], sdBands: null };
  }

  // 1. Calculate SD bands (Standard Deviation Bands)
  let sdBands: SDBands | null = null;
  if (centerForCalculations > 0 && sdDays > 0) {
    let representativeIv = DEFAULT_VOLATILITY;
    const firstOptionLeg = selectedLegs.find(leg => leg.legType === 'option');
    if (firstOptionLeg) {
      const scenarioIV = getScenarioIV(firstOptionLeg.token);
      if (scenarioIV > 0) representativeIv = scenarioIV;
    } else if (Array.isArray(fullInstrumentChainData) && fullInstrumentChainData.length > 0) {
      const atmOptionFromChain = fullInstrumentChainData
        .filter(instr => instr.legTypeDb === 'option' && instr.marketData?.iv && parseFloat(String(instr.marketData.iv)) > 0 && instr.strike !== undefined)
        .reduce((prev, curr) => (!prev || Math.abs(parseFloat(String(curr.strike)) - centerForCalculations) < Math.abs(parseFloat(String(prev.strike)) - centerForCalculations) ? curr : prev), null as FullInstrumentChainData | null);
      if (atmOptionFromChain && atmOptionFromChain.marketData?.iv) {
        const parsedIV = parseFloat(String(atmOptionFromChain.marketData.iv));
        if (!isNaN(parsedIV) && parsedIV > 0) representativeIv = parsedIV / 100;
      }
    }
    if (representativeIv > 0) {
      const timeToExpiryForSD = sdDays / 365.25;
      if (timeToExpiryForSD > 0) {
        const sdMove = centerForCalculations * representativeIv * Math.sqrt(timeToExpiryForSD);
        sdBands = {
          center: Number(centerForCalculations.toFixed(2)),
          minus2SD: Math.max(0, Number((centerForCalculations - 2 * sdMove).toFixed(2))),
          minus1SD: Math.max(0, Number((centerForCalculations - sdMove).toFixed(2))),
          plus1SD: Number((centerForCalculations + sdMove).toFixed(2)),
          plus2SD: Number((centerForCalculations + 2 * sdMove).toFixed(2)),
        };
      }
    }
  }

  // 2. Generate P&L Spot Grid (x-axis points for the chart)
  let pnlSpotGrid: number[] = [];
  let minRangeSpot = centerForCalculations;
  let maxRangeSpot = centerForCalculations;
  const optionStrikes = selectedLegs
    .filter(l => l.legType === 'option' && l.strike !== undefined)
    .map(l => Number(l.strike));

  if (optionStrikes.length > 0) {
    const minLegStrike = Math.min(...optionStrikes);
    const maxLegStrike = Math.max(...optionStrikes);
    minRangeSpot = Math.min(minLegStrike, centerForCalculations);
    maxRangeSpot = Math.max(maxLegStrike, centerForCalculations);
  }

  const rangePaddingFactor = PAYOFF_CHART_XAXIS_STRIKE_PADDING_FACTOR;
  
  let calculatedLowBound = minRangeSpot > 0 ? minRangeSpot * (1 - rangePaddingFactor) : 0;
  let calculatedHighBound = maxRangeSpot > 0 ? maxRangeSpot * (1 + rangePaddingFactor) : (centerForCalculations > 0 ? centerForCalculations * (1 + rangePaddingFactor * 2) : 2000);

  if (centerForCalculations < 100 && optionStrikes.length === 0 && underlyingSpotPrice > 0) {
    calculatedLowBound = underlyingSpotPrice * (1 - rangePaddingFactor);
    calculatedHighBound = underlyingSpotPrice * (1 + rangePaddingFactor);
  } else if (centerForCalculations < 100 && optionStrikes.length === 0) {
    calculatedLowBound = 0;
    calculatedHighBound = 2000;
  }

  const finalLowBound = sdBands ? Math.min(calculatedLowBound, sdBands.minus2SD) : calculatedLowBound;
  const finalHighBound = sdBands ? Math.max(calculatedHighBound, sdBands.plus2SD) : calculatedHighBound;

  let effectiveLowBound = Math.max(0.01, finalLowBound);
  let effectiveHighBound = Math.max(effectiveLowBound + CONFIG_PAYOFF_GRAPH_INTERVAL_STEP, finalHighBound);

  if (optionStrikes.length === 0 && centerForCalculations > 0) {
    const maxAllowedRangeFromCenter = centerForCalculations * 0.50;
    effectiveLowBound = Math.max(effectiveLowBound, centerForCalculations - maxAllowedRangeFromCenter);
    effectiveHighBound = Math.min(effectiveHighBound, centerForCalculations + maxAllowedRangeFromCenter);
    effectiveLowBound = Math.max(0.01, effectiveLowBound);
    effectiveHighBound = Math.max(effectiveLowBound + CONFIG_PAYOFF_GRAPH_INTERVAL_STEP, effectiveHighBound);
  }

  const numPointsToGenerate = PAYOFF_GRAPH_POINTS;

  if (effectiveHighBound > effectiveLowBound && numPointsToGenerate > 0) {
    for (let i = 0; i <= numPointsToGenerate; i++) {
      const spotVal = effectiveLowBound + (i * (effectiveHighBound - effectiveLowBound)) / numPointsToGenerate;
      pnlSpotGrid.push(Number(spotVal.toFixed(2)));
    }
  } else {
    const fallbackCenter = centerForCalculations > 0 ? centerForCalculations : (underlyingSpotPrice || 50000);
    const halfPoints = Math.floor(numPointsToGenerate / 2);
    for (let i = -halfPoints; i <= halfPoints; i++) {
      pnlSpotGrid.push(Number((fallbackCenter + i * CONFIG_PAYOFF_GRAPH_INTERVAL_STEP).toFixed(2)));
    }
  }
  pnlSpotGrid = Array.from(new Set(pnlSpotGrid.filter(p => p >= 0))).sort((a, b) => a - b);

  // 3. Generate OI Spot Grid
  let oiSpotGrid: number[] = [];
  if (Array.isArray(fullInstrumentChainData) && fullInstrumentChainData.length > 0) {
    oiSpotGrid = Array.from(
      new Set(
        fullInstrumentChainData
          .filter(instr => instr.legTypeDb === 'option' && instr.strike !== undefined)
          .map(opt => parseFloat(String(opt.strike)))
          .filter(strikeNum => !isNaN(strikeNum) && strikeNum >= effectiveLowBound && strikeNum <= effectiveHighBound)
      )
    ).map(s => Number(s.toFixed(2)));
  }

  // 4. Merge and sort all unique spot points
  const finalSpotGrid = Array.from(new Set([...pnlSpotGrid, ...oiSpotGrid])).sort((a, b) => a - b);
  
  if (finalSpotGrid.length === 0) {
    const finalFallbackCenter = centerForCalculations > 0 ? centerForCalculations : (underlyingSpotPrice || 50000);
    for (let i = -5; i <= 5; i++) {
      finalSpotGrid.push(Number((finalFallbackCenter + i * (finalFallbackCenter * 0.02)).toFixed(2)));
    }
    finalSpotGrid.sort((a, b) => a - b);
    if (finalSpotGrid.length === 0) return { points: [], sdBands };
  }

  // 5. Calculate P&L and OI for each point
  const points: PayoffPoint[] = finalSpotGrid.map((spotOnXaxis) => {
    let pnlAtExpiryTotal = 0;
    let pnlAtTargetDateTotal = 0;

    if (selectedLegs.length > 0) {
      selectedLegs.forEach((leg) => {
        const instrumentDetails = getInstrumentByToken(leg.token);
        pnlAtExpiryTotal += calculateLegPnLAtExpiry(leg, spotOnXaxis, instrumentDetails);
        pnlAtTargetDateTotal += calculateLegPnLAtTargetDate(
          leg, spotOnXaxis, targetDateISO, riskFreeRate, getScenarioIV, getInstrumentByToken
        );
      });
    }

    let callOI = 0;
    let putOI = 0;
    if (Array.isArray(fullInstrumentChainData) && fullInstrumentChainData.length > 0) {
      fullInstrumentChainData.forEach(instrument => {
        if (instrument.legTypeDb === 'option' && instrument.strike !== undefined && 
            Math.abs(Number(instrument.strike) - spotOnXaxis) < (CONFIG_PAYOFF_GRAPH_INTERVAL_STEP / 2)) {
          if (instrument.optionType === 'CE' && instrument.marketData?.oi) {
            callOI += Number(instrument.marketData.oi);
          } else if (instrument.optionType === 'PE' && instrument.marketData?.oi) {
            putOI += Number(instrument.marketData.oi);
          }
        }
      });
    }

    let pnlAtExpiryPct: number | undefined;
    let pnlAtTargetDatePct: number | undefined;
    if (showPercentage && typeof underlyingSpotPrice === 'number' && underlyingSpotPrice !== 0) {
      pnlAtExpiryPct = (pnlAtExpiryTotal / underlyingSpotPrice) * 100;
      pnlAtTargetDatePct = (pnlAtTargetDateTotal / underlyingSpotPrice) * 100;
    }

    return {
      spot: spotOnXaxis,
      pnlAtExpiry: Number(pnlAtExpiryTotal.toFixed(2)),
      pnlAtTargetDate: Number(pnlAtTargetDateTotal.toFixed(2)),
      pnlAtExpiryPct: pnlAtExpiryPct !== undefined ? Number(pnlAtExpiryPct.toFixed(2)) : undefined,
      pnlAtTargetDatePct: pnlAtTargetDatePct !== undefined ? Number(pnlAtTargetDatePct.toFixed(2)) : undefined,
      callOI,
      putOI,
      isCurrentSpot: centerForCalculations > 0 ? Math.abs(spotOnXaxis - centerForCalculations) < 0.01 : false,
    };
  });

  return { points, sdBands };
}