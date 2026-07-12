import type { ConstraintBound } from "javascript-lp-solver";
import { ref } from "valtio";
import AssemblyLine, { shardsForClock } from "./assembly-line";
import type FactoryRecipe from "./factory-recipe";
import { factoryRecipeSlug } from "./factory-recipe";
import { partSlugLookup, parts, RATE_EPSILON, recipeLookup } from "./game-data";
import {
  defaultRecipeOptimizerConfig,
  type RecipeOptimizerConfig,
} from "./optimizer-config";
import type Part from "./part";
import ProductionLine from "./production-line";
import type Recipe from "./recipe";
import type { AnyRecipe } from "./recipe-like";
import type { SolverError } from "./solver/errors";
import { type RateSolveInput, solveRates } from "./solver/rate-solver";
import {
  materializeSelection,
  solveRecipeSelection,
} from "./solver/recipe-optimizer";
import { verifyConstraints } from "./solver/verify";
import {
  acceptAllSuggestions as acceptAllSuggestionsWalk,
  rejectAllSuggestions as rejectAllSuggestionsWalk,
} from "./suggestions";

export interface Rate {
  consumptionRate: number;
  productionRate: number;
}

export type PartConstraint = {
  partSlug: string;
  min?: number;
  max?: number;
  equal?: number;
};

export interface FactoryOutput {
  part: Part;
  rate: Rate;
  isPrimary: boolean;
}

export default class Factory {
  productionLines: ProductionLine[];
  icon?: string;
  autoAddProductLines: boolean;
  supplierFactories: FactoryRecipe[];
  solverError: SolverError | null;
  constraints: PartConstraint[];
  optimizer: RecipeOptimizerConfig;
  /** Persisted graph-view node positions, keyed by node id (assembly-line id,
   * or `_src_/_sink_/_supplier_/_consumer_` terminal keys). */
  graphLayout: { [nodeId: string]: { x: number; y: number } };
  partPointOverrides: Record<string, number>;
  rateLookup: { [partSlug: string]: Rate };

  _productionLineLookup: { [partSlug: string]: ProductionLine };
  _autoSetPartRateInProgress: Set<string>;
  _partsConsumed: Set<Part>;
  _partsProduced: Set<Part>;
  _mainOutputParts: Set<Part>;

  /**
   * An index of all assembly lines that consume or produce the given part
   */
  _assemblyLineLookup: { [partSlug: string]: AssemblyLine[] };

  constructor() {
    this.productionLines = [];
    this.autoAddProductLines = false;
    this.supplierFactories = [];
    this.solverError = null;
    this.constraints = [];
    this.optimizer = defaultRecipeOptimizerConfig();
    this.graphLayout = {};
    this.partPointOverrides = {};

    this.rateLookup = {};
    this._productionLineLookup = {};
    this._assemblyLineLookup = {};
    // Solver scratch: ref()-exempt from valtio tracking (mutated mid-recursion,
    // never rendered). ref() strips tracking only; add/has/delete still work.
    this._autoSetPartRateInProgress = ref(new Set());

    this._partsConsumed = new Set();
    this._partsProduced = new Set();
    this._mainOutputParts = new Set();

    this._updateRates();
  }

  _addAssemblyLineLookup(partSlug: string, assemblyLine: AssemblyLine) {
    if (!this._assemblyLineLookup[partSlug]) {
      this._assemblyLineLookup[partSlug] = [assemblyLine];
    } else {
      this._assemblyLineLookup[partSlug].push(assemblyLine);
    }
  }

  _updateRates() {
    this.rateLookup = {};
    this._productionLineLookup = {};
    this._assemblyLineLookup = {};
    this._partsConsumed = new Set();
    this._partsProduced = new Set();
    this._mainOutputParts = new Set();

    for (const productionLine of this.productionLines) {
      this._productionLineLookup[productionLine.part.slug] = productionLine;

      if (productionLine.outputRate > 0 || productionLine.maximizeOutput) {
        this._mainOutputParts.add(productionLine.part);
      }

      for (const assemblyLine of productionLine.assemblyLines) {
        for (const recipePart of assemblyLine.recipe.ingredients) {
          this._partsConsumed.add(recipePart.part);
          this._addAssemblyLineLookup(recipePart.part.slug, assemblyLine);

          const rate = this.rateLookup[recipePart.part.slug] || {
            consumptionRate: 0,
            productionRate: 0,
          };

          rate.consumptionRate += assemblyLine.getPartConsumptionRate(
            recipePart.part,
          );
          this.rateLookup[recipePart.part.slug] = rate;
        }

        for (const recipePart of assemblyLine.recipe.products) {
          this._partsProduced.add(recipePart.part);
          this._addAssemblyLineLookup(recipePart.part.slug, assemblyLine);

          const rate = this.rateLookup[recipePart.part.slug] || {
            consumptionRate: 0,
            productionRate: 0,
          };

          rate.productionRate += assemblyLine.getPartProductionRate(
            recipePart.part,
          );
          this.rateLookup[recipePart.part.slug] = rate;
        }
      }
    }
  }

