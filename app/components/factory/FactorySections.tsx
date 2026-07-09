"use client";

import type { Section } from "@/app/hooks/useFactoryUrlSync";
import LogisticsSection from "../LogisticsSection";
import OptimizationSection from "../OptimizationSection";
import PlanningSection from "../PlanningSection";
import type useFactoryPageFlows from "./useFactoryPageFlows";

interface FactorySectionsProps {
  activeSection: Section;
  forceExpanded: boolean | null;
  onToggleExpanded: () => void;
  flows: ReturnType<typeof useFactoryPageFlows>;
}

export default function FactorySections({
  activeSection,
  forceExpanded,
  onToggleExpanded,
  flows,
}: FactorySectionsProps) {
  return (
    <div className="flex flex-col grow min-w-0">
      {activeSection === "planning" && (
        <PlanningSection
          candidateFactories={flows.deserializedOtherFactories}
          forceExpanded={forceExpanded}
          onToggle={onToggleExpanded}
          onAddProduct={flows.addProductionLine}
          onRemoveProduct={flows.removeProductionLine}
        />
      )}
      {activeSection === "optimization" && <OptimizationSection />}
      {activeSection === "logistics" && <LogisticsSection />}
    </div>
  );
}
