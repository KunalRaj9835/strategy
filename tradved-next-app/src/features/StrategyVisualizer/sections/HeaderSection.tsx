// src/features/StrategyVisualizer/sections/HeaderSection.tsx

'use client'; // Best practice for components within an interactive feature section.

import React from 'react';

// Import the new SCSS module for locally-scoped styling.
import styles from './HeaderSection.module.scss';

// Import the Button component using the recommended Next.js alias for clean, absolute paths.
import Button from '@/components/Button/Button';

// --- Main Component ---
// No logic changes are needed; it simply applies the classes from the improved stylesheet.
const HeaderSection: React.FC = () => (
  <header className={styles.svHeaderSection}>
    <h1>Strategy Visualizer</h1>
    <p>Turning market data into clear, strategic visuals for smarter trading decisions</p>
    <Button variant="secondary" className={styles.demoVideosBtn}>
      Demo Videos
    </Button>
  </header>
);

export default HeaderSection;
