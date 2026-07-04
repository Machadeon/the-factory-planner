import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import FileImportButton from "@/app/components/ui/FileImportButton";

describe("FileImportButton", () => {
  it("delivers the selected file and resets the input", async () => {
    const user = userEvent.setup();
    const onFile = vi.fn();
    render(
      <FileImportButton
        aria-label="Import factory"
        accept=".json"
        onFile={onFile}
      />,
    );
    const input = screen.getByTestId(
      "file-import-input:Import factory",
    ) as HTMLInputElement;
    const file = new File(['{"a":1}'], "factory.json", {
      type: "application/json",
    });
    await user.upload(input, file);
    expect(onFile).toHaveBeenCalledTimes(1);
    expect(onFile.mock.calls[0][0]).toBe(file);
    expect(input.value).toBe("");
  });

  it("does not fire when the picker is dismissed without a file", () => {
    const onFile = vi.fn();
    render(
      <FileImportButton
        aria-label="Import factory"
        accept=".json"
        onFile={onFile}
      />,
    );
    const input = screen.getByTestId("file-import-input:Import factory");
    fireEvent.change(input, { target: { files: [] } });
    expect(onFile).not.toHaveBeenCalled();
  });
});
