// src/features/StrategyVisualizer/sections/ReadyMadeStrategiesSection.tsx
import React, { useState, useEffect, useMemo, useCallback } from "react";
import StrategyTabs from "../components/StrategyTabs";
import Button from "../../../components/Button/Button";
import Select from "../../../components/Select/Select";
import ToggleButtonGroup from "../../../components/ToggleButtonGroup/ToggleButtonGroup";
import {
  OPTION_STRATEGY_DEFINITIONS,
  OPTION_STRATEGY_CATEGORIES,
  FUTURE_STRATEGY_DEFINITIONS,
  FUTURE_STRATEGY_CATEGORIES,
} from "../data/strategyDefinitions";
import { findStrikeByOffsetSteps } from "../../utils/strategyUtils";
import "./ReadyMadeStrategiesSection.scss";
import { DEFAULT_VOLATILITY } from "../../../config";

// --- Type Definitions ---

type BuySell = "Buy" | "Sell";
type OptionType = "CE" | "PE";
type LegType = "option" | "future";

interface OptionInstrument {
  token: string;
  expiry: string;
  strike: number | string;
  optionType: OptionType;
  lastPrice: string | number;
  lotSize?: number;
  contractInfo?: { lotSize?: number };
  instrumentSymbol?: string;
  symbol?: string;
  iv?: string | number;
}

interface FutureInstrument {
  token: string;
  expiryDate?: string;
  expiry?: string;
  lastPrice: string | number;
  lotSize?: number;
  instrumentSymbol?: string;
  symbol?: string;
}

interface TradableInstruments {
  options: OptionInstrument[];
  futures: FutureInstrument[];
}

interface StrategyLegTemplate {
  legType: LegType;
  buySell: BuySell;
  lotsRatio?: number;
  optionType?: OptionType;
  strikeOffsetSteps?: number;
  expirySelector?: "SELECTED" | "NEXT_AVAILABLE";
  contractSelector?: "SELECTED_FROM_DROPDOWN" | "NEAREST" | "NEXT";
}

interface StrategyTemplate {
  id: string;
  name: string;
  description?: string;
  category: string;
  chartIcon?: React.ReactNode;
  legs: StrategyLegTemplate[];
  requiresDifferentExpiries?: boolean;
}

interface StrategyLeg {
  id: string;
  legType: LegType;
  token: string;
  instrumentSymbol: string;
  strike?: string | number;
  optionType?: OptionType;
  expiry: string;
  expiryDateDisplay?: string;
  buySell: BuySell;
  lots: number;
  price: number;
  lotSize: number;
  iv?: number;
  status: string;
}

interface SavedStrategyItem {
  _id?: string;
  id?: string;
  name?: string;
  underlying?: string;
  legs: StrategyLeg[];
  status?: string;
  entryDate?: string;
  updatedAt?: string;
  createdAt?: string;
}

interface Instrument {
  token: string;
  expiryDate?: string;
  expiry?: string;
  lastPrice?: string | number;
}

interface ReadyMadeStrategiesSectionProps {
  activeMainTab: string;
  onMainTabChange: (tab: string) => void;
  currentUnderlying: string;
  getTradableInstrumentsByUnderlying: (underlying: string) => TradableInstruments;
  getInstrumentByToken: (token: string) => Instrument | undefined;
  underlyingSpotPrice: number | null | undefined;
  onLoadStrategyLegs: (legs: StrategyLeg[], status?: string) => void;
  userPositions: SavedStrategyItem[];
  mySavedStrategies: SavedStrategyItem[];
  draftStrategies: SavedStrategyItem[];
  isLoadingTabData: {
    positions: boolean;
    myStrategies: boolean;
    drafts: boolean;
  };
}

// --- Helper Functions ---

