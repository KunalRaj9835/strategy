// src/features/StrategyVisualizer/utils/strategyUtils.ts

/**
 * Gets the strike step size based on the instrument symbol
 * @param instrumentSymbol - The symbol of the financial instrument
 * @returns The strike step size
 */
export const getStrikeStep = (instrumentSymbol?: string): number => {
  if (!instrumentSymbol) return 50; // Default
  
  const upperSymbol = instrumentSymbol.toUpperCase();
  
  if (upperSymbol.includes('BANKNIFTY')) return 100;
  if (upperSymbol.includes('NIFTY')) return 50;
  if (upperSymbol.includes('FINNIFTY')) return 50;
  // Add more specific underlying symbols if needed
  
  return 50; // Default Nifty step
};

/**
 * Finds the strike closest to the spot price (ATM - At The Money)
 * @param spotPrice - Current spot price of the underlying
 * @param availableStrikes - Array of available strike prices
 * @returns The ATM strike price or null if no strikes available
 */
export const findATMStrike = (spotPrice: number, availableStrikes: number[]): number | null => {
  if (!availableStrikes || availableStrikes.length === 0) return null;
  
  return availableStrikes.reduce((prev, curr) => 
    (Math.abs(curr - spotPrice) < Math.abs(prev - spotPrice) ? curr : prev)
  );
};

/**
 * Finds the Nth strike away from ATM, considering strike offset steps
 * @param spotPrice - Current spot price of the underlying
 * @param availableStrikes - Array of available strike prices
 * @param strikeOffsetSteps - Number of steps from ATM (0 for ATM, positive for higher strikes, negative for lower strikes)
 * @param instrumentSymbol - The symbol of the financial instrument (optional, for future use)
 * @returns The strike price at the specified offset or null if not found
 */
export const findStrikeByOffsetSteps = (
  spotPrice: number, 
  availableStrikes: number[], 
  strikeOffsetSteps: number, 
  instrumentSymbol?: string
): number | null => {
  if (!availableStrikes || availableStrikes.length === 0 || spotPrice === null || spotPrice === undefined) {
    return null;
  }
  
  // Create sorted array of unique strikes
  const sortedStrikes = Array.from(new Set(availableStrikes.map(s => Number(s))))
    .sort((a, b) => a - b);
    
  if (sortedStrikes.length === 0) return null;

  const atmStrike = findATMStrike(spotPrice, sortedStrikes);
  if (atmStrike === null) return null;

  const atmIndex = sortedStrikes.indexOf(atmStrike);
  if (atmIndex === -1) return null; // Should not happen if atmStrike is from sortedStrikes

  const targetIndex = atmIndex + strikeOffsetSteps;

  // Return strike at target index if within bounds
  if (targetIndex >= 0 && targetIndex < sortedStrikes.length) {
    return sortedStrikes[targetIndex];
  }
  
  // If target index is out of bounds, return closest valid strike (edge)
  if (targetIndex < 0) return sortedStrikes[0];
  if (targetIndex >= sortedStrikes.length) return sortedStrikes[sortedStrikes.length - 1];
  
  return null; // Fallback
};