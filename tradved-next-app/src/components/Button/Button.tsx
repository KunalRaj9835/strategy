// src/components/ui/Button/Button.tsx

'use client'; // This is an interactive component and must be a Client Component.

import React, { ReactNode, MouseEventHandler } from 'react';

// Import the new SCSS module for locally-scoped styling.
import styles from './Button.module.scss';

// --- Type Definitions (Fully Typed and Expanded for Versatility) ---

// BEST PRACTICE: Expanding variants to include common use cases like 'icon-only' and 'unstyled'
// makes the component much more reusable throughout the application.
type ButtonVariant =
  | 'primary'
  | 'secondary'
  | 'tertiary'
  | 'success'
  | 'danger'
  | 'sell' // Alias for danger, common in trading apps
  | 'icon-only'
  | 'unstyled';

type ButtonSize = 'small' | 'normal' | 'large';

interface ButtonProps {
  children?: ReactNode; // Children are optional, especially for icon-only buttons.
  variant?: ButtonVariant;
  onClick?: MouseEventHandler<HTMLButtonElement>;
  icon?: ReactNode;
  className?: string; // Allows passing custom classes from parent components.
  size?: ButtonSize;
  disabled?: boolean;
  title?: string; // Added for better accessibility, especially for icon buttons.
  type?: 'button' | 'submit' | 'reset'; // Standard button type attribute.
}

// --- Main Component (Fully Corrected with Best Practices) ---
const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  onClick,
  icon,
  className = '',
  size = 'normal',
  disabled = false,
  title,
  type = 'button',
}) => {
  // BEST PRACTICE: Use an array and `filter(Boolean).join(' ')` to cleanly handle
  // conditional classes. This avoids extra spaces and is highly readable.
  const buttonClasses = [
    styles.btn,
    styles[variant], // e.g., styles['primary']
    styles[size], // e.g., styles['normal']
    !children ? styles.iconOnly : '', // Apply icon-only style if no children are present
    className, // Pass through any custom classes from the parent
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <button
      className={buttonClasses}
      onClick={onClick}
      disabled={disabled}
      title={title}
      type={type}
    >
      {icon && <span className={styles.btnIcon}>{icon}</span>}
      {children}
    </button>
  );
};

export default Button;
