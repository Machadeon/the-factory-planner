"use client";

import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import DeleteIcon from "@mui/icons-material/Delete";
import DownloadIcon from "@mui/icons-material/Download";
import EditIcon from "@mui/icons-material/Edit";
import FolderIcon from "@mui/icons-material/Folder";
import { memo } from "react";
import { useLibraryContext } from "@/app/contexts/LibraryContext";
import type useLibrary from "@/app/hooks/useLibrary";
import { downloadJson } from "@/app/lib/download";
import type { SerializedFactory } from "@/app/models/factory-storage";
import ConfirmDialog from "../ui/ConfirmDialog";
import Menu from "../ui/Menu";
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
        items={[
          {
            key: "rename",
            label: "Rename",
            icon: <EditIcon fontSize="small" />,
            onClick: () => {
              if (menuFactory) onRename(menuFactory.id);
              onClose();
            },
          },
          {
            key: "export",
            label: "Export",
            icon: <DownloadIcon fontSize="small" />,
            onClick: () => {
              if (menuFactory) handleExportFactory(menuFactory);
              onClose();
            },
          },
          {
            key: "duplicate",
            label: "Duplicate",
            icon: <ContentCopyIcon fontSize="small" />,
            onClick: () => {
              if (menuFactory) libraryApi.duplicateFactory(menuFactory);
              onClose();
            },
          },
          {
            key: "move",
            label: "Move to folder",
            icon: <FolderIcon fontSize="small" />,
            onClick: () => {
              if (menuFactory) onMove(menuFactory.id);
              onClose();
            },
          },
          {
            key: "delete",
            label: "Delete",
            icon: <DeleteIcon fontSize="small" />,
            danger: true,
            onClick: () => {
              if (menuFactory) onDeleteConfirmFactoryChange(menuFactory);
              onClose();
            },
          },
        ]}
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
