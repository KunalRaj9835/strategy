import React, {
  useState,
  useEffect,
  useCallback,
  useMemo,
  Dispatch,
  SetStateAction,
} from "react";
import "./StrategyVisualizer.scss";
import HeaderSection from "./sections/HeaderSection";
import TopControlsSection from "./sections/TopControlsSection";
import ReadyMadeStrategiesSection from "./sections/ReadyMadeStrategiesSection";
import NewStrategySection from "./sections/NewStrategySection";
import PayoffChartSection from "./sections/PayoffChartSection";
import SummaryMetricsSection from "./sections/SummaryMetricsSection";
import DetailedDataSection from "./sections/DetailedDataSection";
import { useLiveOptionData } from "../../contexts/LiveOptionDataContext";
import { RISK_FREE_RATE, DEFAULT_VOLATILITY } from "../../config";
import { fetchStrategies, saveStrategy } from "../../services/strategyService";
import { generatePayoffGraphData } from "../utils/payoffChartUtils";
import {
  PAYOFF_GRAPH_POINTS,
  PAYOFF_GRAPH_INTERVAL_STEP,
} from "../../config";

// --- Type Definitions ---

type InstrumentType = "index" | "equity";
type ChartTab = "payoffgraph" | string;
type MainTab = "readymade" | "positions" | "mystrategies" | "draftportfolios" | "newstrategy" | string;

interface Instrument {
  token: string;
  underlying: string;
  marketData?: {
    spot?: string | number;
    futures?: string | number;
    [key: string]: any;
  };
  iv?: string | number;
  strike?: number;
  [key: string]: any;
}

interface StrategyLeg {
  id: string;
  token: string;
  price: number;
  iv: number;
  status?: string;
  selected: boolean;
  [key: string]: any;
}

interface Strategy {
  id: string;
  legs: StrategyLeg[];
  status: string;
  [key: string]: any;
}

interface LoadingTabData {
  positions: boolean;
  myStrategies: boolean;
  drafts: boolean;
}

interface TradableInstruments {
  options: Instrument[];
  futures: Instrument[];
}

interface PayoffGraphData {
  // Define as per generatePayoffGraphData output
  [key: string]: any;
}

// --- End Type Definitions ---

const HARDCODED_USER_ID = "userTest01";

