"use client";

import AddIcon from "@mui/icons-material/Add";
import CreateNewFolderIcon from "@mui/icons-material/CreateNewFolder";
import DownloadIcon from "@mui/icons-material/Download";
import PushPinIcon from "@mui/icons-material/PushPin";
import PushPinOutlinedIcon from "@mui/icons-material/PushPinOutlined";
import UploadIcon from "@mui/icons-material/Upload";
import { Drawer } from "@mui/material";
import { useCallback, useMemo, useState } from "react";
import { useLibraryContext } from "@/app/contexts/LibraryContext";
import type useLibrary from "@/app/hooks/useLibrary";
import { downloadJson } from "@/app/lib/download";
import type {
  FactoryFolder,
  SerializedFactory,
} from "@/app/models/factory-storage";
import { HorizontalDivider } from "../Dividers";
import ConfirmDialog from "../ui/ConfirmDialog";
import FileImportButton from "../ui/FileImportButton";
import IconButton from "../ui/IconButton";
import LibraryFactoryMenu from "./LibraryFactoryMenu";
import LibraryTree from "./LibraryTree";
import type { EditState, MenuState, RowActions, RowState } from "./row-types";

interface LibraryDrawerProps {
  open: boolean;
  onClose: () => void;
  libraryApi: ReturnType<typeof useLibrary>;
  onLoadFactory: (factory: SerializedFactory) => void;
  onNewFactory: (folderId: string | null) => void;
  onImport: (file: File) => void;
  pinned?: boolean;
  onPinChange?: (pinned: boolean) => void;
}

export default function LibraryDrawer({
  open,
  onClose,
  libraryApi,
  onLoadFactory,
  onNewFactory,
  onImport,
  pinned,
  onPinChange,
}: LibraryDrawerProps) {
  const { library } = useLibraryContext();
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

  const toggleFolder = useCallback((id: string) => {
    setExpandedFolders((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  // Trimming and empty-cancel live in InlineEditText; this just persists.
  const commitRename = useCallback(
    (trimmed: string) => {
      if (!editState) return;
      if (editState.type === "folder") {
        libraryApi.renameFolder(editState.id, trimmed);
      } else {
        libraryApi.renameFactory(editState.id, trimmed);
      }
      setEditState(null);
    },
    [editState, libraryApi.renameFactory, libraryApi.renameFolder],
  );

  const closeMenu = useCallback(() => {
    setMenuState(null);
  }, []);

  const handleAddFolder = useCallback(
    (parentId: string | null) => {
      const { folder } = libraryApi.addFolder("New Folder", parentId);
      setExpandedFolders((prev) => {
        const next = new Set(prev);
        if (parentId) next.add(parentId);
        return next;
      });
      setEditState({ type: "folder", id: folder.id });
    },
    [libraryApi.addFolder],
  );

  const handleExportAll = useCallback(() => {
    downloadJson(library, "satisfactory-factories.json");
  }, [library]);

  const rowState: RowState = useMemo(
    () => ({
      expandedFolders,
      editState,
      moveMenuFactory,
      menuState,
      deleteConfirmFactory,
      deleteConfirmFolder,
    }),
    [
      expandedFolders,
      editState,
      moveMenuFactory,
      menuState,
      deleteConfirmFactory,
      deleteConfirmFolder,
    ],
  );

  const rowActions: RowActions = useMemo(
    () => ({
      toggleFolder,
      commitRename,
      closeMenu,
      handleAddFolder,
      setEditState,
      setMoveMenuFactory,
      setMenuState,
      setDeleteConfirmFactory,
      setDeleteConfirmFolder,
      onLoadFactory,
      onNewFactory,
    }),
    [
      toggleFolder,
      commitRename,
      closeMenu,
      handleAddFolder,
      onLoadFactory,
      onNewFactory,
    ],
  );

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
        <LibraryTree
          rowState={rowState}
          rowActions={rowActions}
          libraryApi={libraryApi}
        />
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

      <LibraryFactoryMenu
        menuState={menuState}
        onClose={closeMenu}
        onRename={(id) => setEditState({ type: "factory", id })}
        onMove={(factoryId) => setMoveMenuFactory(factoryId)}
        deleteConfirmFactory={deleteConfirmFactory}
        onDeleteConfirmFactoryChange={setDeleteConfirmFactory}
        libraryApi={libraryApi}
      />
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
          if (deleteConfirmFolder)
            libraryApi.deleteFolder(deleteConfirmFolder.id);
          setDeleteConfirmFolder(null);
        }}
        onCancel={() => setDeleteConfirmFolder(null)}
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
      slotProps={{ paper: { sx: { width: 320 } } }}
    >
      {content}
    </Drawer>
  );
}
