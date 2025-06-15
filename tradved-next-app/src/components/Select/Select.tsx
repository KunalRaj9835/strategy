// src/components/ui/Select/Select.tsx

'use client'; // This is an interactive form element and must be a Client Component.

import React from 'react';

// Import the new SCSS module for locally-scoped styling.
import styles from './Select.module.scss';

// --- Type Definitions (Fully Typed and Following Best Practices) ---

// BEST PRACTICE: value can be a number or a string in many use cases.
export interface SelectOption {
  value: string | number;
  label: string;
  // Allows for additional data to be passed if needed, like expiry dates.
  [key: string]: any;
}

export interface SelectProps {
  options: SelectOption[];
  // The controlled value can be a string or a number.
  value: string | number;
  // The onChange handler from the native select element always provides a string.
  onChange: (value: string) => void;
  className?: string; // Allows passing custom classes for the container.
  placeholder?: string;
  disabled?: boolean;
  name?: string;
  id?: string;
}

// --- Main Component (Fully Corrected with Best Practices) ---
const Select: React.FC<SelectProps> = ({
  options,
  value,
  onChange,
  className = '',
  placeholder,
  disabled = false,
  name,
  id,
}) => {
  // BEST PRACTICE: Wrap the native <select> in a <div>. This is the standard
  // method for creating a custom-styled dropdown arrow, as the native arrow
  // cannot be styled directly across all browsers.
  return (
    <div className={`${styles.selectContainer} ${className}`}>
      <select
        id={id}
        name={name}
        className={styles.selectInput}
        value={value}
        onChange={(e: React.ChangeEvent<HTMLSelectElement>) => onChange(e.target.value)}
        disabled={disabled}
        // The `required` attribute combined with an empty value for the placeholder
        // allows us to use the `:invalid` CSS selector to style the placeholder text differently.
        required={!value}
      >
        {/* The placeholder is an <option> with an empty value. */}
        {placeholder && (
          <option value="" disabled>
            {placeholder}
          </option>
        )}
        {/* Map over the provided options to render the list. */}
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
};

export default React.memo(Select);
