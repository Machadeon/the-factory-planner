"use client";

import { useState } from "react";
import { hasConsent } from "../models/storage-service";

interface UseConsentGateOptions {
  // Fired on allow before the pending action replays, so freshly-consented
  // storage can be read (e.g. reload the library).
  onConsentGranted?: () => void;
}

// Pending-action state machine: execute immediately with consent, otherwise
// prompt and replay on allow, drop on cancel. A second requireConsent while
// the dialog is open replaces the pending action.
export default function useConsentGate({
  onConsentGranted,
}: UseConsentGateOptions = {}) {
  const [consentOpen, setConsentOpen] = useState(false);
  const [pendingAction, setPendingAction] = useState<(() => void) | null>(null);

  function requireConsent(action: () => void) {
    if (hasConsent()) {
      action();
    } else {
      setPendingAction(() => action);
      setConsentOpen(true);
    }
  }

  function handleAllow() {
    setConsentOpen(false);
    onConsentGranted?.();
    pendingAction?.();
    setPendingAction(null);
  }

  function handleCancel() {
    setConsentOpen(false);
    setPendingAction(null);
  }

  return { consentOpen, requireConsent, handleAllow, handleCancel };
}
