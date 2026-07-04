// biome-ignore-start lint/style/noNonNullAssertion: external code

import { functions, operators, top } from "./operators";

/**
 * Shunting yard algorithm: converts infix expression to postfix expression (reverse Polish notation)
 *
 * Example: ['1', '+', '2'] => ['1', '2', '+']
 *
 * https://en.wikipedia.org/wiki/Shunting_yard_algorithm
 * https://github.com/poteat/shunting-yard-typescript
 * https://blog.kallisti.net.nz/2008/02/extension-to-the-shunting-yard-algorithm-to-allow-variable-numbers-of-arguments-to-functions/
 */
export function shuntingYard(tokens: string[]) {
  const output: string[] = [];
  const operatorStack: string[] = [];

  for (const token of tokens) {
    if (functions[token] !== undefined) {
      operatorStack.push(token);
    } else if (token === ",") {
      while (operatorStack.length > 0 && top(operatorStack) !== "(") {
        output.push(operatorStack.pop()!);
      }
      if (operatorStack.length === 0) {
        throw new Error("Misplaced ','");
      }
    } else if (operators[token] !== undefined) {
      const o1 = token;
      while (
        operatorStack.length > 0 &&
        top(operatorStack) !== undefined &&
        top(operatorStack) !== "(" &&
        (operators[top(operatorStack)!]!.precedence >
          operators[o1]!.precedence ||
          (operators[o1]!.precedence ===
            operators[top(operatorStack)!]!.precedence &&
            operators[o1]!.associativity === "left"))
      ) {
        output.push(operatorStack.pop()!); // o2
      }
      operatorStack.push(o1);
    } else if (token === "(") {
      operatorStack.push(token);
    } else if (token === ")") {
      while (operatorStack.length > 0 && top(operatorStack) !== "(") {
        output.push(operatorStack.pop()!);
      }
      if (operatorStack.length > 0 && top(operatorStack) === "(") {
        operatorStack.pop();
      } else {
        throw new Error("Parentheses mismatch");
      }
      if (functions[top(operatorStack)!] !== undefined) {
        output.push(operatorStack.pop()!);
      }
    } else {
      output.push(token);
    }
  }

  // Remaining items
  while (operatorStack.length > 0) {
    const operator = top(operatorStack);
    if (operator === "(") {
      throw new Error("Parentheses mismatch");
    } else {
      output.push(operatorStack.pop()!);
    }
  }

  return output;
}

// biome-ignore-end lint/style/noNonNullAssertion: external code
