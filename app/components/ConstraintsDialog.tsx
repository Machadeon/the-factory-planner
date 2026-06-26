"use client";

import AddIcon from "@mui/icons-material/Add";
import DeleteIcon from "@mui/icons-material/Delete";
import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import Image from "next/image";
import { useEffect, useState } from "react";
import type Factory from "../models/factory";
import type { PartConstraint } from "../models/factory";
import {
  defaultResourceLimits,
  partSlugLookup,
  parts,
} from "../models/library";
import Clickable from "./Clickable";
import PartSelector from "./PartSelector";
import TextCalculatorField from "./TextCalculatorField";

interface ConstraintsDialogProps {
  open: boolean;
  onClose: () => void;
  factory: Factory;
  onApply: () => void;
}

export default function ConstraintsDialog({
  open,
  onClose,
  factory,
  onApply,
}: ConstraintsDialogProps) {
  const [constraints, setConstraints] = useState<PartConstraint[]>(() => [
    ...factory.constraints,
  ]);
  const [showPartSelector, setShowPartSelector] = useState(false);

  // biome-ignore lint/correctness/useExhaustiveDependencies: intentionally sync only when dialog opens, not on every factory.constraints mutation
  useEffect(() => {
    if (open) {
      setConstraints([...factory.constraints]);
      setShowPartSelector(false);
    }
  }, [open]);

  const allowedSlugs = new Set(parts.map((p) => p.slug));
  const existingSlugs = constraints.map((c) => c.partSlug);

  // PartSelector shows all parts minus existingParts — pass everything except allowedSlugs minus existing
  const selectorExcludedSlugs = parts
    .map((p) => p.slug)
    .filter((s) => !allowedSlugs.has(s) || existingSlugs.includes(s));

  const rawDefaults = Object.entries(defaultResourceLimits).filter(
    ([slug]) => allowedSlugs.has(slug) && !existingSlugs.includes(slug),
  );

  function addConstraint(partSlug: string) {
    const defaultMax = defaultResourceLimits[partSlug];
    setConstraints((prev) => [...prev, { partSlug, max: defaultMax }]);
    setShowPartSelector(false);
  }

  function removeConstraint(slug: string) {
    setConstraints((prev) => prev.filter((c) => c.partSlug !== slug));
  }

  function updateConstraint(
    slug: string,
    field: "min" | "max",
    value: number | undefined,
  ) {
    setConstraints((prev) =>
      prev.map((c) => (c.partSlug === slug ? { ...c, [field]: value } : c)),
    );
  }

  function handleApply() {
    factory.constraints = constraints;
    factory.autoCalculateRates();
    onApply();
    onClose();
  }

  function handleClose() {
    setConstraints([...factory.constraints]);
    onClose();
  }

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>Resource Constraints</DialogTitle>
      <DialogContent>
        {constraints.length === 0 && rawDefaults.length === 0 && (
          <p className="text-sm text-gray-400 mb-3">
            No constraints set. Add a constraint to limit how much of an input
            or output this factory uses.
          </p>
        )}
        {constraints.map((constraint) => {
          const part = partSlugLookup[constraint.partSlug];
          if (!part) return null;
          return (
            <div
              key={constraint.partSlug}
              className="flex flex-row items-center gap-x-2 mb-2 mt-2"
            >
              <Image
                src={part.iconSmall}
                alt={part.name}
                width={24}
                height={24}
              />
              <span className="w-32 text-sm shrink-0">{part.name}</span>
              <TextCalculatorField
                variant="outlined"
                size="small"
                label="Min rate"
                className="w-24"
                value={constraint.min ?? ""}
                allowClear
                onCalculate={(v) =>
                  updateConstraint(constraint.partSlug, "min", v)
                }
                onClear={() =>
                  updateConstraint(constraint.partSlug, "min", undefined)
                }
              />
              <TextCalculatorField
                variant="outlined"
                size="small"
                label="Max rate"
                className="w-24"
                value={constraint.max ?? ""}
                allowClear
                onCalculate={(v) =>
                  updateConstraint(constraint.partSlug, "max", v)
                }
                onClear={() =>
                  updateConstraint(constraint.partSlug, "max", undefined)
                }
              />
              <Clickable
                onClick={() => removeConstraint(constraint.partSlug)}
                className="p-1"
              >
                <DeleteIcon fontSize="small" />
              </Clickable>
            </div>
          );
        })}
        {rawDefaults.length > 0 && (
          <>
            <p className="text-xs text-gray-400 mt-3 mb-1">
              Default limits (add to override):
            </p>
            {rawDefaults.map(([slug, limit]) => {
              const part = partSlugLookup[slug];
              if (!part) return null;
              return (
                <div
                  key={slug}
                  className="flex flex-row items-center gap-x-2 mb-1"
                >
                  <Image
                    src={part.iconSmall}
                    alt={part.name}
                    width={24}
                    height={24}
                  />
                  <span className="w-32 text-sm shrink-0">{part.name}</span>
                  <span className="text-sm text-gray-400">
                    max {limit}/min (default)
                  </span>
                </div>
              );
            })}
          </>
        )}
        {showPartSelector ? (
          <div className="mt-3">
            <PartSelector
              existingParts={selectorExcludedSlugs}
              onPartSelected={(part) => addConstraint(part.slug)}
            />
          </div>
        ) : (
          allowedSlugs.size > existingSlugs.length && (
            <Clickable
              onClick={() => setShowPartSelector(true)}
              className="flex flex-row items-center p-1 mt-2"
            >
              <AddIcon fontSize="small" />
              <span className="text-sm ml-1">Add constraint</span>
            </Clickable>
          )
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose}>Cancel</Button>
        <Button onClick={handleApply} variant="contained">
          Apply
        </Button>
      </DialogActions>
    </Dialog>
  );
}
