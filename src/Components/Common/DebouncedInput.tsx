import React, { useState, useEffect, useCallback } from "react";
import { Input } from "reactstrap";
import { InputType } from "reactstrap/types/lib/Input";

// Debounce utility function
function debounce(func: Function, wait: number) {
  let timeout: number | undefined;
  return function executedFunction(...args: any[]) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = window.setTimeout(later, wait);
  };
}

interface DebouncedInputProps {
  name: string;
  id: string;
  type?: InputType;
  value: string | number;
  onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
  onBlur?: (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
  placeholder?: string;
  rows?: number;
  className?: string;
  disabled?: boolean;
  invalid?: boolean;
  autoComplete?: "off" | "on" | "new-password" | "new-username";
}

export const DebouncedInput: React.FC<DebouncedInputProps> = ({
  name,
  id,
  type = "text",
  value,
  onChange,
  onBlur,
  placeholder,
  rows,
  className,
  disabled,
  invalid,
  autoComplete,
}) => {
  const [localValue, setLocalValue] = useState<string | number>(value);

  // Update local value when prop value changes
  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  // Create a debounced version of the onChange handler
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const debouncedChange = useCallback(
    debounce((e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      onChange(e);
    }, 500),
    [onChange]
  );

  // Handle input changes
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const newValue = e.target.value;
    setLocalValue(newValue);
    debouncedChange(e);
  };

  return (
    <Input
      name={name}
      id={id}
      type={type}
      value={localValue}
      onChange={handleChange}
      onBlur={onBlur}
      placeholder={placeholder}
      rows={type === "textarea" ? rows : undefined}
      className={className}
      disabled={disabled}
      invalid={invalid}
      autoComplete={autoComplete}
    />
  );
}; 