// biome-ignore-start lint/style/noNonNullAssertion: external code

import { functions, operators } from "./operators";

/**
 * Evaluates reverse Polish notation (RPN) (postfix expression).
 *
 * Example: ['1', '2', '+'] => 3
 *
 * https://en.wikipedia.org/wiki/Reverse_Polish_notation
 * https://github.com/poteat/shunting-yard-typescript
 */
export function evalReversePolishNotation(tokens: string[]) {
  const stack: string[] = [];

  const ops = { ...operators, ...functions };

  for (const token of tokens) {
    const op = ops[token];

    // eslint-disable-next-line unicorn/no-negated-condition
    if (op !== undefined) {
      const parameters = [];
      for (let i = 0; i < op.arity; i++) {
        parameters.push(stack.pop()!);
      }
      stack.push(op.func(...parameters.reverse()));
    } else {
      stack.push(token);
    }
  }

  if (stack.length > 1) {
    throw new Error("Insufficient operators");
  }

  return Number(stack[0]);
}

// biome-ignore-end lint/style/noNonNullAssertion: external code