const formatDisplayExpiry = (expiryDDMMMYYYY?: string): string => {
  if (
    !expiryDDMMMYYYY ||
    typeof expiryDDMMMYYYY !== "string" ||
    expiryDDMMMYYYY.length < 7
  )
    return expiryDDMMMYYYY || "";
  try {
    const day = expiryDDMMMYYYY.substring(0, 2);
    const monthStr = expiryDDMMMYYYY.substring(2, 5).toUpperCase();
    const yearSubstring = expiryDDMMMYYYY.substring(5);
    const year =
      yearSubstring.length === 2 ? `20${yearSubstring}` : yearSubstring;
    if (day && monthStr && year && year.length === 4)
      return `${day} ${monthStr} ${year}`;
  } catch (e) {}
  return expiryDDMMMYYYY;
};

const getLegSummaryDisplay = (leg: Partial<StrategyLeg>): string => {
  if (!leg) return "N/A";
  const action =
    leg.buySell === "Buy" ? "B" : leg.buySell === "Sell" ? "S" : leg.buySell;
  const price =
    typeof leg.price === "number"
      ? leg.price.toFixed(2)
      : typeof leg.price === "string"
      ? Number(leg.price).toFixed(2)
      : "-";
  if (leg.legType === "option") {
    return `${action} ${leg.lots || 1}x ${leg.strike || "STK"}${
      leg.optionType || "OPT"
    } @ ${price}`;
  } else if (leg.legType === "future") {
    return `${action} ${leg.lots || 1}x ${
      leg.instrumentSymbol || "Future"
    } @ ${price}`;
  }
  return "N/A";
};

// --- Icon Components ---

const IconLoadToBuilder: React.FC = () => (
  <span className="action-icon icon-load" title="Load to Builder">
    ↗️
  </span>
);

const IconSearch: React.FC = () => <span className="icon-search-input">🔍</span>;

const IconEmptyBox: React.FC<{ className?: string }> = ({
  className = "empty-state-icon",
}) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="currentColor"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path d="M20 2H4C2.9 2 2 2.9 2 4V20C2 21.1 2.9 22 4 22H20C21.1 22 22 21.1 22 20V4C22 2.9 21.1 2 20 2ZM20 20H4V4H20V20Z" />
    <path d="M12 6L9 9H11V13H13V9H15L12 6Z" opacity="0.3" />
  </svg>
);

// --- Main Component ---

