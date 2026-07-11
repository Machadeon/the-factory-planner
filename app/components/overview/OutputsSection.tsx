"use client";

import { useFactorySnapshot } from "@/app/contexts/FactoryContext";
import CollapsibleSection from "../ui/CollapsibleSection";
import PartRateSummary from "./PartRateSummary";

export default function OutputsSection() {
  const factory = useFactorySnapshot();
  const factoryOutputs = factory.getOutputInfo().sort((a, b) => {
    const primaryDiff = (b.isPrimary ? 1 : 0) - (a.isPrimary ? 1 : 0);
    return primaryDiff !== 0
      ? primaryDiff
      : a.part.name.localeCompare(b.part.name);
  });

  return (
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
  );
}