  /**
   * Optimize production lines to satisfy requested outputs from available
   * inputs, choosing recipes per {@link optimizer}. Thin wrapper: the pure
   * pipeline lives in solver/recipe-optimizer.ts; this applies its result and
   * notifies exactly once.
   */
  optimizeRecipes(globalPointOverrides: Record<string, number> = {}) {
    this.solverError = null;

    const result = solveRecipeSelection({
      productionLines: this.productionLines,
      supplierFactories: this.supplierFactories,
      factoryConstraints: this.constraints,
      config: this.optimizer,
      partPointOverrides: this.partPointOverrides,
      globalPointOverrides,
    });

    if (!result.ok) {
      this.solverError = result.error;
      return;
    }

    materializeSelection(this, result.selection);

    const rates = new Map<AssemblyLine, number>();
    for (const pl of this.productionLines) {
      for (const al of pl.assemblyLines) {
        rates.set(al, result.selection.ratesBySlug.get(al.recipe.slug) ?? 0);
      }
    }
    this._applyRates(rates);
    this._updateRates();
  }

  autoCalculateRates() {
    this.solverError = null;

    const input: RateSolveInput = {
      recipes: [],
      rateTargets: new Map(),
      maxTargets: new Set(),
      factoryConstraints: this.constraints,
    };

    for (const pl of this.productionLines) {
      if (pl.maximizeOutput) {
        input.maxTargets.add(pl.part.slug);
      } else if (pl.outputRate > 0) {
        input.rateTargets.set(pl.part.slug, pl.outputRate);
      }
      for (const al of pl.assemblyLines) {
        input.recipes.push(al.recipe);
      }
    }

    const result = solveRates(input);

    if (!result.feasible) {
      this.solverError = { kind: "infeasible-rates" };
      return;
    }

    const rates = new Map<AssemblyLine, number>();
    for (const pl of this.productionLines) {
      for (const al of pl.assemblyLines) {
        rates.set(al, result.ratesBySlug.get(al.recipe.slug) ?? 0);
      }
    }
    this._applyRates(rates);

    // Recompute rateLookup before verifying — the old deferred check relied on
    // the injected update() having rebuilt it by the time the timer fired.
    this._updateRates();

    const violations = verifyConstraints(
      result.model.constraints as Record<string, ConstraintBound>,
      this.rateLookup,
    );
    if (violations.length > 0) {
      this.solverError = { kind: "constraint-violations", violations };
    }
  }

  _hasRecycledRubberPlasticLoop(): boolean {
    var hasRecycledPlasticRecipe = false;
    var hasRecycledRubberRecipe = false;

    for (const productionLine of this.productionLines) {
      for (const assemblyLine of productionLine.assemblyLines) {
        if (assemblyLine.recipe.slug === "recipe-alternate-plastic-1-c")
          hasRecycledPlasticRecipe = true;
        if (assemblyLine.recipe.slug === "recipe-alternate-recycledrubber-c")
          hasRecycledRubberRecipe = true;
      }
    }

    return hasRecycledPlasticRecipe && hasRecycledRubberRecipe;
  }

  allParts(): Part[] {
    return [...this._partsConsumed.union(this._partsProduced)];
  }

  allOutputs(): Part[] {
    return Object.entries(this.rateLookup)
      .filter(([_, rate]) => {
        return rate.productionRate - rate.consumptionRate >= RATE_EPSILON;
      })
      .map(([partSlug, _]) => partSlugLookup[partSlug]);
  }

  allInputs(): Part[] {
    return Object.entries(this.rateLookup)
      .filter(([partSlug, rate]) => {
        const ownDeficit = rate.consumptionRate - rate.productionRate;
        if (ownDeficit <= RATE_EPSILON) return false;
        const supplied = this.supplierFactories.reduce((sum, fr) => {
          const p = fr.getProduct(partSlug);
          return sum + (p?.quantity ?? 0);
        }, 0);
        return ownDeficit - supplied > RATE_EPSILON;
      })
      .map(([partSlug, _]) => partSlugLookup[partSlug]);
  }

