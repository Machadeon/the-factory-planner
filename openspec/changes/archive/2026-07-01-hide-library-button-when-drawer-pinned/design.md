## Context

`FactoryHeader` renders a "Open factory library" button (`FolderOpenIcon`) that opens the `FactoryLibraryDrawer` in overlay mode. When the drawer is pinned open as a sidebar (`libraryPinned === true` in `FactoryComponent`), the drawer is already visible inline — the button is redundant and confusing.

`FactoryComponent` already tracks `libraryPinned` state and uses it to conditionally render the inline vs. overlay drawer. `FactoryHeader` receives `onOpenLibrary` as a required callback and always renders the button.

## Goals / Non-Goals

**Goals:**
- Button is absent from DOM when drawer is pinned
- Button renders and functions normally when drawer is unpinned

**Non-Goals:**
- Eliminating the brief button flash on first page load when pin state is persisted — this is intentional; synchronous init from localStorage causes a Next.js hydration error
- Changing pin persistence or drawer behavior

## Decisions

### Make `onOpenLibrary` optional; omit prop when pinned

`FactoryHeader.Props.onOpenLibrary` changes from required to optional. The button is rendered only when the prop is provided. In `FactoryComponent`, the prop is passed conditionally:

```ts
onOpenLibrary={libraryPinned ? undefined : () => requireConsent("openLibrary")}
```

**Alternatives considered:**

- **Add `hideLibraryButton?: boolean` prop** — introduces a new prop with inverted-default semantics. More surface area, no benefit over making the callback optional.
- **Add `libraryPinned?: boolean` prop** — bleeds drawer layout state into `FactoryHeader`, which shouldn't need to know about the drawer.
- **Conditional render in `FactoryComponent` wrapping the `FactoryHeader`** — would require duplicating or wrapping the header, awkward.

Making the callback optional is idiomatic React: no handler → no interactive element. One change in `FactoryHeader`, one conditional at the call site.

The internal `handleOpenLibrary` wrapper in `FactoryHeader` currently calls `onOpenLibrary()` unconditionally. Since the button is only rendered when `onOpenLibrary` is defined, this is safe — but `handleOpenLibrary` must use optional chaining (`onOpenLibrary?.()`) as a defensive measure against future regressions.

## Risks / Trade-offs

- [Flash on page load when pinned] → Accepted. Unavoidable without SSR-unsafe sync localStorage read. Consistent with existing behavior of the drawer itself.

## Migration Plan

No data migration. Pure UI change. Deploy as normal.

## Open Questions

None.