const ReadyMadeStrategiesSection: React.FC<ReadyMadeStrategiesSectionProps> = ({
  activeMainTab,
  onMainTabChange,
  currentUnderlying,
  getTradableInstrumentsByUnderlying,
  getInstrumentByToken,
  underlyingSpotPrice,
  onLoadStrategyLegs,
  userPositions,
  mySavedStrategies,
  draftStrategies,
  isLoadingTabData,
}) => {
  const [readyMadeType, setReadyMadeType] = useState<"options" | "futures">("options");
  const [activeStrategyCategoryFilter, setActiveStrategyCategoryFilter] = useState<string>(
    OPTION_STRATEGY_CATEGORIES[0]
  );
  const [selectedOptionExpiry, setSelectedOptionExpiry] = useState<string>("");
  const [availableOptionExpiries, setAvailableOptionExpiries] = useState<
    { label: string; value: string }[]
  >([]);
  const [selectedFutureContractToken, setSelectedFutureContractToken] = useState<string>("");
  const [availableFutureContracts, setAvailableFutureContracts] = useState<
    { label: string; value: string }[]
  >([]);
  const [searchTermSaved, setSearchTermSaved] = useState<string>("");

  const mainTabs = useMemo(
    () => [
      { id: "readymade", label: "Ready-made" },
      { id: "positions", label: "Positions" },
      { id: "mystrategies", label: "My Strategies" },
      { id: "draftportfolios", label: "Draft Portfolios" },
      { id: "newstrategy", label: "Builder" },
    ],
    []
  );

  useEffect(() => {
    if (
      activeMainTab !== "readymade" ||
      !currentUnderlying ||
      !getTradableInstrumentsByUnderlying
    ) {
      setAvailableOptionExpiries([]);
      setSelectedOptionExpiry("");
      setAvailableFutureContracts([]);
      setSelectedFutureContractToken("");
      return;
    }
    const instruments = getTradableInstrumentsByUnderlying(currentUnderlying);

    if (readyMadeType === "options") {
      const options = instruments?.options || [];
      if (!options.length) {
        setAvailableOptionExpiries([]);
        setSelectedOptionExpiry("");
        return;
      }
      const uniqueExpiries = [...new Set(options.map((o) => o.expiry))].sort(
        (a, b) => {
          try {
            const dA = new Date(
              a.replace(/(\d{2})([A-Z]{3})(\d{4})/, "$2 $1, $3")
            );
            const dB = new Date(
              b.replace(/(\d{2})([A-Z]{3})(\d{4})/, "$2 $1, $3")
            );
            if (!isNaN(dA.getTime()) && !isNaN(dB.getTime()))
              return dA.getTime() - dB.getTime();
          } catch (e) {}
          return a.localeCompare(b);
        }
      );
      const expiryOpts = uniqueExpiries.map((exp) => ({
        label: formatDisplayExpiry(exp),
        value: exp,
      }));
      setAvailableOptionExpiries(expiryOpts);
      if (
        expiryOpts.length > 0 &&
        (!selectedOptionExpiry ||
          !expiryOpts.find((o) => o.value === selectedOptionExpiry))
      ) {
        setSelectedOptionExpiry(expiryOpts[0].value);
      } else if (expiryOpts.length === 0) {
        setSelectedOptionExpiry("");
      }
      setAvailableFutureContracts([]);
      setSelectedFutureContractToken("");
    } else if (readyMadeType === "futures") {
      const futures = instruments?.futures || [];
      if (!futures.length) {
        setAvailableFutureContracts([]);
        setSelectedFutureContractToken("");
        return;
      }
      const futureOpts = futures.map((fut) => ({
        label:
          fut.instrumentSymbol ||
          `${currentUnderlying} ${formatDisplayExpiry(
            fut.expiryDate || fut.expiry
          )} FUT`,
        value: fut.token,
      }));
      setAvailableFutureContracts(futureOpts);
      if (
        futureOpts.length > 0 &&
        (!selectedFutureContractToken ||
          !futureOpts.find((f) => f.value === selectedFutureContractToken))
      ) {
        setSelectedFutureContractToken(futureOpts[0].value);
      } else if (futureOpts.length === 0) {
        setSelectedFutureContractToken("");
      }
      setAvailableOptionExpiries([]);
      setSelectedOptionExpiry("");
    }
  }, [
    activeMainTab,
    currentUnderlying,
    getTradableInstrumentsByUnderlying,
    readyMadeType,
    selectedOptionExpiry,
    selectedFutureContractToken,
  ]);

  const currentStrategyDefinitions = useMemo<StrategyTemplate[]>(
    () =>
      readyMadeType === "options"
        ? OPTION_STRATEGY_DEFINITIONS
        : FUTURE_STRATEGY_DEFINITIONS,
    [readyMadeType]
  );
  const currentStrategyCategories = useMemo<string[]>(
    () =>
      readyMadeType === "options"
        ? OPTION_STRATEGY_CATEGORIES
        : FUTURE_STRATEGY_CATEGORIES,
    [readyMadeType]
  );

  useEffect(() => {
    if (currentStrategyCategories && currentStrategyCategories.length > 0) {
      setActiveStrategyCategoryFilter(currentStrategyCategories[0]);
    } else {
      setActiveStrategyCategoryFilter("");
    }
  }, [currentStrategyCategories]);

  const filteredReadyMadeStrategies = useMemo(
    () =>
      activeMainTab === "readymade" && activeStrategyCategoryFilter
        ? currentStrategyDefinitions.filter(
            (s) => s.category === activeStrategyCategoryFilter
          )
        : [],
    [activeMainTab, currentStrategyDefinitions, activeStrategyCategoryFilter]
  );

  const handleSelectReadyMadeStrategy = useCallback(
    async (strategyTemplate: StrategyTemplate) => {
      if (!currentUnderlying || !getTradableInstrumentsByUnderlying) {
        alert("Underlying not set or market data access unavailable.");
        return;
      }
      const instruments = getTradableInstrumentsByUnderlying(currentUnderlying);
      const newLegs: StrategyLeg[] = [];
      let errorOccurred = false;

      for (const legDef of strategyTemplate.legs) {
        if (legDef.legType === "option") {
          if (
            !selectedOptionExpiry ||
            underlyingSpotPrice === null ||
            underlyingSpotPrice === undefined
          ) {
            alert(
              "Option expiry or spot price missing for constructing option leg."
            );
            errorOccurred = true;
            break;
          }
          let legExpiry = selectedOptionExpiry;
          if (
            strategyTemplate.requiresDifferentExpiries &&
            legDef.expirySelector
          ) {
            if (legDef.expirySelector === "NEXT_AVAILABLE") {
              const optionExpiries = (instruments?.options || [])
                .map((o) => o.expiry)
                .sort(
                  (a, b) =>
                    new Date(
                      a.replace(/(\d{2})([A-Z]{3})(\d{4})/, "$2 $1, $3")
                    ).getTime() -
                    new Date(
                      b.replace(/(\d{2})([A-Z]{3})(\d{4})/, "$2 $1, $3")
                    ).getTime()
                );
              const currentIdx = optionExpiries.indexOf(selectedOptionExpiry);
              if (currentIdx !== -1 && currentIdx + 1 < optionExpiries.length) {
                legExpiry = optionExpiries[currentIdx + 1];
              } else {
                alert(
                  `Cannot find "NEXT_AVAILABLE" expiry for leg in "${strategyTemplate.name}". Using selected expiry.`
                );
              }
            }
          }
          const optionsForLegExpiry = (instruments?.options || []).filter(
            (o) => o.expiry === legExpiry
          );
          if (!optionsForLegExpiry.length) {
            alert(
              `No options for ${currentUnderlying} on ${formatDisplayExpiry(
                legExpiry
              )}.`
            );
            errorOccurred = true;
            break;
          }
          const availableStrikes = [
            ...new Set(optionsForLegExpiry.map((o) => Number(o.strike))),
          ].sort((a, b) => a - b);
          if (!availableStrikes.length) {
            alert(
              `No strikes for ${currentUnderlying} on ${formatDisplayExpiry(
                legExpiry
              )}.`
            );
            errorOccurred = true;
            break;
          }
          const targetStrike = findStrikeByOffsetSteps(
            underlyingSpotPrice as number,
            availableStrikes,
            legDef.strikeOffsetSteps,
            currentUnderlying
          );
          if (targetStrike === null) {
            alert(
              `Could not determine strike for an option leg in "${strategyTemplate.name}".`
            );
            errorOccurred = true;
            break;
          }
          const optionData = optionsForLegExpiry.find(
            (o) =>
              Number(o.strike) === targetStrike && o.optionType === legDef.optionType
          );
          if (!optionData) {
            alert(
              `Option leg ${targetStrike}${
                legDef.optionType
              } on ${formatDisplayExpiry(legExpiry)} not found for "${
                strategyTemplate.name
              }".`
            );
            errorOccurred = true;
            break;
          }
          let legLotSize =
            optionData.lotSize ||
            optionData.contractInfo?.lotSize ||
            (currentUnderlying.toUpperCase().includes("BANKNIFTY")
              ? 15
              : currentUnderlying.toUpperCase().includes("FINNIFTY")
              ? 40
              : 50);

          newLegs.push({
            id: `leg_${Date.now()}_${Math.random().toString(16).slice(2)}`,
            legType: "option",
            token: optionData.token,
            instrumentSymbol:
              optionData.instrumentSymbol ||
              optionData.symbol ||
              `${currentUnderlying} ${legExpiry} ${targetStrike}${legDef.optionType}`,
            strike: String(targetStrike),
            optionType: legDef.optionType,
            expiry: legExpiry,
            buySell: legDef.buySell,
            lots: legDef.lotsRatio || 1,
            price: parseFloat(String(optionData.lastPrice)) || 0,
            lotSize: legLotSize,
            iv: parseFloat(String(optionData.iv)) || DEFAULT_VOLATILITY * 100,
            status: "new_leg",
          });
        } else if (legDef.legType === "future") {
          const availableFutures = instruments?.futures || [];
          if (availableFutures.length === 0) {
            alert(`No futures contracts found for ${currentUnderlying}.`);
            errorOccurred = true;
            break;
          }
          let selectedFutureInstance: FutureInstrument | undefined = undefined;

          if (legDef.contractSelector === "SELECTED_FROM_DROPDOWN") {
            if (!selectedFutureContractToken) {
              alert(
                "Please select a future contract from the dropdown for this strategy."
              );
              errorOccurred = true;
              break;
            }
            selectedFutureInstance = availableFutures.find(
              (f) => f.token === selectedFutureContractToken
            );
          } else if (legDef.contractSelector === "NEAREST") {
            selectedFutureInstance = availableFutures[0];
          } else if (legDef.contractSelector === "NEXT") {
            if (availableFutures.length > 1)
              selectedFutureInstance = availableFutures[1];
            else {
              alert(
                `Not enough future contracts for 'NEXT' in "${strategyTemplate.name}". Using NEAREST instead.`
              );
              selectedFutureInstance = availableFutures[0];
            }
          } else {
            selectedFutureInstance = selectedFutureContractToken
              ? availableFutures.find(
                  (f) => f.token === selectedFutureContractToken
                )
              : availableFutures[0];
            if (!selectedFutureInstance && availableFutures.length > 0)
              selectedFutureInstance = availableFutures[0];
          }
          if (!selectedFutureInstance) {
            alert(
              `Could not select/find future contract for leg in "${strategyTemplate.name}".`
            );
            errorOccurred = true;
            break;
          }
          let legLotSize =
            selectedFutureInstance.lotSize ||
            (currentUnderlying.toUpperCase().includes("BANKNIFTY")
              ? 15
              : currentUnderlying.toUpperCase().includes("FINNIFTY")
              ? 40
              : 50);

          newLegs.push({
            id: `leg_${Date.now()}_${Math.random().toString(16).slice(2)}`,
            legType: "future",
            token: selectedFutureInstance.token,
            instrumentSymbol:
              selectedFutureInstance.instrumentSymbol ||
              selectedFutureInstance.symbol ||
              `${currentUnderlying} Future`,
            expiry: selectedFutureInstance.token,
            expiryDateDisplay:
              selectedFutureInstance.expiryDate ||
              selectedFutureInstance.expiry,
            buySell: legDef.buySell,
            lots: legDef.lotsRatio || 1,
            price: parseFloat(String(selectedFutureInstance.lastPrice)) || 0,
            lotSize: legLotSize,
            status: "new_leg",
          });
        }
      }
      if (!errorOccurred && newLegs.length > 0)
        onLoadStrategyLegs(newLegs, "new_leg");
      else if (!errorOccurred && strategyTemplate.legs.length > 0)
        alert(
          `Could not construct all legs for "${strategyTemplate.name}". Check data availability.`
        );
    },
    [
      selectedOptionExpiry,
      underlyingSpotPrice,
      currentUnderlying,
      getTradableInstrumentsByUnderlying,
      onLoadStrategyLegs,
      selectedFutureContractToken,
    ]
  );

  const handleLoadSavedItemToBuilder = useCallback(
    (savedItem: SavedStrategyItem) => {
      if (
        savedItem &&
        Array.isArray(savedItem.legs) &&
        savedItem.legs.length > 0
      ) {
        const legsToLoad: StrategyLeg[] = savedItem.legs.map((leg) => {
          let loadedLeg: StrategyLeg = {
            ...leg,
            price: leg.price !== undefined ? parseFloat(String(leg.price)) : 0,
            lotSize: Number(leg.lotSize) || 1,
            id: leg.id || `leg_${Date.now()}_${Math.random().toString(16).slice(2)}`,
            status: leg.status || "new_leg",
            buySell: leg.buySell as BuySell,
            lots: Number(leg.lots) || 1,
            instrumentSymbol: leg.instrumentSymbol || "",
            legType: leg.legType as LegType,
            expiry: leg.expiry,
          };
          if (leg.legType === "option") {
            loadedLeg.strike = Number(leg.strike);
            loadedLeg.iv =
              leg.iv !== undefined
                ? parseFloat(String(leg.iv))
                : DEFAULT_VOLATILITY * 100;
            loadedLeg.optionType = leg.optionType as OptionType;
          }
          return loadedLeg;
        });
        onLoadStrategyLegs(legsToLoad, savedItem.status);
      } else {
        alert("Cannot load item: Leg data is missing or invalid.");
      }
    },
    [onLoadStrategyLegs]
  );

  const renderSavedItemsList = useCallback(
    (
      items: SavedStrategyItem[],
      itemTypeLabel: string,
      isLoading: boolean,
      emptyMessage: string,
      showSearch: boolean = false
    ) => {
      if (isLoading)
        return (
          <div className="tab-content-placeholder loading-state">
            <p>Loading {itemTypeLabel.toLowerCase()}...</p>
          </div>
        );
      const itemsToDisplay =
        showSearch && searchTermSaved
          ? items.filter(
              (item) =>
                item.name
                  ?.toLowerCase()
                  .includes(searchTermSaved.toLowerCase()) ||
                item.underlying
                  ?.toLowerCase()
                  .includes(searchTermSaved.toLowerCase())
            )
          : items;
      if (!Array.isArray(itemsToDisplay) || itemsToDisplay.length === 0)
        return (
          <div className="tab-content-placeholder empty-state">
            {itemTypeLabel === "My Strategies" ? <IconEmptyBox /> : null}{" "}
            <p>
              {searchTermSaved && showSearch
                ? `No results for "${searchTermSaved}".`
                : emptyMessage}
            </p>
          </div>
        );

      return (
        <div
          className={`saved-items-container ${itemTypeLabel
            .toLowerCase()
            .replace(/\s+/g, "-")}-list`}
        >
          {showSearch && (
            <div className="saved-items-search-bar">
              <IconSearch />{" "}
              <input
                type="text"
                placeholder={`Search ${itemTypeLabel.toLowerCase()}...`}
                value={searchTermSaved}
                onChange={(e) => setSearchTermSaved(e.target.value)}
              />
            </div>
          )}
          <div className="saved-items-grid">
            {itemsToDisplay.map((item) => {
              let pnlAbsoluteDisplay = "N/A",
                pnlPercentageDisplay = "",
                pnlClass = "pnl-neutral",
                initialNetValueDisplay = "₹0",
                cardExpiryDisplay = "N/A";
              if (Array.isArray(item.legs) && item.legs.length > 0) {
                const uniqueExpiries = [
                  ...new Set(
                    item.legs
                      .map((leg) => {
                        if (leg.legType === "future") {
                          const instrument = getInstrumentByToken(leg.token);
                          return (
                            instrument?.expiryDate ||
                            instrument?.expiry ||
                            (leg as any).expiryDateDisplay ||
                            leg.expiry
                          );
                        }
                        return leg.expiry;
                      })
                      .filter(Boolean)
                  ),
                ];
                if (uniqueExpiries.length === 1)
                  cardExpiryDisplay = formatDisplayExpiry(uniqueExpiries[0]);
                else if (uniqueExpiries.length > 1)
                  cardExpiryDisplay = "Multi-Expiry";
              }
              if (
                item.status === "active_position" &&
                Array.isArray(item.legs) &&
                item.legs.length > 0
              ) {
                let unrealizedPnl = 0,
                  initialNetDebitCredit = 0;
                item.legs.forEach((leg) => {
                  const instrumentDetails = getInstrumentByToken(leg.token);
                  const entryPrice = parseFloat(String(leg.price));
                  const currentLtp =
                    instrumentDetails?.lastPrice !== undefined
                      ? parseFloat(String(instrumentDetails.lastPrice))
                      : entryPrice;
                  const lots = Number(leg.lots) || 1;
                  const legContractSize = Number(leg.lotSize) || 1;
                  const positionMultiplier = lots * legContractSize;
                  let pnlForLegPerUnit = 0;
                  if (leg.buySell === "Buy") {
                    pnlForLegPerUnit = currentLtp - entryPrice;
                    initialNetDebitCredit += entryPrice * positionMultiplier;
                  } else if (leg.buySell === "Sell") {
                    pnlForLegPerUnit = entryPrice - currentLtp;
                    initialNetDebitCredit -= entryPrice * positionMultiplier;
                  }
                  unrealizedPnl += pnlForLegPerUnit * positionMultiplier;
                });
                initialNetValueDisplay = `${
                  initialNetDebitCredit > 0
                    ? "Debit "
                    : initialNetDebitCredit < 0
                    ? "Credit "
                    : ""
                }${Math.abs(initialNetDebitCredit).toLocaleString(undefined, {
                  style: "currency",
                  currency: "INR",
                  minimumFractionDigits: 0,
                  maximumFractionDigits: 0,
                })}`;
                const isPnlEffectivelyZero = Math.abs(unrealizedPnl) < 0.01;
                if (isPnlEffectivelyZero) {
                  pnlAbsoluteDisplay = "₹0";
                  pnlPercentageDisplay = "(0.0%)";
                  pnlClass = "pnl-neutral";
                } else {
                  pnlAbsoluteDisplay = `${
                    unrealizedPnl > 0 ? "+" : ""
                  }${unrealizedPnl.toLocaleString(undefined, {
                    style: "currency",
                    currency: "INR",
                    minimumFractionDigits: 0,
                    maximumFractionDigits: 0,
                  })}`;
                  if (Math.abs(initialNetDebitCredit) > 0.01) {
                    const pnlPercentage =
                      (unrealizedPnl / Math.abs(initialNetDebitCredit)) * 100;
                    pnlPercentageDisplay = `(${
                      pnlPercentage > 0 ? "+" : ""
                    }${pnlPercentage.toFixed(1)}%)`;
                  } else if (unrealizedPnl !== 0) {
                    pnlPercentageDisplay = `(Abs: ₹${unrealizedPnl.toFixed(
                      0
                    )})`;
                  } else {
                    pnlPercentageDisplay = "(0.0%)";
                  }
                  pnlClass =
                    unrealizedPnl > 0 ? "pnl-positive" : "pnl-negative";
                }
              }
              return (
                <div
                  key={item._id || item.id}
                  className="saved-item-card"
                  onClick={() => handleLoadSavedItemToBuilder(item)}
                  title={`Load "${item.name || "Unnamed Item"}"`}
                >
                  <div className="card-main-content">
                    <div className="card-header">
                      <h3 className="card-title">
                        {item.name || `Unnamed ${itemTypeLabel.slice(0, -1)}`}
                      </h3>
                      {item.status === "active_position" && (
                        <div className={`card-pnl ${pnlClass}`}>
                          <span className="pnl-absolute">
                            {pnlAbsoluteDisplay}
                          </span>
                          {pnlPercentageDisplay && (
                            <span className="pnl-percentage">
                              {pnlPercentageDisplay}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                    <div className="card-body">
                      <div className="card-detail-row">
                        <span className="card-detail">
                          <span className="detail-label">Underlying:</span>{" "}
                          {item.underlying || "N/A"}
                        </span>{" "}
                        <span className="card-detail">
                          <span className="detail-label">Expiry:</span>{" "}
                          {cardExpiryDisplay}
                        </span>
                      </div>
                      <div className="card-detail-row">
                        <span className="card-detail">
                          <span className="detail-label">Legs:</span>{" "}
                          {Array.isArray(item.legs) ? item.legs.length : 0}
                        </span>{" "}
                        {item.status === "active_position" && (
                          <span className="card-detail card-net-value">
                            <span className="detail-label">Net Value:</span>{" "}
                            {initialNetValueDisplay}
                          </span>
                        )}
                      </div>
                      {Array.isArray(item.legs) && item.legs.length > 0 && (
                        <div className="card-legs-preview">
                          {item.legs.slice(0, 3).map((leg, idx) => (
                            <span key={leg.id || idx} className="leg-chip">
                              {getLegSummaryDisplay(leg)}
                            </span>
                          ))}{" "}
                          {item.legs.length > 3 && (
                            <span className="leg-chip more-legs">
                              +{item.legs.length - 3} more
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="card-footer">
                    <span className="card-date">
                      {item.status === "active_position"
                        ? "Traded"
                        : item.status === "draft"
                        ? "Drafted"
                        : "Saved"}
                      :{" "}
                      {new Date(
                        item.entryDate ||
                          item.updatedAt ||
                          item.createdAt ||
                          Date.now()
                      ).toLocaleDateString("en-GB", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                      })}
                    </span>{" "}
                    <Button
                      variant="icon-only"
                      className="card-action-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleLoadSavedItemToBuilder(item);
                      }}
                    >
                      <IconLoadToBuilder />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      );
    },
    [searchTermSaved, getInstrumentByToken, handleLoadSavedItemToBuilder]
  );

  return (
    <section className="sv-ready-made-section">
      <StrategyTabs
        tabs={mainTabs}
        activeTab={activeMainTab}
        onTabChange={onMainTabChange}
      />
      {activeMainTab === "readymade" && (
        <div className="strategy-selection-content">
          <div className="ready-made-type-toggle-container">
            <ToggleButtonGroup
              options={[
                { label: "Option Strategies", value: "options" },
                { label: "Future Strategies", value: "futures" },
              ]}
              selected={readyMadeType}
              onSelect={(type) => setReadyMadeType(type as "options" | "futures")}
              className="ready-made-type-toggle"
            />
          </div>
          <p className="selection-prompt">
            Select a ready-made{" "}
            {readyMadeType === "options" ? "OPTION" : "FUTURE"} strategy
          </p>
          <div className="strategy-filters-bar">
            {currentStrategyCategories.map((filter) => (
              <Button
                key={filter}
                variant={
                  activeStrategyCategoryFilter === filter
                    ? "primary"
                    : "tertiary"
                }
                className={`filter-button ${
                  activeStrategyCategoryFilter === filter ? "active" : ""
                }`}
                onClick={() => setActiveStrategyCategoryFilter(filter)}
              >
                {filter}
              </Button>
            ))}
            {readyMadeType === "options" && (
              <Select
                options={availableOptionExpiries}
                value={selectedOptionExpiry}
                onChange={setSelectedOptionExpiry}
                className="expiry-select"
                placeholder="Select Option Expiry"
                disabled={
                  availableOptionExpiries.length === 0 || !currentUnderlying
                }
              />
            )}
            {readyMadeType === "futures" && (
              <Select
                options={availableFutureContracts}
                value={selectedFutureContractToken}
                onChange={setSelectedFutureContractToken}
                className="expiry-select future-contract-select"
                placeholder="Select Future Contract"
                disabled={
                  availableFutureContracts.length === 0 || !currentUnderlying
                }
              />
            )}
          </div>
          <div className="strategy-grid">
            {filteredReadyMadeStrategies.map((strategy) => (
              <div
                key={strategy.id}
                className="strategy-preview-card"
                onClick={() => handleSelectReadyMadeStrategy(strategy)}
                title={strategy.description || `Load ${strategy.name}`}
              >
                <div className="strategy-chart-placeholder">
                  {strategy.chartIcon ||
                    (readyMadeType === "options" ? "♟️O" : "♟️F")}
                </div>
                <p>{strategy.name}</p>
              </div>
            ))}
            {filteredReadyMadeStrategies.length === 0 &&
              currentUnderlying &&
              activeStrategyCategoryFilter && (
                <p className="no-strategies-message">
                  No "{activeStrategyCategoryFilter}"{" "}
                  {readyMadeType.slice(0, -1)} strategies for{" "}
                  {currentUnderlying}.
                </p>
              )}
            {!currentUnderlying && (
              <p className="no-strategies-message">
                Select an underlying to see strategies.
              </p>
            )}
          </div>
        </div>
      )}
      {activeMainTab === "positions" &&
        renderSavedItemsList(
          userPositions,
          "Positions",
          isLoadingTabData.positions,
          "No open positions."
        )}
      {activeMainTab === "mystrategies" &&
        renderSavedItemsList(
          mySavedStrategies,
          "My Strategies",
          isLoadingTabData.myStrategies,
          "No strategies found.",
          true
        )}
      {activeMainTab === "draftportfolios" &&
        renderSavedItemsList(
          draftStrategies,
          "Draft Portfolios",
          isLoadingTabData.drafts,
          "No drafts saved.",
          true
        )}
    </section>
  );
};

export default React.memo(ReadyMadeStrategiesSection);
