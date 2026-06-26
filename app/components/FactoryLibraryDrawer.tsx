"use client";

import AddIcon from "@mui/icons-material/Add";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import CreateNewFolderIcon from "@mui/icons-material/CreateNewFolder";
import DeleteIcon from "@mui/icons-material/Delete";
import DownloadIcon from "@mui/icons-material/Download";
import EditIcon from "@mui/icons-material/Edit";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import FolderIcon from "@mui/icons-material/Folder";
import FolderOpenIcon from "@mui/icons-material/FolderOpen";
import UploadIcon from "@mui/icons-material/Upload";
import { Collapse, Drawer, MenuItem, TextField, Tooltip } from "@mui/material";
import { useRef, useState } from "react";
import type {
  FactoryFolder,
  SerializedFactory,
  StorageLibrary,
} from "../models/factory-storage";
import { generateId } from "../models/factory-storage";
import {
  addFactory,
  addFolder,
  downloadJson,
  moveFactory,
  removeFactory,
  removeFolder,
  renameFolder,
  saveLibrary,
} from "../models/storage-service";
import Clickable from "./Clickable";
import { HorizontalDivider } from "./Dividers";

interface Props {
  open: boolean;
  onClose: () => void;
  library: StorageLibrary;
  currentFactoryId: string | null;
  onLibraryChange: (lib: StorageLibrary) => void;
  onLoadFactory: (factory: SerializedFactory) => void;
  onNewFactory: (folderId: string | null) => void;
  onImport: (file: File) => void;
}

interface EditState {
  type: "folder" | "factory";
  id: string;
  value: string;
}

