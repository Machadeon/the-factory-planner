"use client";

import DeleteIcon from "@mui/icons-material/Delete";
import { useFactory, useFactorySnapshot } from "@/app/contexts/FactoryContext";
import { useNavigation } from "@/app/contexts/NavigationContext";
import { displayNum } from "@/app/lib/format";
import { factoryRecipeId } from "../../models/factory-recipe";
import { HorizontalDivider } from "../Dividers";
import CollapsibleSection from "../ui/CollapsibleSection";
import Icon from "../ui/Icon";
import IconButton from "../ui/IconButton";

export default function SuppliersSection() {
  const factory = useFactorySnapshot();
  const factoryProxy = useFactory();
  const { navigateToFactory } = useNavigation();

  if (factory.supplierFactories.length === 0) return null;

  return (
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
              return demand && demand.consumptionRate > demand.productionRate;
            });
            return (
              <div key={fr.slug} className="mb-3">
                <div className="flex flex-row items-center gap-x-1 mb-1">
                  {fr.icon && <Icon src={fr.icon} alt={fr.name} size={24} />}
                  <button
                    type="button"
                    className="grow font-medium text-left underline cursor-pointer hover:opacity-70"
                    onClick={() => navigateToFactory(factoryRecipeId(fr.slug))}
                  >
                    {fr.name}
                  </button>
                  <IconButton
                    aria-label="Remove supplier"
                    onClick={() =>
                      factoryProxy.removeSupplier(factoryRecipeId(fr.slug))
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
        </div>
      </CollapsibleSection>
    </>
  );
}
