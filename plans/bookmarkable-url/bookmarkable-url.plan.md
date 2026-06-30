# Bookmarkable URL Feature

## Application Overview

Tests for the bookmarkable URL feature in the Satisfactory factory planner. When a factory is saved or loaded, the browser URL updates to `/?factoryId=<id>` via `window.history.pushState`. Browser back/forward navigation switches between factories via the `popstate` event handler. Loading a `/?factoryId=<id>` URL directly on page load causes `restoreFactory` to read the URL param during the mount effect (before the null-currentFactoryId effect can overwrite it) and load the matching factory from localStorage.

Key implementation details that shape test design:
- Consent is stored as `sfp:consent = "true"` in localStorage. Without consent the library is never read and `restoreFactory` never runs, so URL params are ignored.
- The URL update effect (`useEffect([currentFactoryId])`) fires on every change to `currentFactoryId`, including the initial render where it is null, pushing `/` as a history entry. When a factory is then restored from URL, it pushes a second `/?factoryId=id` entry. Every session therefore begins with at least two history entries.
- The consent dialog title is "Save factories to this browser?" with "Cancel" and "Allow" buttons (not "I Consent").
- Autosave is disabled automatically when "New factory" is created via the library drawer; only an explicit Save generates an ID and updates the URL for a new factory in that state.
- The Save tooltip reads "Save" when clean and "Save (unsaved changes)" when `isDirty` is true.
- The library drawer is a dialog element triggered by clicking the "Open factory library" button (top-left of the header).

## Test Scenarios

### 1. Bookmarkable URL

**Seed:** `tests/e2e/seed.spec.ts`

#### 1.1. URL updates to include factoryId after first manual save

**File:** `tests/e2e/bookmarkable-url/url-updates-on-save.spec.ts`

**Steps:**
  1. Navigate to `/`, clear localStorage, set `sfp:consent` to `'true'`, and reload the page.
    - expect: The page loads showing 'Unnamed Factory' in the name textbox. The URL is exactly `http://localhost:3000/` with no `factoryId` query parameter.
  2. Read the current URL and assert that it does not contain `factoryId`.
    - expect: The URL search string is empty or does not include `factoryId`.
  3. Click the factory name textbox, clear it, and type 'Iron Works'. Press Tab to blur.
    - expect: The textbox shows 'Iron Works'. The Save tooltip changes to 'Save (unsaved changes)'. The URL is still `/` with no factoryId.
  4. Click the Save button (tooltip: 'Save (unsaved changes)').
    - expect: The URL updates to `/?factoryId=<id>` where `<id>` is a non-empty UUID-like string. The Save tooltip returns to 'Save' (no unsaved-changes badge). The factoryId query parameter is present and non-empty.
  5. Copy the current URL. Navigate to `/` using `page.goto('/')` to perform a full page reload without the factoryId.
    - expect: The page reloads and shows 'Iron Works' (because it is the last saved factory stored under `sfp:current`).
  6. Navigate directly to the saved URL (the `/?factoryId=<id>` captured earlier) via a full `page.goto()`.
    - expect: The page loads and the factory name textbox shows 'Iron Works', confirming the URL is functional as a bookmark.

#### 1.2. URL has no factoryId before first save on a fresh session

**File:** `tests/e2e/bookmarkable-url/clean-url-before-save.spec.ts`

**Steps:**
  1. Navigate to `/`, clear localStorage entirely (including consent), then set `sfp:consent` to `'true'`, and reload the page.
    - expect: The page loads with 'Unnamed Factory' in the name textbox. No consent dialog appears because consent is already set.
  2. Without clicking Save or adding any products, read the current URL.
    - expect: The URL is `http://localhost:3000/` with no `factoryId` query parameter. `new URLSearchParams(window.location.search).get('factoryId')` returns null.
  3. Rename the factory to 'New Factory' by editing the name textbox and pressing Tab.
    - expect: The Save tooltip changes to 'Save (unsaved changes)', indicating the factory is dirty. The URL remains `/` with no `factoryId`.
  4. Wait briefly (at least 500 ms) to confirm autosave has not fired (autosave is triggered only by `factory.update()`, not by name changes alone).
    - expect: The URL still has no `factoryId` parameter. The factory has not been persisted to the library yet.

#### 1.3. URL changes to the new factoryId when switching factories via the library

**File:** `tests/e2e/bookmarkable-url/url-updates-on-factory-switch.spec.ts`

