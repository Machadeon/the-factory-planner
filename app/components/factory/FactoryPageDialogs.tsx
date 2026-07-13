"use client";

import type useConsentGate from "@/app/hooks/useConsentGate";
import type useFactoryPageFlows from "@/app/hooks/useFactoryPageFlows";
import type { SerializedFactory } from "@/app/models/factory-storage";
import ConfirmDialog from "../ui/ConfirmDialog";
import FactoryJsonDialog from "./FactoryJsonDialog";
import StorageConsentDialog from "./StorageConsentDialog";

interface FactoryPageDialogsProps {
  consent: ReturnType<typeof useConsentGate>;
  flows: ReturnType<typeof useFactoryPageFlows>;
  jsonDialogOpen: boolean;
  onCloseJsonDialog: () => void;
  buildJson: () => SerializedFactory;
}

export default function FactoryPageDialogs({
  consent,
  flows,
  jsonDialogOpen,
  onCloseJsonDialog,
  buildJson,
}: FactoryPageDialogsProps) {
  return (
    <>
      <StorageConsentDialog
        open={consent.consentOpen}
        onAllow={consent.handleAllow}
        onCancel={consent.handleCancel}
      />
      <ConfirmDialog
        open={flows.unsavedPromptOpen}
        title="Unsaved changes"
        message="You have unsaved changes in the current factory. What would you like to do?"
        confirmLabel="Save & load"
        secondaryLabel="Discard & load"
        onSecondary={flows.handleUnsavedDiscardAndLoad}
        onConfirm={flows.handleUnsavedSaveAndLoad}
        onCancel={flows.handleUnsavedCancel}
      />
      <FactoryJsonDialog
        open={jsonDialogOpen}
        onClose={onCloseJsonDialog}
        buildJson={buildJson}
      />
      <ConfirmDialog
        open={flows.clearConfirmOpen}
        title="Clear factory?"
        message="You have unsaved changes in the current factory. What would you like to do?"
        confirmLabel="Save & clear"
        secondaryLabel="Discard & clear"
        onSecondary={flows.handleClearDiscardAndContinue}
        onConfirm={flows.handleClearSaveAndContinue}
        onCancel={flows.handleClearCancel}
      />
    </>
  );
}