  getOutputInfo(): FactoryOutput[] {
    return this.allOutputs().map((part) => {
      return {
        part: part,
        rate: this.rateLookup[part.slug],
        isPrimary: this._mainOutputParts.has(part),
      };
    });
  }

  addSupplier(fr: FactoryRecipe) {
    this.supplierFactories.push(fr);
    this._updateRates();
  }

  removeSupplier(factoryId: string) {
    this.supplierFactories = this.supplierFactories.filter(
      (fr) => fr.slug !== factoryRecipeSlug(factoryId),
    );
    this._updateRates();
  }

  recipeOutputs(): Part[] {
    // Iterate the assembly lines' products directly (O(assemblyLines)) rather
    // than filtering the full parts list (O(parts)) on every call. This runs
    // per AssemblyLineComponent render, so it must stay cheap.
    const seen = new Map<string, Part>();
    for (const productionLine of this.productionLines) {
      for (const assemblyLine of productionLine.assemblyLines) {
        for (const recipePart of assemblyLine.recipe.products) {
          if (!seen.has(recipePart.part.slug)) {
            seen.set(recipePart.part.slug, recipePart.part);
          }
        }
      }
    }
    return [...seen.values()];
  }

  allIntermediateParts(): Part[] {
    return parts.filter((part) => {
      const rate = this.rateLookup[part.slug];
      if (!rate) return false;
      return (
        Math.abs(rate.productionRate - rate.consumptionRate) < RATE_EPSILON
      );
    });
  }

  addProductionLine(
    part: Part,
    autoCreated: boolean = false,
    suppressAutoRecipe = false,
  ) {
    if (part.slug in this._productionLineLookup) {
      console.warn(
        "Cannot add a production line that already exists!",
        part.slug,
      );
      return;
    }
    const demand = this.getPartDemand(part);
    var productionRate: number, outputRate: number;
    if (demand === 0) {
      productionRate = outputRate = 10;
    } else {
      productionRate = demand;
      outputRate = 0;
    }

    const newProductionLine = new ProductionLine(
      part,
      productionRate,
      outputRate,
      true,
      autoCreated,
    );
    // Auto-add the sole recipe unless suppressed (e.g. another library factory
    // already exports this part). Relocated from the ProductionLine constructor.
    const recipes = recipeLookup[part.slug];
    if (!suppressAutoRecipe && recipes.length === 1) {
      newProductionLine.assemblyLines.push(
        new AssemblyLine({
          recipe: recipes[0],
          rate: productionRate / recipes[0].productLookup[part.slug],
          autoCreated: true,
        }),
      );
    }
    this.productionLines.push(newProductionLine);
    if (!this.icon) this.icon = part.iconLarge;
    this._productionLineLookup[part.slug] = newProductionLine;

    if (this.autoAddProductLines) {
      // TODO select default recipe, add more product lines automatically
    }

    if (!autoCreated) this._updateRates();
  }

  removeProductionLine(part: Part) {
    this.productionLines = this.productionLines.filter(
      (product) => product.part.slug !== part.slug,
    );

    delete this._productionLineLookup[part.slug];

    this._updateRates();
  }

  /**
   * Gets the demand for the part in all production lines except the production line that directly produces the part.
   *
   * @param part The part to get the demand for
   * @returns The demand for the part in all production lines other than the line for the part
   */
  getPartDemand(part: Part) {
    let productionRate = 0;
    for (const productionLine of this.productionLines) {
      if (productionLine.part.slug === part.slug) continue;

      for (const assemblyLine of productionLine.assemblyLines) {
        for (const recipePart of assemblyLine.recipe.ingredients) {
          if (recipePart.part.slug !== part.slug) continue;

          productionRate += assemblyLine.getPartConsumptionRate(
            recipePart.part,
          );
        }

        for (const recipePart of assemblyLine.recipe.products) {
          if (recipePart.part.slug !== part.slug) continue;
          productionRate -= assemblyLine.getPartProductionRate(recipePart.part);
        }
      }
    }

    return productionRate;
  }

