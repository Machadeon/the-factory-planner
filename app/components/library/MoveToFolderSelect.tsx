"use client";

import { MenuItem, TextField } from "@mui/material";
import { useLibraryContext } from "@/app/contexts/LibraryContext";
import type useLibrary from "@/app/hooks/useLibrary";
import type { SerializedFactory } from "@/app/models/factory-storage";

interface MoveToFolderSelectProps {
  factory: SerializedFactory;
  libraryApi: Pick<ReturnType<typeof useLibrary>, "moveFactory">;
  onMoved: () => void;
}

export default function MoveToFolderSelect({
  factory,
  libraryApi,
  onMoved,
}: MoveToFolderSelectProps) {
  const { library } = useLibraryContext();

  return (
    <div className="px-4 pb-2">
      <TextField
        select
        size="small"
        fullWidth
        label="Move to"
        value={factory.folderId ?? ""}
        onChange={(e) => {
          libraryApi.moveFactory(factory.id, e.target.value || null);
          onMoved();
        }}
      >
        <MenuItem value="">Root (no folder)</MenuItem>
        {library.folders.map((f) => (
          <MenuItem key={f.id} value={f.id}>
            {f.name}
          </MenuItem>
        ))}
      </TextField>
    </div>
  );
}
