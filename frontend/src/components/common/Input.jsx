import React from 'react';
import './Input.css';

const Input = ({ 
  type = 'text', 
  value, 
  onChange, 
  placeholder = '',
  className = '',
  disabled = false,
  ...props 
}) => {
  return (
    <input
      type={type}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      className={`input ${className}`}
      disabled={disabled}
      {...props}
    />
  );
};

export const Textarea = ({ 
  value, 
  onChange, 
  placeholder = '',
  className = '',
  rows = 4,
  disabled = false,
  ...props 
}) => {
  return (
    <textarea
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      className={`input ${className}`}
      rows={rows}
      disabled={disabled}
      {...props}
    />
  );
};

export default Input;