export default function FactoryLibraryDrawer({
  open,
  onClose,
  library,
  currentFactoryId,
  onLibraryChange,
  onLoadFactory,
  onNewFactory,
  onImport,
}: Props) {
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(
    new Set(),
  );
  const [editState, setEditState] = useState<EditState | null>(null);
  const [moveMenuFactory, setMoveMenuFactory] = useState<string | null>(null);
  const importInputRef = useRef<HTMLInputElement>(null);

  function toggleFolder(id: string) {
    setExpandedFolders((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function commitEdit() {
    if (!editState) return;
    const trimmed = editState.value.trim();
    if (!trimmed) {
      setEditState(null);
      return;
    }

    if (editState.type === "folder") {
      const updated = renameFolder(library, editState.id, trimmed);
      saveLibrary(updated);
      onLibraryChange(updated);
    } else {
      const updated: StorageLibrary = {
        ...library,
        factories: library.factories.map((f) =>
          f.id === editState.id ? { ...f, name: trimmed } : f,
        ),
      };
      saveLibrary(updated);
      onLibraryChange(updated);
    }
    setEditState(null);
  }

  function handleDeleteFolder(folder: FactoryFolder) {
    const updated = removeFolder(library, folder.id);
    saveLibrary(updated);
    onLibraryChange(updated);
  }

  function handleDeleteFactory(factory: SerializedFactory) {
    const updated = removeFactory(library, factory.id);
    saveLibrary(updated);
    onLibraryChange(updated);
  }

  function handleDuplicateFactory(factory: SerializedFactory) {
    const now = new Date().toISOString();
    const dupe: SerializedFactory = {
      ...factory,
      id: generateId(),
      name: `${factory.name} (copy)`,
      createdAt: now,
      updatedAt: now,
    };
    const updated = addFactory(library, dupe);
    saveLibrary(updated);
    onLibraryChange(updated);
  }

  function handleAddFolder(parentId: string | null) {
    const { lib, folder } = addFolder(library, "New Folder", parentId);
    saveLibrary(lib);
    onLibraryChange(lib);
    setExpandedFolders((prev) => {
      const next = new Set(prev);
      if (parentId) next.add(parentId);
      return next;
    });
    setEditState({ type: "folder", id: folder.id, value: "New Folder" });
  }

  function handleMoveFactory(factoryId: string, folderId: string | null) {
    const updated = moveFactory(library, factoryId, folderId);
    saveLibrary(updated);
    onLibraryChange(updated);
    setMoveMenuFactory(null);
  }

  function handleExportFactory(factory: SerializedFactory) {
    downloadJson(factory, `${factory.name.replace(/[^a-z0-9]/gi, "_")}.json`);
  }

  function handleExportAll() {
    downloadJson(library, "satisfactory-factories.json");
  }

  function handleImportFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) onImport(file);
    e.target.value = "";
  }

  const rootFactories = library.factories.filter((f) => f.folderId === null);
  const rootFolders = library.folders.filter((f) => f.parentId === null);

  function renderFactoryRow(factory: SerializedFactory, depth = 0) {
    const isCurrent = factory.id === currentFactoryId;
    const isEditing =
      editState?.type === "factory" && editState.id === factory.id;
    const isMoving = moveMenuFactory === factory.id;

    return (
      <div key={factory.id}>
        <Clickable
          className={`flex flex-row items-center gap-x-1 px-2 py-1 ${isCurrent ? "bg-[rgba(128,128,128,0.2)]" : ""}`}
          style="default"
          onClick={() => !isEditing && onLoadFactory(factory)}
        >
          <div style={{ width: depth * 16 }} />
          <div className="w-5 flex-none" />
          {factory.icon ? (
            // biome-ignore lint/performance/noImgElement: local game asset path
            <img
              src={factory.icon}
              alt=""
              width={20}
              height={20}
              className="flex-none"
            />
          ) : (
            <div className="w-5 flex-none" />
          )}
          {isEditing ? (
            <TextField
              size="small"
              value={editState.value}
              autoFocus
              onClick={(e) => e.stopPropagation()}
              onChange={(e) =>
                setEditState({ ...editState, value: e.target.value })
              }
              onBlur={commitEdit}
              onKeyDown={(e) => {
                if (e.key === "Enter") commitEdit();
                if (e.key === "Escape") setEditState(null);
              }}
              className="grow"
            />
          ) : (
            <span className="grow truncate text-sm">{factory.name}</span>
          )}
          {!isEditing && (
            <div className="flex flex-row flex-none">
              <Tooltip title="Rename">
                <span>
                  <Clickable
                    className="p-1"
                    onClick={(e) => {
                      e.stopPropagation();
                      setEditState({
                        type: "factory",
                        id: factory.id,
                        value: factory.name,
                      });
                    }}
                  >
                    <EditIcon fontSize="small" />
                  </Clickable>
                </span>
              </Tooltip>
              <Tooltip title="Export">
                <span>
                  <Clickable
                    className="p-1"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleExportFactory(factory);
                    }}
                  >
                    <DownloadIcon fontSize="small" />
                  </Clickable>
                </span>
              </Tooltip>
              <Tooltip title="Duplicate">
                <span>
                  <Clickable
                    className="p-1"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDuplicateFactory(factory);
                    }}
                  >
                    <ContentCopyIcon fontSize="small" />
                  </Clickable>
                </span>
              </Tooltip>
              <Tooltip title="Move to folder">
                <span>
                  <Clickable
                    className="p-1"
                    onClick={(e) => {
                      e.stopPropagation();
                      setMoveMenuFactory(isMoving ? null : factory.id);
                    }}
                  >
                    <FolderIcon fontSize="small" />
                  </Clickable>
                </span>
              </Tooltip>
              <Tooltip title="Delete">
                <span>
                  <Clickable
                    className="p-1"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteFactory(factory);
                    }}
                  >
                    <DeleteIcon fontSize="small" />
                  </Clickable>
                </span>
              </Tooltip>
            </div>
          )}
        </Clickable>
        {isMoving && (
          <div className="px-4 pb-2">
            <TextField
              select
              size="small"
              fullWidth
              label="Move to"
              value={factory.folderId ?? ""}
              onChange={(e) =>
                handleMoveFactory(factory.id, e.target.value || null)
              }
            >
              <MenuItem value="">Root (no folder)</MenuItem>
              {library.folders.map((f) => (
                <MenuItem key={f.id} value={f.id}>
                  {f.name}
                </MenuItem>
              ))}
            </TextField>
          </div>
        )}
      </div>
    );
  }

  function renderFolderRow(folder: FactoryFolder, depth = 0) {
    const isExpanded = expandedFolders.has(folder.id);
    const isEditing =
      editState?.type === "folder" && editState.id === folder.id;
    const childFolders = library.folders.filter(
      (f) => f.parentId === folder.id,
    );
    const childFactories = library.factories.filter(
      (f) => f.folderId === folder.id,
    );

    return (
      <div key={folder.id}>
        <Clickable
          className="flex flex-row items-center gap-x-1 px-2 py-1"
          onClick={() => !isEditing && toggleFolder(folder.id)}
        >
          <div style={{ width: depth * 16 }} />
          <span className="flex-none text-inherit">
            {isExpanded ? (
              <ExpandMoreIcon fontSize="small" />
            ) : (
              <ChevronRightIcon fontSize="small" />
            )}
          </span>
          <span className="flex-none text-inherit">
            {isExpanded ? (
              <FolderOpenIcon fontSize="small" />
            ) : (
              <FolderIcon fontSize="small" />
            )}
          </span>
          {isEditing ? (
            <TextField
              size="small"
              value={editState.value}
              autoFocus
              onClick={(e) => e.stopPropagation()}
              onChange={(e) =>
                setEditState({ ...editState, value: e.target.value })
              }
              onBlur={commitEdit}
              onKeyDown={(e) => {
                if (e.key === "Enter") commitEdit();
                if (e.key === "Escape") setEditState(null);
              }}
              className="grow"
            />
          ) : (
            <span className="grow truncate text-sm font-medium">
              {folder.name}
            </span>
          )}
          {!isEditing && (
            <div className="flex flex-row flex-none">
              <Tooltip title="New factory here">
                <span>
                  <Clickable
                    className="p-1"
                    onClick={(e) => {
                      e.stopPropagation();
                      onNewFactory(folder.id);
                    }}
                  >
                    <AddIcon fontSize="small" />
                  </Clickable>
                </span>
              </Tooltip>
              <Tooltip title="New subfolder">
                <span>
                  <Clickable
                    className="p-1"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleAddFolder(folder.id);
                    }}
                  >
                    <CreateNewFolderIcon fontSize="small" />
                  </Clickable>
                </span>
              </Tooltip>
              <Tooltip title="Rename">
                <span>
                  <Clickable
                    className="p-1"
                    onClick={(e) => {
                      e.stopPropagation();
                      setEditState({
                        type: "folder",
                        id: folder.id,
                        value: folder.name,
                      });
                    }}
                  >
                    <EditIcon fontSize="small" />
                  </Clickable>
                </span>
              </Tooltip>
              <Tooltip title="Delete folder">
                <span>
                  <Clickable
                    className="p-1"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteFolder(folder);
                    }}
                  >
                    <DeleteIcon fontSize="small" />
                  </Clickable>
                </span>
              </Tooltip>
            </div>
          )}
        </Clickable>
        <Collapse in={isExpanded} unmountOnExit>
          {childFolders.map((f) => renderFolderRow(f, depth + 1))}
          {childFactories.map((f) => renderFactoryRow(f, depth + 1))}
          {childFolders.length === 0 && childFactories.length === 0 && (
            <p className="text-xs px-4 py-1 opacity-50">Empty folder</p>
          )}
        </Collapse>
      </div>
    );
  }

  return (
    <Drawer
      anchor="left"
      open={open}
      onClose={onClose}
      PaperProps={{ sx: { width: 320 } }}
    >
      {/* Header */}
      <div className="flex flex-row items-center justify-between px-4 py-2">
        <span className="font-semibold">Factories</span>
        <div className="flex flex-row">
          <Tooltip title="New factory">
            <span>
              <Clickable className="p-1" onClick={() => onNewFactory(null)}>
                <AddIcon />
              </Clickable>
            </span>
          </Tooltip>
          <Tooltip title="New folder">
            <span>
              <Clickable className="p-1" onClick={() => handleAddFolder(null)}>
                <CreateNewFolderIcon />
              </Clickable>
            </span>
          </Tooltip>
          <Tooltip title="Import">
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
        </div>
      </div>
      <HorizontalDivider />

      {/* Tree */}
      <div className="flex-1 overflow-y-auto">
        {library.factories.length === 0 && library.folders.length === 0 ? (
          <p className="p-4 text-sm opacity-50">
            No saved factories yet. Click + to create one.
          </p>
        ) : (
          <div className="flex flex-col">
            {rootFolders.map((f) => renderFolderRow(f))}
            {rootFactories.map((f) => renderFactoryRow(f))}
          </div>
        )}
      </div>

      {/* Footer */}
      <HorizontalDivider />
      <div className="flex flex-row items-center px-2 py-1">
        <Tooltip title="Export all factories">
          <span>
            <Clickable className="p-1" onClick={handleExportAll}>
              <DownloadIcon fontSize="small" />
            </Clickable>
          </span>
        </Tooltip>
        <span className="text-xs opacity-50 ml-1">Export all</span>
      </div>
    </Drawer>
  );
}