**Steps:**
  1. Navigate to `/`, clear localStorage, set `sfp:consent` to `'true'`, and reload.
    - expect: Page shows 'Unnamed Factory', URL is `/`.
  2. Rename the factory to 'Factory A' and click Save.
    - expect: The URL updates to `/?factoryId=<idA>`. Record idA from the URL. Save tooltip shows 'Save'.
  3. Click the 'Open factory library' button to open the library drawer.
    - expect: A dialog appears listing 'Factory A'.
  4. Click the 'New factory' button inside the library drawer.
    - expect: The dialog closes. The factory name textbox shows 'Unnamed Factory'. The URL changes to `/` (no factoryId) because creating a new factory sets currentFactoryId to null.
  5. Rename the new factory to 'Factory B' and click Save.
    - expect: The URL updates to `/?factoryId=<idB>` where idB is different from idA. Record idB from the URL.
  6. Click 'Open factory library' again.
    - expect: The library drawer opens listing both 'Factory A' and 'Factory B'. 'Factory B' may be highlighted as the current factory.
  7. Click the 'Factory A' entry in the library list.
    - expect: The library drawer closes. The factory name textbox shows 'Factory A'. The URL updates to `/?factoryId=<idA>` — the same idA captured earlier. The URL no longer shows idB.

#### 1.4. Browser back button loads the previously viewed factory

**File:** `tests/e2e/bookmarkable-url/back-navigation.spec.ts`

**Steps:**
  1. Navigate to `/`, clear localStorage, set `sfp:consent` to `'true'`, and reload.
    - expect: Page shows 'Unnamed Factory', URL is `/`.
  2. Rename to 'Factory A' and click Save.
    - expect: URL is `/?factoryId=<idA>`.
  3. Click 'Open factory library', then click 'New factory'.
    - expect: URL changes to `/`. Page shows 'Unnamed Factory'.
  4. Rename to 'Factory B' and click Save.
    - expect: URL is `/?factoryId=<idB>`.
  5. Click 'Open factory library', then click 'Factory A' in the list.
    - expect: URL changes to `/?factoryId=<idA>`. Factory name shows 'Factory A'. The library drawer closes.
  6. Use `page.goBack()` to simulate the browser back button once.
    - expect: The `popstate` event fires. The URL changes to `/?factoryId=<idB>` (the previous history entry where Factory B was active). The factory name textbox changes to 'Factory B'. No page reload occurs.
  7. Use `page.goForward()` to simulate the browser forward button.
    - expect: The URL returns to `/?factoryId=<idA>`. The factory name textbox changes back to 'Factory A'. No page reload occurs.

#### 1.5. Back navigation to clean URL restores empty factory state

**File:** `tests/e2e/bookmarkable-url/back-to-clean-url.spec.ts`

**Steps:**
  1. Navigate to `/`, clear localStorage, set `sfp:consent` to `'true'`, and reload.
    - expect: Page shows 'Unnamed Factory', URL is `/`.
  2. Rename to 'Factory A' and click Save.
    - expect: URL is `/?factoryId=<idA>`.
  3. Use `page.goBack()` to press the browser back button.
    - expect: The URL changes to `/` (the clean URL entry that was pushed before the factory was saved). The `popstate` handler fires with `e.state.factoryId = null` or no state.
  4. Check the factory name textbox.
    - expect: The textbox shows 'Unnamed Factory', confirming the app treated the clean URL as a new empty factory (per the `performClearFactory` path in the popstate handler). The URL is `/` with no factoryId.

#### 1.6. Navigating directly to a factory URL loads that factory on page reload

**File:** `tests/e2e/bookmarkable-url/direct-url-load.spec.ts`

**Steps:**
  1. Navigate to `/`, clear localStorage, set `sfp:consent` to `'true'`, and reload.
    - expect: Page shows 'Unnamed Factory', URL is `/`.
  2. Rename to 'Factory A' and click Save. Capture the URL — specifically extract the `factoryId` query parameter value (idA).
    - expect: URL is `/?factoryId=<idA>`.
  3. Click 'Open factory library', click 'New factory', rename to 'Factory B', click Save.
    - expect: URL is `/?factoryId=<idB>`. Active factory is 'Factory B'.
  4. Perform a full page navigation via `page.goto('/?factoryId=' + idA)` to simulate pasting the bookmark URL.
    - expect: The page performs a full reload. On load, `restoreFactory` reads the `factoryId` URL param, finds Factory A in the library, and loads it.
  5. Wait for the page to finish loading and check the factory name textbox.
    - expect: The factory name textbox shows 'Factory A'. The URL remains `/?factoryId=<idA>` (the app uses `replaceState` to annotate the URL entry with history state, then eventually `pushState` to the same URL).
  6. Check that the factory listed in the library is still 'Factory B' (it was not overwritten).
    - expect: Opening the library drawer shows both 'Factory A' and 'Factory B'. The feature loads the bookmarked factory without destroying the other.

