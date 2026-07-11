"use client";

import { useMemo } from "react";
import { useFactorySnapshot } from "@/app/contexts/FactoryContext";
import { useLibraryContext } from "@/app/contexts/LibraryContext";
import { useNavigation } from "@/app/contexts/NavigationContext";
import { displayNum } from "@/app/lib/format";
import { deriveConsumers } from "../../models/consumer-links";
import { HorizontalDivider } from "../Dividers";
import CollapsibleSection from "../ui/CollapsibleSection";
import Icon from "../ui/Icon";

export default function ConsumersSection() {
  const factory = useFactorySnapshot();
  const { library, currentFactoryId } = useLibraryContext();
  const { navigateToFactory } = useNavigation();

  const factoryOutputs = factory.getOutputInfo().sort((a, b) => {
    const primaryDiff = (b.isPrimary ? 1 : 0) - (a.isPrimary ? 1 : 0);
    return primaryDiff !== 0
      ? primaryDiff
      : a.part.name.localeCompare(b.part.name);
  });

  // Deserializing consumer factories is expensive, so memoize: it only depends on
  // the library, this factory's id, and the set of output part slugs (recomputed
  // when any of those change).
  const outputSlugKey = factoryOutputs.map((o) => o.part.slug).join(",");
  // biome-ignore lint/correctness/useExhaustiveDependencies: factoryOutputs is intentionally tracked via its slug signature (outputSlugKey) rather than its unstable array identity.
  const consumersByPartSlug = useMemo(
    () => deriveConsumers(factory, { library, currentFactoryId }),
    [factory, library, currentFactoryId, outputSlugKey],
  );

  if (consumersByPartSlug.size === 0) return null;

  return (
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
                      · {displayNum(totalConsumed - produced)}/min unfulfilled
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
  );
}
