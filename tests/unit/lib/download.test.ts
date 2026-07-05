import { afterEach, describe, expect, it, vi } from "vitest";
import { downloadJson } from "@/app/lib/download";

describe("downloadJson (R6.S1)", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("serializes pretty JSON into an application/json blob, clicks a temp anchor, revokes the URL", () => {
    let capturedBlob: Blob | undefined;
    const createObjectURL = vi.fn((blob: Blob) => {
      capturedBlob = blob;
      return "blob:mock-url";
    });
    const revokeObjectURL = vi.fn();
    vi.stubGlobal("URL", {
      ...URL,
      createObjectURL,
      revokeObjectURL,
    });

    const click = vi.fn();
    const anchor = document.createElement("a");
    anchor.click = click;
    const createElement = vi
      .spyOn(document, "createElement")
      .mockReturnValue(anchor);

    const data = { a: 1, nested: { b: [2, 3] } };
    downloadJson(data, "test-file.json");

    expect(createElement).toHaveBeenCalledWith("a");
    expect(createObjectURL).toHaveBeenCalledTimes(1);
    expect(capturedBlob?.type).toBe("application/json");
    expect(anchor.href).toContain("blob:mock-url");
    expect(anchor.download).toBe("test-file.json");
    expect(click).toHaveBeenCalledTimes(1);
    expect(revokeObjectURL).toHaveBeenCalledWith("blob:mock-url");

    return capturedBlob?.text().then((text) => {
      expect(text).toBe(JSON.stringify(data, null, 2));
    });
  });
});
