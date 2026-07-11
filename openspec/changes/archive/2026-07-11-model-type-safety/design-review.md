## Pass 1 — 2026-07-08

**Source: Reviewer**

**Status: CONCERNS**

### Resolved from Previous Pass
(none — first design pass)

### Findings
- [D4 — MachineCount probe sites] — miscounts and misattributes the probe sites. Design claims "four `"fullMachines" in count` probes (`assembly-line` ×2, `MachineCountDisplay`, `AssemblyLineControls`)". Actual grep: `assembly-line.ts` has 3 (`totalMachines` L15, `getTotalShards` L200, `getPowerConsumption` L228), `MachineCountDisplay.tsx` L16 has 1, and `AssemblyLineControls.tsx` has ZERO — it consumes `getMachineCount()`/`totalMachines()` results but never probes shape. Listing `AssemblyLineControls` as a probe site to convert is wrong (nothing to convert there); the real fourth site is the `totalMachines` L15 probe, which the design/spec treat separately under R2. Fix D4's enumeration to `assembly-line.ts` (`totalMachines`, `getTotalShards`, `getPowerConsumption`) + `MachineCountDisplay.tsx`, and drop `AssemblyLineControls`. NOTE: machine-math spec R4.S2 (already APPROVED) carries the same wrong `AssemblyLineControls` attribution — it should be corrected in lockstep or the design will contradict the spec.
- [D5 — factory-storage reset vs R3] — design says the `pl.assemblyLines = []` reset (two sites: `factory-storage.ts:258` and `:384`) is "harmless if left; it will be removed for clarity", but production-line-auto-recipe R3 states deserialization SHALL NOT need the reset. Design and spec agree on the outcome (remove it), but "harmless if left" invites a partial edit that removes one site and not the other; state that BOTH `:258` and `:384` are removed so the sweep is unambiguous.

### N/A guidance modules
- `frontend-design`: N/A — model-layer TypeScript refactor, zero UI surface (no palette/type/layout/component work).
- `modern-web-guidance`: N/A — no HTML/CSS/client-side rendering touched; matches the skill's own "DO NOT trigger" (non-frontend) scope. No applicable query.

## Pass 2 — 2026-07-08

**Source: Reviewer**

**Status: APPROVED**

### Resolved from Previous Pass
- [D4 — MachineCount probe sites] — RESOLVED. D4 (design L39) now lists exactly four probe sites — `assembly-line.ts` (`totalMachines` L15, `getTotalShards` L200, `getPowerConsumption` L228) + `MachineCountDisplay.tsx` L16 — and explicitly notes `factory-metrics` and `AssemblyLineControls` consume `getMachineCount()`/`totalMachines()` without probing, so are unchanged. Matches source grep. machine-math spec R4.S2 (spec L20) fixed in lockstep: same four-site enumeration and the same `AssemblyLineControls.tsx`/`factory-metrics.ts` non-probing note. Design and spec now agree; no contradiction.
- [D5 — factory-storage reset vs R3] — RESOLVED. D5 (design L43) drops "harmless if left" and states both reset sites (`factory-storage.ts:258` and `:384`) are removed. Unambiguous; matches production-line-auto-recipe R3.

### Findings
(none — APPROVED)

### N/A guidance modules
- `frontend-design`: N/A — unchanged; model-layer TypeScript refactor, zero UI surface.
- `modern-web-guidance`: N/A — unchanged; no HTML/CSS/client-side code touched.