const StrategyVisualizer: React.FC = () => {
  // 1. Get data and functions from the LiveOptionDataContext
  const {
    liveInstrumentChainArray,
    websocketReadyState,
    SocketIOReadyState,
    availableUnderlyings,
    getTradableInstrumentsByUnderlying,
    getInstrumentByToken,
  } = useLiveOptionData();

  // 2. State variables
  const [instrumentType, setInstrumentType] = useState<InstrumentType>("index");
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [strategyLegs, setStrategyLegs] = useState<StrategyLeg[]>([]);
  const [activeChartTab, setActiveChartTab] = useState<ChartTab>("payoffgraph");
  const [activeMainTab, setActiveMainTab] = useState<MainTab>("readymade");
  const [multiplier, setMultiplier] = useState<number>(1);
  const [niftyTarget, setNiftyTarget] = useState<string>("");
  const [isNiftyTargetManuallySet, setIsNiftyTargetManuallySet] = useState<boolean>(false);
  const [targetDate, setTargetDate] = useState<string>(() => {
    const now = new Date();
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
    return now.toISOString().slice(0, 16);
  });
  const [globalIvOffset, setGlobalIvOffset] = useState<number>(0);
  const [individualIvAdjustments, setIndividualIvAdjustments] = useState<Record<string, number>>({});
  const [multiplyByLotSize, setMultiplyByLotSizeState] = useState<boolean>(true);
  const [multiplyByNumLots, setMultiplyByNumLotsState] = useState<boolean>(true);

  const [userPositions, setUserPositions] = useState<Strategy[]>([]);
  const [mySavedStrategies, setMySavedStrategies] = useState<Strategy[]>([]);
  const [draftStrategies, setDraftStrategies] = useState<Strategy[]>([]);
  const [isLoadingTabData, setIsLoadingTabData] = useState<LoadingTabData>({
    positions: false,
    myStrategies: false,
    drafts: false,
  });
  const [sdDays, setSdDays] = useState<number>(7);

  // --- Derived values ---

  const underlyingSpotPrice = useMemo<number | null>(() => {
    if (
      !searchTerm ||
      !liveInstrumentChainArray ||
      (Array.isArray(liveInstrumentChainArray) && liveInstrumentChainArray.length === 0)
    )
      return null;
    const arr: Instrument[] = Array.isArray(liveInstrumentChainArray)
      ? liveInstrumentChainArray
      : liveInstrumentChainArray instanceof Map
      ? Array.from(liveInstrumentChainArray.values())
      : [];
    const instrument = arr.find(
      (instr) => instr.underlying === searchTerm && instr.marketData
    );
    const spot =
      instrument?.marketData?.spot !== undefined
        ? parseFloat(instrument.marketData.spot as string)
        : instrument?.marketData?.futures !== undefined
        ? parseFloat(instrument.marketData.futures as string)
        : null;
    return !isNaN(spot as number) && (spot as number) > 0 ? (spot as number) : null;
  }, [searchTerm, liveInstrumentChainArray]);

  useEffect(() => {
    if (
      availableUnderlyings &&
      availableUnderlyings.length > 0 &&
      !searchTerm
    ) {
      setSearchTerm(availableUnderlyings[0]);
      setIsNiftyTargetManuallySet(false);
    } else if (!searchTerm) {
      setIsNiftyTargetManuallySet(false);
    }
  }, [availableUnderlyings, searchTerm]);

  useEffect(() => {
    if (!isNiftyTargetManuallySet && underlyingSpotPrice !== null) {
      setNiftyTarget(underlyingSpotPrice.toFixed(2));
    }
  }, [underlyingSpotPrice, isNiftyTargetManuallySet]);

  // --- Handlers ---

  const handleInstrumentTypeChange = useCallback(
    (type: InstrumentType) => setInstrumentType(type),
    []
  );

  const handleSdDaysChange = useCallback((days: number) => setSdDays(days), []);

  const handleSearchTermChange = useCallback((term: string) => {
    setSearchTerm(term);
    setIsNiftyTargetManuallySet(false);
  }, []);

  const handleStrategyLegsChange = useCallback(
    (
      legsUpdater: StrategyLeg[] | ((prev: StrategyLeg[]) => StrategyLeg[])
    ) => {
      if (typeof legsUpdater === "function") setStrategyLegs(legsUpdater);
      else setStrategyLegs(legsUpdater);
    },
    []
  );

  const handleChartTabChange = useCallback(
    (tab: ChartTab) => setActiveChartTab(tab),
    []
  );

  const fetchDataForTabDisplay = useCallback(
    async (
      status: string,
      setter: Dispatch<SetStateAction<Strategy[]>>,
      tabKey: keyof LoadingTabData
    ) => {
      if (!HARDCODED_USER_ID) {
        setter([]);
        return;
      }
      setIsLoadingTabData((prev) => ({ ...prev, [tabKey]: true }));
      try {
        const strategiesArray = await fetchStrategies({
          status,
          userId: HARDCODED_USER_ID,
        });
        setter(Array.isArray(strategiesArray) ? strategiesArray : []);
      } catch (error: any) {
        setter([]);
        console.error(
          `StrategyVisualizer: Error fetching ${tabKey} for display:`,
          error.message
        );
      } finally {
        setIsLoadingTabData((prev) => ({ ...prev, [tabKey]: false }));
      }
    },
    []
  );

  const handleMainTabChange = useCallback(
    (tabId: MainTab) => {
      setActiveMainTab(tabId);
      if (tabId === "positions")
        fetchDataForTabDisplay(
          "active_position",
          setUserPositions,
          "positions"
        );
      else if (tabId === "mystrategies")
        fetchDataForTabDisplay(
          "active_position",
          setMySavedStrategies,
          "myStrategies"
        );
      else if (tabId === "draftportfolios")
        fetchDataForTabDisplay("draft", setDraftStrategies, "drafts");
    },
    [fetchDataForTabDisplay]
  );

  const handleNiftyTargetChange = useCallback((valStr: string) => {
    const numVal = parseFloat(valStr);
    if (!isNaN(numVal) && numVal >= 0) {
      setNiftyTarget(numVal.toFixed(2));
    } else if (valStr === "") {
      setNiftyTarget("");
    }
    setIsNiftyTargetManuallySet(true);
  }, []);

  const handleResetNiftyTargetToLive = useCallback(() => {
    setIsNiftyTargetManuallySet(false);
    if (underlyingSpotPrice !== null) {
      setNiftyTarget(underlyingSpotPrice.toFixed(2));
    }
  }, [underlyingSpotPrice]);

  const handleTargetDateChange = useCallback(
    (val: string) => setTargetDate(val),
    []
  );

  const handleMultiplyLotSizeChange = useCallback(
    (checked: boolean) => setMultiplyByLotSizeState(Boolean(checked)),
    []
  );

  const handleMultiplyNumLotsChange = useCallback(
    (checked: boolean) => setMultiplyByNumLotsState(Boolean(checked)),
    []
  );

  const handleGlobalIvOffsetChange = useCallback(
    (updater: number | ((prev: number) => number)) => {
      const applyUpdate = (prev: number) =>
        parseFloat(
          Math.max(
            -50,
            Math.min(
              50,
              typeof updater === "function" ? updater(prev) : updater
            )
          ).toFixed(1)
        );
      setGlobalIvOffset(applyUpdate);
    },
    []
  );

  const handleIndividualIvAdjustmentChange = useCallback(
    (legToken: string, adjustment: number | string) => {
      setIndividualIvAdjustments((prev) => ({
        ...prev,
        [legToken]: parseFloat(adjustment as string) || 0,
      }));
    },
    []
  );

  const handleResetAllIvAdjustments = useCallback(() => {
    setGlobalIvOffset(0);
    setIndividualIvAdjustments({});
  }, []);

  const handleLoadStrategyLegsIntoBuilder = useCallback(
    (legsToLoad: StrategyLeg[], itemStatus?: string) => {
      const newLegs: StrategyLeg[] = legsToLoad.map((leg) => ({
        ...leg,
        id:
          leg.id ||
          `leg_${Date.now()}_${Math.random().toString(16).slice(2)}`,
        selected: leg.selected !== undefined ? leg.selected : true,
        price: leg.price !== undefined ? parseFloat(leg.price as any) : 0,
        iv:
          leg.iv !== undefined
            ? parseFloat(leg.iv as any)
            : DEFAULT_VOLATILITY * 100,
        status: leg.status || itemStatus,
      }));
      setStrategyLegs(newLegs);
      setActiveMainTab("newstrategy");
      setIsNiftyTargetManuallySet(false);
    },
    [setActiveMainTab]
  );

  const handleSaveStrategyFromBuilder = useCallback(
    async (strategyPayloadFromBuilder: any) => {
      if (!HARDCODED_USER_ID) {
        alert("User ID not set. Cannot save strategy.");
        return;
      }
      try {
        const result = await saveStrategy(strategyPayloadFromBuilder);
        alert(result.message || "Strategy action completed!");
        if (strategyPayloadFromBuilder.status === "active_position") {
          fetchDataForTabDisplay(
            "active_position",
            setUserPositions,
            "positions"
          );
          fetchDataForTabDisplay(
            "active_position",
            setMySavedStrategies,
            "myStrategies"
          );
        } else if (strategyPayloadFromBuilder.status === "draft") {
          fetchDataForTabDisplay("draft", setDraftStrategies, "drafts");
        }
      } catch (error: any) {
        console.error("Failed to save strategy from builder:", error);
        alert(
          `Error saving strategy: ${error.message || "Unknown server error."}`
        );
      }
    },
    [fetchDataForTabDisplay]
  );

  const getScenarioIV = useCallback(
    (legToken: string): number => {
      const liveOption: Instrument | undefined = getInstrumentByToken(legToken);
      if (!liveOption || liveOption.iv === undefined)
        return DEFAULT_VOLATILITY;
      const baseIV = parseFloat(liveOption.iv as string);
      const indAdj = individualIvAdjustments[legToken] || 0;
      const scenarioIV = baseIV + indAdj + globalIvOffset;
      return Math.max(0.001, scenarioIV / 100);
    },
    [getInstrumentByToken, individualIvAdjustments, globalIvOffset]
  );

  const tradableInstrumentsForSelectedUnderlying = useMemo<TradableInstruments>(() => {
    if (!searchTerm || !getTradableInstrumentsByUnderlying)
      return { options: [], futures: [] };
    return getTradableInstrumentsByUnderlying(searchTerm);
  }, [searchTerm, getTradableInstrumentsByUnderlying, liveInstrumentChainArray]);

  // Option chain extraction
  let optionChainArray: Instrument[] = [];
  if (liveInstrumentChainArray instanceof Map) {
    optionChainArray = Array.from(liveInstrumentChainArray.values());
  } else if (Array.isArray(liveInstrumentChainArray)) {
    optionChainArray = liveInstrumentChainArray;
    if (optionChainArray.length > 0) {
      const firstElement = optionChainArray[0];
      if (
        Array.isArray(firstElement) &&
        firstElement.length === 2 &&
        firstElement[1] &&
        typeof firstElement[1] === "object" &&
        "strike" in firstElement[1]
      ) {
        optionChainArray = optionChainArray.map((entry: any) => entry[1]);
      } else if (
        !(
          typeof firstElement === "object" &&
          firstElement !== null &&
          "strike" in firstElement
        )
      ) {
        console.warn(
          "PayoffChart: liveOptionChainMap is an array, but elements don't look like option objects."
        );
        optionChainArray = [];
      }
    }
  } else if (liveInstrumentChainArray) {
    console.warn(
      "PayoffChart: liveOptionChainMap received is neither a Map nor an Array. OI data will be missing.",
      typeof liveInstrumentChainArray
    );
  }

  const payoffGraphData: PayoffGraphData = generatePayoffGraphData({
    strategyLegs,
    niftyTarget: niftyTarget.toString(),
    displaySpotForSlider: underlyingSpotPrice,
    targetDateISO: targetDate,
    riskFreeRate: RISK_FREE_RATE,
    getScenarioIV,
    getInstrumentByToken,
    targetInterval: 1000,
    PAYOFF_GRAPH_POINTS,
    PAYOFF_GRAPH_INTERVAL_STEP,
    underlyingSpotPrice,
    showPercentage: true,
    sdDays,
    fullOptionChainData: optionChainArray,
  });

  // --- Section Props ---

  const commonScenarioProps = {
    strategyLegs,
    getInstrumentByToken,
    riskFreeRate: RISK_FREE_RATE,
    getScenarioIV,
  };

  const payoffChartProps = {
    ...commonScenarioProps,
    activeChartTab,
    onChartTabChange: handleChartTabChange,
    niftyTarget,
    onNiftyTargetChange: handleNiftyTargetChange,
    onResetNiftyTarget: handleResetNiftyTargetToLive,
    targetDate,
    onTargetDateChange: handleTargetDateChange,
    liveOptionChainMap: liveInstrumentChainArray,
    currentUnderlying: searchTerm,
    underlyingSpotPrice,
    multiplyByLotSize,
    onMultiplyByLotSizeChange: handleMultiplyLotSizeChange,
    multiplyByNumLots,
    onMultiplyByNumLotsChange: handleMultiplyNumLotsChange,
    handleSdDaysChange: handleSdDaysChange,
    sdDays,
    multiplier,
    underlyingSpotPrice,
  };

  const detailedDataProps = {
    ...commonScenarioProps,
    currentUnderlying: searchTerm,
    projectedNiftyTarget: niftyTarget,
    projectedTargetDate: targetDate,
    individualIvAdjustments,
    onIndividualIvAdjustmentChange: handleIndividualIvAdjustmentChange,
    onResetAllIvAdjustments: handleResetAllIvAdjustments,
    globalIvOffset,
    onGlobalIvOffsetChange: handleGlobalIvOffsetChange,
    multiplyByLotSize,
    onMultiplyByLotSizeChange: handleMultiplyLotSizeChange,
    multiplyByNumLots,
    onMultiplyByNumLotsChange: handleMultiplyNumLotsChange,
    liveOptionChainMap: liveInstrumentChainArray,
    underlyingSpotPrice,
    sdDays,
    multiplier,
  };

  const readyMadeStrategiesProps = {
    activeMainTab,
    onMainTabChange: handleMainTabChange,
    currentUnderlying: searchTerm,
    liveInstrumentChainArray,
    getTradableInstrumentsByUnderlying,
    getInstrumentByToken,
    underlyingSpotPrice,
    onLoadStrategyLegs: handleLoadStrategyLegsIntoBuilder,
    userPositions,
    mySavedStrategies,
    draftStrategies,
    isLoadingTabData,
  };

  const newStrategyProps = {
    strategyLegs,
    onStrategyLegsChange: handleStrategyLegsChange,
    tradableInstrumentsForSelectedUnderlying,
    currentUnderlying: searchTerm,
    onSaveStrategy: handleSaveStrategyFromBuilder,
    getInstrumentByToken,
    underlyingSpotPrice,
    multiplier,
    setMultiplier,
  };

  // --- Render ---

  return (
    <div className="strategy-visualizer-container">
      <HeaderSection />
      <TopControlsSection
        instrumentType={instrumentType}
        onInstrumentTypeChange={handleInstrumentTypeChange}
        searchTerm={searchTerm}
        onSearchTermChange={handleSearchTermChange}
        availableUnderlyings={availableUnderlyings || []}
      />
      <ReadyMadeStrategiesSection {...readyMadeStrategiesProps} />
      {activeMainTab === "newstrategy" && (
        <NewStrategySection {...newStrategyProps} />
      )}
      <PayoffChartSection {...payoffChartProps} />
      <SummaryMetricsSection
        {...commonScenarioProps}
        projectedNiftyTarget={niftyTarget}
        projectedTargetDate={targetDate}
        payoffGraphData={payoffGraphData}
        underlyingSpotPrice={underlyingSpotPrice}
      />
      <DetailedDataSection {...detailedDataProps} />
    </div>
  );
};

export default React.memo(StrategyVisualizer);
