"use client";

import type { Section } from "@/app/hooks/useFactoryUrlSync";
import { formatSolverError } from "@/app/lib/format-solver-error";
import type { SolverError } from "@/app/models/solver/errors";
import Tabs from "../ui/Tabs";

interface SectionTabsProps {
  activeSection: Section;
  onSectionChange: (section: Section) => void;
  solverError: SolverError | null;
}

const TABS = [
  { value: "planning", label: "Planning" },
  { value: "optimization", label: "Optimization" },
  { value: "logistics", label: "Logistics" },
];

export default function SectionTabs({
  activeSection,
  onSectionChange,
  solverError,
}: SectionTabsProps) {
  return (
    <>
      <Tabs
        tabs={TABS}
        value={activeSection}
        onChange={(v) => onSectionChange(v as Section)}
      />

      {solverError && (
        <div
          role="alert"
          className="m-2 p-2 text-sm rounded-sm bg-amber-500/10 text-amber-400 border border-amber-500/30"
        >
          {formatSolverError(solverError)}
        </div>
      )}
    </>
  );
}
