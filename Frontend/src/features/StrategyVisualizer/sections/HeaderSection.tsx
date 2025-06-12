
// src/features/StrategyVisualizer/sections/HeaderSection.tsx
import React from 'react';
import Button from '../../../components/Button/Button';
import './HeaderSection.scss';

const HeaderSection: React.FC = () => (
  <header className="sv-header-section">
    <h1>Strategy Visualizer</h1>
    <p>Turning market data into clear, strategic visuals for smarter trading decisions</p>
    <Button variant="secondary" className="demo-videos-btn">Demo Videos</Button>
  </header>
);

export default HeaderSection;
