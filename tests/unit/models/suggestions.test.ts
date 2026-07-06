import { describe, expect, it } from "vitest";
import {
  defaultRecipeOptimizerConfig,
  type RecipeOptimizerConfig,
} from "@/app/models/optimizer-config";
import {
  applyRejectChoice,
  applyRejectSilent,
  shouldPromptReject,
} from "@/app/models/suggestions";

const SLUG_A = "recipe-ironplate-c";
const SLUG_B = "recipe-ironrod-c";

function makeConfig(): RecipeOptimizerConfig {
  const config = defaultRecipeOptimizerConfig();
  expect(config.enabledRecipes).toContain(SLUG_A);
  expect(config.enabledRecipes).toContain(SLUG_B);
  return config;
}

describe("suggestions module (R1.S1, R2)", () => {
  it("R1.S1 functions operate on a bare config, no Factory", () => {
    const config = makeConfig();
    expect(shouldPromptReject(config)).toBe(true); // default rejectPrompt: "ask"
    config.rejectPrompt = "always";
    expect(shouldPromptReject(config)).toBe(false);
    config.rejectPrompt = "never";
    expect(shouldPromptReject(config)).toBe(false);
  });

  it('R2.S1 choice "never" sets rejectPrompt without denying', () => {
    const config = makeConfig();
    applyRejectChoice(config, [SLUG_A], "never");
    expect(config.rejectPrompt).toBe("never");
    expect(config.enabledRecipes).toContain(SLUG_A);
  });

  it('R2.S1 choice "always" sets rejectPrompt and denies', () => {
    const config = makeConfig();
    applyRejectChoice(config, [SLUG_A], "always");
    expect(config.rejectPrompt).toBe("always");
    expect(config.enabledRecipes).not.toContain(SLUG_A);
  });

  it('R2.S1 choice "yes" denies without changing rejectPrompt', () => {
    const config = makeConfig();
    applyRejectChoice(config, [SLUG_A], "yes");
    expect(config.rejectPrompt).toBe("ask");
    expect(config.enabledRecipes).not.toContain(SLUG_A);
  });

  it('R2.S1 choice "no" changes nothing', () => {
    const config = makeConfig();
    const before = [...config.enabledRecipes];
    applyRejectChoice(config, [SLUG_A], "no");
    expect(config.rejectPrompt).toBe("ask");
    expect(config.enabledRecipes).toEqual(before);
  });

  it('R2.S2 applyRejectSilent denies only under "always"', () => {
    for (const [prompt, denied] of [
      ["always", true],
      ["never", false],
      ["ask", false],
    ] as const) {
      const config = makeConfig();
      config.rejectPrompt = prompt;
      applyRejectSilent(config, [SLUG_A]);
      expect(config.enabledRecipes.includes(SLUG_A)).toBe(!denied);
    }
  });

  it("R2.S3 falsy slugs are ignored", () => {
    const config = makeConfig();
    applyRejectChoice(config, ["", SLUG_B], "yes");
    expect(config.enabledRecipes).not.toContain(SLUG_B);
    expect(config.enabledRecipes).toContain(SLUG_A);
  });
});
