import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import { type ReactNode, useState } from "react";
import ActionRow from "./ActionRow";

export interface CollapsibleSectionProps {
  label: string;
  defaultExpanded: boolean;
  children: ReactNode;
}

export default function CollapsibleSection({
  label,
  defaultExpanded,
  children,
}: CollapsibleSectionProps) {
  const [expanded, setExpanded] = useState(defaultExpanded);

  return (
    <>
      <ActionRow
        onClick={() => setExpanded((v) => !v)}
        aria-expanded={expanded}
        className="flex flex-row items-center mb-2 w-full"
      >
        <span className="text-lg grow text-gray-400">{label}</span>
        {expanded ? (
          <ExpandMoreIcon fontSize="small" />
        ) : (
          <ChevronRightIcon fontSize="small" />
        )}
      </ActionRow>
      {expanded && children}
    </>
  );
}
