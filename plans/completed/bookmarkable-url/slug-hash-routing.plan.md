# Bookmarkable URL — Slug and Hash Routing Tests

## Application Overview

Tests for the slug-based bookmarkable URL feature in the Satisfactory factory planner. The URL format is `/?factory=<slug>#<tab>` where slug is a human-readable identifier derived from the factory name and tab is one of `planning`, `optimization`, or `logistics`. Legacy `?factoryId=<uuid>` URLs remain supported. The app is a Next.js SPA — all navigation after initial load uses `pushState`/`replaceState` with no server round-trip. Consent must be present (`sfp:consent = "true"` in localStorage) for any URL params to be acted upon. Tab switching uses `replaceState` (no new history entry). Factory switching uses `pushState` (new history entry). The hash is appended to every factory URL, so the full bookmark looks like `/?factory=iron-works#planning`. Note: the feature overview references `#graph` but the actual Logistics tab uses the hash value `#logistics`; there is no `#graph` hash in the implementation.

## Test Scenarios

### 1. A. Slug Generation

**Seed:** `tests/e2e/seed.spec.ts`

#### 1.1. URL uses human-readable slug after first save

**File:** `tests/e2e/bookmarkable-url/slug-in-url-after-save.spec.ts`

**Steps:**
  1. Navigate to `/`, clear localStorage, set `sfp:consent` to `'true'`, and reload the page.
    - expect: Page shows 'Unnamed Factory' in the name textbox. URL is exactly `http://localhost:3000/` with no query parameters.
  2. Click the factory name textbox, clear it, type 'Iron Works', and press Tab to blur.
    - expect: Textbox shows 'Iron Works'. The Save button tooltip changes to 'Save (unsaved changes)'. URL is still `/`.
  3. Click the Save button (tooltip: 'Save (unsaved changes)').
    - expect: The URL updates to `/?factory=iron-works#planning` (or whichever tab is active). The `factory` query parameter equals `iron-works`. There is no `factoryId` query parameter. The Save tooltip returns to 'Save'.
  4. Assert the URL search param `factory` equals `iron-works` and `factoryId` is absent using `new URLSearchParams(window.location.search)`.
    - expect: `factory` = `'iron-works'`. `factoryId` = `null`.

#### 1.2. Slug uniqueness: two factories with same name get different slugs

**File:** `tests/e2e/bookmarkable-url/slug-uniqueness.spec.ts`

**Steps:**
  1. Navigate to `/`, clear localStorage, set `sfp:consent` to `'true'`, and reload.
    - expect: Page shows 'Unnamed Factory'. URL is `/`.
  2. Rename to 'Iron Works' and click Save.
    - expect: URL contains `?factory=iron-works`. Record this slug as `slug1`.
  3. Click 'Open factory library', then click 'New factory'.
    - expect: Library closes. URL is `/`. Page shows 'Unnamed Factory'.
  4. Rename to 'Iron Works' (same name as the first factory) and click Save.
    - expect: URL contains `?factory=iron-works-2` (the first available unique variant). The `factory` param is `iron-works-2`, not `iron-works`.
  5. Assert that `slug1` is `iron-works` and the new URL's `factory` param is `iron-works-2`, confirming they differ.
    - expect: `iron-works` and `iron-works-2` are different strings. Both factories are independently addressable.

#### 1.3. Special characters in factory name produce a valid slug

**File:** `tests/e2e/bookmarkable-url/slug-special-characters.spec.ts`

**Steps:**
  1. Navigate to `/`, clear localStorage, set `sfp:consent` to `'true'`, and reload.
    - expect: Page shows 'Unnamed Factory'. URL is `/`.
  2. Rename the factory to 'Oil & Gas Processing #1!' and click Save.
    - expect: Save completes without error. The URL `factory` param contains only lowercase letters, digits, and hyphens — no `&`, `#`, `!`, spaces, or other special characters. A reasonable expected slug is `oil-gas-processing-1`.
  3. Assert `new URLSearchParams(window.location.search).get('factory')` matches `/^[a-z0-9-]+$/`.
    - expect: The slug is URL-safe. The page does not throw any errors.

