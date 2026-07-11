import type {
  FactoryFolder,
  SerializedFactory,
} from "@/app/models/factory-storage";

export interface EditState {
  type: "folder" | "factory";
  id: string;
}

export interface MenuState {
  anchorEl: HTMLElement;
  factoryId: string;
}

// Transient UI state, lifted to LibraryDrawer.tsx and threaded down as one
// prop (see design.md D1a/D1b) instead of re-derived or duplicated per row.
export interface RowState {
  expandedFolders: Set<string>;
  editState: EditState | null;
  moveMenuFactory: string | null;
  menuState: MenuState | null;
  deleteConfirmFactory: SerializedFactory | null;
  deleteConfirmFolder: FactoryFolder | null;
}

// Closed member list — see design.md D1a/D1b's table for each member's
// useCallback stability rule. `onLoadFactory`/`onNewFactory` are pass-through
// flows (originally separate props on FactoryLibraryDrawer, sourced from
// LibraryDrawerSlot's `flows`) bundled in here for the same threading
// convenience as the locally-owned actions above — not new state.
export interface RowActions {
  toggleFolder: (id: string) => void;
  commitRename: (trimmed: string) => void;
  closeMenu: () => void;
  handleAddFolder: (parentId: string | null) => void;
  setEditState: (state: EditState | null) => void;
  setMoveMenuFactory: (id: string | null) => void;
  setMenuState: (state: MenuState | null) => void;
  setDeleteConfirmFactory: (factory: SerializedFactory | null) => void;
  setDeleteConfirmFolder: (folder: FactoryFolder | null) => void;
  onLoadFactory: (factory: SerializedFactory) => void;
  onNewFactory: (folderId: string | null) => void;
}
