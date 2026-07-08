"use client";

import DeleteIcon from "@mui/icons-material/Delete";
import { useMemo } from "react";
import {
  useFactory,
  useFactoryUpdateSubscription,
} from "@/app/contexts/FactoryContext";
import { useLibraryContext } from "@/app/contexts/LibraryContext";
import { useNavigation } from "@/app/contexts/NavigationContext";
import { displayNum } from "@/app/lib/format";
import {
  getTotalPower,
  getTotalShards,
  getTotalSloops,
} from "../models/factory-metrics";
import { factoryRecipeId } from "../models/factory-recipe";
import { deserializeFactory } from "../models/factory-storage";
import { RATE_EPSILON } from "../models/game-data";
import { HorizontalDivider } from "./Dividers";
import PartRateSummary from "./PartRateSummary";
import CollapsibleSection from "./ui/CollapsibleSection";
import Icon from "./ui/Icon";
import IconButton from "./ui/IconButton";

interface FactoryOverviewComponentProps {
  // Kept for the existing (unused) caller contract; overview reads state from context.
  onRebuild?: () => void;
}

export default function FactoryOverviewComponent(
  _props: FactoryOverviewComponentProps,
) {
  const factory = useFactory();
  useFactoryUpdateSubscription();
  const { library, currentFactoryId } = useLibraryContext();
  const { navigateToFactory } = useNavigation();
  const factoryOutputs = factory.getOutputInfo().sort((a, b) => {
    const primaryDiff = (b.isPrimary ? 1 : 0) - (a.isPrimary ? 1 : 0);
    return primaryDiff !== 0
      ? primaryDiff
      : a.part.name.localeCompare(b.part.name);
  });
  const factoryInputs = factory
    .allInputs()
    .sort((a, b) => a.name.localeCompare(b.name));
  const intermediateParts = factory.allIntermediateParts();

  // For each output part, find consumer factories (those that list currentFactoryId as a supplier)
  // and how much of that part they consume. Deserializing consumer factories is
  // expensive, so memoize: it only depends on the library, this factory's id,
  // and the set of output part slugs (recomputed when any of those change).
  const outputSlugKey = factoryOutputs.map((o) => o.part.slug).join(",");
  // biome-ignore lint/correctness/useExhaustiveDependencies: factoryOutputs is intentionally tracked via its slug signature (outputSlugKey) rather than its unstable array identity.
  const consumersByPartSlug = useMemo(() => {
    const map = new Map<string, { id: string; name: string; rate: number }[]>();
    if (currentFactoryId && library) {
      for (const sf of library.factories) {
        if (!sf.supplierIds?.includes(currentFactoryId)) continue;
        const consumerFactory = deserializeFactory(sf, library);
        if (!consumerFactory) continue;
        for (const output of factoryOutputs) {
          const rate = consumerFactory.rateLookup[output.part.slug];
          if (!rate) continue;
          const net = rate.consumptionRate - rate.productionRate;
          if (net <= RATE_EPSILON) continue;
          const existing = map.get(output.part.slug) ?? [];
          existing.push({ id: sf.id, name: sf.name, rate: net });
          map.set(output.part.slug, existing);
        }
      }
    }
    return map;
  }, [library, currentFactoryId, outputSlugKey]);
  const hasConsumers = consumersByPartSlug.size > 0;

  return (
    <div className="flex flex-col px-2 pb-4">
      <CollapsibleSection
        label={`Outputs (${factoryOutputs.length})`}
        defaultExpanded
      >
        <div>
          {factoryOutputs.map((output, idx) => (
            <div key={output.part.slug}>
              {!output.isPrimary &&
                (idx === 0 || factoryOutputs[idx - 1].isPrimary) && (
                  <div className="text-sm text-gray-400 py-2 mt-2">
                    Byproducts
                  </div>
                )}
              <PartRateSummary
                part={output.part}
                rate={output.rate}
                highlight={!output.isPrimary}
              />
            </div>
          ))}
        </div>
      </CollapsibleSection>
      {hasConsumers && (
        <>
          <HorizontalDivider />
          <CollapsibleSection label="Consumers" defaultExpanded>
            <div>
              {factoryOutputs.map((output) => {
                const consumers = consumersByPartSlug.get(output.part.slug);
                if (!consumers || consumers.length === 0) return null;
                const totalConsumed = consumers.reduce((s, c) => s + c.rate, 0);
                const produced =
                  output.rate.productionRate - output.rate.consumptionRate;
                const unused = produced - totalConsumed;
                const pct =
                  produced > 0
                    ? Math.min(100, (totalConsumed / produced) * 100)
                    : 0;
                const overAllocated = totalConsumed > produced + 0.05;
                return (
                  <div key={output.part.slug} className="mb-3">
                    <div className="flex flex-row items-center gap-x-1 mb-1">
                      <Icon
                        src={output.part.iconSmall}
                        alt={output.part.name}
                        size={24}
                      />
                      <span className="grow font-medium text-sm">
                        {output.part.name}
                      </span>
                    </div>
                    <div className="w-full h-2 rounded bg-gray-700 mb-1 overflow-hidden">
                      <div
                        className={`h-full rounded transition-all ${overAllocated ? "bg-red-500" : "bg-blue-500"}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <div className="text-xs mb-1">
                      <span className="text-gray-400">
                        {displayNum(totalConsumed)}/{displayNum(produced)}/min
                        consumed
                      </span>
                      {overAllocated ? (
                        <span className="text-red-400">
                          {" "}
                          · {displayNum(totalConsumed - produced)}/min
                          unfulfilled
                        </span>
                      ) : (
                        <span className="text-gray-400">
                          {" "}
                          · {displayNum(unused)}/min unused
                        </span>
                      )}
                    </div>
                    {consumers.map((c) => (
                      <div
                        key={c.name}
                        className="flex flex-row items-center gap-x-1 pl-1 py-0.5"
                      >
                        <button
                          type="button"
                          className="grow text-sm text-left underline cursor-pointer hover:opacity-70"
                          onClick={() => navigateToFactory(c.id)}
                        >
                          {c.name}
                        </button>
                        <span className="text-sm text-right">
                          {displayNum(c.rate)}/min
                        </span>
                        <span className="text-xs text-gray-400 text-right min-w-10">
                          {produced > 0
                            ? `${displayNum((c.rate / produced) * 100)}%`
                            : "—"}
                        </span>
                      </div>
                    ))}
                  </div>
                );
              })}
            </div>
          </CollapsibleSection>
        </>
      )}
      <HorizontalDivider />
      <CollapsibleSection
        label={`Inputs (${factoryInputs.length})`}
        defaultExpanded
      >
        <div>
          {factoryInputs.map((part) => (
            <PartRateSummary
              key={part.slug}
              part={part}
              rate={factory.rateLookup[part.slug]}
            />
          ))}
        </div>
      </CollapsibleSection>
      <HorizontalDivider />
      <CollapsibleSection
        label={`Intermediate Parts (${intermediateParts.length})`}
        defaultExpanded={false}
      >
        <div>
          {intermediateParts
            .sort((a, b) => a.name.localeCompare(b.name))
            .map((part) => (
              <PartRateSummary
                key={part.slug}
                part={part}
                rate={factory.rateLookup[part.slug]}
                showDetail
              />
            ))}
        </div>
      </CollapsibleSection>
      {(() => {
        const totalPower = getTotalPower(factory);
        const totalShards = Math.round(getTotalShards(factory));
        const totalSloops = Math.round(getTotalSloops(factory));
        const variable = totalPower.max - totalPower.min > 0.01;
        return (
          <>
            <HorizontalDivider />
            <CollapsibleSection label="Power & Modules" defaultExpanded>
              <div>
                <div className="flex flex-row items-center gap-x-2 mb-1">
                  <Icon
                    src="/images/items/power_192.png"
                    alt="Power"
                    size={24}
                  />
                  {variable ? (
                    <span className="text-sm">
                      {displayNum(totalPower.avg)} MW avg
                      <span className="text-gray-400">
                        {" "}
                        · {displayNum(totalPower.min)}–
                        {displayNum(totalPower.max)} MW
                      </span>
                    </span>
                  ) : (
                    <span className="text-sm">
                      {displayNum(totalPower.avg)} MW
                    </span>
                  )}
                </div>
                <div className="flex flex-row items-center gap-x-2 mb-1">
                  <Icon
                    src="/images/items/desc-crystalshard-c_64.png"
                    label=""
                    size={24}
                  />
                  <span className="text-sm">{totalShards} Power Shards</span>
                </div>
                <div className="flex flex-row items-center gap-x-2 mb-2">
                  <Icon src="/images/items/Somersloop.png" label="" size={24} />
                  <span className="text-sm">{totalSloops} Somersloops</span>
                </div>
              </div>
            </CollapsibleSection>
          </>
        );
      })()}
      {factory.supplierFactories.length > 0 && (
        <>
          <HorizontalDivider />
          <CollapsibleSection
            label={`Suppliers (${factory.supplierFactories.length})`}
            defaultExpanded
          >
            <div>
              {factory.supplierFactories.map((fr) => {
                const suppliedParts = fr.products.filter((rp) => {
                  const demand = factory.rateLookup[rp.part.slug];
                  return (
                    demand && demand.consumptionRate > demand.productionRate
                  );
                });
                return (
                  <div key={fr.slug} className="mb-3">
                    <div className="flex flex-row items-center gap-x-1 mb-1">
                      {fr.icon && (
                        <Icon src={fr.icon} alt={fr.name} size={24} />
                      )}
                      <button
                        type="button"
                        className="grow font-medium text-left underline cursor-pointer hover:opacity-70"
                        onClick={() =>
                          navigateToFactory(factoryRecipeId(fr.slug))
                        }
                      >
                        {fr.name}
                      </button>
                      <IconButton
                        aria-label="Remove supplier"
                        onClick={() =>
                          factory.removeSupplier(factoryRecipeId(fr.slug))
                        }
                        className="inline p-1"
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </div>
                    {suppliedParts.length === 0 ? (
                      <div className="text-sm text-gray-400 pl-1">
                        No parts currently demanded
                      </div>
                    ) : (
                      suppliedParts.map((rp) => {
                        const demand = factory.rateLookup[rp.part.slug];
                        const demanded =
                          demand.consumptionRate - demand.productionRate;
                        return (
                          <div
                            key={rp.part.slug}
                            className="flex flex-row items-center gap-x-1 pl-4 py-0.5"
                          >
                            <Icon
                              src={rp.part.iconSmall}
                              alt={rp.part.name}
                              size={24}
                              className="shrink-0"
                            />
                            <span className="grow text-sm">{rp.part.name}</span>
                            <span className="text-sm text-right whitespace-nowrap">
                              {displayNum(demanded)} of{" "}
                              {displayNum(rp.quantity)}
                              /min
                            </span>
                          </div>
                        );
                      })
                    )}
                  </div>
                );
              })}
            </div>
          </CollapsibleSection>
        </>
      )}
    </div>
  );
}
