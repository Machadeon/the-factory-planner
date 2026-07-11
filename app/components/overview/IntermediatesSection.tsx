"use client";

import { useFactorySnapshot } from "@/app/contexts/FactoryContext";
import CollapsibleSection from "../ui/CollapsibleSection";
import PartRateSummary from "./PartRateSummary";

export default function IntermediatesSection() {
  const factory = useFactorySnapshot();
  const intermediateParts = factory.allIntermediateParts();

  return (
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
  );
}
