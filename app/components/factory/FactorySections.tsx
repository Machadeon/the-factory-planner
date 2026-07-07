"use client";

import type { Section } from "@/app/hooks/useFactoryUrlSync";
import type Factory from "@/app/models/factory";
import type { StorageLibrary } from "@/app/models/factory-storage";
import LogisticsSection from "../LogisticsSection";
import OptimizationSection from "../OptimizationSection";
import PlanningSection from "../PlanningSection";
import type useFactoryPageFlows from "./useFactoryPageFlows";

interface FactorySectionsProps {
  activeSection: Section;
  factory: Factory;
  library: StorageLibrary;
  currentFactoryId: string | null;
  forceExpanded: boolean | null;
  onToggleExpanded: () => void;
  onUpdateLibrary: (overrides: Record<string, number>) => void;
  flows: ReturnType<typeof useFactoryPageFlows>;
}

export default function FactorySections({
  activeSection,
  factory,
  library,
  currentFactoryId,
  forceExpanded,
  onToggleExpanded,
  onUpdateLibrary,
  flows,
}: FactorySectionsProps) {
  return (
    <div className="flex flex-col grow min-w-0">
      {activeSection === "planning" && (
        <PlanningSection
          factory={factory}
          library={library}
          currentFactoryId={currentFactoryId}
          candidateFactories={flows.deserializedOtherFactories}
          forceExpanded={forceExpanded}
          onToggle={onToggleExpanded}
          onAddProduct={flows.addProductionLine}
          onRemoveProduct={flows.removeProductionLine}
          onNavigateToFactory={flows.handleNavigateToFactory}
        />
      )}
      {activeSection === "optimization" && (
        <OptimizationSection
          factory={factory}
          library={library}
          currentFactoryId={currentFactoryId}
          onUpdateLibrary={onUpdateLibrary}
        />
      )}
      {activeSection === "logistics" && (
        <LogisticsSection
          factory={factory}
          library={library}
          currentFactoryId={currentFactoryId}
          onNavigateToFactory={flows.handleNavigateToFactory}
        />
      )}
    </div>
  );
}
