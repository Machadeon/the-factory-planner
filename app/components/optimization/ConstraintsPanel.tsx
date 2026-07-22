"use client";

import DeleteIcon from "@mui/icons-material/Delete";
import type Factory from "../../models/factory";
import type { PartConstraint } from "../../models/factory";
import {
  defaultResourceLimits,
  partSlugLookup,
  parts,
} from "../../models/game-data";
import AddItemControl from "../ui/AddItemControl";
import Icon from "../ui/Icon";
import IconButton from "../ui/IconButton";
import PartSelector from "../ui/PartSelector";
import TextCalculatorField from "../ui/TextCalculatorField";

interface ConstraintsPanelProps {
  factory: Factory;
}

// Inline, always-visible constraints editor. Live-write: every committed edit
// mutates factory.constraints and re-solves. No Apply/Cancel (see spec R6b).
export default function ConstraintsPanel({ factory }: ConstraintsPanelProps) {
  const constraints = factory.constraints;
  const allowedSlugs = new Set(parts.map((p) => p.slug));
  const existingSlugs = constraints.map((c) => c.partSlug);

  const selectorExcludedSlugs = parts
    .map((p) => p.slug)
    .filter((s) => !allowedSlugs.has(s) || existingSlugs.includes(s));

  const rawDefaults = Object.entries(defaultResourceLimits).filter(
    ([slug]) => allowedSlugs.has(slug) && !existingSlugs.includes(slug),
  );

  function commit(next: PartConstraint[]) {
    factory.setConstraints(next);
  }

  function addConstraint(partSlug: string) {
    const defaultMax = defaultResourceLimits[partSlug];
    commit([...constraints, { partSlug, max: defaultMax }]);
  }

  function removeConstraint(slug: string) {
    commit(constraints.filter((c) => c.partSlug !== slug));
  }

  function updateConstraint(
    slug: string,
    field: "min" | "max",
    value: number | undefined,
  ) {
    commit(
      constraints.map((c) =>
        c.partSlug === slug ? { ...c, [field]: value } : c,
      ),
    );
  }

  return (
    <div data-testid="constraints-panel">
      <p className="text-lg mb-2">Resource Constraints</p>
      {constraints.length === 0 && rawDefaults.length === 0 && (
        <p className="text-sm text-gray-400 mb-3">
          No constraints set. Add a constraint to limit how much of an input or
          output this factory uses.
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
            <Icon src={part.iconSmall} alt={part.name} size={24} />
            <span className="w-32 text-sm shrink-0">{part.name}</span>
            <TextCalculatorField
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
            <IconButton
              aria-label="Remove constraint"
              title="Remove constraint"
              onClick={() => removeConstraint(constraint.partSlug)}
              className="p-1"
            >
              <DeleteIcon fontSize="small" />
            </IconButton>
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
                <Icon src={part.iconSmall} alt={part.name} size={24} />
                <span className="w-32 text-sm shrink-0">{part.name}</span>
                <span className="text-sm text-gray-400">
                  max {limit}/min (default)
                </span>
              </div>
            );
          })}
        </>
      )}
      {allowedSlugs.size > existingSlugs.length && (
        <AddItemControl
          label="Add constraint"
          closeOnBlur={false}
          triggerClassName="flex flex-row items-center p-1 mt-2"
        >
          {(close) => (
            <div className="mt-3">
              <PartSelector
                existingParts={selectorExcludedSlugs}
                onPartSelected={(part) => {
                  addConstraint(part.slug);
                  close();
                }}
              />
            </div>
          )}
        </AddItemControl>
      )}
    </div>
  );
}
