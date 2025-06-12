import React, { ReactNode, MouseEventHandler } from 'react';
import './Button.scss';

interface ButtonProps {
  children: ReactNode;
  variant?: 'primary' | 'secondary' | 'tertiary' | 'danger' | 'success';
  onClick?: MouseEventHandler<HTMLButtonElement>;
  icon?: ReactNode;
  className?: string;
  size?: 'small' | 'normal' | 'large';
  disabled?: boolean;
}

const Button: React.FC<ButtonProps> = ({ 
  children, 
  variant = 'primary', 
  onClick, 
  icon, 
  className = '', 
  size = 'normal', 
  disabled = false 
}) => (
  <button
    className={`btn btn-${variant} btn-size-${size} ${className}`}
    onClick={onClick}
    disabled={disabled}
  >
    {icon && <span className="btn-icon">{icon}</span>}
    {children}
  </button>
);

export default Button;
