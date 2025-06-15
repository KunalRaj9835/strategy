// src/components/ui/Checkbox/Checkbox.tsx

'use client'; // This is an interactive form element and must be a Client Component.

import React, { useId } from 'react';

// Import the new SCSS module for locally-scoped styling.
import styles from './Checkbox.module.scss';

// --- Type Definitions (Fully Typed and Following Best Practices) ---
interface CheckboxProps {
  checked: boolean;
  // BEST PRACTICE: The original `onChange` was good. We will keep its signature as it provides
  // a clean abstraction, sending only the boolean state back to the parent.
  onChange: (checked: boolean) => void;
  label?: string;
  className?: string; // Allows passing custom classes from parent components for layout.
  disabled?: boolean;
  id?: string; // Optional custom ID.
  name?: string; // Standard name attribute for forms.
}

// --- Main Component (Fully Corrected with Best Practices) ---
const Checkbox: React.FC<CheckboxProps> = ({
  checked,
  onChange,
  label,
  className = '',
  disabled = false,
  id: customId,
  name,
}) => {
  // BEST PRACTICE: useId() generates a unique ID for the component instance, ensuring the
  // <label> is correctly associated with its <input> for accessibility, even with multiple
  // instances on the page. We use the customId if provided, otherwise fallback to the generated one.
  const generatedId = useId();
  const id = customId || generatedId;

  // Cleanly build the class string for the root label element.
  const labelClasses = [
    styles.checkboxLabel,
    disabled ? styles.disabled : '',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <label htmlFor={id} className={labelClasses}>
      <input
        id={id}
        name={name}
        type="checkbox"
        className={styles.nativeCheckbox}
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        disabled={disabled}
      />
      {/* This span is our visually styled checkbox. Its appearance is controlled
          by the state of the hidden native checkbox above via CSS selectors. */}
      <span className={styles.customCheckbox}></span>
      {label && <span className={styles.checkboxText}>{label}</span>}
    </label>
  );
};

// Using React.memo for performance optimization, preventing re-renders if props haven't changed.
export default React.memo(Checkbox);
