"use client";

import CancelIcon from "@mui/icons-material/Cancel";
import DataObjectIcon from "@mui/icons-material/DataObject";
import DownloadIcon from "@mui/icons-material/Download";
import FolderOpenIcon from "@mui/icons-material/FolderOpen";
import SaveIcon from "@mui/icons-material/Save";
import UnfoldLessIcon from "@mui/icons-material/UnfoldLess";
import UnfoldMoreIcon from "@mui/icons-material/UnfoldMore";
import UploadIcon from "@mui/icons-material/Upload";
import { Badge, Switch, TextField, Tooltip } from "@mui/material";
import FactoryIconPicker from "./FactoryIconPicker";
import FileImportButton from "./ui/FileImportButton";
import IconButton from "./ui/IconButton";

interface Props {
  factoryName: string;
  factoryIcon?: string;
  isDirty: boolean;
  autosaveEnabled: boolean;
  onNameChange: (name: string) => void;
  onIconChange: (icon: string | undefined) => void;
  onOpenLibrary?: () => void;
  onSave: () => void;
  onToggleAutosave: () => void;
  onExport: () => void;
  onImport: (file: File) => void;
  onNewFactory: () => void;
  onViewJson: () => void;
  onExpandAll?: () => void;
  onCollapseAll?: () => void;
  productionLineCount?: number;
}

export default function FactoryHeader({
  factoryName,
  factoryIcon,
  isDirty,
  autosaveEnabled,
  onNameChange,
  onIconChange,
  onOpenLibrary,
  onSave,
  onToggleAutosave,
  onExport,
  onImport,
  onNewFactory,
  onViewJson,
  onExpandAll,
  onCollapseAll,
  productionLineCount,
}: Props) {
  function handleOpenLibrary() {
    onOpenLibrary?.();
  }

  return (
    <div className="flex flex-row items-center gap-2 px-4 py-2 border-b border-[rgba(128,128,128,0.2)]">
      {onOpenLibrary && (
        <IconButton
          aria-label="Open factory library"
          className="p-1"
          onClick={handleOpenLibrary}
        >
          <FolderOpenIcon sx={{ fontSize: "2.25rem" }} />
        </IconButton>
      )}

      <div className="flex flex-row items-center gap-0.5 grow">
        <FactoryIconPicker icon={factoryIcon} onChange={onIconChange} />
        <TextField
          variant="outlined"
          size="small"
          value={factoryName}
          onChange={(e) => onNameChange(e.target.value)}
          placeholder="Factory Name"
          inputProps={{ "aria-label": "Factory name" }}
          sx={{
            flexGrow: 1,
            "& .MuiOutlinedInput-root": {
              fontWeight: 600,
              fontSize: "1.5rem",
              "& fieldset": { borderColor: "transparent" },
              "&:hover fieldset": { borderColor: "rgba(128,128,128,0.4)" },
              "&.Mui-focused fieldset": {
                borderColor: "rgba(128,128,128,0.6)",
              },
            },
          }}
        />
      </div>

      <div className="flex flex-row ml-auto">
        {onExpandAll && onCollapseAll && (
          <>
            <IconButton
              aria-label={
                productionLineCount ? "Expand all" : "No production lines"
              }
              className={`p-1 ${!productionLineCount ? "opacity-50 cursor-default" : ""}`}
              onClick={productionLineCount ? onExpandAll : () => {}}
            >
              <UnfoldMoreIcon fontSize="small" />
            </IconButton>
            <IconButton
              aria-label={
                productionLineCount ? "Collapse all" : "No production lines"
              }
              className={`p-1 ${!productionLineCount ? "opacity-50 cursor-default" : ""}`}
              onClick={productionLineCount ? onCollapseAll : () => {}}
            >
              <UnfoldLessIcon fontSize="small" />
            </IconButton>
          </>
        )}
        <IconButton
          aria-label="Clear factory"
          className="p-1"
          onClick={onNewFactory}
        >
          <CancelIcon />
        </IconButton>
        <FileImportButton
          aria-label="Import factory from file"
          accept=".json"
          className="p-1"
          onFile={onImport}
        >
          <UploadIcon />
        </FileImportButton>
        <IconButton
          aria-label="Export current factory"
          className="p-1"
          onClick={onExport}
        >
          <DownloadIcon />
        </IconButton>
        <IconButton
          aria-label="View factory JSON"
          className="p-1"
          onClick={onViewJson}
        >
          <DataObjectIcon />
        </IconButton>
        <IconButton
          aria-label={isDirty ? "Save (unsaved changes)" : "Save"}
          className="p-1"
          onClick={onSave}
        >
          <Badge color="warning" variant="dot" invisible={!isDirty}>
            <SaveIcon />
          </Badge>
        </IconButton>
        <Tooltip title={autosaveEnabled ? "Autosave on" : "Autosave off"}>
          <span className="flex items-center">
            <Switch
              size="small"
              checked={autosaveEnabled}
              onChange={() => onToggleAutosave()}
            />
          </span>
        </Tooltip>
      </div>
    </div>
  );
}
