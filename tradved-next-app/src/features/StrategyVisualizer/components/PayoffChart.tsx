// src/features/StrategyVisualizer/components/PayoffChart.tsx
import React, { useRef } from "react";
import { Chart as ChartJS, registerables, ChartOptions, ChartData } from "chart.js";
import { Chart } from "react-chartjs-2";
import annotationPlugin from "chartjs-plugin-annotation";
import { generatePayoffGraphData } from "@/lib/payoffChartUtils"; // This utility needs to be legType-aware
import { PAYOFF_GRAPH_POINTS, PAYOFF_GRAPH_INTERVAL_STEP } from "@/config"; // Ensure these constants are defined

ChartJS.register(...registerables, annotationPlugin);

// Type definitions
interface StrategyLeg {
  legType: string;
  [key: string]: any; // Allow for additional properties
}

interface Instrument {
  token: string;
  [key: string]: any; // Allow for additional properties
}

interface PayoffPoint {
  spot: number;
  pnlAtExpiry: number;
  pnlAtExpiryPct: number;
  pnlAtTargetDate: number;
  pnlAtTargetDatePct: number;
  callOI?: number;
  putOI?: number;
}

interface SDBands {
  center: number;
  minus2SD: number;
  minus1SD: number;
  plus1SD: number;
  plus2SD: number;
}

interface PayoffChartProps {
  strategyLegs: StrategyLeg[]; // Existing (will contain legType)
  niftyTargetString: string;
  displaySpotForSlider: string | number;
  targetDateISO: string;
  riskFreeRate: number;
  getScenarioIV: (token: string, scenario: any) => number; // For options
  getInstrumentByToken: (token: string) => Instrument | null; // MODIFIED: Was getOptionByToken
  targetInterval: number;
  underlyingSpotPrice: number;
  showPercentage: boolean;
  sdDays: number;
  fullInstrumentChainData: Instrument[] | Map<string, Instrument> | any; // MODIFIED: Was fullOptionChainData, expects array of all instruments
  multiplier?: number;
}

