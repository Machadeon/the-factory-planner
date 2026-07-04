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
import MoreVertIcon from "@mui/icons-material/MoreVert";
import PushPinIcon from "@mui/icons-material/PushPin";
import PushPinOutlinedIcon from "@mui/icons-material/PushPinOutlined";
import UploadIcon from "@mui/icons-material/Upload";
import {
  Collapse,
  Drawer,
  ListItemIcon,
  ListItemText,
  Menu,
  MenuItem,
  TextField,
} from "@mui/material";
import { useState } from "react";
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
import { HorizontalDivider } from "./Dividers";
import ActionRow from "./ui/ActionRow";
import ConfirmDialog from "./ui/ConfirmDialog";
import FileImportButton from "./ui/FileImportButton";
import Icon from "./ui/Icon";
import IconButton from "./ui/IconButton";
import InlineEditText from "./ui/InlineEditText";
import { rowVisualClasses } from "./ui/interactive-styles";

interface Props {
  open: boolean;
  onClose: () => void;
  library: StorageLibrary;
  currentFactoryId: string | null;
  onLibraryChange: (lib: StorageLibrary) => void;
  onLoadFactory: (factory: SerializedFactory) => void;
  onNewFactory: (folderId: string | null) => void;
  onImport: (file: File) => void;
  pinned?: boolean;
  onPinChange?: (pinned: boolean) => void;
}

interface EditState {
  type: "folder" | "factory";
  id: string;
}

