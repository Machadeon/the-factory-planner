"use client";

import TextField, {
  type OutlinedTextFieldProps,
} from "@mui/material/TextField";
import { type FocusEvent, type KeyboardEvent, useRef, useState } from "react";
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

  function calculate(newValue: string) {
    var result = evaluateExpression(`${other.value}`);
    try {
      result = evaluateExpression(newValue);
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
