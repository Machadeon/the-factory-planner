"use client";

import Dialog from "@mui/material/Dialog";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import List from "@mui/material/List";
import ListItemButton from "@mui/material/ListItemButton";
import ListItemText from "@mui/material/ListItemText";
import Image from "next/image";
import { useMemo } from "react";
import type Factory from "../models/factory";
import type { StorageLibrary } from "../models/factory-storage";
import { deserializeFactory } from "../models/factory-storage";

interface FactoryPickerDialogProps {
  open: boolean;
  library: StorageLibrary;
  currentFactoryId: string | null;
  targetPartSlug: string;
  onPick: (id: string, name: string, factory: Factory) => void;
  onClose: () => void;
}

export default function FactoryPickerDialog({
  open,
  library,
  currentFactoryId,
  targetPartSlug,
  onPick,
  onClose,
}: FactoryPickerDialogProps) {
  // Deserializing the whole library is expensive; skip it when the dialog is
  // closed and memoize otherwise (inputs are all stable refs/primitives).
  const candidates = useMemo(() => {
    if (!open) return [];
    return library.factories.flatMap((sf) => {
      if (sf.id === currentFactoryId) return [];
      const factory = deserializeFactory(sf, library);
      if (!factory) return [];
      if (!factory.allOutputs().some((p) => p.slug === targetPartSlug))
        return [];
      return [{ sf, factory }];
    });
  }, [open, library, currentFactoryId, targetPartSlug]);

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>Use Factory</DialogTitle>
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
                  <Image
                    src={sf.icon}
                    alt={sf.name}
                    width={32}
                    height={32}
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