interface MenuState {
  anchorEl: HTMLElement;
  factoryId: string;
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
  pinned,
  onPinChange,
}: Props) {
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(
    new Set(),
  );
  const [editState, setEditState] = useState<EditState | null>(null);
  const [moveMenuFactory, setMoveMenuFactory] = useState<string | null>(null);
  const [menuState, setMenuState] = useState<MenuState | null>(null);
  const [deleteConfirmFactory, setDeleteConfirmFactory] =
    useState<SerializedFactory | null>(null);
  const [deleteConfirmFolder, setDeleteConfirmFolder] =
    useState<FactoryFolder | null>(null);

  function toggleFolder(id: string) {
    setExpandedFolders((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  // Trimming and empty-cancel live in InlineEditText; these just persist.
  function commitRename(trimmed: string) {
    if (!editState) return;
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
    setEditState({ type: "folder", id: folder.id });
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

  function closeMenu() {
    setMenuState(null);
  }

  const menuFactory = menuState
    ? (library.factories.find((f) => f.id === menuState.factoryId) ?? null)
    : null;

  const rootFactories = library.factories.filter((f) => f.folderId === null);
  const rootFolders = library.folders.filter((f) => f.parentId === null);

  function renderFactoryRow(factory: SerializedFactory, depth = 0) {
    const isCurrent = factory.id === currentFactoryId;
    const isEditing =
      editState?.type === "factory" && editState.id === factory.id;
    const isMoving = moveMenuFactory === factory.id;

    const factoryIcon = factory.icon ? (
      <Icon src={factory.icon} label="" size={20} className="flex-none" />
    ) : (
      <div className="w-5 flex-none" />
    );

    return (
      <div key={factory.id}>
        <div
          className={rowVisualClasses(
            "default",
            `flex flex-row items-center gap-x-1 px-2 py-1 ${isCurrent ? "bg-[rgba(128,128,128,0.2)]" : ""}`,
          )}
        >
          {isEditing ? (
            <>
              <div style={{ width: depth * 16 }} className="flex-none" />
              {factoryIcon}
              <InlineEditText
                value={factory.name}
                aria-label="Factory name"
                onCommit={commitRename}
                onCancel={() => setEditState(null)}
                className="grow"
              />
            </>
          ) : (
            <>
              <ActionRow
                bare
                onClick={() => onLoadFactory(factory)}
                className="flex flex-row items-center gap-x-1 grow min-w-0"
              >
                <div style={{ width: depth * 16 }} className="flex-none" />
                {factoryIcon}
                <span className="grow truncate text-sm">{factory.name}</span>
              </ActionRow>
              <IconButton
                aria-label="Actions"
                className="p-1 flex-none"
                onClick={(e) => {
                  e.stopPropagation();
                  setMenuState({
                    anchorEl: e.currentTarget as HTMLElement,
                    factoryId: factory.id,
                  });
                }}
              >
                <MoreVertIcon fontSize="small" />
              </IconButton>
            </>
          )}
        </div>
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

    const chevronAndIcon = (
      <>
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
      </>
    );

    return (
      <div key={folder.id}>
        <div
          className={rowVisualClasses(
            "default",
            "flex flex-row items-center gap-x-1 px-2 py-1",
          )}
        >
          {isEditing ? (
            <>
              <div style={{ width: depth * 16 }} className="flex-none" />
              {chevronAndIcon}
              <InlineEditText
                value={folder.name}
                aria-label="Folder name"
                onCommit={commitRename}
                onCancel={() => setEditState(null)}
                className="grow"
              />
            </>
          ) : (
            <>
              <ActionRow
                bare
                aria-expanded={isExpanded}
                onClick={() => toggleFolder(folder.id)}
                className="flex flex-row items-center gap-x-1 grow min-w-0"
              >
                <div style={{ width: depth * 16 }} className="flex-none" />
                {chevronAndIcon}
                <span className="grow truncate text-sm font-medium">
                  {folder.name}
                </span>
              </ActionRow>
              <div className="flex flex-row flex-none">
                <IconButton
                  aria-label="New factory here"
                  className="p-1"
                  onClick={(e) => {
                    e.stopPropagation();
                    onNewFactory(folder.id);
                  }}
                >
                  <AddIcon fontSize="small" />
                </IconButton>
                <IconButton
                  aria-label="New subfolder"
                  className="p-1"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleAddFolder(folder.id);
                  }}
                >
                  <CreateNewFolderIcon fontSize="small" />
                </IconButton>
                <IconButton
                  aria-label="Rename"
                  className="p-1"
                  onClick={(e) => {
                    e.stopPropagation();
                    setEditState({ type: "folder", id: folder.id });
                  }}
                >
                  <EditIcon fontSize="small" />
                </IconButton>
                <IconButton
                  aria-label="Delete folder"
                  className="p-1"
                  onClick={(e) => {
                    e.stopPropagation();
                    setDeleteConfirmFolder(folder);
                  }}
                >
                  <DeleteIcon fontSize="small" />
                </IconButton>
              </div>
            </>
          )}
        </div>
        <Collapse in={isExpanded} unmountOnExit>
          {childFolders
            .sort((a, b) => a.name.localeCompare(b.name))
            .map((f) => renderFolderRow(f, depth + 1))}
          {childFactories
            .sort((a, b) => a.name.localeCompare(b.name))
            .map((f) => renderFactoryRow(f, depth + 1))}
          {childFolders.length === 0 && childFactories.length === 0 && (
            <p className="text-xs px-4 py-1 opacity-50">Empty folder</p>
          )}
        </Collapse>
      </div>
    );
  }

  const content = (
    <>
      {/* Header */}
      <div className="flex flex-row items-center justify-between px-4 py-2">
        <span className="font-semibold">Factories</span>
        <div className="flex flex-row">
          {onPinChange && (
            <IconButton
              aria-label={pinned ? "Unpin sidebar" : "Pin sidebar"}
              className="p-1"
              onClick={() => onPinChange(!pinned)}
            >
              {pinned ? (
                <PushPinIcon fontSize="small" />
              ) : (
                <PushPinOutlinedIcon fontSize="small" />
              )}
            </IconButton>
          )}
          <IconButton
            aria-label="New factory"
            className="p-1"
            onClick={() => onNewFactory(null)}
          >
            <AddIcon />
          </IconButton>
          <IconButton
            aria-label="New folder"
            className="p-1"
            onClick={() => handleAddFolder(null)}
          >
            <CreateNewFolderIcon />
          </IconButton>
          <FileImportButton
            aria-label="Import"
            accept=".json"
            className="p-1"
            onFile={onImport}
          >
            <UploadIcon />
          </FileImportButton>
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
            {rootFolders
              .sort((a, b) => a.name.localeCompare(b.name))
              .map((f) => renderFolderRow(f))}
            {rootFactories
              .sort((a, b) => a.name.localeCompare(b.name))
              .map((f) => renderFactoryRow(f))}
          </div>
        )}
      </div>

      {/* Footer */}
      <HorizontalDivider />
      <div className="flex flex-row items-center px-2 py-1">
        <IconButton
          aria-label="Export all factories"
          className="p-1"
          onClick={handleExportAll}
        >
          <DownloadIcon fontSize="small" />
        </IconButton>
        <span className="text-xs opacity-50 ml-1">Export all</span>
      </div>

      {/* Factory actions dropdown */}
      <Menu
        anchorEl={menuState?.anchorEl}
        open={menuState !== null}
        onClose={closeMenu}
      >
        <MenuItem
          onClick={() => {
            if (menuFactory) {
              setEditState({ type: "factory", id: menuFactory.id });
            }
            closeMenu();
          }}
        >
          <ListItemIcon>
            <EditIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Rename</ListItemText>
        </MenuItem>
        <MenuItem
          onClick={() => {
            if (menuFactory) handleExportFactory(menuFactory);
            closeMenu();
          }}
        >
          <ListItemIcon>
            <DownloadIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Export</ListItemText>
        </MenuItem>
        <MenuItem
          onClick={() => {
            if (menuFactory) handleDuplicateFactory(menuFactory);
            closeMenu();
          }}
        >
          <ListItemIcon>
            <ContentCopyIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Duplicate</ListItemText>
        </MenuItem>
        <MenuItem
          onClick={() => {
            if (menuFactory) setMoveMenuFactory(menuFactory.id);
            closeMenu();
          }}
        >
          <ListItemIcon>
            <FolderIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Move to folder</ListItemText>
        </MenuItem>
        <MenuItem
          onClick={() => {
            if (menuFactory) setDeleteConfirmFactory(menuFactory);
            closeMenu();
          }}
          sx={{ color: "error.main" }}
        >
          <ListItemIcon sx={{ color: "inherit" }}>
            <DeleteIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Delete</ListItemText>
        </MenuItem>
      </Menu>
      <ConfirmDialog
        open={deleteConfirmFolder !== null}
        title="Delete folder?"
        message={
          <>
            &ldquo;{deleteConfirmFolder?.name}&rdquo; and all its contents will
            be permanently deleted.
          </>
        }
        confirmLabel="Delete"
        severity="danger"
        onConfirm={() => {
          if (deleteConfirmFolder) handleDeleteFolder(deleteConfirmFolder);
          setDeleteConfirmFolder(null);
        }}
        onCancel={() => setDeleteConfirmFolder(null)}
      />
      <ConfirmDialog
        open={deleteConfirmFactory !== null}
        title="Delete factory?"
        message={
          <>
            &ldquo;{deleteConfirmFactory?.name}&rdquo; will be permanently
            deleted.
          </>
        }
        confirmLabel="Delete"
        severity="danger"
        onConfirm={() => {
          if (deleteConfirmFactory) handleDeleteFactory(deleteConfirmFactory);
          setDeleteConfirmFactory(null);
        }}
        onCancel={() => setDeleteConfirmFactory(null)}
      />
    </>
  );

  if (pinned) {
    return (
      <div
        className="flex flex-col flex-none border-r border-gray-700 overflow-hidden"
        style={{ width: 320 }}
      >
        {content}
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
      {content}
    </Drawer>
  );
}
