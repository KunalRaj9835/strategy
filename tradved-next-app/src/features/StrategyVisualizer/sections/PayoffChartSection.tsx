// src/features/StrategyVisualizer/sections/PayoffChartSection.tsx

"use client"; // This component is highly interactive and must be a Client Component.

import React, { useMemo, useCallback, useState } from "react";

// Import the new SCSS module for locally-scoped styling.
import styles from "./PayoffChartSection.module.scss";

// Import shared UI components using the recommended Next.js alias for clean, absolute paths.
import StrategyTabs from "../components/StrategyTabs";
import Button from "@/components/Button/Button";
import Input from "@/components/Input/Input";
import Checkbox from "@/components/Checkbox/Checkbox";
import GreeksTable from "../components/GreeksTable";
import PnLTable from "../components/PnLTable";
import PayoffTable from "../components/PayoffTable";
import Select from "@/components/Select/Select";
import PayoffChart from "../components/PayoffChart";

// Import hooks, utilities, and constants
import { usePayoffChartControls } from "@/hooks/usePayoffChartControls";
import { generatePayoffTableData } from "@/lib/payoffTableUtils";
import { calculateProjectedStrategyData } from "@/lib/payoffDataCalculator";
import { NOT_APPLICABLE } from "@/lib/formatters";
import { SPOT_SLIDER_STEP, PAYOFF_TABLE_INTERVAL_STEP } from "@/config";

// --- Type Definitions (Fully Typed and Preserved from Original) ---
type BuySell = "Buy" | "Sell";
type OptionType = "CE" | "PE";
type LegType = "option" | "future";

interface StrategyLeg {
  id: string;
  legType: LegType;
  token: string;
  price: number;
  lots: number;
  lotSize: number;
  buySell: BuySell;
  strike?: number | string;
  optionType?: OptionType;
  expiry?: string;
  iv?: number;
  [key: string]: any; // Allow for other properties
}

interface Instrument {
  token: string;
  expiry?: string;
  expiryDate?: string;
  lastPrice?: number | string;
  [key: string]: any; // Allow for other properties
}

interface PayoffChartSectionProps {
  activeChartTab: string;
  onChartTabChange: (tab: string) => void;
  niftyTarget: string;
  onNiftyTargetChange: (val: string) => void;
  onResetNiftyTarget: () => void;
  targetDate: string;
  onTargetDateChange: (val: string) => void;
  strategyLegs: StrategyLeg[];
  getInstrumentByToken: (token: string) => Instrument | undefined;
  liveInstrumentChainArray: Instrument[];
  currentUnderlying: string;
  riskFreeRate: number;
  multiplyByLotSize: boolean;
  onMultiplyByLotSizeChange: (checked: boolean) => void;
  multiplyByNumLots: boolean;
  onMultiplyByNumLotsChange: (checked: boolean) => void;
  getScenarioIV: (token: string) => number;
  underlyingSpotPrice: number | null | undefined;
  handleSdDaysChange: (days: number) => void;
  sdDays: number;
  multiplier?: number;
}

// --- Constants ---
const SUB_TAB_CHART_VIEW = "subTabChartView";
const SUB_TAB_PAYOFF_TABLE_VIEW = "subTabPayoffTableView";

