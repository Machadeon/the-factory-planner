import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import FactoryJsonDialog from "@/app/components/factory/FactoryJsonDialog";
import FactoryPage from "@/app/components/factory/FactoryPage";
import SectionTabs from "@/app/components/factory/SectionTabs";
import {
  CURRENT_SCHEMA_VERSION,
  type SerializedFactory,
  type StorageLibrary,
} from "@/app/models/factory-storage";

vi.mock("next/image", () => ({
  default: ({
    src,
    alt,
    ...rest
  }: {
    src: string;
    alt: string;
    [k: string]: unknown;
  }) => (
    // biome-ignore lint/performance/noImgElement: test mock
    <img src={src} alt={alt} {...(rest as object)} />
  ),
}));

vi.mock("@/app/lib/download", () => ({
  downloadJson: vi.fn(),
}));

import { downloadJson } from "@/app/lib/download";

Object.assign(navigator, {
  clipboard: { writeText: vi.fn().mockResolvedValue(undefined) },
});

function makeLocalStorageMock() {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => {
      store[key] = value;
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
    get length() {
      return Object.keys(store).length;
    },
    key: (i: number) => Object.keys(store)[i] ?? null,
  };
}

let localStorageMock: ReturnType<typeof makeLocalStorageMock>;

beforeEach(() => {
  localStorageMock = makeLocalStorageMock();
  vi.stubGlobal("localStorage", localStorageMock);
  window.history.replaceState(null, "", "/");
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

function grantConsent() {
  localStorageMock.setItem("sfp:consent", "true");
}

const NOW = "2026-01-01T00:00:00.000Z";

function sf(overrides: Partial<SerializedFactory> = {}): SerializedFactory {
  return {
    schemaVersion: CURRENT_SCHEMA_VERSION,
    id: "f-import",
    slug: "imported-plant",
    name: "Imported Plant",
    folderId: null,
    autoAddProductLines: false,
    productionLines: [
      {
        partSlug: "iron-ingot",
        rate: 30,
        outputRate: 30,
        autoCalculateRate: false,
        autoCreated: false,
        assemblyLines: [],
      },
    ],
    createdAt: NOW,
    updatedAt: NOW,
    ...overrides,
  };
}

async function addIronPlate(user: ReturnType<typeof userEvent.setup>) {
  const addButton = await screen.findByText(/Add Product/i);
  await user.click(addButton);
  const autocomplete = screen.getByRole("combobox");
  await user.type(autocomplete, "Iron Plate");
  const options = await screen.findAllByRole("option");
  const option = options.find((el) => el.textContent?.trim() === "Iron Plate");
  expect(option).toBeTruthy();
  // biome-ignore lint/style/noNonNullAssertion: checked above
  await user.click(option!);
  await waitFor(() => {
    expect(screen.getAllByText("Iron Plate").length).toBeGreaterThan(0);
  });
}

function fileInput(): HTMLInputElement {
  const input = document.querySelector('input[type="file"]');
  expect(input).not.toBeNull();
  return input as HTMLInputElement;
}

function jsonFile(payload: unknown): File {
  return new File([JSON.stringify(payload)], "import.json", {
    type: "application/json",
  });
}

describe("FactoryPage session flows (1.10)", () => {
  it("factory-session R2.S1 — proxy mutation re-renders the page (no version counter)", async () => {
    grantConsent();
    const user = userEvent.setup();
    render(<FactoryPage />);
    await addIronPlate(user);
  });

  it("factory-session R7.S2 — dirty + autosave on: New factory saves silently, no dialog", async () => {
    grantConsent();
    const user = userEvent.setup();
    render(<FactoryPage />);
    await addIronPlate(user);
    await user.click(screen.getByRole("button", { name: "Clear factory" }));
    expect(screen.queryByText("Clear factory?")).toBeNull();
    await waitFor(() => {
      const lib = JSON.parse(
        localStorageMock.getItem("sfp:library") ?? "{}",
      ) as StorageLibrary;
      expect(lib.factories?.length).toBe(1);
    });
    expect(screen.queryAllByText("Iron Plate").length).toBe(0);
  });

  it("factory-session R7.S3 — dirty + autosave off: confirm dialog; cancel leaves session", async () => {
    grantConsent();
    localStorageMock.setItem("sfp:autosave-pref", "false");
    const user = userEvent.setup();
    render(<FactoryPage />);
    await addIronPlate(user);
    await user.click(screen.getByRole("button", { name: "Clear factory" }));
    expect(await screen.findByText("Clear factory?")).toBeTruthy();
    await user.click(screen.getByRole("button", { name: /Cancel/i }));
    expect(screen.getAllByText("Iron Plate").length).toBeGreaterThan(0);
  });
});

describe("FactoryPage import wiring (1.11)", () => {
  it("library-ops R5.S1 — single-factory import without consent loads but does not persist", async () => {
    const user = userEvent.setup();
    render(<FactoryPage />);
    await user.upload(fileInput(), jsonFile(sf()));
    await waitFor(() => {
      expect(screen.getByLabelText("Factory name")).toHaveValue(
        "Imported Plant",
      );
    });
    expect(localStorageMock.getItem("sfp:library")).toBeNull();
  });

  it("library-ops R5.S2 — bundle import with consent saves and loads root without drawer", async () => {
    grantConsent();
    const user = userEvent.setup();
    render(<FactoryPage />);
    const bundle: StorageLibrary = {
      schemaVersion: CURRENT_SCHEMA_VERSION,
      folders: [],
      factories: [sf(), sf({ id: "f-dep", slug: "dep", name: "Dep" })],
      rootId: "f-import",
    };
    await user.upload(fileInput(), jsonFile(bundle));
    await waitFor(() => {
      expect(screen.getByLabelText("Factory name")).toHaveValue(
        "Imported Plant",
      );
    });
    const lib = JSON.parse(
      localStorageMock.getItem("sfp:library") ?? "{}",
    ) as StorageLibrary;
    expect(lib.factories?.length).toBe(2);
    expect(screen.queryByText("Factory Library")).toBeNull();
  });

  it("library-ops R5.S3 — library import without consent: nothing merges, consent prompt", async () => {
    const user = userEvent.setup();
    render(<FactoryPage />);
    const nameBefore = (
      screen.getByLabelText("Factory name") as HTMLInputElement
    ).value;
    const bundle: StorageLibrary = {
      schemaVersion: CURRENT_SCHEMA_VERSION,
      folders: [],
      factories: [sf()],
    };
    await user.upload(fileInput(), jsonFile(bundle));
    expect(await screen.findByRole("button", { name: /Allow/i })).toBeTruthy();
    expect(localStorageMock.getItem("sfp:library")).toBeNull();
    expect(screen.getByLabelText("Factory name")).toHaveValue(nameBefore);
  });
});

describe("extracted components (1.12)", () => {
  it("page-structure R5.S1 — FactoryJsonDialog shows JSON and copies it", async () => {
    // userEvent.setup() installs its own clipboard stub — spy on that one.
    const user = userEvent.setup();
    const writeText = vi.spyOn(navigator.clipboard, "writeText");
    const payload = sf();
    render(
      <FactoryJsonDialog
        open={true}
        onClose={() => {}}
        buildJson={() => payload}
      />,
    );
    expect(screen.getByText(/"Imported Plant"/)).toBeTruthy();
    await user.click(
      screen.getByRole("button", { name: /Copy factory JSON/i }),
    );
    expect(writeText).toHaveBeenCalledWith(JSON.stringify(payload, null, 2));
  });

  it("page-structure R6.S1 — SectionTabs renders tabs and solver alert", () => {
    render(
      <SectionTabs
        activeSection="planning"
        onSectionChange={() => {}}
        solverError={{ kind: "nothing-to-optimize" }}
      />,
    );
    expect(screen.getByRole("tab", { name: "Planning" })).toBeTruthy();
    expect(screen.getByRole("tab", { name: "Optimization" })).toBeTruthy();
    expect(screen.getByRole("tab", { name: "Logistics" })).toBeTruthy();
    expect(screen.getByRole("alert")).toHaveTextContent("Nothing to optimize");
  });

  it("lib-utilities R7.S2 — export filename uses sanitizeFilename", async () => {
    grantConsent();
    const user = userEvent.setup();
    render(<FactoryPage />);
    const nameField = screen.getByLabelText("Factory name");
    await user.clear(nameField);
    await user.type(nameField, "Iron Plant #2!");
    await user.click(
      screen.getByRole("button", { name: "Export current factory" }),
    );
    expect(downloadJson).toHaveBeenCalled();
    const filename = (downloadJson as ReturnType<typeof vi.fn>).mock
      .calls[0][1] as string;
    expect(filename).toBe("Iron_Plant__2_.json");
  });
});
