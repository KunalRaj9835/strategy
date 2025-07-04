import React, { useEffect, useState } from "react";
import { LiveOptionDataProvider } from "./contexts/LiveOptionDataContext.jsx";
import StrategyVisualizer from "./features/StrategyVisualizer/StrategyVisualizer.tsx";
import Text from "./features/text.jsx";
import { BrowserRouter as Router, Route, Routes } from "react-router-dom";
import { AdvancedRealTimeChart } from "react-ts-tradingview-widgets";
function App() {
  return (
    <LiveOptionDataProvider>
      <Router>
        <div
          style={{
            maxWidth: 1200,
            margin: "0 auto",
            padding: "20px",
            fontFamily: "Arial, sans-serif",
          }}
        >
          <h1>TradVed Strategy Visualizer</h1>
          <Routes>
            <Route path="/" element={<StrategyVisualizer />} />
            <Route
              path="/nifty"
              element={
                <AdvancedRealTimeChart
                  symbol="NSE:NIFTY"
                  theme="light"
                  autosize
                ></AdvancedRealTimeChart>
              }
            />
          </Routes>
        </div>
      </Router>
    </LiveOptionDataProvider>
  );
}

export default App;
