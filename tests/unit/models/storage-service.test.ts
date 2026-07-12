import { beforeEach, describe, expect, it } from "vitest";
import {
  CURRENT_SCHEMA_VERSION,
  emptyLibrary,
  type SerializedFactory,
} from "@/app/models/factory-storage";
import {
  addFactory,
  addFolder,
  loadLibrary,
  moveFactory,
  removeFactory,
  removeFolder,
  renameFolder,
  updateFactory,
} from "@/app/models/storage-service";
import { installLocalStorageMock } from "../../helpers/local-storage-mock";

function makeFactory(
  id: string,
  name: string,
  folderId: string | null = null,
): SerializedFactory {
  const now = new Date().toISOString();
  return {
    schemaVersion: CURRENT_SCHEMA_VERSION,
    id,
    name,
    folderId,
    autoAddProductLines: false,
    productionLines: [],
    createdAt: now,
    updatedAt: now,
  };
}

describe("loadLibrary() — unconditional normalization (storage-migrations R7)", () => {
  beforeEach(() => {
    installLocalStorageMock();
  });

  it("R7.S1: pre-change stored data still gets structurally normalized regardless of schemaVersion", () => {
    localStorage.setItem(
      "sfp:library",
      JSON.stringify({ schemaVersion: CURRENT_SCHEMA_VERSION }),
    );
    const lib = loadLibrary();
    expect(lib.folders).toEqual([]);
    expect(lib.factories).toEqual([]);
  });

  it("R7.S2: already-well-formed data survives unconditional migrateLibrary as a no-op", () => {
    const factory = makeFactory("1", "Alpha");
    const wellFormed = {
      schemaVersion: CURRENT_SCHEMA_VERSION,
      folders: [],
      factories: [factory],
    };
    localStorage.setItem("sfp:library", JSON.stringify(wellFormed));
    const lib = loadLibrary();
    expect(lib.factories).toEqual([factory]);
    expect(lib.folders).toEqual([]);
  });
});

describe("addFactory()", () => {
  it("appends factory to the list", () => {
    const lib = emptyLibrary();
    const factory = makeFactory("1", "Alpha");
    const result = addFactory(lib, factory);
    expect(result.factories).toHaveLength(1);
    expect(result.factories[0].id).toBe("1");
  });

  it("does not mutate the original library", () => {
    const lib = emptyLibrary();
    addFactory(lib, makeFactory("1", "Alpha"));
    expect(lib.factories).toHaveLength(0);
  });

  it("preserves existing factories", () => {
    let lib = emptyLibrary();
    lib = addFactory(lib, makeFactory("1", "Alpha"));
    lib = addFactory(lib, makeFactory("2", "Beta"));
    expect(lib.factories).toHaveLength(2);
  });
});

describe("updateFactory()", () => {
  it("replaces the matching factory by id", () => {
    let lib = emptyLibrary();
    lib = addFactory(lib, makeFactory("1", "Old Name"));
    lib = addFactory(lib, makeFactory("2", "Other"));

    const updated = makeFactory("1", "New Name");
    const result = updateFactory(lib, updated);
    expect(result.factories.find((f) => f.id === "1")?.name).toBe("New Name");
  });

  it("does not affect other factories", () => {
    let lib = emptyLibrary();
    lib = addFactory(lib, makeFactory("1", "Alpha"));
    lib = addFactory(lib, makeFactory("2", "Beta"));

    const result = updateFactory(lib, makeFactory("1", "Updated Alpha"));
    expect(result.factories.find((f) => f.id === "2")?.name).toBe("Beta");
  });

  it("does not mutate the original library", () => {
    let lib = emptyLibrary();
    lib = addFactory(lib, makeFactory("1", "Old"));
    updateFactory(lib, makeFactory("1", "New"));
    expect(lib.factories[0].name).toBe("Old");
  });
});

describe("removeFactory()", () => {
  it("removes the matching factory by id", () => {
    let lib = emptyLibrary();
    lib = addFactory(lib, makeFactory("1", "Alpha"));
    lib = addFactory(lib, makeFactory("2", "Beta"));

    const result = removeFactory(lib, "1");
    expect(result.factories).toHaveLength(1);
    expect(result.factories[0].id).toBe("2");
  });

  it("is a no-op for non-existent id", () => {
    let lib = emptyLibrary();
    lib = addFactory(lib, makeFactory("1", "Alpha"));

    const result = removeFactory(lib, "999");
    expect(result.factories).toHaveLength(1);
  });
});

