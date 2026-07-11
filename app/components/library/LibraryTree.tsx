"use client";

import { useLibraryContext } from "@/app/contexts/LibraryContext";
import type useLibrary from "@/app/hooks/useLibrary";
import LibraryFactoryRow from "./LibraryFactoryRow";
import LibraryFolderRow from "./LibraryFolderRow";
import type { RowActions, RowState } from "./row-types";

interface LibraryTreeProps {
  rowState: RowState;
  rowActions: RowActions;
  libraryApi: Pick<ReturnType<typeof useLibrary>, "moveFactory">;
}

export default function LibraryTree({
  rowState,
  rowActions,
  libraryApi,
}: LibraryTreeProps) {
  const { library } = useLibraryContext();
  const rootFactories = library.factories.filter((f) => f.folderId === null);
  const rootFolders = library.folders.filter((f) => f.parentId === null);

  if (library.factories.length === 0 && library.folders.length === 0) {
    return (
      <p className="p-4 text-sm opacity-50">
        No saved factories yet. Click + to create one.
      </p>
    );
  }

  return (
    <div className="flex flex-col">
      {rootFolders
        .sort((a, b) => a.name.localeCompare(b.name))
        .map((f) => (
          <LibraryFolderRow
            key={f.id}
            folder={f}
            rowState={rowState}
            rowActions={rowActions}
            libraryApi={libraryApi}
          />
        ))}
      {rootFactories
        .sort((a, b) => a.name.localeCompare(b.name))
        .map((f) => (
          <LibraryFactoryRow
            key={f.id}
            factory={f}
            rowState={rowState}
            rowActions={rowActions}
            libraryApi={libraryApi}
          />
        ))}
    </div>
  );
}