#### 1.4. Renaming a factory does not change its existing slug in the URL

**File:** `tests/e2e/bookmarkable-url/slug-preserved-on-rename.spec.ts`

**Steps:**
  1. Navigate to `/`, clear localStorage, set `sfp:consent` to `'true'`, and reload.
    - expect: Page shows 'Unnamed Factory'. URL is `/`.
  2. Rename to 'Iron Works' and click Save. Record the URL's `factory` param as `originalSlug`.
    - expect: URL contains `?factory=iron-works`. `originalSlug` = `'iron-works'`.
  3. Click the factory name textbox, clear it, type 'Steel Works', and press Tab to blur.
    - expect: Textbox shows 'Steel Works'. Save tooltip changes to 'Save (unsaved changes)'.
  4. Click Save.
    - expect: Save completes. The URL's `factory` param is still `iron-works` (the original slug), not `steel-works`. Renaming does not regenerate the slug.
  5. Reload the page and verify the URL still contains `?factory=iron-works` and the factory name shows 'Steel Works'.
    - expect: Factory loads by slug `iron-works` and displays the updated name 'Steel Works'.

#### 1.5. Old factory without a slug gets one generated and URL updated on first load

**File:** `tests/e2e/bookmarkable-url/slug-generated-for-legacy-factory.spec.ts`

**Steps:**
  1. Navigate to `/`, clear localStorage, set `sfp:consent` to `'true'`, and reload.
    - expect: Page shows 'Unnamed Factory'. URL is `/`.
  2. Inject a legacy factory entry directly into localStorage via `page.evaluate`. Insert a `sfp:library` entry whose factory record has an `id` but no `slug` field and name 'Copper Works'. Also set `sfp:current` to that factory's `id`.
    - expect: localStorage now contains a factory record lacking a slug field.
  3. Reload the page with the URL `/?factoryId=<injectedId>` (using the legacy param).
    - expect: Page loads without error. `restoreFactory` reads the `factoryId` param, finds the factory, calls `ensureSlug` to generate a slug, and persists it back to the library.
  4. After load, read the URL and check the `factory` param.
    - expect: The URL has been updated to `/?factory=copper-works#planning` (or similar). The `factoryId` param is absent. The factory name textbox shows 'Copper Works'.
  5. Reload the page again at `/` and verify the factory loads.
    - expect: The factory with slug `copper-works` is persisted; the library entry now has a slug field. The factory loads correctly.

### 2. B. Hash / Tab Routing

**Seed:** `tests/e2e/seed.spec.ts`

#### 2.1. URL includes correct hash for each active tab

**File:** `tests/e2e/bookmarkable-url/hash-reflects-active-tab.spec.ts`

**Steps:**
  1. Navigate to `/`, clear localStorage, set `sfp:consent` to `'true'`, and reload. Rename to 'Test Factory' and click Save.
    - expect: URL is `/?factory=test-factory#planning` (Planning tab is active by default).
  2. Click the 'Optimization' tab.
    - expect: URL hash changes to `#optimization` via replaceState. No new history entry is added. The URL is now `/?factory=test-factory#optimization`.
  3. Click the 'Logistics' tab.
    - expect: URL hash changes to `#logistics`. The URL is now `/?factory=test-factory#logistics`.
  4. Click the 'Planning' tab.
    - expect: URL hash changes back to `#planning`. The URL is `/?factory=test-factory#planning`.

#### 2.2. Switching tabs uses replaceState and does not add history entries

**File:** `tests/e2e/bookmarkable-url/tab-switch-uses-replace-state.spec.ts`

