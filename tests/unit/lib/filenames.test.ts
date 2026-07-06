import { describe, expect, it } from "vitest";
import { sanitizeFilename } from "@/app/lib/filenames";

// lib-utilities R7.S1
describe("sanitizeFilename", () => {
  it("replaces every non-alphanumeric character with underscore", () => {
    expect(sanitizeFilename("Iron Plant #2!")).toBe("Iron_Plant__2_");
  });

  it("keeps alphanumerics of any case", () => {
    expect(sanitizeFilename("Steel2Works")).toBe("Steel2Works");
  });
});
