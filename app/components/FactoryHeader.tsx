"use client";

import AddBoxIcon from "@mui/icons-material/AddBox";
import DataObjectIcon from "@mui/icons-material/DataObject";
import DownloadIcon from "@mui/icons-material/Download";
import FolderOpenIcon from "@mui/icons-material/FolderOpen";
import SaveIcon from "@mui/icons-material/Save";
import UploadIcon from "@mui/icons-material/Upload";
import { Badge, Switch, TextField, Tooltip } from "@mui/material";
import { useRef } from "react";
import Clickable from "./Clickable";
import FactoryIconPicker from "./FactoryIconPicker";

interface Props {
  factoryName: string;
  factoryIcon?: string;
  isDirty: boolean;
  autosaveEnabled: boolean;
  onNameChange: (name: string) => void;
  onIconChange: (icon: string | undefined) => void;
  onOpenLibrary: () => void;
  onSave: () => void;
  onToggleAutosave: () => void;
  onExport: () => void;
  onImport: (file: File) => void;
  onNewFactory: () => void;
  onViewJson: () => void;
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
}: Props) {
  const importInputRef = useRef<HTMLInputElement>(null);

  function handleImportFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) onImport(file);
    e.target.value = "";
  }

  return (
    <div className="flex flex-row items-center gap-2 px-4 py-2 border-b border-[rgba(128,128,128,0.2)]">
      <Tooltip title="Open factory library">
        <span>
          <Clickable className="p-1" onClick={onOpenLibrary}>
            <FolderOpenIcon sx={{ fontSize: "2.25rem" }} />
          </Clickable>
        </span>
      </Tooltip>

      <div className="flex flex-row items-center gap-0.5 grow">
        <FactoryIconPicker icon={factoryIcon} onChange={onIconChange} />
        <TextField
          variant="outlined"
          size="small"
          value={factoryName}
          onChange={(e) => onNameChange(e.target.value)}
          placeholder="Unnamed Factory"
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
        <Tooltip title="New factory">
          <span>
            <Clickable className="p-1" onClick={onNewFactory}>
              <AddBoxIcon />
            </Clickable>
          </span>
        </Tooltip>
        <Tooltip title="Import factory from file">
          <span>
            <Clickable
              className="p-1"
              onClick={() => importInputRef.current?.click()}
            >
              <UploadIcon />
            </Clickable>
          </span>
        </Tooltip>
        <input
          ref={importInputRef}
          type="file"
          accept=".json"
          className="hidden"
          onChange={handleImportFile}
        />
        <Tooltip title="Export current factory">
          <span>
            <Clickable className="p-1" onClick={onExport}>
              <DownloadIcon />
            </Clickable>
          </span>
        </Tooltip>
        <Tooltip title="View factory JSON">
          <span>
            <Clickable className="p-1" onClick={onViewJson}>
              <DataObjectIcon />
            </Clickable>
          </span>
        </Tooltip>
        <Tooltip title={isDirty ? "Save (unsaved changes)" : "Save"}>
          <span>
            <Clickable className="p-1" onClick={onSave}>
              <Badge color="warning" variant="dot" invisible={!isDirty}>
                <SaveIcon />
              </Badge>
            </Clickable>
          </span>
        </Tooltip>
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
