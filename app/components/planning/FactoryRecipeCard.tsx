"use client";

import { displayNum } from "@/app/lib/format";
import type { SerializedFactory } from "../../models/factory-storage";
import ActionRow from "../ui/ActionRow";
import Icon from "../ui/Icon";

interface FactoryRecipeCardProps {
  sf: SerializedFactory;
  instanceRate: number;
  qty: number;
  onClick: () => void;
}

export default function FactoryRecipeCard({
  sf,
  instanceRate,
  qty,
  onClick,
}: FactoryRecipeCardProps) {
  return (
    <ActionRow
      className="sp-recipe-component flex flex-row grow items-center gap-x-2 p-2"
      onClick={onClick}
    >
      {sf.icon ? (
        <Icon src={sf.icon} label={sf.name} size={64} />
      ) : (
        <div className="w-16 h-16 flex items-center justify-center text-gray-400 text-xs border border-gray-600 rounded">
          Factory
        </div>
      )}
      <span className="w-3xs font-medium">{sf.name}</span>
      <span className="text-sm text-gray-400">
        {displayNum(instanceRate)} instance
        {instanceRate !== 1 ? "s" : ""}
      </span>
      <span className="text-sm text-gray-400">
        → {displayNum(qty * instanceRate)}/min
      </span>
    </ActionRow>
  );
}
