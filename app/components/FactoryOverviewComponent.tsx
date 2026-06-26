"use client";

import DeleteIcon from "@mui/icons-material/Delete";
import VisibilityIcon from "@mui/icons-material/Visibility";
import VisibilityOffIcon from "@mui/icons-material/VisibilityOff";
import Tooltip from "@mui/material/Tooltip";
import Image from "next/image";
import { useMemo, useState } from "react";
import type Factory from "../models/factory";
import {
  deserializeFactory,
  type StorageLibrary,
} from "../models/factory-storage";
import { displayNum } from "../utils";
import Clickable from "./Clickable";
import { HorizontalDivider } from "./Dividers";
import PartRateSummary from "./PartRateSummary";

interface FactoryOverviewComponentProps {
  factory: Factory;
  library?: StorageLibrary;
  currentFactoryId?: string | null;
  onNavigateToFactory?: (id: string) => void;
}

export default function FactoryOverviewComponent({
  factory,
  library,
  currentFactoryId,
  onNavigateToFactory,
}: FactoryOverviewComponentProps) {
  const [showIntermediateProducts, setShowIntermediateProducts] =
    useState<boolean>(false);

  function _schedule(obj: object, fn: () => void) {
    setTimeout(fn.bind(obj), 1);
  }

  const factoryOutputs = factory.allOutputs();
  const factoryInputs = factory.allInputs();
  const intermediateParts = factory.allIntermediateParts();

  // For each output part, find consumer factories (those that list currentFactoryId as a supplier)
  // and how much of that part they consume. Deserializing consumer factories is
  // expensive, so memoize: it only depends on the library, this factory's id,
  // and the set of output part slugs (recomputed when any of those change).
  const outputSlugKey = factoryOutputs.map((p) => p.slug).join(",");
  // biome-ignore lint/correctness/useExhaustiveDependencies: factoryOutputs is intentionally tracked via its slug signature (outputSlugKey) rather than its unstable array identity.
  const consumersByPartSlug = useMemo(() => {
    const map = new Map<string, { id: string; name: string; rate: number }[]>();
    if (currentFactoryId && library) {
      for (const sf of library.factories) {
        if (!sf.supplierIds?.includes(currentFactoryId)) continue;
        const consumerFactory = deserializeFactory(sf, library);
        if (!consumerFactory) continue;
        for (const part of factoryOutputs) {
          const rate = consumerFactory.rateLookup[part.slug];
          if (!rate) continue;
          const net = rate.consumptionRate - rate.productionRate;
          if (net <= 0.0001) continue;
          const existing = map.get(part.slug) ?? [];
          existing.push({ id: sf.id, name: sf.name, rate: net });
          map.set(part.slug, existing);
        }
      }
    }
    return map;
  }, [library, currentFactoryId, outputSlugKey]);
  const hasConsumers = consumersByPartSlug.size > 0;

  return (
    <div className="flex flex-col w-xs">
      <div className="text-lg mb-2">Outputs ({factoryOutputs.length})</div>
      {factoryOutputs.map((part) => (
        <PartRateSummary
          key={part.slug}
          part={part}
          rate={factory.rateLookup[part.slug]}
          factory={factory}
          library={library}
          currentFactoryId={currentFactoryId}
        />
      ))}
      {hasConsumers && (
        <>
          <HorizontalDivider />
          <div className="text-lg mb-2">Consumers</div>
          {factoryOutputs.map((part) => {
            const consumers = consumersByPartSlug.get(part.slug);
            if (!consumers || consumers.length === 0) return null;
            const totalConsumed = consumers.reduce((s, c) => s + c.rate, 0);
            const output = factory.rateLookup[part.slug];
            const produced = output
              ? output.productionRate - output.consumptionRate
              : 0;
            const unused = produced - totalConsumed;
            const pct =
              produced > 0
                ? Math.min(100, (totalConsumed / produced) * 100)
                : 0;
            const overAllocated = totalConsumed > produced + 0.05;
            return (
              <div key={part.slug} className="mb-3">
                <div className="flex flex-row items-center gap-x-1 mb-1">
                  <Image
                    src={part.iconSmall}
                    alt={part.name}
                    width={24}
                    height={24}
                  />
                  <span className="grow font-medium text-sm">{part.name}</span>
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
                    {onNavigateToFactory ? (
                      <button
                        type="button"
                        className="grow text-sm text-left underline cursor-pointer hover:opacity-70"
                        onClick={() => onNavigateToFactory(c.id)}
                      >
                        {c.name}
                      </button>
                    ) : (
                      <span className="grow text-sm">{c.name}</span>
                    )}
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
        </>
      )}
      <HorizontalDivider />
      <div className="text-lg mb-2">Inputs ({factoryInputs.length})</div>
      {factoryInputs.map((part) => (
        <PartRateSummary
          key={part.slug}
          part={part}
          rate={factory.rateLookup[part.slug]}
          factory={factory}
          library={library}
          currentFactoryId={currentFactoryId}
        />
      ))}
      <HorizontalDivider />
      <div className="flex flex-row items-center mb-2">
        <span className="text-lg grow">
          Intermediate Parts ({intermediateParts.length})
        </span>
        <Clickable
          onClick={() => setShowIntermediateProducts(!showIntermediateProducts)}
          className="inline"
        >
          {showIntermediateProducts ? (
            <VisibilityOffIcon />
          ) : (
            <VisibilityIcon />
          )}
        </Clickable>
      </div>
      {showIntermediateProducts &&
        intermediateParts.map((part) => (
          <PartRateSummary
            key={part.slug}
            part={part}
            rate={factory.rateLookup[part.slug]}
            factory={factory}
            library={library}
            currentFactoryId={currentFactoryId}
            showDetail
          />
        ))}
      {(() => {
        const totalPower = factory.getTotalPower();
        const totalShards = Math.round(factory.getTotalShards());
        const totalSloops = Math.round(factory.getTotalSloops());
        const variable = totalPower.max - totalPower.min > 0.01;
        return (
          <>
            <HorizontalDivider />
            <div className="text-lg mb-2">Power & Modules</div>
            <div className="flex flex-row items-center gap-x-2 mb-1">
              <Image
                src="/images/items/power_192.png"
                alt="Power"
                width={24}
                height={24}
              />
              {variable ? (
                <span className="text-sm">
                  {displayNum(totalPower.avg)} MW avg
                  <span className="text-gray-400">
                    {" "}
                    · {displayNum(totalPower.min)}–{displayNum(totalPower.max)}{" "}
                    MW
                  </span>
                </span>
              ) : (
                <span className="text-sm">{displayNum(totalPower.avg)} MW</span>
              )}
            </div>
            <div className="flex flex-row items-center gap-x-2 mb-1">
              <Image
                src="/images/items/desc-crystalshard-c_64.png"
                alt=""
                width={24}
                height={24}
              />
              <span className="text-sm">{totalShards} Power Shards</span>
            </div>
            <div className="flex flex-row items-center gap-x-2 mb-2">
              <Image
                src="/images/items/Somersloop.png"
                alt=""
                width={24}
                height={24}
              />
              <span className="text-sm">{totalSloops} Somersloops</span>
            </div>
          </>
        );
      })()}
      {factory.supplierFactories.length > 0 && (
        <>
          <HorizontalDivider />
          <div className="text-lg mb-2">
            Suppliers ({factory.supplierFactories.length})
          </div>
          {factory.supplierFactories.map((fr) => {
            const suppliedParts = fr.products.filter((rp) => {
              const demand = factory.rateLookup[rp.part.slug];
              return demand && demand.consumptionRate > demand.productionRate;
            });
            return (
              <div key={fr.slug} className="mb-3">
                <div className="flex flex-row items-center gap-x-1 mb-1">
                  {fr.icon && (
                    <Image src={fr.icon} alt={fr.name} width={24} height={24} />
                  )}
                  {onNavigateToFactory ? (
                    <button
                      type="button"
                      className="grow font-medium text-left underline cursor-pointer hover:opacity-70"
                      onClick={() =>
                        onNavigateToFactory(fr.slug.replace("factory:", ""))
                      }
                    >
                      {fr.name}
                    </button>
                  ) : (
                    <span className="grow font-medium">{fr.name}</span>
                  )}
                  <Tooltip title="Remove supplier">
                    <span>
                      <Clickable
                        onClick={() =>
                          factory.removeSupplier(
                            fr.slug.replace("factory:", ""),
                          )
                        }
                        className="inline p-1"
                      >
                        <DeleteIcon fontSize="small" />
                      </Clickable>
                    </span>
                  </Tooltip>
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
                        <Image
                          src={rp.part.iconSmall}
                          alt={rp.part.name}
                          width={24}
                          height={24}
                          className="shrink-0"
                        />
                        <span className="grow text-sm">{rp.part.name}</span>
                        <span className="text-sm text-right whitespace-nowrap">
                          {displayNum(demanded)} of {displayNum(rp.quantity)}
                          /min
                        </span>
                      </div>
                    );
                  })
                )}
              </div>
            );
          })}
        </>
      )}
    </div>
  );
}
