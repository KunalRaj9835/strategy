// src/features/StrategyVisualizer/sections/NewStrategySection.tsx

'use client'; // This is a highly interactive component and must be a Client Component.

import React, { useMemo, useCallback } from "react";

// Import the new SCSS module for locally-scoped styling.
import styles from './NewStrategySection.module.scss';

// Import shared UI components using the recommended Next.js alias for clean, absolute paths.
import Checkbox from '@/components/Checkbox/Checkbox';
import Button from '@/components/Button/Button';
import StrategyLegRow from '../components/StrategyLegRow';

// Import constants and utilities
import { DEFAULT_VOLATILITY } from '@/config';

// --- Type Definitions (Fully Typed for Robustness) ---
type BuySell = "Buy" | "Sell";
type OptionType = "CE" | "PE";
type LegType = "option" | "future";
type StrategyStatus = "new_leg" | "active_position" | "draft";

interface SelectOption {
  label: string;
  value: string | number;
}

interface OptionInstrument {
  token: string;
  expiry: string;
  strike: number | string;
  optionType: OptionType;
  lastPrice?: number | string;
  instrumentSymbol?: string;
  symbol?: string;
  lotSize?: number;
  contractInfo?: { lotSize?: number };
  iv?: number | string;
}

interface FutureInstrument {
  token: string;
  expiry: string;
  expiryDate?: string;
  lastPrice?: number | string;
  instrumentSymbol?: string;
  symbol?: string;
  lotSize?: number;
}

interface TradableInstruments {
  options: OptionInstrument[];
  futures: FutureInstrument[];
}

interface StrategyLeg {
  id: string | number;
  selected: boolean;
  buySell: BuySell;
  lots: number;
  price: number | string;
  token: string;
  instrumentSymbol: string;
  status: StrategyStatus;
  legType: LegType;
  lotSize: number;
  optionType?: OptionType | "";
  expiry?: string;
  strike?: number | string;
  iv?: number | string;
}

interface SaveStrategyPayload {
  userId: string;
  underlying: string;
  legs: StrategyLeg[];
  status: "draft" | "active_position";
  multiplier: number;
  name: string;
}

interface NewStrategySectionProps {
  strategyLegs: StrategyLeg[];
  onStrategyLegsChange: React.Dispatch<React.SetStateAction<StrategyLeg[]>>;
  tradableInstrumentsForSelectedUnderlying: TradableInstruments;
  currentUnderlying: string;
  onSaveStrategy: (payload: SaveStrategyPayload) => void;
  underlyingSpotPrice: number | null;
  multiplier: number;
  setMultiplier: React.Dispatch<React.SetStateAction<number>>;
}

const HARDCODED_USER_ID_FOR_SAVE = "userTest01"; // Preserved from original