**Steps:**
  1. Navigate to `/`, clear localStorage, set `sfp:consent` to `'true'`, and reload. Rename to 'Test Factory' and click Save.
    - expect: URL is `/?factory=test-factory#planning`.
  2. Record the browser history length via `window.history.length`.
    - expect: Record `lengthBefore`.
  3. Click the 'Optimization' tab, then the 'Logistics' tab, then back to 'Planning' tab.
    - expect: Each tab click updates the URL hash immediately via replaceState.
  4. Check `window.history.length` again.
    - expect: `window.history.length` equals `lengthBefore` — no new entries were added by tab switching, confirming replaceState was used each time.
  5. Press the browser back button (`page.goBack()`).
    - expect: The browser navigates back to the previous factory state or `/`, not to a previous tab. Tab switching does not pollute the history stack.

#### 2.3. Direct load of `/?factory=<slug>#logistics` opens on the Logistics tab

**File:** `tests/e2e/bookmarkable-url/direct-load-logistics-tab.spec.ts`

**Steps:**
  1. Navigate to `/`, clear localStorage, set `sfp:consent` to `'true'`, and reload. Rename to 'Iron Works' and click Save. Record the slug from the URL.
    - expect: URL is `/?factory=iron-works#planning`. Slug is `iron-works`.
  2. Perform a full page navigation via `page.goto('/?factory=iron-works#logistics')`.
    - expect: The page performs a full reload.
  3. After load, check which tab is active (look for the selected tab in the tablist).
    - expect: The 'Logistics' tab is selected/active. The Planning tab is not active. The factory name shows 'Iron Works'.
  4. Check the URL after load.
    - expect: URL is `/?factory=iron-works#logistics` (the hash was preserved and applied).

#### 2.4. Direct load of `/?factory=<slug>#planning` opens on the Planning tab

**File:** `tests/e2e/bookmarkable-url/direct-load-planning-tab.spec.ts`

**Steps:**
  1. Navigate to `/`, clear localStorage, set `sfp:consent` to `'true'`, and reload. Rename to 'Iron Works' and click Save.
    - expect: Factory is saved with slug `iron-works`.
  2. Click the 'Logistics' tab to change the active tab away from Planning.
    - expect: Logistics tab is active, URL hash is `#logistics`.
  3. Perform a full page navigation via `page.goto('/?factory=iron-works#planning')`.
    - expect: Page reloads.
  4. Check the active tab after load.
    - expect: The 'Planning' tab is selected. The Logistics tab is not active. Factory name shows 'Iron Works'.

#### 2.5. Unknown hash value falls back to the default Planning tab

**File:** `tests/e2e/bookmarkable-url/unknown-hash-fallback.spec.ts`

**Steps:**
  1. Navigate to `/`, clear localStorage, set `sfp:consent` to `'true'`, and reload. Rename to 'Iron Works' and click Save.
    - expect: Factory saved with slug `iron-works`.
  2. Perform a full page navigation to `/?factory=iron-works#nonexistenttab`.
    - expect: Page reloads without crashing.
  3. Check the active tab after load.
    - expect: The 'Planning' tab is active (the default). No error dialog or crash screen is visible. Factory name shows 'Iron Works'.

#### 2.6. Back/forward navigation preserves tab state via hash

**File:** `tests/e2e/bookmarkable-url/back-forward-tab-hash.spec.ts`

**Steps:**
  1. Navigate to `/`, clear localStorage, set `sfp:consent` to `'true'`, and reload. Rename to 'Iron Works' and click Save.
    - expect: URL is `/?factory=iron-works#planning`.
  2. Click 'Open factory library', then 'New factory'. Rename to 'Steel Works' and click Save.
    - expect: URL is `/?factory=steel-works#planning`.
  3. Click the 'Logistics' tab on Steel Works.
    - expect: URL hash changes to `#logistics` via replaceState. URL is `/?factory=steel-works#logistics`.
  4. Open the library, click 'Iron Works' to switch factories.
    - expect: URL changes to `/?factory=iron-works#planning` (new pushState entry with current active section). Iron Works is shown.
  5. Use `page.goBack()` to navigate back.
    - expect: The URL returns to `/?factory=steel-works#logistics` (or the state at the time of the pushState for Steel Works). The Logistics tab becomes active and Steel Works is loaded.
  6. Use `page.goForward()` to navigate forward.
    - expect: URL returns to `/?factory=iron-works#planning`. Iron Works loads on the Planning tab.

