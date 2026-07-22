"use client";

import { useLibraryContext } from "@/app/contexts/LibraryContext";
import type useLibrary from "@/app/hooks/useLibrary";
import type { SerializedFactory } from "@/app/models/factory-storage";
import Select from "../ui/Select";

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
      <Select
        size="small"
        fullWidth
        label="Move to"
        value={factory.folderId ?? ""}
        onChange={(v) => {
          libraryApi.moveFactory(factory.id, v || null);
          onMoved();
        }}
        options={[
          { value: "", label: "Root (no folder)" },
          ...library.folders.map((f) => ({ value: f.id, label: f.name })),
        ]}
      />
    </div>
  );
}
