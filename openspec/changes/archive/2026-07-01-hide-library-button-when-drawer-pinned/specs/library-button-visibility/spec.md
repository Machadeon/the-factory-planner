## ADDED Requirements

### Requirement R1: Library button hidden when drawer is pinned

When the factory library drawer is pinned open as a sidebar, the "Open factory library" button in the factory header SHALL NOT be rendered in the DOM. When the drawer is unpinned, the button SHALL be rendered and functional.

#### Scenario R1.S1: Button absent when drawer is pinned

- **WHEN** the library drawer is pinned open (sidebar mode)
- **THEN** the "Open factory library" button is not present in the DOM

#### Scenario R1.S2: Button present when drawer is unpinned

- **WHEN** the library drawer is unpinned (overlay mode or closed)
- **THEN** the "Open factory library" button is rendered in the factory header and is clickable

#### Scenario R1.S3: Button removed immediately on pin

- **WHEN** the user pins the library drawer (clicks the pin button)
- **THEN** the "Open factory library" button is removed from the DOM without requiring a page reload

#### Scenario R1.S4: Button restored immediately on unpin

- **WHEN** the user unpins the library drawer (clicks the unpin button)
- **THEN** the "Open factory library" button appears in the factory header without requiring a page reload