  setPartRate(part: Part, productionRate: number, _isAutoSet: boolean = false) {
    const productionLine = this._productionLineLookup[part.slug];

    if (productionLine.rate === 0) {
      // Multiplicative scaling from 0 produces NaN (0 * Infinity); distribute evenly instead
      const n = productionLine.assemblyLines.length;
      for (const assemblyLine of productionLine.assemblyLines) {
        const product = assemblyLine.recipe.getProduct(part);
        assemblyLine.rate =
          product && n > 0 ? productionRate / n / product.quantity : 0;
      }
    } else {
      const rateMultiplier = productionRate / productionLine.rate;
      for (const assemblyLine of productionLine.assemblyLines) {
        assemblyLine.rate *= rateMultiplier;
      }
    }

    productionLine.rate = productionRate;

    for (const assemblyLine of productionLine.assemblyLines) {
      for (const recipePart of assemblyLine.recipe.ingredients) {
        if (recipePart.part.slug === part.slug) continue;

        this.autoSetPartRate(recipePart.part);
      }
    }

    this._updateRates();
  }

  /**
   * Sets the rate for the production line for the part given its demand in other production lines. This will remove the
   * production line for the part if it is not needed anywhere else in the factory and it was created automatically.
   *
   * @param part The part whose production rate needs to be set based on other production lines
   */
  autoSetPartRate(part: Part) {
    if (this._autoSetPartRateInProgress.has(part.slug)) {
      // Cycle detected: this part is already being processed up the call stack
      return;
    }

    const productionLine = this._productionLineLookup[part.slug];
    if (!productionLine?.autoCalculateRate) {
      // do not auto set rate for a production line without the flag set, or one that doesn't exist yet
      return;
    }

    if (
      (part.slug === "rubber" || part.slug === "plastic") &&
      this._hasRecycledRubberPlasticLoop()
    ) {
      // Handling recycled rubber and plastic loop is not implemented here
      return;
    }

    this._autoSetPartRateInProgress.add(part.slug);
    try {
      const productionRate = this.getPartDemand(part);
      if (productionLine.autoCreated && productionRate < RATE_EPSILON) {
        this.removeProductionLine(part);
      } else {
        this.setPartRate(part, productionRate, true);
      }
    } finally {
      this._autoSetPartRateInProgress.delete(part.slug);
    }
  }

  _applyRates(rateMap: Map<AssemblyLine, number>) {
    const affected = new Set<ProductionLine>();

    for (const productionLine of this.productionLines) {
      for (const assemblyLine of productionLine.assemblyLines) {
        const rate = rateMap.get(assemblyLine);
        if (rate !== undefined) {
          assemblyLine.rate = rate;
          affected.add(productionLine);
        }
      }
    }

    for (const productionLine of affected) {
      productionLine.rate = productionLine.assemblyLines.reduce(
        (acc, assemblyLine) => {
          const product = assemblyLine.recipe.getProduct(productionLine.part);
          if (!product) return acc;
          return acc + assemblyLine.getPartProductionRate(product.part);
        },
        0,
      );
    }
  }

  // --- Mutation methods (M4 mutation contract) ---------------------------
  // Components mutate the factory only through these, on the valtio proxy.
  // Each rate-affecting mutator ends with its own recompute; presentation
  // mutators skip recompute (the proxy write itself notifies). See spec R5.

  /** Re-run the sole-recipe sync + rate propagation for one production line. */
  _syncProductionLine(pl: ProductionLine) {
    if (pl.assemblyLines.length === 1) {
      pl.assemblyLines[0].setPartProductionRate(pl.part, pl.rate);
    }
    this.setPartRate(pl.part, pl.rate);
  }

  setClockSpeed(al: AssemblyLine, speed: number) {
    const clamped = Math.min(Math.max(speed, 1), 250);
    al.machineSpeed = clamped;
    al.powerShards = shardsForClock(clamped);
    this._updateRates();
  }

  setAllowRemainder(al: AssemblyLine, allow: boolean) {
    al.allowRemainder = allow;
    this._updateRates();
  }

  setMachineCount(al: AssemblyLine, n: number) {
    const N = Math.max(1, Math.round(n));
    const recipe = al.recipe as Recipe;
    const baseRate = 60 / recipe.processingTime;
    const newSpeed = al.rate > 0 ? (al.rate / (N * baseRate)) * 100 : 100;
    const clamped = Math.min(250, Math.max(1, newSpeed));
    al.machineSpeed = clamped;
    al.powerShards = shardsForClock(clamped);
    al.allowRemainder = false;
    this._updateRates();
  }

  setSloopedSlots(al: AssemblyLine, n: number) {
    al.setSloopedSlots(n);
    if (this.productionLines.some((pl) => pl.outputRate > 0)) {
      this.autoCalculateRates();
    } else {
      this._updateRates();
    }
  }

