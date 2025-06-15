// src/components/ui/ToggleButtonGroup/ToggleButtonGroup.tsx

'use client'; // This is an interactive component with onClick handlers and must be a Client Component.

import React from 'react';

// Import the new SCSS module for locally-scoped styling.
import styles from './ToggleButtonGroup.module.scss';

// --- Type Definitions (Fully Typed and Following Best Practices) ---
export interface ToggleOption {
  value: string;
  label: string;
}

export interface ToggleButtonGroupProps {
  options: ToggleOption[];
  selected: string;
  onSelect: (value: string) => void;
  className?: string; // Allows passing custom classes from the parent for layout.
  disabled?: boolean; // Added disabled prop as a common best practice.
}

// --- Main Component (Fully Corrected with Best Practices) ---
const ToggleButtonGroup: React.FC<ToggleButtonGroupProps> = ({
  options,
  selected,
  onSelect,
  className = '',
  disabled = false,
}) => {
  // Cleanly build the class string for the root container element.
  const containerClasses = [
    styles.toggleButtonGroup,
    disabled ? styles.disabled : '',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={containerClasses}>
      {options.map((opt) => {
        // BEST PRACTICE: Use an array and `join(' ')` to cleanly handle
        // conditional classes for each button. This is highly readable.
        const buttonClasses = [
          styles.toggleButton,
          selected === opt.value ? styles.selected : '',
        ]
          .filter(Boolean)
          .join(' ');

        return (
          <button
            key={opt.value}
            className={buttonClasses}
            onClick={() => onSelect(opt.value)}
            disabled={disabled}
            type="button" // Explicitly set type to prevent form submission in some cases.
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
};

// Using React.memo for performance optimization, preventing re-renders if props haven't changed.
export default React.memo(ToggleButtonGroup);
