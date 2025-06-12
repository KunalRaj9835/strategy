import React from 'react';
import './ToggleButtonGroup.scss';

interface ToggleOption {
  value: string;
  label: string;
}

interface ToggleButtonGroupProps {
  options: ToggleOption[];
  selected: string;
  onSelect: (value: string) => void;
  className?: string;
}

const ToggleButtonGroup: React.FC<ToggleButtonGroupProps> = ({ 
  options, 
  selected, 
  onSelect, 
  className = '' 
}) => (
  <div className={`toggle-button-group ${className}`}>
    {options.map(opt => (
      <button
        key={opt.value}
        className={`toggle-button ${selected === opt.value ? 'selected' : ''}`}
        onClick={() => onSelect(opt.value)}
        value={opt.value} // For SCSS targeting if needed
      >
        {opt.label}
      </button>
    ))}
  </div>
);

export default ToggleButtonGroup;