// --- Main Component (Fully Corrected with Best Practices) ---
const PayoffChartSection: React.FC<PayoffChartSectionProps> = ({
  activeChartTab,
  onChartTabChange,
  niftyTarget,
  onNiftyTargetChange,
  onResetNiftyTarget,
  targetDate,
  onTargetDateChange,
  strategyLegs,
  getInstrumentByToken,
  liveInstrumentChainArray,
  currentUnderlying,
  riskFreeRate,
  multiplyByLotSize,
  onMultiplyByLotSizeChange,
  multiplyByNumLots,
  onMultiplyByNumLotsChange,
  getScenarioIV,
  underlyingSpotPrice,
  handleSdDaysChange,
  sdDays,
  multiplier = 1,
}) => {
  const [activePayoffGraphSubTab, setActivePayoffGraphSubTab] =
    useState<string>(SUB_TAB_PAYOFF_TABLE_VIEW);
  const [matrixTableInterval, setMatrixTableInterval] = useState<string>(
    String(PAYOFF_TABLE_INTERVAL_STEP || 50)
  );
  const [showPercentageInMatrix, setShowPercentageInMatrix] =
    useState<boolean>(false);

  const {
    displaySpotForSlider,
    spotSliderMin,
    spotSliderMax,
    minDateForSliderRange,
    maxDateForSliderRange,
    dateSliderValue,
    handleDateSliderChange,
    handleResetDate,
    daysToTargetDisplay,
  } = usePayoffChartControls(
    underlyingSpotPrice,
    liveInstrumentChainArray,
    currentUnderlying,
    strategyLegs,
    targetDate,
    onTargetDateChange
  );

  const mainChartTabsDefinition = useMemo(
    () => [
      { id: "payoffgraph", label: "Payoff Graph" },
      { id: "p&ltable", label: "P&L Table" },
      { id: "greeks", label: "Greeks" },
      { id: "strategychart", label: "Strategy Chart" },
    ],
    []
  );

  const niftyTargetInputValue =
    niftyTarget !== "" && !isNaN(parseFloat(niftyTarget))
      ? parseFloat(niftyTarget).toFixed(2)
      : "";
  const niftyTargetSliderValue =
    niftyTarget !== "" && !isNaN(parseFloat(niftyTarget))
      ? parseFloat(niftyTarget)
      : displaySpotForSlider > 0
      ? displaySpotForSlider
      : spotSliderMin;

  const payoffGraphViewSubTabsDefinition = useMemo(
    () => [
      { id: SUB_TAB_CHART_VIEW, label: "Payoff Graph" },
      { id: SUB_TAB_PAYOFF_TABLE_VIEW, label: "Payoff Table" },
    ],
    []
  );

  const singleScenarioPerLegData = useMemo(
    () =>
      calculateProjectedStrategyData({
        strategyLegs,
        niftyTarget,
        targetDate,
        getInstrumentByToken,
        riskFreeRate,
        getScenarioIV,
        multiplyByLotSize,
        multiplyByNumLots,
      }),
    [
      strategyLegs,
      niftyTarget,
      targetDate,
      getInstrumentByToken,
      riskFreeRate,
      getScenarioIV,
      multiplyByLotSize,
      multiplyByNumLots,
    ]
  );

  const payoffMatrixData = useMemo(() => {
    if (!niftyTarget || !targetDate) return [];
    try {
      return generatePayoffTableData({
        strategyLegs,
        niftyTargetString: niftyTarget,
        displaySpotForSlider,
        targetDateISO: targetDate,
        riskFreeRate,
        getScenarioIV,
        getInstrumentByToken,
        targetInterval: Number(matrixTableInterval),
        underlyingSpotPriceForPercentage: underlyingSpotPrice,
        showPercentage: showPercentageInMatrix,
      });
    } catch (error) {
      console.error(
        "[PayoffChartSection] Error in generatePayoffTableData:",
        error
      );
      return [];
    }
  }, [
    strategyLegs,
    niftyTarget,
    displaySpotForSlider,
    targetDate,
    riskFreeRate,
    getScenarioIV,
    getInstrumentByToken,
    matrixTableInterval,
    underlyingSpotPrice,
    showPercentageInMatrix,
  ]);

  const handleMainTabChangeWithLog = useCallback(
    (tabId: string) => {
      onChartTabChange(tabId);
    },
    [onChartTabChange]
  );
  const handleSubTabChangeWithLog = useCallback((tabId: string) => {
    setActivePayoffGraphSubTab(tabId);
  }, []);
  const handleIncrementSdDays = useCallback(() => {
    if (sdDays < 365) handleSdDaysChange(sdDays + 1);
  }, [sdDays, handleSdDaysChange]);
  const handleDecrementSdDays = useCallback(() => {
    if (sdDays > 0) handleSdDaysChange(sdDays - 1);
  }, [sdDays, handleSdDaysChange]);

  const tableIntervalOptions = useMemo(
    () => [
      { value: "25", label: "25" },
      { value: "50", label: "50" },
      { value: "100", label: "100" },
      { value: "200", label: "200" },
      { value: "250", label: "250" },
      { value: "500", label: "500" },
      { value: "1000", label: "1000" },
      { value: "2000", label: "2000" },
    ],
    []
  );

  return (
    <section className={styles.svPayoffChartSection}>
      <StrategyTabs
        tabs={mainChartTabsDefinition}
        activeTab={activeChartTab}
        onTabChange={handleMainTabChangeWithLog}
        className={styles.chartSectionTabs}
      />
      <div className={styles.tabContentArea}>
        {activeChartTab === "payoffgraph" && (
          <div className={styles.payoffGraphMainTabContent}>
            <div className={styles.sectionHeaderControls}>
              <StrategyTabs
                tabs={payoffGraphViewSubTabsDefinition}
                activeTab={activePayoffGraphSubTab}
                onTabChange={handleSubTabChangeWithLog}
                className={styles.payoffSubTabs}
              />
              {activePayoffGraphSubTab === SUB_TAB_PAYOFF_TABLE_VIEW && (
                <div className={styles.tableControls}>
                  <label htmlFor="matrixTableIntervalSelect">
                    Target Interval:
                  </label>
                  <Select
                    id="matrixTableIntervalSelect"
                    options={tableIntervalOptions}
                    value={matrixTableInterval}
                    onChange={setMatrixTableInterval}
                    className={styles.tableIntervalSelect}
                  />
                  <Checkbox
                    label="Show % P&L"
                    checked={showPercentageInMatrix}
                    onChange={(checked) =>
                      setShowPercentageInMatrix(Boolean(checked))
                    }
                  />
                </div>
              )}
              {activePayoffGraphSubTab === SUB_TAB_CHART_VIEW && (
                <div className={styles.chartSpecificControls}>
                  {/* BEST PRACTICE CORRECTION: Replaced inline styles with a dedicated SCSS class for the number input. */}
                  <div className={styles.sdDaysInputContainer}>
                    <button onClick={handleDecrementSdDays}>-</button>
                    <input
                      type="number"
                      value={sdDays}
                      onChange={(e) =>
                        handleSdDaysChange(Number(e.target.value))
                      }
                    />
                    <button onClick={handleIncrementSdDays}>+</button>
                  </div>
                </div>
              )}
            </div>
            {activePayoffGraphSubTab === SUB_TAB_CHART_VIEW && (
              <PayoffChart
                strategyLegs={strategyLegs}
                niftyTargetString={niftyTarget}
                displaySpotForSlider={displaySpotForSlider}
                targetDateISO={targetDate}
                getInstrumentByToken={getInstrumentByToken}
                riskFreeRate={riskFreeRate}
                getScenarioIV={getScenarioIV}
                underlyingSpotPrice={underlyingSpotPrice}
                targetInterval={matrixTableInterval}
                showPercentage={showPercentageInMatrix}
                sdDays={sdDays}
                fullInstrumentChainData={liveInstrumentChainArray}
                multiplier={multiplier}
              />
            )}
            {activePayoffGraphSubTab === SUB_TAB_PAYOFF_TABLE_VIEW && (
              <PayoffTable
                payoffData={payoffMatrixData}
                targetDate={targetDate}
                multiplier={multiplier}
              />
            )}
          </div>
        )}
        {activeChartTab === "p&ltable" && (
          <>
            <div className={styles.greeksControlsHeader}>
              <Checkbox
                label="Lot Size / Contract Multiplier"
                checked={multiplyByLotSize}
                onChange={onMultiplyByLotSizeChange}
              />
              <Checkbox
                label="Num Lots"
                checked={multiplyByNumLots}
                onChange={onMultiplyByNumLotsChange}
              />
            </div>
            <PnLTable
              projectedLegsData={singleScenarioPerLegData.legs}
              totals={singleScenarioPerLegData.totals}
              multiplier={multiplier}
            />
          </>
        )}
        {activeChartTab === "greeks" && (
          <div className={styles.greeksTabContent}>
            <div className={styles.greeksControlsHeader}>
              <Checkbox
                label="Lot Size / Contract Multiplier"
                checked={multiplyByLotSize}
                onChange={onMultiplyByLotSizeChange}
              />
              <Checkbox
                label="Num Lots"
                checked={multiplyByNumLots}
                onChange={onMultiplyByNumLotsChange}
              />
            </div>
            <GreeksTable
              projectedLegsData={singleScenarioPerLegData.legs}
              totals={singleScenarioPerLegData.totals}
              multiplier={multiplier}
            />
          </div>
        )}
        {activeChartTab === "strategychart" && (
          <div className={styles.tabContentPlaceholder}>
            <p>Strategy Chart View (To be implemented)</p>
          </div>
        )}
      </div>
      <div className={styles.globalChartControls}>
        <div className={styles.targetControlsRow}>
          <div className={styles.inputSliderGroup}>
            <label htmlFor="spotTargetInput">
              {currentUnderlying || "Spot"} Target
            </label>
            <div className={styles.inputWithButtons}>
              <Button
                variant="icon"
                size="small"
                icon="-"
                onClick={() =>
                  onNiftyTargetChange(
                    (
                      parseFloat(
                        niftyTarget || String(displaySpotForSlider) || "0"
                      ) - (SPOT_SLIDER_STEP || 50)
                    ).toFixed(2)
                  )
                }
              />
              <Input
                id="spotTargetInput"
                type="number"
                value={niftyTargetInputValue}
                onChange={onNiftyTargetChange}
                className={styles.targetValueInput}
                placeholder={
                  displaySpotForSlider > 0
                    ? displaySpotForSlider.toFixed(2)
                    : "Target"
                }
              />
              <Button
                variant="icon"
                size="small"
                icon="+"
                onClick={() =>
                  onNiftyTargetChange(
                    (
                      parseFloat(
                        niftyTarget || String(displaySpotForSlider) || "0"
                      ) + (SPOT_SLIDER_STEP || 50)
                    ).toFixed(2)
                  )
                }
              />
            </div>
            <input
              type="range"
              min={spotSliderMin}
              max={spotSliderMax}
              value={niftyTargetSliderValue}
              step={SPOT_SLIDER_STEP || 50}
              onChange={(e) => onNiftyTargetChange(e.target.value)}
              className={styles.globalTargetSlider}
            />
            <Button variant="link" size="small" onClick={onResetNiftyTarget}>
              Reset Spot
            </Button>
          </div>
        </div>
        <div className={styles.targetControlsRow}>
          <div className={styles.inputSliderGroup}>
            <label htmlFor="dateTargetDisplay">
              Date: {daysToTargetDisplay}
              {daysToTargetDisplay !== "Past" &&
              daysToTargetDisplay !== NOT_APPLICABLE
                ? "D to Scenario"
                : ""}
            </label>
            <div className={styles.inputWithButtons}>
              {/* BEST PRACTICE CORRECTION: The hidden input for the date picker is preserved but correctly styled in SCSS. */}
              <Input
                id="dateTargetDisplay"
                type="text"
                value={
                  targetDate
                    ? new Date(targetDate).toLocaleDateString("en-GB", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                      })
                    : ""
                }
                readOnly
                className={styles.dateDisplayInput}
                onClick={() =>
                  document
                    .getElementById("hiddenDateTargetInput")
                    ?.showPicker?.()
                }
              />
              <input
                id="hiddenDateTargetInput"
                type="datetime-local"
                value={targetDate}
                onChange={(e) => onTargetDateChange(e.target.value)}
                className={styles.hiddenDateInput}
              />
            </div>
            <input
              type="range"
              min={0}
              max={100}
              value={dateSliderValue}
              onChange={handleDateSliderChange}
              className={styles.globalTargetSlider}
              disabled={
                !minDateForSliderRange ||
                !maxDateForSliderRange ||
                minDateForSliderRange >= maxDateForSliderRange
              }
            />
            <Button variant="link" size="small" onClick={handleResetDate}>
              Reset Date
            </Button>
          </div>
        </div>
        <div className={styles.dateSliderLabels}>
          <span>
            {minDateForSliderRange
              ? new Date(minDateForSliderRange).toLocaleDateString("en-GB", {
                  day: "2-digit",
                  month: "short",
                })
              : "Today"}
          </span>
          <span>
            {maxDateForSliderRange
              ? new Date(maxDateForSliderRange).toLocaleDateString("en-GB", {
                  day: "2-digit",
                  month: "short",
                })
              : "Max Exp"}
          </span>
        </div>
      </div>
    </section>
  );
};

export default React.memo(PayoffChartSection);
