// src/features/StrategyVisualizer/utils/payoffDataCalculator.ts

// Ensure these utilities are correctly imported from your project structure
import {
  black76Price,
  black76Greeks,
  timeToExpiry,
} from "./optionPricingUtils";

// ============================================================================
// TYPE DEFINITIONS (Bottom-up approach - starting with basic types)
// ============================================================================

/**
 * Basic Greeks interface for option pricing
 */
interface Greeks {
  delta: number;
  gamma: number;
  theta: number;
  vega: number;
}

/**
 * Option type enumeration
 */
type OptionType = "CE" | "PE";

/**
 * Leg type enumeration
 */
type LegType = "option" | "future";

/**
 * Buy/Sell direction
 */
type BuySell = "Buy" | "Sell";

/**
 * Instrument details from token lookup
 */
interface InstrumentDetails {
  legTypeDb: LegType;
  strike?: number;
  expiry?: string;
  expiryDate?: string;
  optionType?: OptionType;
  instrumentSymbol?: string;
  lastPrice?: number | string;
}

/**
 * Strategy leg input interface
 */
interface StrategyLeg {
  selected: boolean;
  token: string;
  legType: LegType;
  price: string | number;
  instrumentSymbol?: string;
  buySell: BuySell;
  lotSize?: string | number;
  lots?: string | number;
}

/**
 * Processed strategy leg with calculated values
 */
interface ProcessedStrategyLeg extends StrategyLeg {
  instrumentSymbolConcise: string;
  projectedValue: number | null;
  projectedPnL: number;
  projectedGreeks: Greeks;
  entryPrice: number;
  ltp: number | null;
}

/**
 * Aggregated totals for all legs
 */
interface StrategyTotals {
  projectedPnL: number;
  delta: number;
  gamma: number;
  theta: number;
  vega: number;
}

/**
 * Function type for getting instrument details by token
 */
type GetInstrumentByToken = (token: string) => InstrumentDetails | null | undefined;

/**
 * Function type for getting scenario IV
 */
type GetScenarioIV = (token: string) => number;

/**
 * Parameters for calculateProjectedStrategyData function
 */
interface CalculateProjectedStrategyDataParams {
  strategyLegs: StrategyLeg[];
  niftyTarget: string;
  targetDate: string;
  getInstrumentByToken: GetInstrumentByToken;
  riskFreeRate: number;
  getScenarioIV: GetScenarioIV;
  multiplyByLotSize: boolean;
  multiplyByNumLots: boolean;
  underlyingSpotPrice?: number;
}

/**
 * Return type for calculateProjectedStrategyData function
 */
