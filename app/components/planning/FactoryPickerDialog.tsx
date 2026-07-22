"use client";

import { useMemo } from "react";
import { useLibraryContext } from "@/app/contexts/LibraryContext";
import type Factory from "../../models/factory";
import { deserializeFactory } from "../../models/factory-storage";
import ActionRow from "../ui/ActionRow";
import { Dialog, DialogContent, DialogTitle } from "../ui/Dialog";
import Icon from "../ui/Icon";

interface FactoryPickerDialogProps {
  open: boolean;
  mode: "recipe" | "supplier";
  targetPartSlug: string;
  onPick: (id: string, name: string, factory: Factory) => void;
  onClose: () => void;
}

const MODE_TITLES: Record<FactoryPickerDialogProps["mode"], string> = {
  recipe: "Use Factory as Recipe",
  supplier: "Supply from Factory",
};

export default function FactoryPickerDialog({
  open,
  mode,
  targetPartSlug,
  onPick,
  onClose,
}: FactoryPickerDialogProps) {
  const { library, currentFactoryId } = useLibraryContext();
  // Deserializing the whole library is expensive; skip it when the dialog is
  // closed and memoize otherwise (inputs are all stable refs/primitives).
  const candidates = useMemo(() => {
    if (!open) return [];
    return library.factories.flatMap((sf) => {
      if (sf.id === currentFactoryId) return [];
      const factory = deserializeFactory(
        sf,
        (id) => library.factories.find((f) => f.id === id) ?? null,
      );
      if (!factory) return [];
      if (!factory.allOutputs().some((p) => p.slug === targetPartSlug))
        return [];
      return [{ sf, factory }];
    });
  }, [open, library, currentFactoryId, targetPartSlug]);

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>{MODE_TITLES[mode]}</DialogTitle>
      <DialogContent>
        {candidates.length === 0 ? (
          <p className="text-sm text-gray-400">
            No saved factories produce this part.
          </p>
        ) : (
          <ul>
            {candidates.map(({ sf, factory }) => (
              <li key={sf.id}>
                <ActionRow
                  onClick={() => onPick(sf.id, sf.name, factory)}
                  className="flex flex-row items-center w-full px-3 py-2"
                >
                  {sf.icon && (
                    <Icon
                      src={sf.icon}
                      alt={sf.name}
                      size={32}
                      className="mr-2"
                    />
                  )}
                  <span>{sf.name}</span>
                </ActionRow>
              </li>
            ))}
          </ul>
        )}
      </DialogContent>
    </Dialog>
  );
}