describe("addFolder()", () => {
  it("creates a folder with the given name and parentId", () => {
    const lib = emptyLibrary();
    const { lib: result, folder } = addFolder(lib, "My Folder", null);
    expect(result.folders).toHaveLength(1);
    expect(folder.name).toBe("My Folder");
    expect(folder.parentId).toBeNull();
    expect(folder.id).toBeTruthy();
  });

  it("supports nested folders via parentId", () => {
    const lib = emptyLibrary();
    const { lib: lib2, folder: parent } = addFolder(lib, "Parent", null);
    const { lib: lib3, folder: child } = addFolder(lib2, "Child", parent.id);
    expect(child.parentId).toBe(parent.id);
    expect(lib3.folders).toHaveLength(2);
  });
});

describe("renameFolder()", () => {
  it("updates the folder name", () => {
    const lib = emptyLibrary();
    const { lib: lib2, folder } = addFolder(lib, "Old Name", null);
    const result = renameFolder(lib2, folder.id, "New Name");
    expect(result.folders.find((f) => f.id === folder.id)?.name).toBe(
      "New Name",
    );
  });

  it("does not affect other folders", () => {
    const lib = emptyLibrary();
    const { lib: lib2, folder: f1 } = addFolder(lib, "A", null);
    const { lib: lib3, folder: f2 } = addFolder(lib2, "B", null);
    const result = renameFolder(lib3, f1.id, "A-renamed");
    expect(result.folders.find((f) => f.id === f2.id)?.name).toBe("B");
  });
});

describe("removeFolder()", () => {
  it("removes the folder and its children recursively", () => {
    const lib = emptyLibrary();
    const { lib: lib2, folder: parent } = addFolder(lib, "Parent", null);
    const { lib: lib3, folder: child } = addFolder(lib2, "Child", parent.id);
    lib3; // assigned but we need to use lib3 for next call
    const { lib: lib4 } = addFolder(lib3, "Grandchild", child.id);

    const result = removeFolder(lib4, parent.id);
    expect(result.folders).toHaveLength(0);
  });

  it("removes factories inside deleted folders", () => {
    const lib = emptyLibrary();
    const { lib: lib2, folder } = addFolder(lib, "Folder", null);
    lib2; // assigned but using lib3
    const lib3 = addFactory(lib2, makeFactory("1", "In Folder", folder.id));

    const result = removeFolder(lib3, folder.id);
    expect(result.factories).toHaveLength(0);
  });

  it("preserves factories outside deleted folders", () => {
    const lib = emptyLibrary();
    const { lib: lib2, folder } = addFolder(lib, "Folder", null);
    let lib3 = addFactory(lib2, makeFactory("1", "In Folder", folder.id));
    lib3 = addFactory(lib3, makeFactory("2", "Root Level", null));

    const result = removeFolder(lib3, folder.id);
    expect(result.factories).toHaveLength(1);
    expect(result.factories[0].id).toBe("2");
  });
});

describe("moveFactory()", () => {
  it("moves factory to the specified folder", () => {
    let lib = emptyLibrary();
    lib = addFactory(lib, makeFactory("1", "Alpha", null));
    const { lib: lib2, folder } = addFolder(lib, "Folder", null);

    const result = moveFactory(lib2, "1", folder.id);
    expect(result.factories.find((f) => f.id === "1")?.folderId).toBe(
      folder.id,
    );
  });

  it("moves factory to root (folderId=null)", () => {
    const lib = emptyLibrary();
    const { lib: lib2, folder } = addFolder(lib, "Folder", null);
    const lib3 = addFactory(lib2, makeFactory("1", "Alpha", folder.id));

    const result = moveFactory(lib3, "1", null);
    expect(result.factories.find((f) => f.id === "1")?.folderId).toBeNull();
  });

  it("does not affect other factories", () => {
    let lib = emptyLibrary();
    lib = addFactory(lib, makeFactory("1", "Alpha", null));
    lib = addFactory(lib, makeFactory("2", "Beta", null));
    const { lib: lib2, folder } = addFolder(lib, "Folder", null);

    const result = moveFactory(lib2, "1", folder.id);
    expect(result.factories.find((f) => f.id === "2")?.folderId).toBeNull();
  });
});
