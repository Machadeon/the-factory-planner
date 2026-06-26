"use client";

import TextField, {
  type OutlinedTextFieldProps,
} from "@mui/material/TextField";
import { type FocusEvent, type KeyboardEvent, useState } from "react";
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

  function parseValue(value: string): number {
    const result = evaluateExpression(value);
    if (!Number.isNaN(result)) return result;
    return parseFloat(value);
  }

  function calculate(newValue: string) {
    var result = parseValue(`${other.value}`);
    try {
      result = parseValue(newValue);
    } catch {
      console.warn("Invalid expression:", value);
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
    event.target.select();
  }

  return (
    <TextField
      {...other}
      value={value}
      error={error}
      onFocus={handleFocus}
      onKeyDown={onKeyDown}
      onChange={(e) => setValue(e.target.value)}
      onBlur={finalize}
    />
    // TODO: add calculate/reset buttons
  );
}
