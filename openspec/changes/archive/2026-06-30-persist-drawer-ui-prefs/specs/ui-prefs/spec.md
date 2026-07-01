## ADDED Requirements

### Requirement R1: Drawer pin state persists across page reloads
The system SHALL persist the factory browser drawer's pinned/unpinned state to localStorage under the key `sfp:library-pinned` and restore it on page load. The default value when no preference is stored SHALL be `false` (unpinned). No storage consent gate is required, consistent with `sfp:autosave-pref`.

#### Scenario R1.S1: Pin state restored after reload when pinned
- **WHEN** user pins the drawer and reloads the page
- **THEN** the drawer renders in pinned (sidebar) mode without user interaction

#### Scenario R1.S2: Drawer not rendered on load when unpinned
- **WHEN** the stored pin state is `false` (or absent) and the page loads
- **THEN** the drawer does not render; it only appears when the user clicks the folder icon, at which point it renders in overlay mode

#### Scenario R1.S3: Default state on first load
- **WHEN** no `sfp:library-pinned` value exists in localStorage
- **THEN** the drawer defaults to unpinned (per R1.S2 behavior)

#### Scenario R1.S4: Preference written on toggle
- **WHEN** user clicks the pin/unpin button
- **THEN** the new boolean value is written to `sfp:library-pinned` immediately

### Requirement R2: Factory overview sidebar width persists across page reloads
The system SHALL persist the factory overview sidebar width to localStorage under the key `sfp:sidebar-width` and restore it on page load. The default value when no preference is stored SHALL be `380`. No storage consent gate is required.

#### Scenario R2.S1: Width restored after reload
- **WHEN** user drags the sidebar resize divider to a custom width and reloads the page
- **THEN** the factory overview sidebar renders at the previously set width without user interaction

#### Scenario R2.S2: Default width on first load
- **WHEN** no `sfp:sidebar-width` value exists in localStorage
- **THEN** the factory overview sidebar renders at width 380

#### Scenario R2.S3: Width written on drag end
- **WHEN** user drags the sidebar resize divider and releases the mouse
- **THEN** the final width is written to `sfp:sidebar-width` exactly once (on mouseup, not during drag)

#### Scenario R2.S4: Width clamped to valid range
- **WHEN** a stored width value is outside the valid range (200–700)
- **THEN** the system clamps it to the nearest valid bound before applying