#### 1.7. Unknown factoryId in URL falls back gracefully without crashing

**File:** `tests/e2e/bookmarkable-url/unknown-factory-id-fallback.spec.ts`

**Steps:**
  1. Navigate to `/`, clear localStorage, set `sfp:consent` to `'true'`, and reload.
    - expect: Page shows 'Unnamed Factory'. Library is empty.
  2. Navigate via `page.goto('/?factoryId=nonexistent-id-12345abcdef')` — an ID that does not exist in the library.
    - expect: The page loads without throwing a JavaScript error or showing a crash screen.
  3. Check the factory name textbox and the URL after the page has loaded.
    - expect: The textbox shows 'Unnamed Factory' (no factory was found for the unknown ID). The URL has changed to `/` (the effect pushed `/` because `currentFactoryId` remained null after `restoreFactory` found nothing). No factoryId appears in the URL.
  4. Check the browser console for errors.
    - expect: No unhandled JavaScript errors related to the missing factory ID are present.

#### 1.8. factoryId URL param is ignored and URL resets when localStorage consent is absent

**File:** `tests/e2e/bookmarkable-url/consent-required-for-url.spec.ts`

**Steps:**
  1. Clear localStorage completely (no `sfp:consent` key and no library data). Then navigate via `page.goto('/?factoryId=some-factory-id')` to simulate a user who received a bookmarked URL but has never consented.
    - expect: The page loads. No consent dialog appears automatically (it only shows on explicit user action).
  2. Check the factory name textbox and the current URL.
    - expect: The textbox shows 'Unnamed Factory'. The URL has been pushed to `/` by the URL-update effect (since `currentFactoryId` is null and consent was absent so `restoreFactory` was never called). The `factoryId` query parameter is gone.
  3. Click the Save button in the toolbar.
    - expect: The consent dialog opens with the title 'Save factories to this browser?' and two buttons: 'Cancel' and 'Allow'.
  4. Click the 'Allow' button in the consent dialog.
    - expect: The dialog closes. The factory is saved. The URL updates to `/?factoryId=<newId>` where newId is a freshly generated ID for the current (Unnamed) factory. `localStorage.getItem('sfp:consent')` returns `'true'`.
  5. Click the 'Open factory library' button.
    - expect: The library drawer opens and lists the saved factory (currently named 'Unnamed Factory'). No consent dialog appears again since consent was already granted.

#### 1.9. URL updates correctly when autosave triggers the first save for a new factory

**File:** `tests/e2e/bookmarkable-url/autosave-url-update.spec.ts`

**Steps:**
  1. Navigate to `/`, clear localStorage, set `sfp:consent` to `'true'`, and reload.
    - expect: Page shows 'Unnamed Factory', URL is `/`. Autosave switch shows 'Autosave on'.
  2. Click 'Add product', select 'Iron Plate' from the dropdown, and click the 'Iron Plate' standard recipe entry to add a production line.
    - expect: An Iron Plate production line appears. The factory is dirty. Autosave is enabled so `scheduleAutosave` is called via `factory.update()`.
  3. Wait 600 ms (longer than the 400 ms autosave debounce) without further interaction.
    - expect: The autosave fires. The URL updates automatically to `/?factoryId=<id>` even though the user never clicked Save. The Save tooltip shows 'Save' (clean, not dirty).
  4. Read the factoryId from the URL and verify it is non-empty.
    - expect: The URL contains a non-empty `factoryId` parameter. Opening the library drawer shows the factory listed there (it was persisted by autosave).

#### 1.10. Library factory load via in-page navigation updates URL without page reload

**File:** `tests/e2e/bookmarkable-url/library-load-no-reload.spec.ts`

**Steps:**
  1. Navigate to `/`, clear localStorage, set `sfp:consent` to `'true'`, and reload.
    - expect: Page shows 'Unnamed Factory', URL is `/`.
  2. Rename to 'Factory A' and click Save.
    - expect: URL is `/?factoryId=<idA>`.
  3. Click 'Open factory library', then click 'New factory', rename to 'Factory B', and click Save.
    - expect: URL is `/?factoryId=<idB>`.
  4. Attach a listener via `page.evaluate` to record whether a full page navigation occurs (e.g. by counting `load` events). Then click 'Open factory library' and click 'Factory A'.
    - expect: No browser `load` event fires (the switch is purely client-side via `pushState` and React state). The URL updates to `/?factoryId=<idA>` and the factory name changes to 'Factory A' without any visible page reload.
