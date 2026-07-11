"use client";

import { useFactorySnapshot } from "@/app/contexts/FactoryContext";
import CollapsibleSection from "../ui/CollapsibleSection";
import PartRateSummary from "./PartRateSummary";

export default function InputsSection() {
  const factory = useFactorySnapshot();
  const factoryInputs = factory
    .allInputs()
    .sort((a, b) => a.name.localeCompare(b.name));

  return (
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
  );
}