  /** Edit one assembly line's throughput for a specific part (recompute-only). */
  setAssemblyLinePartRate(
    al: AssemblyLine,
    part: Part,
    rate: number,
    isProduction: boolean,
  ) {
    if (isProduction) al.setPartProductionRate(part, rate);
    else al.setPartConsumptionRate(part, rate);
    this._updateRates();
  }

  /** Set a nested-factory line's whole-copy count (recompute-only). */
  setNestedFactoryRate(al: AssemblyLine, copies: number) {
    al.rate = Math.max(0, Math.round(copies));
    this._updateRates();
  }

  setProductionLineRate(pl: ProductionLine, rate: number) {
    pl.rate = rate;
    this._syncProductionLine(pl);
  }

  setOutputRate(pl: ProductionLine, rate: number) {
    pl.outputRate = rate;
    this.autoCalculateRates();
  }

  setMaximizeOutput(pl: ProductionLine, value: boolean) {
    pl.maximizeOutput = value;
    this.autoCalculateRates();
  }

  setAutoCalculateRate(pl: ProductionLine, value: boolean) {
    pl.autoCalculateRate = value;
    if (value) this.autoSetPartRate(pl.part);
    else this._updateRates();
  }

  addAssemblyLine(pl: ProductionLine, recipe: Recipe) {
    pl.assemblyLines.push(
      new AssemblyLine({
        recipe,
        rate: pl.recipeInstanceRate(recipe),
        machineSpeed: 100,
        allowRemainder: true,
        autoCreated: true,
      }),
    );
    this._syncProductionLine(pl);
  }

  addFactoryAssemblyLine(
    pl: ProductionLine,
    fr: FactoryRecipe,
    actualProductionRate: number,
  ) {
    const productionDeficit = pl.rate - actualProductionRate;
    const qty = fr.getProduct(pl.part.slug)?.quantity ?? 1;
    pl.assemblyLines.push(
      new AssemblyLine({
        recipe: fr,
        rate: productionDeficit / qty,
        machineSpeed: 100,
        allowRemainder: true,
        autoCreated: true,
      }),
    );
    this._syncProductionLine(pl);
  }

  removeAssemblyLine(pl: ProductionLine, recipe: AnyRecipe) {
    const index = pl.assemblyLines
      .map((a) => a.recipe.slug)
      .indexOf(recipe.slug);
    if (index >= 0) pl.assemblyLines.splice(index, 1);
    this._syncProductionLine(pl);
  }

  acceptLine(pl: ProductionLine) {
    pl.autoCreated = false;
    for (const al of pl.assemblyLines) al.autoCreated = false;
    this._updateRates();
  }

  acceptAssembly(pl: ProductionLine, recipe: AnyRecipe) {
    const al = pl.assemblyLines.find((a) => a.recipe.slug === recipe.slug);
    if (al) al.autoCreated = false;
    this._updateRates();
  }

  acceptAllSuggestions() {
    acceptAllSuggestionsWalk(this);
    this._updateRates();
  }

  rejectAllSuggestions() {
    rejectAllSuggestionsWalk(this);
    this._updateRates();
  }

  /** Public wrapper over the recipe optimizer (recompute is internal). */
  optimize(globalPointOverrides: Record<string, number> = {}) {
    this.optimizeRecipes(globalPointOverrides);
  }

  setConstraints(next: PartConstraint[]) {
    this.constraints = next;
    this.autoCalculateRates();
  }

  setOptimizerConfig(next: RecipeOptimizerConfig) {
    this.optimizer = next;
    this._updateRates();
  }

  setPartPointOverride(slug: string, value: number) {
    this.partPointOverrides = { ...this.partPointOverrides, [slug]: value };
    this._updateRates();
  }

  setPartPointOverrides(next: Record<string, number>) {
    this.partPointOverrides = next;
    this._updateRates();
  }

  // --- Presentation mutators (no recompute) ------------------------------

  setIcon(icon: string | undefined) {
    this.icon = icon;
  }

  setNodePosition(nodeId: string, pos: { x: number; y: number }) {
    this.graphLayout[nodeId] = pos;
  }

  pruneGraphLayout(liveNodeIds: Set<string>) {
    for (const key of Object.keys(this.graphLayout)) {
      if (!liveNodeIds.has(key)) delete this.graphLayout[key];
    }
  }

  setAssemblyLineRows(al: AssemblyLine, rows: number, maxRows: number) {
    al.rows = Math.max(1, Math.min(maxRows, Math.floor(rows)));
  }

  setAssemblyLineRowSpacing(al: AssemblyLine, spacing: number) {
    al.rowSpacing = Math.max(0, spacing);
  }
}
