"use client";

import { Alert, Tab, Tabs } from "@mui/material";
import type { Section } from "@/app/hooks/useFactoryUrlSync";
import { formatSolverError } from "@/app/lib/format-solver-error";
import type { SolverError } from "@/app/models/solver/errors";

interface SectionTabsProps {
  activeSection: Section;
  onSectionChange: (section: Section) => void;
  solverError: SolverError | null;
}

export default function SectionTabs({
  activeSection,
  onSectionChange,
  solverError,
}: SectionTabsProps) {
  return (
    <>
      <Tabs
        value={activeSection}
        onChange={(_, v) => onSectionChange(v as Section)}
        className="border-b border-gray-700"
      >
        <Tab label="Planning" value="planning" />
        <Tab label="Optimization" value="optimization" />
        <Tab label="Logistics" value="logistics" />
      </Tabs>

      {solverError && (
        <Alert severity="warning" className="m-2 text-sm">
          {formatSolverError(solverError)}
        </Alert>
      )}
    </>
  );
}
