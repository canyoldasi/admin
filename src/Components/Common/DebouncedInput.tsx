import React, { useState, useEffect, useCallback } from "react";
import { Input } from "reactstrap";

// Debounce utility function
function debounce(func: Function, wait: number) {
  let timeout: ReturnType<typeof setTimeout> | null = null;
  
  return function executedFunction(...args: any[]) {
    const later = () => {
      timeout = null;
      func(...args);
    };
    
    if (timeout) {
      clearTimeout(timeout);
    }
    timeout = setTimeout(later, wait);
  };
}

interface DebouncedInputProps {
  name: string;
  id: string;
  type?: string;
  value: string | number;
  onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
  onBlur?: (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
  placeholder?: string;
  rows?: number;
  className?: string;
  disabled?: boolean;
  invalid?: boolean;
}

const DebouncedInput: React.FC<DebouncedInputProps> = ({ 
  name, 
  id, 
  type = "text", 
  value, 
  onChange, 
  onBlur, 
  placeholder = "", 
  rows = 1,
  className = "form-control",
  disabled = false,
  invalid = false
}) => {
  // Use state to track the input value locally
  const [localValue, setLocalValue] = useState(value);
  
  // Update local value when prop value changes
  useEffect(() => {
    setLocalValue(value);
  }, [value]);
  
  // Create a debounced version of the onChange handler
  const debouncedOnChange = useCallback(
    debounce((e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      onChange(e);
    }, 500),
    [onChange]
  );
  
  // Handle local changes immediately but debounce the parent notification
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setLocalValue(e.target.value);
    debouncedOnChange(e);
  };
  
  return (
    <Input
      name={name}
      id={id}
      className={className}
      type={type}
      value={localValue}
      onChange={handleChange}
      onBlur={onBlur}
      placeholder={placeholder}
      disabled={disabled}
      invalid={invalid}
      rows={type === "textarea" ? rows : undefined}
    />
  );
};

export default DebouncedInput; 