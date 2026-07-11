"use client";

import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import DeleteIcon from "@mui/icons-material/Delete";
import DownloadIcon from "@mui/icons-material/Download";
import EditIcon from "@mui/icons-material/Edit";
import FolderIcon from "@mui/icons-material/Folder";
import { ListItemIcon, ListItemText, Menu, MenuItem } from "@mui/material";
import { memo } from "react";
import { useLibraryContext } from "@/app/contexts/LibraryContext";
import type useLibrary from "@/app/hooks/useLibrary";
import { downloadJson } from "@/app/lib/download";
import type { SerializedFactory } from "@/app/models/factory-storage";
import ConfirmDialog from "../ui/ConfirmDialog";
import type { MenuState } from "./row-types";

interface LibraryFactoryMenuProps {
  menuState: MenuState | null;
  onClose: () => void;
  onRename: (id: string) => void;
  onMove: (factoryId: string) => void;
  deleteConfirmFactory: SerializedFactory | null;
  onDeleteConfirmFactoryChange: (factory: SerializedFactory | null) => void;
  libraryApi: Pick<
    ReturnType<typeof useLibrary>,
    "duplicateFactory" | "deleteFactory"
  >;
}

function handleExportFactory(factory: SerializedFactory) {
  downloadJson(factory, `${factory.name.replace(/[^a-z0-9]/gi, "_")}.json`);
}

function LibraryFactoryMenu({
  menuState,
  onClose,
  onRename,
  onMove,
  deleteConfirmFactory,
  onDeleteConfirmFactoryChange,
  libraryApi,
}: LibraryFactoryMenuProps) {
  const { library } = useLibraryContext();
  const menuFactory = menuState
    ? (library.factories.find((f) => f.id === menuState.factoryId) ?? null)
    : null;

  return (
    <>
      <Menu
        anchorEl={menuState?.anchorEl}
        open={menuState !== null}
        onClose={onClose}
      >
        <MenuItem
          onClick={() => {
            if (menuFactory) onRename(menuFactory.id);
            onClose();
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
            onClose();
          }}
        >
          <ListItemIcon>
            <DownloadIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Export</ListItemText>
        </MenuItem>
        <MenuItem
          onClick={() => {
            if (menuFactory) libraryApi.duplicateFactory(menuFactory);
            onClose();
          }}
        >
          <ListItemIcon>
            <ContentCopyIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Duplicate</ListItemText>
        </MenuItem>
        <MenuItem
          onClick={() => {
            if (menuFactory) onMove(menuFactory.id);
            onClose();
          }}
        >
          <ListItemIcon>
            <FolderIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Move to folder</ListItemText>
        </MenuItem>
        <MenuItem
          onClick={() => {
            if (menuFactory) onDeleteConfirmFactoryChange(menuFactory);
            onClose();
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
          if (deleteConfirmFactory) {
            libraryApi.deleteFactory(deleteConfirmFactory.id);
          }
          onDeleteConfirmFactoryChange(null);
        }}
        onCancel={() => onDeleteConfirmFactoryChange(null)}
      />
    </>
  );
}

export default memo(LibraryFactoryMenu);