// --- Main Component (Fully Corrected with Best Practices) ---
const NewStrategySection: React.FC<NewStrategySectionProps> = ({
  strategyLegs,
  onStrategyLegsChange,
  tradableInstrumentsForSelectedUnderlying,
  currentUnderlying,
  onSaveStrategy,
  underlyingSpotPrice,
  multiplier,
  setMultiplier,
}) => {
  // All hooks and logic are preserved from the original file, with enhanced TypeScript typing.
  const { totalPremium, priceGetNet } = useMemo(() => {
    let premium = 0, netPriceValue = 0;
    if (!Array.isArray(strategyLegs)) return { totalPremium: 0, priceGetNet: 0 };
    strategyLegs.filter((l) => l.selected && l.legType).forEach((leg) => {
      const legPrice = typeof leg.price === "number" ? leg.price : 0;
      const legLots = typeof leg.lots === "number" && leg.lots > 0 ? leg.lots : 1;
      const legContractSize = typeof leg.lotSize === "number" && leg.lotSize > 0 ? leg.lotSize : 1;
      const direction = leg.buySell === "Buy" ? 1 : -1;
      premium += legPrice * direction * legLots * legContractSize * -1;
      netPriceValue += legPrice * direction * -1;
    });
    return { totalPremium: premium, priceGetNet: netPriceValue };
  }, [strategyLegs]);

  const allOptionExpiries = useMemo<SelectOption[]>(() => {
    if (!tradableInstrumentsForSelectedUnderlying?.options?.length) return [];
    const expiries = [...new Set(tradableInstrumentsForSelectedUnderlying.options.map((opt) => opt.expiry))];
    return expiries.sort((a, b) => { try { const dateA = new Date(a.replace(/(\d{2})([A-Z]{3})(\d{4})/, "$2 $1, $3")); const dateB = new Date(b.replace(/(\d{2})([A-Z]{3})(\d{4})/, "$2 $1, $3")); if (!isNaN(dateA.getTime()) && !isNaN(dateB.getTime())) return dateA.getTime() - dateB.getTime(); } catch (e) {} return a.localeCompare(b); }).map((expiry) => ({ label: expiry, value: expiry }));
  }, [tradableInstrumentsForSelectedUnderlying]);

  const allFutureExpiries = useMemo<SelectOption[]>(() => {
    if (!tradableInstrumentsForSelectedUnderlying?.futures?.length) return [];
    return tradableInstrumentsForSelectedUnderlying.futures.map((fut) => ({ label: fut.instrumentSymbol || `${currentUnderlying} ${fut.expiry || "Future"}`, value: fut.token, expiryDate: fut.expiryDate || fut.expiry })).sort((a, b) => new Date(a.expiryDate || 0).getTime() - new Date(b.expiryDate || 0).getTime());
  }, [tradableInstrumentsForSelectedUnderlying, currentUnderlying]);

  const getStrikesForOptionExpiry = useCallback((expiryDate?: string): SelectOption[] => {
    if (!tradableInstrumentsForSelectedUnderlying?.options || !expiryDate) return [];
    const strikes = tradableInstrumentsForSelectedUnderlying.options.filter((opt) => opt.expiry === expiryDate).map((opt) => Number(opt.strike));
    return [...new Set(strikes)].sort((a, b) => a - b).map((strike) => ({ label: String(strike), value: strike }));
  }, [tradableInstrumentsForSelectedUnderlying]);

  const getTypesForOptionExpiryStrike = useCallback((expiryDate?: string, strikePrice?: number | string): SelectOption[] => {
    if (!tradableInstrumentsForSelectedUnderlying?.options || !expiryDate || strikePrice === undefined || strikePrice === null || strikePrice === "") return [];
    const types = tradableInstrumentsForSelectedUnderlying.options.filter((opt) => opt.expiry === expiryDate && Number(opt.strike) === Number(strikePrice)).map((opt) => opt.optionType);
    return [...new Set(types)].sort().map((type) => ({ label: type, value: type }));
  }, [tradableInstrumentsForSelectedUnderlying]);

  const findOptionDetails = useCallback((expiry?: string, strike?: number | string, optionType?: OptionType | ""): OptionInstrument | null => {
    if (!tradableInstrumentsForSelectedUnderlying?.options || !expiry || strike === undefined || strike === null || strike === "" || !optionType) return null;
    return tradableInstrumentsForSelectedUnderlying.options.find((opt) => opt.expiry === expiry && Number(opt.strike) === Number(strike) && opt.optionType === optionType) || null;
  }, [tradableInstrumentsForSelectedUnderlying]);

  const findFutureInstrumentDetails = useCallback((futureToken?: string): FutureInstrument | null => {
    if (!tradableInstrumentsForSelectedUnderlying?.futures || !futureToken) return null;
    return tradableInstrumentsForSelectedUnderlying.futures.find((fut) => fut.token === futureToken) || null;
  }, [tradableInstrumentsForSelectedUnderlying]);

  const handleAddLeg = useCallback((legTypeToAdd: LegType = "option") => {
    let newLegBase: Partial<StrategyLeg> = { id: `leg_${Date.now()}_${Math.random().toString(16).slice(2)}`, selected: true, buySell: "Buy", lots: 1, price: 0, token: "", instrumentSymbol: "", status: "new_leg", legType: legTypeToAdd, lotSize: 1 };
    let newLegSpecifics: Partial<StrategyLeg> = {};
    const defaultLotSize = currentUnderlying?.toUpperCase().includes("BANKNIFTY") ? 15 : currentUnderlying?.toUpperCase().includes("FINNIFTY") ? 40 : 50;

    if (legTypeToAdd === "option") {
      newLegSpecifics = { optionType: "", expiry: "", strike: "", lotSize: defaultLotSize, iv: DEFAULT_VOLATILITY * 100 };
      if (allOptionExpiries.length > 0) {
        newLegSpecifics.expiry = allOptionExpiries[0].value as string;
        const strikesForDefaultExpiry = getStrikesForOptionExpiry(newLegSpecifics.expiry);
        if (strikesForDefaultExpiry.length > 0) {
          let atmStrikeObj = strikesForDefaultExpiry.reduce((prev, curr) => (Math.abs(Number(curr.value) - (underlyingSpotPrice || 0)) < Math.abs(Number(prev.value) - (underlyingSpotPrice || 0)) ? curr : prev), strikesForDefaultExpiry[0]);
          newLegSpecifics.strike = atmStrikeObj.value;
          const typesForDefaultStrike = getTypesForOptionExpiryStrike(newLegSpecifics.expiry, newLegSpecifics.strike);
          newLegSpecifics.optionType = typesForDefaultStrike.find((t) => t.value === "CE")?.value as OptionType || typesForDefaultStrike[0]?.value as OptionType || "";
          if (newLegSpecifics.optionType) {
            const optionDetails = findOptionDetails(newLegSpecifics.expiry, newLegSpecifics.strike, newLegSpecifics.optionType);
            if (optionDetails) {
              newLegBase.price = optionDetails.lastPrice !== undefined ? parseFloat(String(optionDetails.lastPrice)) : 0;
              newLegBase.token = optionDetails.token;
              newLegBase.instrumentSymbol = optionDetails.instrumentSymbol || optionDetails.symbol || `${currentUnderlying}${newLegSpecifics.expiry}${newLegSpecifics.strike}${newLegSpecifics.optionType}`;
              newLegSpecifics.lotSize = optionDetails.lotSize || optionDetails.contractInfo?.lotSize || newLegSpecifics.lotSize;
              newLegSpecifics.iv = optionDetails.iv !== undefined ? parseFloat(String(optionDetails.iv)) : newLegSpecifics.iv;
            } else { newLegBase.instrumentSymbol = `${currentUnderlying}${newLegSpecifics.expiry}${newLegSpecifics.strike}${newLegSpecifics.optionType}`; }
          }
        }
      }
    } else if (legTypeToAdd === "future") {
      newLegSpecifics = { strike: -1, expiry: "", optionType: "", iv: NaN, lotSize: defaultLotSize };
      if (allFutureExpiries.length > 0) {
        const defaultFutureToken = allFutureExpiries[0].value as string;
        const futureDetails = findFutureInstrumentDetails(defaultFutureToken);
        if (futureDetails) {
          newLegSpecifics.expiry = futureDetails.token; // Use token as the selectable value.
          newLegBase.price = futureDetails.lastPrice !== undefined ? parseFloat(String(futureDetails.lastPrice)) : 0;
          newLegBase.token = futureDetails.token;
          newLegBase.instrumentSymbol = futureDetails.instrumentSymbol || futureDetails.symbol || `${currentUnderlying} Future`;
          newLegSpecifics.lotSize = futureDetails.lotSize || newLegSpecifics.lotSize;
        }
      }
    }
    onStrategyLegsChange((prev) => [...prev, { ...newLegBase, ...newLegSpecifics } as StrategyLeg]);
  }, [onStrategyLegsChange, allOptionExpiries, getStrikesForOptionExpiry, getTypesForOptionExpiryStrike, findOptionDetails, allFutureExpiries, findFutureInstrumentDetails, currentUnderlying, underlyingSpotPrice]);

  const handleLegChange = useCallback((legId: string | number, field: string, value: any) => {
    onStrategyLegsChange((prevLegs) => prevLegs.map((originalLeg) => {
      if (originalLeg.id !== legId) return originalLeg;
      const isOriginalLegActivePosition = originalLeg.status === "active_position";
      if (isOriginalLegActivePosition && field !== "selected") return originalLeg;

      let updatedLeg = { ...originalLeg, [field]: value };
      if (field === "lots") updatedLeg.lots = Math.max(1, parseInt(value, 10) || 1);
      if (field === "price" && !isOriginalLegActivePosition) updatedLeg.price = parseFloat(value) || 0;

      if (updatedLeg.legType === "option") {
        if (field === "strike") updatedLeg.strike = value !== "" ? Number(value) : "";
        if (field === "iv" && !isOriginalLegActivePosition) updatedLeg.iv = parseFloat(value) || 0;
        if (!isOriginalLegActivePosition && (field === "expiry" || field === "strike" || field === "optionType")) {
          if (field === "expiry") {
            updatedLeg.strike = "";
            updatedLeg.optionType = "";
            const strikesForNewExpiry = getStrikesForOptionExpiry(updatedLeg.expiry);
            if (strikesForNewExpiry.length > 0) {
              const atmStrikeObj = strikesForNewExpiry.reduce((prev, curr) => Math.abs(Number(curr.value) - (underlyingSpotPrice || 0)) < Math.abs(Number(prev.value) - (underlyingSpotPrice || 0)) ? curr : prev, strikesForNewExpiry[0]);
              updatedLeg.strike = atmStrikeObj.value;
              const typesForNewStrike = getTypesForOptionExpiryStrike(updatedLeg.expiry, updatedLeg.strike);
              updatedLeg.optionType = typesForNewStrike.find((t) => t.value === "CE")?.value as OptionType || typesForNewStrike[0]?.value as OptionType || "";
            }
          } else if (field === "strike" && updatedLeg.expiry) {
            updatedLeg.optionType = "";
            const typesForNewStrike = getTypesForOptionExpiryStrike(updatedLeg.expiry, updatedLeg.strike);
            updatedLeg.optionType = typesForNewStrike.find((t) => t.value === "CE")?.value as OptionType || typesForNewStrike[0]?.value as OptionType || "";
          }
          if (updatedLeg.expiry && updatedLeg.strike !== "" && updatedLeg.optionType) {
            const optionDetails = findOptionDetails(updatedLeg.expiry, updatedLeg.strike, updatedLeg.optionType);
            if (optionDetails) {
              updatedLeg.token = optionDetails.token;
              updatedLeg.instrumentSymbol = optionDetails.instrumentSymbol || optionDetails.symbol || `${currentUnderlying}${updatedLeg.expiry}${updatedLeg.strike}${updatedLeg.optionType}`;
              updatedLeg.lotSize = optionDetails.lotSize || optionDetails.contractInfo?.lotSize || updatedLeg.lotSize;
              if (field !== "price" && optionDetails.lastPrice !== undefined) updatedLeg.price = parseFloat(String(optionDetails.lastPrice));
              if (field !== "iv" && optionDetails.iv !== undefined) updatedLeg.iv = parseFloat(String(optionDetails.iv));
            } else { updatedLeg.token = ""; updatedLeg.instrumentSymbol = `${currentUnderlying}${updatedLeg.expiry}${updatedLeg.strike}${updatedLeg.optionType}`; }
          } else { updatedLeg.token = ""; updatedLeg.instrumentSymbol = ""; }
        }
      } else if (updatedLeg.legType === "future") {
        if (field === "expiry" && !isOriginalLegActivePosition) {
          const futureDetails = findFutureInstrumentDetails(value);
          if (futureDetails) {
            updatedLeg.token = futureDetails.token;
            updatedLeg.expiry = futureDetails.token; // Keep expiry field as the token for selection
            updatedLeg.instrumentSymbol = futureDetails.instrumentSymbol || futureDetails.symbol || `${currentUnderlying} Future`;
            updatedLeg.lotSize = futureDetails.lotSize || updatedLeg.lotSize;
            if (field !== "price" && futureDetails.lastPrice !== undefined) updatedLeg.price = parseFloat(String(futureDetails.lastPrice));
          } else { updatedLeg.token = ""; updatedLeg.instrumentSymbol = ""; }
        }
      }
      return updatedLeg;
    }));
  }, [onStrategyLegsChange, findOptionDetails, findFutureInstrumentDetails, currentUnderlying, getStrikesForOptionExpiry, getTypesForOptionExpiryStrike, underlyingSpotPrice]);

  const handleRemoveLeg = useCallback((legId: string | number) => {
    onStrategyLegsChange((prev) => prev.filter((leg) => {
      if (leg.id === legId && leg.status === "active_position") { alert("Active positions cannot be removed directly from the builder. Manage them through your positions list."); return true; }
      return leg.id !== legId;
    }));
  }, [onStrategyLegsChange]);

  const handleDuplicateLeg = useCallback((legId: string | number) => {
    const legToDuplicate = strategyLegs.find((l) => l.id === legId);
    if (!legToDuplicate) return;
    let newPrice = parseFloat(String(legToDuplicate.price));
    let newIv: number | string | undefined = undefined;
    if (legToDuplicate.legType === "option") {
      const optionDetails = findOptionDetails(legToDuplicate.expiry, legToDuplicate.strike, legToDuplicate.optionType);
      newPrice = optionDetails?.lastPrice !== undefined ? parseFloat(String(optionDetails.lastPrice)) : newPrice;
      newIv = optionDetails?.iv !== undefined ? parseFloat(String(optionDetails.iv)) : legToDuplicate.iv;
    } else if (legToDuplicate.legType === "future") {
      const futureDetails = findFutureInstrumentDetails(legToDuplicate.expiry);
      newPrice = futureDetails?.lastPrice !== undefined ? parseFloat(String(futureDetails.lastPrice)) : newPrice;
    }
    onStrategyLegsChange((prev) => [...prev, { ...legToDuplicate, id: `leg_${Date.now()}_${Math.random().toString(16).slice(2)}`, selected: true, status: "new_leg", price: newPrice, iv: newIv }]);
  }, [strategyLegs, onStrategyLegsChange, findOptionDetails, findFutureInstrumentDetails]);

  const handleAnalyzeLeg = useCallback((legId: string | number) => {
    const legToAnalyze = strategyLegs.find((l) => l.id === legId);
    if (legToAnalyze) alert(`Placeholder for Analyzing Leg: ${legToAnalyze.instrumentSymbol || legToAnalyze.id}`);
  }, [strategyLegs]);

  const handleClearTrades = () => {
    const activePositions = strategyLegs.filter((leg) => leg.status === "active_position");
    if (activePositions.length === strategyLegs.length && strategyLegs.length > 0) {
      alert("Cannot clear active positions. To start fresh with no legs, please change the underlying instrument.");
    } else { onStrategyLegsChange(activePositions); }
  };

  const handleResetPrices = useCallback(() => {
    onStrategyLegsChange((prevLegs) => prevLegs.map((leg) => {
      if (leg.status === "active_position") return leg;
      if (leg.legType === "option") {
        const optDetails = findOptionDetails(leg.expiry, leg.strike, leg.optionType);
        if (optDetails?.lastPrice !== undefined) return { ...leg, price: parseFloat(String(optDetails.lastPrice)) };
      } else if (leg.legType === "future") {
        const futDetails = findFutureInstrumentDetails(leg.expiry);
        if (futDetails?.lastPrice !== undefined) return { ...leg, price: parseFloat(String(futDetails.lastPrice)) };
      }
      return leg;
    }));
  }, [onStrategyLegsChange, findOptionDetails, findFutureInstrumentDetails]);

  const selectedTradesCount = useMemo(() => Array.isArray(strategyLegs) ? strategyLegs.filter((l) => l.selected).length : 0, [strategyLegs]);
  const allTradesSelected = useMemo(() => strategyLegs.length > 0 && selectedTradesCount === strategyLegs.length, [strategyLegs, selectedTradesCount]);

  const handleSelectAllTrades = (isChecked: boolean) => { onStrategyLegsChange((prev) => prev.map((leg) => ({ ...leg, selected: isChecked }))); };

  const handleActionClick = (actionStatus: "draft" | "active_position", defaultNamePrefix: string) => {
    const legsForAction = strategyLegs.filter((leg) => leg.selected && leg.legType);
    if (legsForAction.length === 0) { alert(`Please add and select at least one new leg to ${defaultNamePrefix.toLowerCase()}.`); return; }
    if (!currentUnderlying) { alert("Please select an underlying instrument first."); return; }

    const legsAreValid = legsForAction.every((leg) => {
      if (leg.legType === "option") return (leg.token && leg.instrumentSymbol?.trim() && leg.expiry && leg.strike !== "" && leg.optionType && leg.buySell && leg.lots >= 1 && typeof leg.price === "number" && leg.lotSize >= 1 && typeof leg.iv === "number");
      else if (leg.legType === "future") return (leg.token && leg.instrumentSymbol?.trim() && leg.expiry && leg.buySell && leg.lots >= 1 && typeof leg.price === "number" && leg.lotSize >= 1);
      return false;
    });

    if (!legsAreValid) { alert("One or more selected new legs have incomplete or invalid data. Please check all fields."); return; }

    let strategyName = `${defaultNamePrefix}: ${currentUnderlying} (${new Date().toLocaleDateString("en-CA")})`;
    if (actionStatus === "draft") {
      const promptedName = prompt("Enter a name for this draft strategy:", strategyName);
      if (!promptedName?.trim()) return;
      strategyName = promptedName.trim();
    }

    const payload: SaveStrategyPayload = { userId: HARDCODED_USER_ID_FOR_SAVE, underlying: currentUnderlying, legs: legsForAction.map(leg => ({ ...leg, status: actionStatus })), status: actionStatus, multiplier: multiplier || 1, name: strategyName };
    onSaveStrategy(payload);
  };

  const canAddOptionLeg = currentUnderlying && tradableInstrumentsForSelectedUnderlying?.options?.length > 0;
  const canAddFutureLeg = currentUnderlying && tradableInstrumentsForSelectedUnderlying?.futures?.length > 0;

  return (
    <section className={styles.svNewStrategySection}>
      <header className={styles.newStrategyHeader}>
        <h2>Strategy Builder {currentUnderlying ? `(${currentUnderlying})` : ""}</h2>
        <div className={styles.tradeActions}>
          <Checkbox label={`${selectedTradesCount} trade${selectedTradesCount !== 1 ? "s" : ""} selected`} checked={allTradesSelected} onChange={(e) => handleSelectAllTrades(typeof e.target.checked === "boolean" ? e.target.checked : false)} className={styles.selectAllTradesCheckbox} disabled={strategyLegs.length === 0} />
          <Button variant="link" className={styles.clearTradesBtn} onClick={handleClearTrades} disabled={strategyLegs.filter((l) => l.status !== "active_position").length === 0}>Clear New Trades</Button>
          <Button variant="link" className={styles.resetPricesBtn} onClick={handleResetPrices} disabled={strategyLegs.filter((l) => l.status !== "active_position").length === 0 || (!canAddOptionLeg && !canAddFutureLeg)}><span className={styles.resetPricesIcon} role="img" aria-label="reset">↻</span> Reset Prices</Button>
        </div>
      </header>

      <div className={styles.strategyLegsEditor}>
        <div className={styles.legHeaderRow}>
          <Checkbox checked={allTradesSelected} onChange={(e) => handleSelectAllTrades(typeof e.target.checked === "boolean" ? e.target.checked : false)} className={styles.legHeaderCheckbox} disabled={strategyLegs.length === 0} />
          <span>B/S</span><span>Expiry / Contract</span><span>Strike / Details</span><span>Type</span><span>Lots</span><span>Entry Price</span><span>Actions</span>
        </div>
        {Array.isArray(strategyLegs) && strategyLegs.map((leg) => (<StrategyLegRow key={leg.id} leg={leg} onLegChange={handleLegChange} onRemoveLeg={handleRemoveLeg} onDuplicateLeg={handleDuplicateLeg} onAnalyzeLeg={handleAnalyzeLeg} allOptionExpiries={allOptionExpiries} allFutureExpiries={allFutureExpiries} getStrikesForOptionExpiry={getStrikesForOptionExpiry} getTypesForOptionExpiryStrike={getTypesForOptionExpiryStrike} />))}
        {(!Array.isArray(strategyLegs) || strategyLegs.length === 0) && (<div className={styles.noLegsPlaceholder}>Click "Add Option Leg" / "Add Future Leg" or select from lists.</div>)}
      </div>

      <div className={styles.strategyLegSummary}>
        <label htmlFor="strategyMultiplierInput">Strat Multiplier:</label>
        <input type="number" id="strategyMultiplierInput" value={multiplier} onChange={(e) => setMultiplier(e.target.value ? parseFloat(e.target.value) : 1)} min="1" step="1" />
        <span>Net Price: <span className={priceGetNet >= 0 ? styles.pnlPositive : styles.pnlNegative}>{Math.abs(priceGetNet).toFixed(2)}</span></span>
        <span>{totalPremium >= 0 ? "Net Credit: " : "Net Debit: "}<span className={totalPremium >= 0 ? styles.pnlPositive : styles.pnlNegative}>{Math.abs(totalPremium).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span><span className={styles.infoIcon} title="Total cash flow for selected legs. Positive for credit, negative for debit.">ⓘ</span></span>
      </div>

      <div className={styles.strategyActionsFooter}>
        <Button variant="primary" onClick={() => handleAddLeg("option")} disabled={!canAddOptionLeg}>Add Option Leg</Button>
        <Button variant="primary" onClick={() => handleAddLeg("future")} disabled={!canAddFutureLeg} style={{ marginLeft: "10px" }}>Add Future Leg</Button>
        <Button variant="sell" className={styles.sellBtnFooter} onClick={() => handleActionClick("active_position", "Trade")} disabled={strategyLegs.filter((l) => l.selected && l.status !== "active_position" && l.legType).length === 0}>Trade New Selected</Button>
        <Button variant="tertiary" icon="💾" className={styles.saveStrategyBtn} title="Save New Legs as Draft" onClick={() => handleActionClick("draft", "Draft")} disabled={strategyLegs.filter((l) => l.selected && l.status !== "active_position" && l.legType).length === 0}>Draft New Selected</Button>
      </div>
    </section>
  );
};

export default React.memo(NewStrategySection);
