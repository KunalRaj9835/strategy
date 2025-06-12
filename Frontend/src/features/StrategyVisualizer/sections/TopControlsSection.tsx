// src/features/StrategyVisualizer/sections/TopControlsSection.tsx
import React from 'react';
import ToggleButtonGroup from '../../../components/ToggleButtonGroup/ToggleButtonGroup';
import Input from '../../../components/Input/Input';
import Button from '../../../components/Button/Button';
import './TopControlsSection.scss';

// Define the instrument type options
type InstrumentType = 'index' | 'equity';

// Define the props interface
interface TopControlsSectionProps {
  instrumentType: InstrumentType;
  onInstrumentTypeChange: (instrumentType: InstrumentType) => void;
  searchTerm: string;
  onSearchTermChange: (searchTerm: string) => void;
}

const TopControlsSection: React.FC<TopControlsSectionProps> = ({
  instrumentType,
  onInstrumentTypeChange,
  searchTerm,
  onSearchTermChange
}) => (
  <section className="sv-top-controls-section">
    <ToggleButtonGroup
      options={[
        { label: 'Index', value: 'index' as const }, 
        { label: 'Equity', value: 'equity' as const }
      ]}
      selected={instrumentType}
      onSelect={onInstrumentTypeChange}
      className="instrument-type-toggle"
    />
    <Input
      placeholder="Search NIFTY, BANKNIFTY..."
      value={searchTerm}
      onChange={(inputValue: string) => onSearchTermChange(inputValue)}
      icon="🔍"
      className="search-input"
      name="mainStrategySearch"
    />
    <div className="top-actions">
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