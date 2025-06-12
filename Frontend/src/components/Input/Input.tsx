// src/components/Input/Input.tsx
import React, { ReactNode } from 'react';
import './Input.scss'; // Assuming you have styles for it

interface InputProps {
  type?: 'text' | 'password' | 'email' | 'number' | 'tel' | 'url' | 'search';
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  icon?: ReactNode;
  className?: string;
  readOnly?: boolean;
  disabled?: boolean;
  name?: string; // Added 'name' as a good practice, but optional for this specific fix
  autoComplete?: string; // New prop with a default to "off"
}

const Input: React.FC<InputProps> = ({
  type = 'text',
  value,
  onChange, // This prop receives the direct string value from the input's native onChange
  placeholder,
  icon,
  className = '',
  readOnly = false,
  disabled = false,
  name, // Added 'name' as a good practice, but optional for this specific fix
  autoComplete = "off" // <<<< ADDED: New prop with a default to "off"
}) => (
  <div className={`input-group ${className} ${disabled ? 'disabled' : ''} ${readOnly ? 'readonly' : ''}`}>
    {icon && <span className="input-icon">{icon}</span>}
    <input
      type={type}
      // Providing a name can sometimes help browsers differentiate fields for autofill,
      // though autoComplete="off" is the primary mechanism.
      name={name || placeholder || `input-${type}-${Math.random().toString(36).substring(7)}`}
      value={value}
      onChange={e => onChange(e.target.value)} // This existing logic is correct
      placeholder={placeholder}
      readOnly={readOnly}
      disabled={disabled}
      autoComplete={autoComplete} // <<<< APPLIED: Apply the autoComplete prop here
    />
  </div>
);

export default Input;
