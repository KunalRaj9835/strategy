// src/components/ui/Input/Input.tsx

'use client'; // This is an interactive form element and must be a Client Component.

import React, { ReactNode } from 'react';

// Import the new SCSS module for locally-scoped styling.
import styles from './Input.module.scss';

// --- Type Definitions (Fully Typed and Following Best Practices) ---
interface InputProps {
  type?: 'text' | 'password' | 'email' | 'number' | 'tel' | 'url' | 'search';
  value: string | number; // Value can be a number type as well
  // The provided `onChange` signature is a clean abstraction. We will implement it as requested.
  onChange: (value: string) => void;
  placeholder?: string;
  icon?: ReactNode;
  className?: string; // Allows passing custom classes from the parent for layout.
  readOnly?: boolean;
  disabled?: boolean;
  name?: string; // Standard name attribute for forms.
  autoComplete?: string;
  step?: string | number; // For number inputs
  title?: string; // For accessibility
}

// --- Main Component (Fully Corrected with Best Practices) ---
const Input: React.FC<InputProps> = ({
  type = 'text',
  value,
  onChange,
  placeholder,
  icon,
  className = '',
  readOnly = false,
  disabled = false,
  name,
  autoComplete = 'off',
  step,
  title,
}) => {
  // Cleanly build the class string for the root wrapper element.
  const groupClasses = [
    styles.inputGroup,
    disabled ? styles.disabled : '',
    readOnly ? styles.readonly : '',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  // Cleanly build the class string for the input element itself.
  const inputClasses = [
    styles.inputElement,
    icon ? styles.withIcon : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={groupClasses}>
      {icon && <span className={styles.inputIcon}>{icon}</span>}
      <input
        type={type}
        name={name}
        value={value}
        // The onChange handler correctly implements the prop's signature.
        onChange={(e: React.ChangeEvent<HTMLInputElement>) => onChange(e.target.value)}
        placeholder={placeholder}
        readOnly={readOnly}
        disabled={disabled}
        autoComplete={autoComplete}
        step={step}
        title={title}
        className={inputClasses}
      />
    </div>
  );
};

export default React.memo(Input);
