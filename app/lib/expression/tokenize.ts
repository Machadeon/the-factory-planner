// biome-ignore-start lint/style/noNonNullAssertion: external code

import { functionsKeys, operatorsKeys, top } from "./operators";

/**
 * Breaks a mathematical expression into tokens.
 *
 * Example: "1 + 2" => [1, '+', 2]
 *
 * https://gist.github.com/tchayen/44c28e8d4230b3b05e9f
 */
export function tokenize(expression: string) {
  // "1  +" => "1 +"
  const expr = expression.replace(/\s+/g, " ");

  const tokens = [];

  let acc = "";
  let currentNumber = "";

  for (let i = 0; i < expr.length; i++) {
    const c = expr.charAt(i);
    const prev_c = expr.charAt(i - 1); // '' if index out of range
    const next_c = expr.charAt(i + 1); // '' if index out of range

    const lastToken = top(tokens);

    const numberParsingStarted = currentNumber !== "";

    if (
      // 1
      /\d/.test(c) ||
      // Unary operator: +1 or -1
      ((c === "+" || c === "-") &&
        !numberParsingStarted &&
        (lastToken === undefined ||
          lastToken === "," ||
          lastToken === "(" ||
          operatorsKeys.includes(lastToken)) &&
        /\d/.test(next_c))
    ) {
      currentNumber += c;
    } else if (c === ".") {
      if (numberParsingStarted && currentNumber.includes(".")) {
        throw new Error(`Double '.' in number: '${currentNumber}${c}'`);
      } else {
        currentNumber += c;
      }
    } else if (c === " ") {
      if (/\d/.test(prev_c) && /\d/.test(next_c)) {
        throw new Error(`Space in number: '${currentNumber}${c}${next_c}'`);
      }
    } else if (functionsKeys.includes(acc + c)) {
      acc += c;
      if (!functionsKeys.includes(acc + next_c)) {
        tokens.push(acc);
        acc = "";
      }
    } else if (
      operatorsKeys.includes(c) ||
      c === "(" ||
      c === ")" ||
      c === ","
    ) {
      if (
        operatorsKeys.includes(c) &&
        !numberParsingStarted &&
        operatorsKeys.includes(lastToken!)
      ) {
        throw new Error(`Consecutive operators: '${lastToken!}${c}'`);
      }
      if (numberParsingStarted) {
        tokens.push(currentNumber);
      }
      tokens.push(c);
      currentNumber = "";
    } else {
      acc += c;
    }
  }

  if (acc !== "") {
    throw new Error(`Invalid characters: '${acc}'`);
  }

  // Add last number to the tokens
  if (currentNumber !== "") {
    tokens.push(currentNumber);
  }

  // ['+', '1'] => ['0', '+', '1']
  // ['-', '1'] => ['0', '-', '1']
  if (tokens[0] === "+" || tokens[0] === "-") {
    tokens.unshift("0");
  }

  return tokens;
}

// biome-ignore-end lint/style/noNonNullAssertion: external code