#### 2.7. Switching factories via library updates hash to reflect the new factory context

**File:** `tests/e2e/bookmarkable-url/factory-switch-resets-tab-hash.spec.ts`

**Steps:**
  1. Navigate to `/`, clear localStorage, set `sfp:consent` to `'true'`, and reload. Rename to 'Iron Works' and click Save.
    - expect: URL is `/?factory=iron-works#planning`.
  2. Click 'Open factory library', then 'New factory'. Rename to 'Steel Works' and click Save.
    - expect: URL is `/?factory=steel-works#planning`.
  3. Open the library and click 'Iron Works'.
    - expect: URL changes to `/?factory=iron-works#planning`. The hash in the URL corresponds to the currently active tab.

### 3. C. Slug-Based URL with Legacy Fallback

**Seed:** `tests/e2e/seed.spec.ts`

#### 3.1. `?factory=<slug>` URL loads the correct factory on direct navigation

**File:** `tests/e2e/bookmarkable-url/direct-url-load-slug.spec.ts`

**Steps:**
  1. Navigate to `/`, clear localStorage, set `sfp:consent` to `'true'`, and reload. Rename to 'Iron Works' and click Save. Also create a second factory 'Steel Works' and save it.
    - expect: Both factories are in the library. Current factory is 'Steel Works'.
  2. Perform a full page navigation to `/?factory=iron-works` (without hash).
    - expect: Page reloads. `restoreFactory` reads `?factory=iron-works`, finds the matching factory by slug, and loads it.
  3. Check the factory name textbox and the URL.
    - expect: Factory name shows 'Iron Works'. URL contains `?factory=iron-works`. Steel Works was not affected.
  4. Open the library drawer.
    - expect: Both 'Iron Works' and 'Steel Works' are listed. The library is intact.

#### 3.2. Legacy `?factoryId=<uuid>` URL still loads the factory

**File:** `tests/e2e/bookmarkable-url/legacy-factory-id-url.spec.ts`

**Steps:**
  1. Navigate to `/`, clear localStorage, set `sfp:consent` to `'true'`, and reload. Rename to 'Iron Works' and click Save.
    - expect: Factory saved. URL now uses `?factory=iron-works`.
  2. Read the factory's `id` from localStorage by evaluating `JSON.parse(localStorage.getItem('sfp:library')).factories[0].id`. Store as `factoryId`.
    - expect: `factoryId` is a non-empty UUID string.
  3. Perform a full page navigation to `/?factoryId=<factoryId>` (the legacy URL format).
    - expect: Page reloads. `restoreFactory` reads `?factoryId`, finds the matching factory, and loads it.
  4. Check the factory name and the URL after load.
    - expect: Factory name shows 'Iron Works'. The URL has been updated to the slug form `/?factory=iron-works#planning` — `ensureSlug` ran and `window.history.replaceState` updated the URL to the canonical slug form.

#### 3.3. Factory loaded via legacy URL gets a slug generated and URL updated

**File:** `tests/e2e/bookmarkable-url/legacy-url-gets-slug-assigned.spec.ts`

**Steps:**
  1. Navigate to `/`, clear localStorage, set `sfp:consent` to `'true'`, and reload. Inject a legacy factory into localStorage via `page.evaluate`: insert a factory with a known `id` but no `slug` field and name 'Copper Smelter'.
    - expect: localStorage contains the legacy factory entry.
  2. Navigate via `page.goto('/?factoryId=<injectedId>')` to simulate loading the legacy bookmarked URL.
    - expect: Page loads without error.
  3. After load, read the URL's search params.
    - expect: The URL has been updated to `/?factory=copper-smelter#planning` (or whichever active tab). `factoryId` param is absent. `factory` param equals `copper-smelter`.
  4. Read the factory entry from localStorage and check its `slug` field.
    - expect: The factory entry in localStorage now has `slug: 'copper-smelter'`. The slug was persisted back by `ensureSlug`.

