import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

// Structural contract checks for the context migration.
// R4.S1 — drilled props removed; R6.S2 (neg) — no root rateLookup trigger;
// R7.S1/R7.S2 — foreign factories stay data-only; R8.S2 — dead props gone;
// factory-page R7.S3 — only the four drilled props were removed.
const ROOT = join(__dirname, "..", "..", "..");
const read = (rel: string) => readFileSync(join(ROOT, rel), "utf8");

// Extract the body of the component's own `interface <ComponentName>Props { ... }`
// block (named after the file), ignoring unrelated internal Props interfaces
// (e.g. LogisticsSection's internal GraphProps). Returns "" when the component
// declares no props interface of its own.
function propsInterface(src: string, componentName: string): string {
  const re = new RegExp(
    `interface ${componentName}Props\\s*(?:<[^>]*>)?\\s*\\{`,
  );
  const start = src.search(re);
  if (start === -1) return "";
  let depth = 0;
  let i = src.indexOf("{", start);
  const begin = i;
  for (; i < src.length; i++) {
    if (src[i] === "{") depth++;
    else if (src[i] === "}") {
      depth--;
      if (depth === 0) return src.slice(begin + 1, i);
    }
  }
  return "";
}

const baseName = (rel: string): string =>
  rel
    .split("/")
    .pop()
    ?.replace(/\.tsx$/, "") ?? "";

const DRILLED = ["library", "currentFactoryId", "onNavigateToFactory"] as const;

const COMPONENTS = [
  "app/components/factory/FactorySections.tsx",
  "app/components/factory/FactorySidebar.tsx",
  "app/components/PlanningSection.tsx",
  "app/components/ProductionLineComponent.tsx",
  "app/components/AssemblyLineComponent.tsx",
  "app/components/NestedFactoryRow.tsx",
  "app/components/overview/PartRateSummary.tsx",
  "app/components/FactoryPickerDialog.tsx",
  "app/components/overview/OverviewSidebar.tsx",
  "app/components/OptimizationSection.tsx",
  "app/components/LogisticsSection.tsx",
  "app/components/ProductionTargetsBar.tsx",
  "app/components/RecipeOptimizerPanel.tsx",
];

describe("prop-contract: drilled props removed (R4.S1)", () => {
  for (const rel of COMPONENTS) {
    it(`${rel} props declares none of the drilled non-factory props`, () => {
      const body = propsInterface(read(rel), baseName(rel));
      for (const prop of DRILLED) {
        expect(body).not.toMatch(new RegExp(`(^|\\W)${prop}\\s*[?:]`, "m"));
      }
    });
  }
});

describe("ProductionTargetsBar dead props gone (R8.S2)", () => {
  it("declares no library or currentFactoryId prop", () => {
    const body = propsInterface(
      read("app/components/ProductionTargetsBar.tsx"),
      "ProductionTargetsBar",
    );
    expect(body).not.toMatch(/library\s*[?:]/);
    expect(body).not.toMatch(/currentFactoryId\s*[?:]/);
  });
});

describe("FactorySidebar has no dangling onRebuild prop (overview-sidebar-structure R1.S3, R4)", () => {
  it("declares no onRebuild prop", () => {
    const body = propsInterface(
      read("app/components/factory/FactorySidebar.tsx"),
      "FactorySidebar",
    );
    expect(body).not.toMatch(/onRebuild\s*[?:]/);
  });

  it("FactoryPage does not pass onRebuild to FactorySidebar", () => {
    expect(read("app/components/factory/FactoryPage.tsx")).not.toMatch(
      /onRebuild/,
    );
  });
});

describe("single deriveConsumers implementation (consumer-links R1.S1, R1.S2)", () => {
  it("graph-model.ts does not define deriveConsumers locally", () => {
    const src = read("app/components/logistics/graph-model.ts");
    expect(src).not.toMatch(/export function deriveConsumers/);
    expect(src).toMatch(
      /import \{ deriveConsumers \} from "..\/..\/models\/consumer-links"/,
    );
  });

  it("ConsumersSection.tsx contains no inline consumer-derivation loop", () => {
    const src = read("app/components/overview/ConsumersSection.tsx");
    expect(src).not.toMatch(/for \(const sf of library\.factories\)/);
    expect(src).toMatch(
      /deriveConsumers\(factory, \{ library, currentFactoryId \}\)/,
    );
  });
});

describe("no root rateLookup whole-tree trigger (R6.S2 neg)", () => {
  it("FactoryPage does not subscribe to rateLookup as a trigger", () => {
    expect(read("app/components/factory/FactoryPage.tsx")).not.toMatch(
      /rateLookup/,
    );
  });
});

describe("foreign factories stay data-only (R7.S1, R7.S2)", () => {
  it("FactoryPickerDialog does not render candidates through useFactory leaves", () => {
    const src = read("app/components/FactoryPickerDialog.tsx");
    // It deserializes candidate factories as local data; it must not re-provide
    // a foreign factory via FactoryProvider nor read the ambient factory as if
    // it were the candidate.
    expect(src).not.toMatch(/FactoryProvider/);
  });

  it("only FactoryPage provides FactoryContext (no nested provider today)", () => {
    // A nested FactoryProvider would be the mechanism for a foreign subtree;
    // none is needed now, so none should exist outside the composition root.
    const src = read("app/contexts/FactoryContext.tsx");
    expect(src).toMatch(/FactoryProvider/);
  });
});