const PayoffChart: React.FC<PayoffChartProps> = ({
  strategyLegs, // Existing (will contain legType)
  niftyTargetString,
  displaySpotForSlider,
  targetDateISO,
  riskFreeRate,
  getScenarioIV, // For options
  getInstrumentByToken, // MODIFIED: Was getOptionByToken
  targetInterval,
  underlyingSpotPrice,
  showPercentage,
  sdDays,
  fullInstrumentChainData, // MODIFIED: Was fullOptionChainData, expects array of all instruments
  multiplier = 1,
}) => {
  const chartRef = useRef<ChartJS | null>(null); // Keep for potential direct chart interactions

  // MODIFIED: Process fullInstrumentChainData (which should be an array from PayoffChartSection)
  // This logic is a safeguard; ideally, PayoffChartSection passes a clean array.
  let instrumentArray: Instrument[] = [];
  if (Array.isArray(fullInstrumentChainData)) {
    instrumentArray = fullInstrumentChainData;
    // The complex Map/Array[Array] check from your paste-2.txt might be less necessary
    // if liveInstrumentChainArray from context is consistently an array of instrument objects.
    // Let's simplify: if it's an array, assume it's the correct array of instruments.
  } else if (fullInstrumentChainData instanceof Map) {
    // Fallback if a Map is somehow passed
    console.warn(
      "PayoffChart: fullInstrumentChainData received as Map, converting to array. Should be array."
    );
    instrumentArray = Array.from(fullInstrumentChainData.values());
  } else if (fullInstrumentChainData) {
    console.warn(
      "PayoffChart: fullInstrumentChainData received is neither an Array nor a Map. OI data might be missing or incorrect.",
      typeof fullInstrumentChainData
    );
  }

  // MODIFIED: Call to generatePayoffGraphData now passes getInstrumentByToken
  // and the processed instrumentArray as 'fullOptionChainData' (utility prop name)
  const { points, sdBands }: { points: PayoffPoint[]; sdBands: SDBands | null } = generatePayoffGraphData({
    strategyLegs,
    niftyTargetString,
    displaySpotForSlider,
    targetDateISO,
    riskFreeRate,
    getScenarioIV, // For options
    getInstrumentByToken, // MODIFIED: Pass new generic getter (utility expects getOptionByToken name)
    targetInterval,
    PAYOFF_GRAPH_POINTS,
    PAYOFF_GRAPH_INTERVAL_STEP,
    underlyingSpotPrice,
    showPercentage,
    sdDays,
    fullOptionChainData: instrumentArray, // MODIFIED: Pass the processed array
  });
//  console.log(points, sdBands); // << DEBUG: Log points and sdBands for verification
  if (!points || points.length === 0) {
    return (
      <div style={{ textAlign: "center", padding: "20px", minHeight: 350 }}>
        No payoff data to display. Check inputs or console.
      </div>
    );
  }

  const chartLabels: number[] = points.map((pt) => pt.spot); // x-values

  // Data for datasets
  // P&L values already incorporate the strategy multiplier if done in generatePayoffGraphData,
  // OR apply multiplier here if generatePayoffGraphData returns unscaled P&L.
  // Assuming generatePayoffGraphData returns unscaled P&L for flexibility, apply multiplier here.
  const expiryData: number[] = points.map((pt) =>
    showPercentage
      ? pt.pnlAtExpiryPct * multiplier
      : pt.pnlAtExpiry * multiplier
  );
  const targetData: number[] = points.map((pt) =>
    showPercentage
      ? pt.pnlAtTargetDatePct * multiplier
      : pt.pnlAtTargetDate * multiplier
  );

  const callOIData: number[] = points.map((pt) => pt.callOI || 0);
  const putOIData: number[] = points.map((pt) => pt.putOI || 0);
  const hasOIData: boolean =
    callOIData.some((oi) => oi > 0) || putOIData.some((oi) => oi > 0);

  const datasets: any[] = [];
  if (hasOIData) {
    datasets.push(
      {
        type: "bar",
        label: "Call OI",
        data: points.map((p) => ({ x: p.spot, y: p.callOI || 0 })),
        backgroundColor: "rgba(255, 99, 132, 0.6)",
        borderColor: "rgb(255, 86, 123)",
        borderWidth: 1,
        yAxisID: "yOI",
        order: 3,
        barPercentage: 0.4,
        categoryPercentage: 0.9,
      },
      {
        type: "bar",
        label: "Put OI",
        data: points.map((p) => ({ x: p.spot, y: p.putOI || 0 })),
        backgroundColor: "rgba(75, 192, 192, 0.6)",
        borderColor: "rgb(52, 255, 62)",
        borderWidth: 1,
        yAxisID: "yOI",
        order: 3,
        barPercentage: 0.4,
        categoryPercentage: 0.9,
      }
    );
  }

  datasets.push(
    {
      type: "line",
      label: "P&L at Expiry",
      data: points.map((p) => ({
        x: p.spot,
        y: showPercentage
          ? p.pnlAtExpiryPct * multiplier
          : p.pnlAtExpiry * multiplier,
      })),
      borderColor: "#43a047",
      borderWidth: 2,
      pointRadius: 0,
      fill: false,
      tension: 0.1,
      segment: {
        borderColor: (ctx: any) => (ctx.p1.raw.y >= 0 ? "#43a047" : "#d32f2f"),
      },
      yAxisID: "yPnL",
      order: 1,
    },
    {
      type: "line",
      label: "P&L at Target Date",
      data: points.map((p) => ({
        x: p.spot,
        y: showPercentage
          ? p.pnlAtTargetDatePct * multiplier
          : p.pnlAtTargetDate * multiplier,
      })),
      borderColor: "rgb(58, 84, 255)",
      borderWidth: 2,
      borderDash: [6, 3],
      pointRadius: 0,
      fill: false,
      tension: 0.1,
      segment: {
        borderColor: (ctx: any) => (ctx.p1.raw.y >= 0 ? "#1976d2" : "#d32f2f"),
      },
      yAxisID: "yPnL",
      order: 2, // Ensure target P&L line is drawn after expiry P&L
    }
  );

  const chartData: ChartData = { datasets }; // labels are implicitly handled by {x,y} data

  const centerForSpotAnnotation: number = sdBands
    ? sdBands.center
    : parseFloat(displaySpotForSlider.toString()) ||
      parseFloat(niftyTargetString) ||
      underlyingSpotPrice ||
      0;
  let pnlAtCenterForAnnotation: number = 0;
  // Find the P&L value at the center spot for the annotation label
  const centerPointData: PayoffPoint | undefined = points.find(
    (p) =>
      Math.abs(p.spot - centerForSpotAnnotation) < (targetInterval * 0.1 || 1)
  ); // Tolerance for finding point
  if (centerPointData) {
    // Use P&L at Expiry for the main annotation label, as it's generally the primary focus
    pnlAtCenterForAnnotation = showPercentage
      ? centerPointData.pnlAtExpiryPct * multiplier
      : centerPointData.pnlAtExpiry * multiplier;
  }

  const scalesConfig: any = {
    /* ... (existing scalesConfig from your paste-2.txt, ensure yPnL and yOI are correctly defined) ... */
    x: {
      title: { display: true, text: "Spot / Strike Price" },
      type: "linear",
      min:
        points.length > 0 ? Math.min(...points.map((p) => p.spot)) : undefined,
      max:
        points.length > 0 ? Math.max(...points.map((p) => p.spot)) : undefined,
    },
    yPnL: {
      type: "linear",
      position: "left",
      title: {
        display: true,
        text: showPercentage
          ? `P&L (%) x ${multiplier}`
          : `P&L (₹) x ${multiplier}`,
      },
      grid: { drawOnChartArea: true },
    },
  };
  if (hasOIData) {
    scalesConfig.yOI = {
      type: "linear",
      position: "right",
      title: { display: true, text: "Open Interest" },
      grid: { drawOnChartArea: false },
      ticks: {
        callback: function (value: number): string {
          if (value >= 1000000) return (value / 1000000).toFixed(1) + "M";
          if (value >= 1000) return (value / 1000).toFixed(0) + "K";
          return value.toString();
        },
      },
      display: true,
    };
  }

  const annotationsObject: any =
    {}; /* ... (existing annotation logic from your paste-2.txt, ensure sdBands and centerForSpotAnnotation are correctly used) ... */
  if (sdBands && typeof sdBands.minus2SD === "number") {
    // SD Bands
    annotationsObject.minus2SD = {
      type: "line",
      scaleID: "x",
      value: sdBands.minus2SD,
      borderColor: "#ff6b6b",
      borderWidth: 1.5,
      borderDash: [5, 5],
      label: {
        enabled: true,
        content: "-2SD",
        position: "start",
        backgroundColor: "rgba(255,255,255,0.8)",
        color: "#333",
        font: { size: 10 },
        yAdjust: -10,
      },
    };
    annotationsObject.minus1SD = {
      type: "line",
      scaleID: "x",
      value: sdBands.minus1SD,
      borderColor: "#ffa726",
      borderWidth: 1.5,
      borderDash: [5, 5],
      label: {
        enabled: true,
        content: "-1SD",
        position: "start",
        backgroundColor: "rgba(255,255,255,0.8)",
        color: "#333",
        font: { size: 10 },
        yAdjust: -10,
      },
    };
    annotationsObject.plus1SD = {
      type: "line",
      scaleID: "x",
      value: sdBands.plus1SD,
      borderColor: "#ffa726",
      borderWidth: 1.5,
      borderDash: [5, 5],
      label: {
        enabled: true,
        content: "+1SD",
        position: "end",
        backgroundColor: "rgba(255,255,255,0.8)",
        color: "#333",
        font: { size: 10 },
        yAdjust: -10,
      },
    };
    annotationsObject.plus2SD = {
      type: "line",
      scaleID: "x",
      value: sdBands.plus2SD,
      borderColor: "#ff6b6b",
      borderWidth: 1.5,
      borderDash: [5, 5],
      label: {
        enabled: true,
        content: "+2SD",
        position: "end",
        backgroundColor: "rgba(255,255,255,0.8)",
        color: "#333",
        font: { size: 10 },
        yAdjust: -10,
      },
    };
  }
  if (
    typeof centerForSpotAnnotation === "number" &&
    centerForSpotAnnotation > 0
  ) {
    // Current Spot/Target Annotation
    annotationsObject.currentSpotLine = {
      type: "line",
      scaleID: "x",
      value: centerForSpotAnnotation,
      borderColor: "rgba(100,100,100,0.7)",
      borderWidth: 2,
      borderDash: [4, 4],
      label: {
        enabled: true,
        content: `Spot: ${centerForSpotAnnotation.toFixed(0)} | P&L: ${
          pnlAtCenterForAnnotation !== undefined
            ? pnlAtCenterForAnnotation.toFixed(0)
            : "--"
        }`,
        position: "center",
        backgroundColor: "rgba(200,200,200,0.8)",
        color: "black",
        font: { size: 10, weight: "bold" },
        yAdjust: -15,
      },
    };
  }

  const options: ChartOptions = {
    /* ... (existing options object from your paste-2.txt, ensure tooltip and legend are fine) ... */
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: "index", intersect: false },
    plugins: {
      legend: { position: "bottom" },
      tooltip: {
        callbacks: {
          title: function (tooltipItems: any[]): string {
            return `Spot/Strike: ${tooltipItems[0].parsed.x.toFixed(2)}`;
          },
          label: function (context: any): string {
            const datasetLabel: string = context.dataset.label || "";
            const value: number = context.parsed.y;
            if (datasetLabel.includes("OI"))
              return `${datasetLabel}: ${
                value !== null && value !== undefined
                  ? value.toLocaleString()
                  : "N/A"
              }`;
            return `${datasetLabel}: ${
              value !== null && value !== undefined ? value.toFixed(2) : "N/A"
            }`;
          },
        },
      },
      annotation:
        Object.keys(annotationsObject).length > 0
          ? { annotations: annotationsObject }
          : undefined,
    },
    scales: scalesConfig,
    elements: { line: { borderWidth: 2, tension: 0.1 }, point: { radius: 0 } },
  };

  return (
    <div style={{ minHeight: 350, maxHeight: 500, width: "100%" }}>
      {/* Ensure type="bar" is correct if you intend mixed chart, or adjust if only line charts are primary */}
      <Chart type="bar" ref={chartRef} data={chartData} options={options} />
    </div>
  );
};

export default PayoffChart;