interface CalculatedStrategyData {
  legs: ProcessedStrategyLeg[];
  totals: StrategyTotals;
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Helper function to format expiry dates for concise display in tables.
 * @param expiryStr - The expiry date string (e.g., "30MAY2024", "2024-06-27T00:00:00.000Z").
 * @param legType - The type of leg ('option' or 'future').
 * @returns A formatted expiry string (e.g., "30MAY", "NIFTY JUL FUT").
 */
function formatDisplayExpiryForTable(expiryStr: string, legType: LegType = "option"): string {
  if (!expiryStr || typeof expiryStr !== "string") return "N/A";

  // If it's a future and already descriptive (like from instrumentSymbol), return as is
  if (
    legType === "future" &&
    expiryStr.includes("FUT") &&
    expiryStr.length > 7
  ) {
    // e.g., "NIFTY JUL FUT"
    return expiryStr;
  }

  try {
    // Attempt to parse common date formats
    const dateObj = new Date(expiryStr);
    if (!isNaN(dateObj.getTime())) {
      // Prioritize "DDMON" format if original string looks like "DDMMMYYYY"
      if (
        expiryStr.length >= 9 &&
        /^\d{2}[A-Z]{3}\d{4}$/i.test(expiryStr.substring(0, 9))
      ) {
        return expiryStr.substring(0, 5); // e.g., "30MAY"
      }
      // Fallback to formatting from Date object
      const day = String(dateObj.getDate()).padStart(2, "0");
      const month = dateObj
        .toLocaleString("default", { month: "short" })
        .toUpperCase();
      return `${day}${month}`; // e.g., "27JUN"
    }
  } catch (e) {
    // If parsing fails, use a substring as a last resort
  }
  // Generic fallback if parsing is difficult or format is unknown
  return expiryStr.length > 7 ? expiryStr.substring(0, 7) : expiryStr;
}

// ============================================================================
// MAIN CALCULATION FUNCTION
// ============================================================================

/**
 * Calculates projected Profit/Loss and Greeks for each leg of a strategy
 * for a given scenario (target underlying price and target date).
 * This data is typically used for P&L tables and detailed Greek summaries.
 */
export const calculateProjectedStrategyData = ({
  strategyLegs,
  niftyTarget,
  targetDate,
  getInstrumentByToken,
  riskFreeRate,
  getScenarioIV,
  multiplyByLotSize,
  multiplyByNumLots,
  underlyingSpotPrice,
}: CalculateProjectedStrategyDataParams): CalculatedStrategyData => {
  // Validate essential inputs
  if (
    !Array.isArray(strategyLegs) || // Ensure strategyLegs is an array
    !getInstrumentByToken ||
    typeof riskFreeRate !== "number" || // Ensure riskFreeRate is a number
    !getScenarioIV
  ) {
    console.warn(
      "calculateProjectedStrategyData: Missing or invalid essential inputs."
    );
    return {
      legs: [],
      totals: { projectedPnL: 0, delta: 0, gamma: 0, theta: 0, vega: 0 },
    };
  }

  // Determine if calculating for a specific projected scenario or a "live" scenario
  const numericNiftyTarget = parseFloat(niftyTarget);
  const useProjectedScenario =
    targetDate && !isNaN(numericNiftyTarget) && numericNiftyTarget > 0;

  // spotForCalc is the spot price of the UNDERLYING on the projectionDate
  const spotForCalc = useProjectedScenario
    ? numericNiftyTarget
    : typeof underlyingSpotPrice === "number" && underlyingSpotPrice > 0
    ? underlyingSpotPrice
    : 0;

  // If a projected scenario is intended but the target spot is invalid, return empty
  if (spotForCalc <= 0 && useProjectedScenario) {
    console.warn(
      "calculateProjectedStrategyData: Invalid numericNiftyTarget for projected scenario."
    );
    return {
      legs: [],
      totals: { projectedPnL: 0, delta: 0, gamma: 0, theta: 0, vega: 0 },
    };
  }
  // If not a projected scenario and live spot is also unavailable, calculations will use spotForCalc = 0.

  // projectionDate is the date for which P&L and Greeks are being calculated
  const projectionDate = useProjectedScenario
    ? new Date(targetDate)
    : new Date(); // Default to "now" for live scenario

  // Initialize aggregate values
  let aggProjectedPnL = 0;
  let aggDelta = 0;
  let aggGamma = 0;
  let aggTheta = 0;
  let aggVega = 0;

  const projectedLegsResult: ProcessedStrategyLeg[] = strategyLegs
    .filter((leg): leg is StrategyLeg => 
      Boolean(leg && leg.selected && leg.token && leg.legType)
    ) // Filter for valid, selected legs with a legType
    .map((leg): ProcessedStrategyLeg => {
      const instrumentDetails = getInstrumentByToken(leg.token);

      // Default values for a leg if processing fails
      let projectedValuePerShare: number = parseFloat(String(leg.price)); // Default to entry price
      let legGreeks: Greeks = { delta: 0, gamma: 0, theta: 0, vega: 0 }; // Per share/unit greeks
      let displayInstrumentName: string = leg.instrumentSymbol || "Data N/A"; // Fallback display name

      if (!instrumentDetails) {
        console.warn(
          `calculateProjectedStrategyData: No instrument details found for token: ${leg.token}, symbol: ${leg.instrumentSymbol}`
        );
        // Leg will use default values (P&L=0, Greeks=0)
      } else if (leg.legType === "option") {
        // --- Option Leg Processing ---
        if (
          instrumentDetails.legTypeDb !== "option" ||
          instrumentDetails.strike === undefined ||
          !instrumentDetails.expiry ||
          !instrumentDetails.optionType
        ) {
          console.warn(
            `calculateProjectedStrategyData: Incomplete or mismatched option details for token: ${leg.token}`
          );
        } else {
          const scenarioIVForLeg = getScenarioIV(leg.token); // Expected decimal IV (e.g., 0.15)
          // T_to_option_expiry: Time from projectionDate to the OPTION'S own expiry date
          const T_to_option_expiry = timeToExpiry(
            instrumentDetails.expiry,
            projectionDate
          );

          if (T_to_option_expiry > 1e-9 && scenarioIVForLeg > 1e-9) {
            // Option has time value and IV
            // F_projected_for_option: Forward price of the UNDERLYING for the option's remaining life
            const F_projected_for_option =
              spotForCalc * Math.exp(riskFreeRate * T_to_option_expiry);
            projectedValuePerShare = black76Price(
              F_projected_for_option,
              Number(instrumentDetails.strike),
              T_to_option_expiry,
              riskFreeRate,
              scenarioIVForLeg,
              instrumentDetails.optionType
            );
            legGreeks = black76Greeks(
              F_projected_for_option,
              Number(instrumentDetails.strike),
              T_to_option_expiry,
              riskFreeRate,
              scenarioIVForLeg,
              instrumentDetails.optionType
            );
          } else {
            // Option is at expiry or IV is effectively zero, value is intrinsic
            projectedValuePerShare =
              instrumentDetails.optionType === "CE"
                ? Math.max(0, spotForCalc - Number(instrumentDetails.strike))
                : Math.max(0, Number(instrumentDetails.strike) - spotForCalc);
            // Calculate Greeks at T=0 or IV=0 (model should handle this gracefully)
            legGreeks = black76Greeks(
              spotForCalc,
              Number(instrumentDetails.strike),
              T_to_option_expiry <= 0 ? 1e-9 : T_to_option_expiry,
              riskFreeRate,
              scenarioIVForLeg > 0 ? scenarioIVForLeg : 0.0001,
              instrumentDetails.optionType
            );
          }
          displayInstrumentName = `${Number(instrumentDetails.strike)}${
            instrumentDetails.optionType
          } ${formatDisplayExpiryForTable(instrumentDetails.expiry, "option")}`;
        }
      } else if (leg.legType === "future") {
        // --- Future Leg Processing ---
        if (
          instrumentDetails.legTypeDb === "future" &&
          (instrumentDetails.expiryDate || instrumentDetails.expiry)
        ) {
          // T_future_rem: Time from projectionDate to the FUTURE'S own expiry date
          const expiryForFuture =
            instrumentDetails.expiryDate ??
            instrumentDetails.expiry ??
            ""; // fallback to empty string if both are undefined
          const T_future_rem = timeToExpiry(
            expiryForFuture,
            projectionDate
          );

          if (T_future_rem <= 1e-9) {
            // Future is at or past its expiry on the projectionDate
            projectedValuePerShare = spotForCalc; // Settles to the spot price of the underlying
          } else {
            // Projected future price using cost of carry: F = S * e^(rT)
            // S here is spotForCalc (underlying's spot on projectionDate)
            // T here is T_future_rem (time from projectionDate to future's own expiry)
            projectedValuePerShare =
              spotForCalc * Math.exp(riskFreeRate * T_future_rem);
          }

          // Simplified Greeks for Futures (per unit of underlying)
          legGreeks.delta = 1.0; // Delta of a future is 1
          legGreeks.gamma = 0.0;
          legGreeks.theta = 0.0; // Simplified; can be non-zero if modeling cost of carry per day
          legGreeks.vega = 0.0; // Futures are not directly sensitive to IV changes

          displayInstrumentName =
            instrumentDetails.instrumentSymbol ||
            `${formatDisplayExpiryForTable(
              instrumentDetails.expiryDate || instrumentDetails.expiry || "",
              "future"
            )} FUT`;
        } else {
          console.warn(
            `calculateProjectedStrategyData: Leg type is future but instrument details (expiry or type) mismatch for token: ${leg.token}`
          );
        }
      }

      // Calculate P&L per share/unit
      const entryPriceNum = parseFloat(String(leg.price));
      const pnlPerShare =
        isNaN(projectedValuePerShare) || isNaN(entryPriceNum)
          ? 0
          : projectedValuePerShare - entryPriceNum;

      // Determine scaling factor based on UI toggles
      const legContractSize = Number(leg.lotSize) || 1;
      let scaleFactor = 1;
      if (multiplyByLotSize) scaleFactor *= legContractSize;
      if (multiplyByNumLots && leg.lots) scaleFactor *= Number(leg.lots);

      const positionDirection = leg.buySell === "Buy" ? 1 : -1;
      const totalLegPnl = pnlPerShare * positionDirection * scaleFactor; // Total P&L for this leg is directional

      // Aggregate scaled Greeks for portfolio totals
      if (!isNaN(totalLegPnl)) aggProjectedPnL += totalLegPnl;
      if (legGreeks && !isNaN(legGreeks.delta))
        aggDelta += legGreeks.delta * positionDirection * scaleFactor;
      if (legGreeks && !isNaN(legGreeks.gamma))
        aggGamma += legGreeks.gamma * scaleFactor; // Gamma is typically additive
      if (legGreeks && !isNaN(legGreeks.theta))
        aggTheta += legGreeks.theta * positionDirection * scaleFactor; // Theta is directional
      if (legGreeks && !isNaN(legGreeks.vega))
        aggVega += legGreeks.vega * positionDirection * scaleFactor; // Vega is directional

      return {
        ...leg, // Spread original leg data
        instrumentSymbolConcise: `${leg.buySell === "Buy" ? "B" : "S"} ${
          leg.lots || 1
        }x ${displayInstrumentName}`,
        projectedValue: isNaN(projectedValuePerShare)
          ? null
          : projectedValuePerShare, // Projected price per share/unit
        projectedPnL: totalLegPnl, // Total scaled P&L for this leg
        projectedGreeks: {
          // Per-share/unit Greeks for this leg, made directional
          delta: legGreeks.delta * positionDirection,
          gamma: legGreeks.gamma, // Gamma itself is not made directional here, portfolio sum is what matters
          theta: legGreeks.theta * positionDirection,
          vega: legGreeks.vega * positionDirection,
        },
        entryPrice: entryPriceNum,
        ltp:
          instrumentDetails?.lastPrice !== undefined
            ? parseFloat(String(instrumentDetails.lastPrice))
            : null,
      };
    });

  return {
    legs: projectedLegsResult,
    totals: {
      projectedPnL: aggProjectedPnL,
      delta: aggDelta,
      gamma: aggGamma,
      theta: aggTheta,
      vega: aggVega,
    },
  };
};

// If calculateDynamicPayoffData was part of this file and is still used,
// it should be included here. It was present in your original paste but not directly
// related to the P&L table calculation fix. For it to handle futures,
// it would also need similar legType checks and appropriate P&L calculations.
// Example:
/*
export const calculateDynamicPayoffData = ({ ...params ... }) => {
    // This function would need significant updates to handle futures if it's
    // intended for a payoff chart that should display combined strategies.
    // The logic provided in the original paste was option-specific.
    console.warn("calculateDynamicPayoffData is not fully updated for futures and needs review if used.");
    return null; // Placeholder
};
*/