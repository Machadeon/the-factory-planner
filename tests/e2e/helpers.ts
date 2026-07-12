import { expect, type Page } from "@playwright/test";

// Fill the factory-name field, gated on hydration. A fresh session renders
// the field empty (deterministic SSR) and seeds the random name in a mount
// effect; a non-empty value therefore proves hydration and effects finished.
// Typing before that point is lossy — the pre-hydration input event never
// reaches React, and reconciliation merges the typed text with the seeded
// name (the CI-only name-concatenation flake).
export async function fillFactoryName(page: Page, name: string) {
  const input = page.getByRole("textbox", { name: "Factory name" });
  await expect(input).not.toHaveValue("");
  await input.fill(name);
}
