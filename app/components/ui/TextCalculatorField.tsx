"use client";

import {
  type FocusEvent,
  type KeyboardEvent,
  type MouseEvent,
  type ReactNode,
  useEffect,
  useState,
} from "react";
import { calculate as evaluateExpression } from "@/app/lib/expression";
import TextField from "./TextField";

export interface TextCalculatorFieldProps {
  value: number | string;
  label?: string;
  placeholder?: string;
  className?: string;
  inputClassName?: string;
  disabled?: boolean;
  autoFocus?: boolean;
  size?: "small" | "medium";
  endAdornment?: ReactNode;
  onCalculate?: (newValue: number) => void;
  onClear?: () => void;
  allowClear?: boolean;
  onClick?: (e: MouseEvent<HTMLInputElement>) => void;
}

// The onCalculate/onClear/allowClear callback contract is preserved verbatim
// across the MUI TextField -> ui/TextField swap — callers wire onCalculate
// to a Factory mutator, so the reads-from-snapshot/writes-to-proxy boundary
// is unaffected by this refactor.
export default function TextCalculatorField({
  value,
  label,
  placeholder,
  className,
  inputClassName,
  disabled,
  autoFocus,
  size,
  endAdornment,
  onCalculate,
  onClear,
  allowClear,
  onClick,
}: TextCalculatorFieldProps) {
  const [text, setText] = useState<string>(`${value}`);
  const [error, setError] = useState<boolean>(false);
  const [focused, setFocused] = useState(false);

  // Sync internal display value when the external prop changes (e.g. after LP solver runs)
  // but only while the field is not being actively edited.
  useEffect(() => {
    if (!focused) {
      setText(`${value}`);
      setError(false);
    }
  }, [value, focused]);

  function parseValue(v: string): number {
    const result = evaluateExpression(v);
    if (!Number.isNaN(result)) return result;
    return parseFloat(v);
  }

  function calculate(newValue: string) {
    if (allowClear && newValue.trim() === "") {
      setText("");
      setError(false);
      onClear?.();
      return;
    }

    let result: number;
    try {
      result = parseValue(newValue);
    } catch {
      setError(true);
      return;
    }

    if (Number.isNaN(result)) {
      setError(true);
      return;
    }

    setText(result.toString());
    setError(false);

    if (onCalculate) onCalculate(result);
  }

  function finalize() {
    calculate(text);
  }

  function reset() {
    calculate(`${value}`);
  }

  function onKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter") finalize();
    if (event.key === "Escape") {
      reset();
    }
  }

  function handleFocus(event: FocusEvent<HTMLInputElement>) {
    setFocused(true);
    event.target.select();
  }

  function handleBlur() {
    setFocused(false);
    finalize();
  }

  return (
    <TextField
      value={text}
      label={label}
      placeholder={placeholder}
      className={className}
      inputClassName={inputClassName}
      disabled={disabled}
      autoFocus={autoFocus}
      size={size}
      endAdornment={endAdornment}
      error={error}
      onFocus={handleFocus}
      onKeyDown={onKeyDown}
      onChange={(e) => setText(e.target.value)}
      onBlur={handleBlur}
      onClick={onClick}
    />
    // TODO: add calculate/reset buttons
  );
}