### 4. D. Full Bookmark Round-Trip

**Seed:** `tests/e2e/seed.spec.ts`

#### 4.1. Copying `/?factory=<slug>#logistics` and opening in a fresh page loads correct factory on Logistics tab

**File:** `tests/e2e/bookmarkable-url/full-bookmark-roundtrip.spec.ts`

**Steps:**
  1. Navigate to `/`, clear localStorage, set `sfp:consent` to `'true'`, and reload. Rename to 'Iron Works' and click Save.
    - expect: Factory saved with slug `iron-works`.
  2. Click the 'Logistics' tab.
    - expect: URL hash changes to `#logistics`. Full URL is now `/?factory=iron-works#logistics`.
  3. Capture the full URL string from `page.url()`.
    - expect: URL string is `http://localhost:3000/?factory=iron-works#logistics`.
  4. Perform a full page navigation via `page.goto('/?factory=iron-works#logistics')` to simulate pasting the bookmark in a new tab (localStorage is preserved from the earlier steps).
    - expect: Page reloads fully.
  5. After load, verify the factory name, active tab, and URL.
    - expect: Factory name shows 'Iron Works'. The 'Logistics' tab is active. URL is `/?factory=iron-works#logistics`.

#### 4.2. Unknown slug in URL falls back gracefully — no crash and URL resets

**File:** `tests/e2e/bookmarkable-url/unknown-slug-fallback.spec.ts`

**Steps:**
  1. Navigate to `/`, clear localStorage, set `sfp:consent` to `'true'`, and reload.
    - expect: Page shows 'Unnamed Factory'. Library is empty.
  2. Navigate via `page.goto('/?factory=nonexistent-slug-xyz')` — a slug that does not exist in the library.
    - expect: Page loads without throwing a JavaScript error.
  3. Check the factory name and URL after load.
    - expect: Factory name shows 'Unnamed Factory'. URL has changed to `/` (no factory param) because `restoreFactory` found no match and `currentFactoryId` remained null, causing the pushState effect to push `/`.
  4. Check the browser console for JavaScript errors.
    - expect: No unhandled errors in the console related to the missing slug.

#### 4.3. Unknown slug with hash still falls back gracefully without tab errors

**File:** `tests/e2e/bookmarkable-url/unknown-slug-with-hash-fallback.spec.ts`

**Steps:**
  1. Navigate to `/`, clear localStorage, set `sfp:consent` to `'true'`, and reload.
    - expect: Page shows 'Unnamed Factory'. URL is `/`.
  2. Navigate via `page.goto('/?factory=ghost-factory#logistics')`.
    - expect: Page reloads without crashing.
  3. After load, check the active tab, factory name, and URL.
    - expect: Factory name shows 'Unnamed Factory'. URL is `/` (the factory was not found, so currentFactoryId is null and pushState pushed `/`). The Logistics tab mount logic may or may not activate — either Planning (default) or Logistics is acceptable as long as no error occurs.

### 5. E. Existing Scenarios Requiring Updates for Slug URL Format

**Seed:** `tests/e2e/seed.spec.ts`

#### 5.1. url-updates-on-save: URL gets `?factory=<slug>` (not `?factoryId=`) after save

**File:** `tests/e2e/bookmarkable-url/url-updates-on-save.spec.ts`

