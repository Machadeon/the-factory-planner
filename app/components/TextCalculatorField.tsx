"use client";

import TextField, {
  type OutlinedTextFieldProps,
} from "@mui/material/TextField";
import {
  type FocusEvent,
  type KeyboardEvent,
  useEffect,
  useState,
} from "react";
import { calculate as evaluateExpression } from "../utils";

export interface TextCalculatorFieldProps extends OutlinedTextFieldProps {
  onCalculate?: (newValue: number) => void;
}

export default function TextCalculatorField({
  onCalculate,
  ...other
}: TextCalculatorFieldProps) {
  const [value, setValue] = useState<string>(`${other.value}`);
  const [error, setError] = useState<boolean>(false);
  const [focused, setFocused] = useState(false);

  // Sync internal display value when the external prop changes (e.g. after LP solver runs)
  // but only while the field is not being actively edited.
  useEffect(() => {
    if (!focused) {
      setValue(`${other.value}`);
      setError(false);
    }
  }, [other.value, focused]);

  function parseValue(value: string): number {
    const result = evaluateExpression(value);
    if (!Number.isNaN(result)) return result;
    return parseFloat(value);
  }

  function calculate(newValue: string) {
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

    setValue(result.toString());
    setError(false);

    if (onCalculate) onCalculate(result);
  }

  function finalize() {
    calculate(value);
  }

  function reset() {
    const originalValue = `${other.value}`;
    calculate(originalValue);
  }

  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
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
      {...other}
      value={value}
      error={error}
      onFocus={handleFocus}
      onKeyDown={onKeyDown}
      onChange={(e) => setValue(e.target.value)}
      onBlur={handleBlur}
    />
    // TODO: add calculate/reset buttons
  );
}
