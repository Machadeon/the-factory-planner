"use client";

import {
  useFactorySnapshot,
  useFactoryUpdateSubscription,
} from "@/app/contexts/FactoryContext";
import {
  getTotalPower,
  getTotalShards,
  getTotalSloops,
} from "../../models/factory-metrics";
import { HorizontalDivider } from "../Dividers";
import CollapsibleSection from "../ui/CollapsibleSection";
import Icon from "../ui/Icon";
import ConsumersSection from "./ConsumersSection";
import InputsSection from "./InputsSection";
import IntermediatesSection from "./IntermediatesSection";
import OutputsSection from "./OutputsSection";
import PowerSummary from "./PowerSummary";
import SuppliersSection from "./SuppliersSection";

export default function OverviewSidebar() {
  useFactoryUpdateSubscription();
  const factory = useFactorySnapshot();
  const totalPower = getTotalPower(factory);
  const totalShards = Math.round(getTotalShards(factory));
  const totalSloops = Math.round(getTotalSloops(factory));

  return (
    <div className="flex flex-col px-2 pb-4">
      <OutputsSection />
      <ConsumersSection />
      {/* ConsumersSection renders its own HorizontalDivider when non-empty */}
      <HorizontalDivider />
      <InputsSection />
      <HorizontalDivider />
      <IntermediatesSection />
      <HorizontalDivider />
      <CollapsibleSection label="Power & Modules" defaultExpanded>
        <div>
          <div className="flex flex-row items-center gap-x-2 mb-1">
            <PowerSummary power={totalPower} />
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
      <SuppliersSection />
    </div>
  );
}
