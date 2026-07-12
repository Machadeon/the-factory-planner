"use client";

import Dialog from "@mui/material/Dialog";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import List from "@mui/material/List";
import ListItemButton from "@mui/material/ListItemButton";
import ListItemText from "@mui/material/ListItemText";
import { useMemo } from "react";
import { useLibraryContext } from "@/app/contexts/LibraryContext";
import type Factory from "../models/factory";
import { deserializeFactory } from "../models/factory-storage";
import Icon from "./ui/Icon";

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
          <List disablePadding>
            {candidates.map(({ sf, factory }) => (
              <ListItemButton
                key={sf.id}
                onClick={() => onPick(sf.id, sf.name, factory)}
              >
                {sf.icon && (
                  <Icon
                    src={sf.icon}
                    alt={sf.name}
                    size={32}
                    className="mr-2"
                  />
                )}
                <ListItemText primary={sf.name} />
              </ListItemButton>
            ))}
          </List>
        )}
      </DialogContent>
    </Dialog>
  );
}
