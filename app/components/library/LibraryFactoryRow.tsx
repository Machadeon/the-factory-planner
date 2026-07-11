"use client";

import MoreVertIcon from "@mui/icons-material/MoreVert";
import { memo } from "react";
import { useLibraryContext } from "@/app/contexts/LibraryContext";
import type useLibrary from "@/app/hooks/useLibrary";
import type { SerializedFactory } from "@/app/models/factory-storage";
import ActionRow from "../ui/ActionRow";
import Icon from "../ui/Icon";
import IconButton from "../ui/IconButton";
import InlineEditText from "../ui/InlineEditText";
import { rowVisualClasses } from "../ui/interactive-styles";
import MoveToFolderSelect from "./MoveToFolderSelect";
import type { RowActions, RowState } from "./row-types";

interface LibraryFactoryRowProps {
  factory: SerializedFactory;
  depth?: number;
  rowState: RowState;
  rowActions: RowActions;
  libraryApi: Pick<ReturnType<typeof useLibrary>, "moveFactory">;
}

function LibraryFactoryRow({
  factory,
  depth = 0,
  rowState,
  rowActions,
  libraryApi,
}: LibraryFactoryRowProps) {
  const { currentFactoryId } = useLibraryContext();
  const isCurrent = factory.id === currentFactoryId;
  const isEditing =
    rowState.editState?.type === "factory" &&
    rowState.editState.id === factory.id;
  const isMoving = rowState.moveMenuFactory === factory.id;

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
              aria-label="Rename factory"
              onCommit={rowActions.commitRename}
              onCancel={() => rowActions.setEditState(null)}
              className="grow"
            />
          </>
        ) : (
          <>
            <ActionRow
              bare
              onClick={() => rowActions.onLoadFactory(factory)}
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
                rowActions.setMenuState({
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
        <MoveToFolderSelect
          factory={factory}
          libraryApi={libraryApi}
          onMoved={() => rowActions.setMoveMenuFactory(null)}
        />
      )}
    </div>
  );
}

export default memo(LibraryFactoryRow);
