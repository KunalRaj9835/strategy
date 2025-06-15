// src/features/StrategyVisualizer/sections/TopControlsSection.tsx

'use client'; // This is an interactive component and must be a Client Component in Next.js.

import React from 'react';

// Import the SCSS module for locally-scoped styling.
import styles from './TopControlsSection.module.scss';

// Import shared UI components using the recommended Next.js alias for clean, absolute paths.
import ToggleButtonGroup from '@/components/ToggleButtonGroup/ToggleButtonGroup';
import Input from '@/components/Input/Input';
import Button from '@/components/Button/Button';

// --- Type Definitions (Fully Typed) ---

// Defines the instrument type options for type safety.
type InstrumentType = 'index' | 'equity';

// Defines the props interface for the component, ensuring strong typing.
interface TopControlsSectionProps {
  instrumentType: InstrumentType;
  onInstrumentTypeChange: (instrumentType: InstrumentType) => void;
  searchTerm: string;
  onSearchTermChange: (searchTerm: string) => void;
}

// --- Main Component (Fully Corrected with Best Practices) ---
const TopControlsSection: React.FC<TopControlsSectionProps> = ({
  instrumentType,
  onInstrumentTypeChange,
  searchTerm,
  onSearchTermChange,
}) => (
  <section className={styles.svTopControlsSection}>
    <ToggleButtonGroup
      // Options are typed with 'as const' to ensure the 'value' is treated as a literal type.
      options={[
        { label: 'Index', value: 'index' as const },
        { label: 'Equity', value: 'equity' as const },
      ]}
      selected={instrumentType}
      // The onSelect prop is expected to pass the value directly.
      onSelect={onInstrumentTypeChange}
      className={styles.instrumentTypeToggle}
    />
    <Input
      placeholder="Search NIFTY, BANKNIFTY..."
      value={searchTerm}
      // BEST PRACTICE CORRECTION: Using the standard React.ChangeEvent to extract the value.
      // This makes the component more robust and aligned with standard input handling.
      onChange={(e: React.ChangeEvent<HTMLInputElement>) => onSearchTermChange(e.target.value)}
      icon="🔍"
      className={styles.searchInput}
      name="mainStrategySearch"
    />
    <div className={styles.topActions}>
      <Button variant="tertiary" icon="📊" size="normal">
        Info
      </Button>
      <Button variant="tertiary" icon="⚙️" size="normal">
        Settings
      </Button>
    </div>
  </section>
);

export default TopControlsSection;
