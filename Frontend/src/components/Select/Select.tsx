import React from 'react';
import './Select.scss';

interface SelectOption {
  value: string;
  label: string;
}

interface SelectProps {
  options: SelectOption[];
  value: string;
  onChange: (value: string) => void;
  className?: string;
  placeholder?: string;
  disabled?: boolean;
}

const Select: React.FC<SelectProps> = ({ 
  options, 
  value, 
  onChange, 
  className = '', 
  placeholder, 
  disabled = false 
}) => (
  <select
    className={`select-input ${className}`}
    value={value}
    onChange={e => onChange(e.target.value)}
    disabled={disabled}
  >
    {placeholder && <option value="" disabled={value !== ""}>{placeholder}</option>}
    {options.map(opt => (
      <option key={opt.value} value={opt.value}>{opt.label}</option>
    ))}
  </select>
);

export default Select;
