"use client";

import AddIcon from "@mui/icons-material/Add";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import CreateNewFolderIcon from "@mui/icons-material/CreateNewFolder";
import DeleteIcon from "@mui/icons-material/Delete";
import EditIcon from "@mui/icons-material/Edit";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import FolderIcon from "@mui/icons-material/Folder";
import FolderOpenIcon from "@mui/icons-material/FolderOpen";
import { Collapse } from "@mui/material";
import { memo } from "react";
import { useLibraryContext } from "@/app/contexts/LibraryContext";
import type useLibrary from "@/app/hooks/useLibrary";
import type { FactoryFolder } from "@/app/models/factory-storage";
import ActionRow from "../ui/ActionRow";
import IconButton from "../ui/IconButton";
import InlineEditText from "../ui/InlineEditText";
import { rowVisualClasses } from "../ui/interactive-styles";
import LibraryFactoryRow from "./LibraryFactoryRow";
import type { RowActions, RowState } from "./row-types";

interface LibraryFolderRowProps {
  folder: FactoryFolder;
  depth?: number;
  rowState: RowState;
  rowActions: RowActions;
  libraryApi: Pick<ReturnType<typeof useLibrary>, "moveFactory">;
}

function LibraryFolderRow({
  folder,
  depth = 0,
  rowState,
  rowActions,
  libraryApi,
}: LibraryFolderRowProps) {
  const { library } = useLibraryContext();
  const isExpanded = rowState.expandedFolders.has(folder.id);
  const isEditing =
    rowState.editState?.type === "folder" &&
    rowState.editState.id === folder.id;
  const childFolders = library.folders.filter((f) => f.parentId === folder.id);
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
              aria-label="Rename folder"
              onCommit={rowActions.commitRename}
              onCancel={() => rowActions.setEditState(null)}
              className="grow"
            />
          </>
        ) : (
          <>
            <ActionRow
              bare
              aria-expanded={isExpanded}
              onClick={() => rowActions.toggleFolder(folder.id)}
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
                  rowActions.onNewFactory(folder.id);
                }}
              >
                <AddIcon fontSize="small" />
              </IconButton>
              <IconButton
                aria-label="New subfolder"
                className="p-1"
                onClick={(e) => {
                  e.stopPropagation();
                  rowActions.handleAddFolder(folder.id);
                }}
              >
                <CreateNewFolderIcon fontSize="small" />
              </IconButton>
              <IconButton
                aria-label="Rename"
                className="p-1"
                onClick={(e) => {
                  e.stopPropagation();
                  rowActions.setEditState({ type: "folder", id: folder.id });
                }}
              >
                <EditIcon fontSize="small" />
              </IconButton>
              <IconButton
                aria-label="Delete folder"
                className="p-1"
                onClick={(e) => {
                  e.stopPropagation();
                  rowActions.setDeleteConfirmFolder(folder);
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
          .map((f) => (
            <LibraryFolderRow
              key={f.id}
              folder={f}
              depth={depth + 1}
              rowState={rowState}
              rowActions={rowActions}
              libraryApi={libraryApi}
            />
          ))}
        {childFactories
          .sort((a, b) => a.name.localeCompare(b.name))
          .map((f) => (
            <LibraryFactoryRow
              key={f.id}
              factory={f}
              depth={depth + 1}
              rowState={rowState}
              rowActions={rowActions}
              libraryApi={libraryApi}
            />
          ))}
        {childFolders.length === 0 && childFactories.length === 0 && (
          <p className="text-xs px-4 py-1 opacity-50">Empty folder</p>
        )}
      </Collapse>
    </div>
  );
}

export default memo(LibraryFolderRow);