**Steps:**
  1. Navigate to `/`, clear localStorage, set `sfp:consent` to `'true'`, and reload.
    - expect: Page shows 'Unnamed Factory'. URL is `/`.
  2. Rename to 'Iron Works' and press Tab.
    - expect: Save tooltip shows 'Save (unsaved changes)'. URL is still `/`.
  3. Click Save.
    - expect: URL updates to `/?factory=iron-works#planning`. The `factory` param is `iron-works`. There is NO `factoryId` param. NOTE: the original plan asserted `factoryId=` in the URL — this must be updated to assert `factory=iron-works` instead.
  4. Navigate to `/` via full reload, then navigate back to `/?factory=iron-works`.
    - expect: Factory name shows 'Iron Works', confirming the slug-based URL functions as a bookmark.

#### 5.2. url-updates-on-factory-switch: URL changes to `?factory=<slug>` when switching via library

**File:** `tests/e2e/bookmarkable-url/url-updates-on-factory-switch.spec.ts`

**Steps:**
  1. Navigate to `/`, clear localStorage, set `sfp:consent` to `'true'`, and reload. Rename to 'Factory A' and click Save. Record slug from URL (`factory` param).
    - expect: URL is `/?factory=factory-a#planning`. Slug A = `factory-a`. NOTE: existing test asserts `factoryId=` — must be updated to assert `factory=factory-a`.
  2. Open library, create 'New factory', rename to 'Factory B', and click Save. Record slug B.
    - expect: URL is `/?factory=factory-b#planning`. Slug B = `factory-b`.
  3. Open library and click 'Factory A'.
    - expect: URL changes to `/?factory=factory-a#planning`. Slug A matches. URL does NOT contain `factory-b`. NOTE: existing test uses `factoryId` regex matching — must be updated to use `factory=factory-a`.

#### 5.3. back-navigation: back/forward uses `?factory=<slug>` URLs (not `?factoryId=`)

**File:** `tests/e2e/bookmarkable-url/back-navigation.spec.ts`

**Steps:**
  1. Navigate to `/`, clear localStorage, set `sfp:consent` to `'true'`, and reload. Rename to 'Factory A' and click Save. Record `slugA` from URL `factory` param.
    - expect: URL is `/?factory=factory-a#planning`. NOTE: existing test captures `factoryId` from URL — must be updated to read `factory` param as the slug identifier.
  2. Open library, create 'New factory', rename to 'Factory B', save. Record `slugB`.
    - expect: URL is `/?factory=factory-b#planning`.
  3. Open library, click 'Factory A'.
    - expect: URL is `/?factory=factory-a#planning`. Factory name shows 'Factory A'.
  4. Call `page.goBack()`.
    - expect: URL changes back to `/?factory=factory-b#planning` (or the hash at time of push). Factory name shows 'Factory B'. NOTE: existing test uses `waitForURL(/factoryId=.../)` — must be updated to use `waitForURL(/factory=factory-b/)`.
  5. Call `page.goForward()`.
    - expect: URL returns to `/?factory=factory-a#planning`. Factory name shows 'Factory A'. NOTE: same update required as above.

#### 5.4. direct-url-load: navigating to `/?factory=<slug>` loads correct factory

**File:** `tests/e2e/bookmarkable-url/direct-url-load.spec.ts`

**Steps:**
  1. Navigate to `/`, clear localStorage, set `sfp:consent` to `'true'`, and reload. Rename to 'Factory A' and click Save. Record `slugA` from `factory` URL param.
    - expect: URL is `/?factory=factory-a#planning`. NOTE: existing plan step 4 uses `page.goto('/?factoryId=' + idA)` — must be updated to `page.goto('/?factory=' + slugA)`.
  2. Create 'Factory B', save it.
    - expect: URL is `/?factory=factory-b#planning`.
  3. Full page navigate to `/?factory=factory-a`.
    - expect: Factory name shows 'Factory A'. URL contains `?factory=factory-a`. `factoryId` param is absent.
  4. Open library and verify both factories are still present.
    - expect: Library lists 'Factory A' and 'Factory B'. Navigation did not corrupt the library.
