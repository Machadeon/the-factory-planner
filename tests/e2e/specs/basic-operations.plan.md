# Satisfactory Planner - Basic Operations Test Plan

## Application Overview

Satisfactory Planner is a single-page Next.js app for planning production factories in the game Satisfactory. Users compose a factory by selecting output products, assigning recipes, and setting production rates. The app calculates part rates and can auto-optimize them via linear programming. All state is stored in localStorage. The domain model is Factory > ProductionLine (one per output part) > AssemblyLine (one per recipe variant). The app has no backend and relies on localStorage for persistence. A consent dialog is bypassed in tests by pre-seeding localStorage with the consent key.

## Test Scenarios

### 1. Factory Name and Icon

**Seed:** `tests/e2e/seed.spec.ts`

#### 1.1. Rename the factory via the header text field

**File:** `tests/e2e/factory-name-icon/rename-factory.spec.ts`

**Steps:**
  1. Navigate to http://localhost:3000 with the seed state applied (consent pre-set in localStorage)
    - expect: The page loads and the factory header shows the name text field labeled 'Factory name'
  2. Click the factory name text field labeled 'Factory name' in the header
    - expect: The text field becomes focused
  3. Clear the existing text and type 'Iron Works'
    - expect: The text field now shows 'Iron Works'
  4. Press Tab or click elsewhere to confirm
    - expect: The factory header displays 'Iron Works' as the factory name

#### 1.2. Set the factory icon via the icon picker

**File:** `tests/e2e/factory-name-icon/set-factory-icon.spec.ts`

**Steps:**
  1. Navigate to http://localhost:3000 with the seed state applied
    - expect: The page loads with the default factory icon (or no icon) visible in the header
  2. Click the 'Set factory icon' button (the icon image next to the factory name field)
    - expect: An icon picker panel opens showing a grid of all game part icons and a 'Search parts...' text field
  3. Type 'Iron' in the 'Search parts...' text field
    - expect: The icon grid filters to show only items whose names contain 'Iron' (e.g., Iron Plate, Iron Ingot, Iron Ore, Iron Rod, Iron Rebar)
  4. Click the 'Iron Plate' icon button
    - expect: The icon picker closes and the factory header now shows the Iron Plate icon next to the factory name

### 2. Adding and Removing Products

**Seed:** `tests/e2e/seed.spec.ts`

#### 2.1. Add a product via the 'Add Product' button

**File:** `tests/e2e/products/add-product.spec.ts`

**Steps:**
  1. Navigate to http://localhost:3000 with the seed state applied
    - expect: The main area shows the message 'Add a product to get started' and an 'Add Product' button. The overview sidebar shows 'Outputs (0)', 'Inputs (0)', and 'Intermediate Parts (0)'
  2. Click the 'Add Product' button
    - expect: A Part selector combobox appears with a dropdown listing all available game parts in alphabetical order
  3. Type 'Iron Plate' in the Part combobox
    - expect: The dropdown filters to show 'Iron Plate' and 'Reinforced Iron Plate'
  4. Click the 'Iron Plate' option in the dropdown
    - expect: A production line row for Iron Plate appears with: a part icon, 'Iron Plate' label, a 'Factory Output Rate' text field (default 10), a 'Production Rate' text field (disabled, default 10), an '/min' label, an 'Override rate' button, an 'Actual: 0/min (-10)' status, and available recipe cards below it (Standard, Alternate: Coated Iron Plate, Alternate: Steel Cast Plate)

#### 2.2. Search and select a product using autocomplete filtering

**File:** `tests/e2e/products/search-and-select-product.spec.ts`

**Steps:**
  1. Navigate to http://localhost:3000 with the seed state applied
    - expect: The main area shows 'Add a product to get started'
  2. Click 'Add Product'
    - expect: The Part combobox appears with its dropdown open
  3. Type 'Rein' in the Part combobox
    - expect: The dropdown filters to show only 'Reinforced Iron Plate'
  4. Click 'Reinforced Iron Plate' in the dropdown
    - expect: A production line row for Reinforced Iron Plate appears with the part icon and name, and recipe options for Reinforced Iron Plate are shown

#### 2.3. Remove a product from the factory

**File:** `tests/e2e/products/remove-product.spec.ts`

**Steps:**
  1. Navigate to http://localhost:3000 with the seed state applied
    - expect: The main area shows 'Add a product to get started'
  2. Click 'Add Product', type 'Iron Plate', and select 'Iron Plate' from the dropdown
    - expect: A production line row for Iron Plate appears
  3. Click the 'Remove product' button (trash icon) at the far right of the Iron Plate production line header
    - expect: The Iron Plate production line is removed and the main area shows 'Add a product to get started' again. The overview sidebar resets to 'Outputs (0)', 'Inputs (0)'

#### 2.4. Add multiple products to the factory

**File:** `tests/e2e/products/add-multiple-products.spec.ts`

**Steps:**
  1. Navigate to http://localhost:3000 with the seed state applied
    - expect: The main area shows 'Add a product to get started'
  2. Click 'Add Product', type 'Iron Plate', and select 'Iron Plate'
    - expect: A production line for Iron Plate appears
  3. Click 'Add Product' again, type 'Wire', and select 'Wire'
    - expect: A second production line for Wire appears below the Iron Plate row. Both production lines are visible simultaneously
  4. Click 'Add Product' again, type 'Concrete', and select 'Concrete'
    - expect: A third production line for Concrete appears. All three production lines are visible

### 3. Recipe Selection

**Seed:** `tests/e2e/seed.spec.ts`

#### 3.1. Select the standard recipe for a product

**File:** `tests/e2e/recipes/select-standard-recipe.spec.ts`

**Steps:**
  1. Navigate to http://localhost:3000 with the seed state applied
    - expect: The page loads with an empty factory
  2. Click 'Add Product', type 'Iron Plate', and select 'Iron Plate'
    - expect: The Iron Plate production line appears with three recipe cards: the standard 'Iron Plate' (Constructor), 'Alternate: Coated Iron Plate' (Assembler), and 'Alternate: Steel Cast Plate' (Foundry)
  3. Click the standard 'Iron Plate' recipe card (shows Constructor icon, 3x Iron Ingot → 2x Iron Plate)
    - expect: An assembly line row appears inside the production line showing: Constructor icon, 'Iron Plate' label, ingredient (Iron Ingot 15/min), arrow, product (Iron Plate 10/min). The recipe picker disappears. The 'Actual: 10/min' status shows in green. The sidebar updates to Outputs (1): Iron Plate +10/min, Inputs (1): Iron Ingot -15/min

#### 3.2. Select an alternate recipe for a product

**File:** `tests/e2e/recipes/select-alternate-recipe.spec.ts`

**Steps:**
  1. Navigate to http://localhost:3000 with the seed state applied
    - expect: The page loads with an empty factory
  2. Click 'Add Product', type 'Iron Plate', and select 'Iron Plate'
    - expect: The Iron Plate production line shows three recipe options
  3. Click the 'Alternate: Coated Iron Plate' recipe card (shows Assembler icon, Iron Ingot + Plastic inputs)
    - expect: An assembly line row appears using the Coated Iron Plate recipe with an Assembler building icon and the correct ingredient rates. The sidebar shows Iron Plate output and both Iron Ingot and Plastic as inputs

#### 3.3. Add a second recipe to a production line

**File:** `tests/e2e/recipes/add-second-recipe.spec.ts`

**Steps:**
  1. Navigate to http://localhost:3000 with the seed state applied
    - expect: The page loads with an empty factory
  2. Click 'Add Product', type 'Iron Plate', select 'Iron Plate', then click the standard Iron Plate recipe
    - expect: An assembly line with the standard Iron Plate recipe appears. The 'Add Recipe' button is visible below
  3. Click the 'Add Recipe' button below the assembly line
    - expect: The remaining alternate recipe cards appear: 'Alternate: Coated Iron Plate' and 'Alternate: Steel Cast Plate'
  4. Click the 'Alternate: Coated Iron Plate' recipe card
    - expect: A second assembly line row appears below the first, using the Coated Iron Plate recipe. Both assembly lines are now visible for the Iron Plate production line

#### 3.4. Remove a recipe from a production line

**File:** `tests/e2e/recipes/remove-recipe.spec.ts`

**Steps:**
  1. Navigate to http://localhost:3000 with the seed state applied
    - expect: The page loads with an empty factory
  2. Click 'Add Product', type 'Iron Plate', select 'Iron Plate', click the standard recipe to add it, then click 'Add Recipe' and select 'Alternate: Coated Iron Plate'
    - expect: Two assembly line rows are visible for Iron Plate
  3. Click the 'Remove recipe' button (trash icon) on the second assembly line (Coated Iron Plate)
    - expect: The Coated Iron Plate assembly line is removed. Only the standard Iron Plate assembly line remains

### 4. Production Rates

**Seed:** `tests/e2e/seed.spec.ts`

#### 4.1. Change the Factory Output Rate for a production line

**File:** `tests/e2e/rates/change-output-rate.spec.ts`

**Steps:**
  1. Navigate to http://localhost:3000 with the seed state applied
    - expect: The page loads with an empty factory
  2. Add Iron Plate as a product and select the standard Iron Plate recipe
    - expect: The Iron Plate production line shows Factory Output Rate = 10 and Actual: 10/min
  3. Click the 'Factory Output Rate' text field and change the value to 30
    - expect: The Factory Output Rate field shows 30. The assembly line recalculates and the 'Actual' rate updates to reflect the new target. The overview sidebar updates to show Iron Plate output and Iron Ingot input at the new rates

#### 4.2. Enter a math expression in the Factory Output Rate field

**File:** `tests/e2e/rates/math-expression-in-rate.spec.ts`

**Steps:**
  1. Navigate to http://localhost:3000 with the seed state applied
    - expect: The page loads with an empty factory
  2. Add Iron Plate as a product and select the standard Iron Plate recipe
    - expect: The Iron Plate production line appears with a Factory Output Rate field
  3. Click the 'Factory Output Rate' field, clear it, and type '60*2'
    - expect: The field accepts the expression '60*2'
  4. Press Enter or Tab to confirm the expression
    - expect: The Factory Output Rate field evaluates to 120. The production rates update accordingly. The overview sidebar reflects Iron Plate at 120/min output

#### 4.3. Override the Production Rate for a production line

**File:** `tests/e2e/rates/override-production-rate.spec.ts`

**Steps:**
  1. Navigate to http://localhost:3000 with the seed state applied
    - expect: The page loads with an empty factory
  2. Add Iron Plate as a product and select the standard Iron Plate recipe
    - expect: The Iron Plate production line shows Factory Output Rate = 10, Production Rate disabled = 10, and an 'Override rate' (edit) button
  3. Click the 'Override rate' button
    - expect: The Production Rate field becomes enabled and the button tooltip changes to 'Autocalculate rate'
  4. Click the Production Rate field, clear it, and type 20
    - expect: The Production Rate field shows 20
  5. Press Enter or Tab to confirm
    - expect: The production line uses 20/min as its production rate. The 'Actual' rate updates. The assembly line controls update machine count and clock speed accordingly

#### 4.4. Return to autocalculate after overriding production rate

**File:** `tests/e2e/rates/return-to-autocalculate-rate.spec.ts`

**Steps:**
  1. Navigate to http://localhost:3000 with the seed state applied
    - expect: The page loads with an empty factory
  2. Add Iron Plate as a product, select the standard recipe, then click 'Override rate' and set Production Rate to 25
    - expect: Production Rate field shows 25 and the 'Autocalculate rate' button is visible
  3. Click the 'Autocalculate rate' (link) button
    - expect: The Production Rate field becomes disabled again and reverts to autocalculate mode. The button tooltip changes back to 'Override rate'

### 5. Assembly Line Machine Controls

**Seed:** `tests/e2e/seed.spec.ts`

#### 5.1. Adjust clock speed via the slider

**File:** `tests/e2e/machines/adjust-clock-speed-slider.spec.ts`

**Steps:**
  1. Navigate to http://localhost:3000 with the seed state applied
    - expect: The page loads with an empty factory
  2. Add Iron Plate as a product and select the standard Iron Plate recipe
    - expect: The assembly line controls panel shows a clock speed slider at 100% and a Somersloop slider at 0. Power shards/machine = 0
  3. Drag the clock speed slider to the 150% mark
    - expect: The clock speed text field shows 150. The power shards counter updates to show 1/machine. The power consumption increases. Machine count display updates
  4. Drag the clock speed slider to the 200% mark
    - expect: The clock speed text field shows 200. Power shards shows 2/machine. Power consumption increases further

#### 5.2. Set clock speed by typing in the percentage field

**File:** `tests/e2e/machines/set-clock-speed-text.spec.ts`

**Steps:**
  1. Navigate to http://localhost:3000 with the seed state applied
    - expect: The page loads with an empty factory
  2. Add Iron Plate as a product and select the standard Iron Plate recipe
    - expect: The assembly line controls show machine count = 1 and clock speed = 100%
  3. Click the clock speed text field (showing '100' with '%' suffix) and change the value to 50
    - expect: The clock speed slider moves to 50%. The machine count updates to reflect the new speed. Power consumption shows the updated value

#### 5.3. Set machine count by typing in the machine count field

**File:** `tests/e2e/machines/set-machine-count.spec.ts`

**Steps:**
  1. Navigate to http://localhost:3000 with the seed state applied
    - expect: The page loads with an empty factory
  2. Add Iron Plate as a product, select the standard recipe, and change the Factory Output Rate to 60
    - expect: The assembly line shows machine count = 1 running at approximately 100%
  3. Click the machine count text field and type 3
    - expect: The machine count field shows 3. The clock speed adjusts to distribute the workload across 3 machines. The machine count display row updates to show clock speeds for all machines

#### 5.4. Toggle the 'All equal' clock speed switch

**File:** `tests/e2e/machines/toggle-all-equal-switch.spec.ts`

**Steps:**
  1. Navigate to http://localhost:3000 with the seed state applied
    - expect: The page loads with an empty factory
  2. Add Iron Plate as a product, select the standard recipe, and set Factory Output Rate to 25
    - expect: The assembly line shows the 'All equal' switch toggled ON and the clock speed display shows all machines at an equal speed
  3. Click the 'All equal' switch to toggle it OFF (enabling 'bank + remainder' mode)
    - expect: The switch changes state and the machine count display updates to show a split between full-speed machines and a remainder machine running at a different clock speed. The label changes to indicate mixed clock speeds
  4. Click the switch again to toggle it back ON
    - expect: All machines return to equal clock speed mode

#### 5.5. Copy clock speed value using the copy button

**File:** `tests/e2e/machines/copy-clock-speed.spec.ts`

**Steps:**
  1. Navigate to http://localhost:3000 with the seed state applied
    - expect: The page loads with an empty factory
  2. Add Iron Plate as a product and select the standard Iron Plate recipe
    - expect: The assembly line controls show a machine count display with copy button(s) next to clock speed percentages
  3. Click the copy button next to a displayed clock speed percentage
    - expect: The button responds to the click (clipboard API is invoked). The clock speed value is available for pasting

#### 5.6. Adjust Somersloop slots via the slider

**File:** `tests/e2e/machines/adjust-somersloop-slider.spec.ts`

**Steps:**
  1. Navigate to http://localhost:3000 with the seed state applied
    - expect: The page loads with an empty factory
  2. Add Iron Plate as a product and select the standard Iron Plate recipe
    - expect: The assembly line controls show a Somersloop (production amplifier) slider at 0. The overview sidebar shows '0 Somersloops'
  3. Drag the Somersloop slider to 1
    - expect: The Somersloop slider shows 1. The overview sidebar updates to show '1 Somersloops' (or more, depending on machine count). The total Somersloops counter in the assembly line summary also updates

### 6. Overview Sidebar

**Seed:** `tests/e2e/seed.spec.ts`

#### 6.1. Sidebar shows correct outputs and inputs after adding a recipe

**File:** `tests/e2e/overview/sidebar-outputs-inputs.spec.ts`

**Steps:**
  1. Navigate to http://localhost:3000 with the seed state applied
    - expect: The overview sidebar shows Outputs (0), Inputs (0), Intermediate Parts (0), Power 0 MW, 0 Power Shards, 0 Somersloops
  2. Add Iron Plate as a product and select the standard Iron Plate recipe
    - expect: The sidebar updates to show: Outputs (1) - Iron Plate +10/min, Inputs (1) - Iron Ingot -15/min, Intermediate Parts (0), Power 1.6 MW, 0 Power Shards, 0 Somersloops

#### 6.2. Toggle intermediate parts visibility in the sidebar

**File:** `tests/e2e/overview/toggle-intermediate-parts.spec.ts`

**Steps:**
  1. Navigate to http://localhost:3000 with the seed state applied
    - expect: The page loads with an empty factory
  2. Add 'Reinforced Iron Plate' as a product and select its standard recipe
    - expect: The production line appears. The sidebar shows Intermediate Parts with a count greater than 0 (Iron Plate and Iron Rod are intermediate)
  3. Add the standard 'Iron Plate' recipe by clicking on it within the recipe list for Iron Plate sub-assembly
    - expect: The assembly line for the sub-recipe is configured
  4. Click the eye icon next to 'Intermediate Parts (N)' in the sidebar
    - expect: The intermediate parts list expands to show each intermediate part with its rate breakdown
  5. Click the eye icon again
    - expect: The intermediate parts list collapses and hides the detailed breakdown

#### 6.3. Add production line from the inputs section of the sidebar

**File:** `tests/e2e/overview/add-production-line-from-sidebar.spec.ts`

**Steps:**
  1. Navigate to http://localhost:3000 with the seed state applied
    - expect: The page loads with an empty factory
  2. Add Iron Plate as a product and select the standard Iron Plate recipe
    - expect: The sidebar shows Inputs (1): Iron Ingot -15/min with an 'Add production line' (+) button next to it
  3. Click the 'Add production line' button next to 'Iron Ingot' in the Inputs section
    - expect: A new production line for Iron Ingot is added to the main factory area. Recipe picker options for Iron Ingot appear

#### 6.4. Sidebar shows power consumption after adding a recipe

**File:** `tests/e2e/overview/sidebar-power-consumption.spec.ts`

**Steps:**
  1. Navigate to http://localhost:3000 with the seed state applied
    - expect: The overview sidebar shows Power 0 MW
  2. Add Iron Plate as a product and select the standard Iron Plate recipe
    - expect: The overview sidebar shows a non-zero power consumption in MW under 'Power & Modules'
  3. Add another product (e.g., Wire) and select its standard recipe
    - expect: The total power consumption in the sidebar increases to reflect both production lines' combined power usage

### 7. Expand and Collapse Production Lines

**Seed:** `tests/e2e/seed.spec.ts`

#### 7.1. Collapse and expand a single production line

**File:** `tests/e2e/expand-collapse/single-production-line.spec.ts`

**Steps:**
  1. Navigate to http://localhost:3000 with the seed state applied
    - expect: The page loads with an empty factory
  2. Add Iron Plate as a product and select the standard Iron Plate recipe
    - expect: The Iron Plate production line is expanded and shows the assembly line with machine controls
  3. Click the production line header row (the row with the Iron Plate icon, name, and rate fields)
    - expect: The production line collapses and the assembly line details (recipe and machine controls) are hidden. The header row remains visible with a collapsed indicator
  4. Click the production line header row again
    - expect: The production line expands and the assembly line details are visible again

#### 7.2. Use 'Expand all' and 'Collapse all' buttons

**File:** `tests/e2e/expand-collapse/expand-collapse-all.spec.ts`

**Steps:**
  1. Navigate to http://localhost:3000 with the seed state applied
    - expect: The page loads with an empty factory
  2. Add Iron Plate and Wire as products, each with their standard recipes
    - expect: Both production lines are expanded showing their assembly lines
  3. Click the 'Collapse all' button (the collapse arrow icon in the toolbar above the production lines)
    - expect: All production lines collapse — only their header rows are visible
  4. Click the 'Expand all' button (the expand arrow icon in the toolbar)
    - expect: All production lines expand and their assembly line details are visible again

### 8. Factory Toolbar Actions

**Seed:** `tests/e2e/seed.spec.ts`

#### 8.1. Clear the factory

**File:** `tests/e2e/toolbar/clear-factory.spec.ts`

**Steps:**
  1. Navigate to http://localhost:3000 with the seed state applied
    - expect: The page loads with an empty factory
  2. Add Iron Plate as a product and select the standard Iron Plate recipe
    - expect: The factory has one production line with an assembly line
  3. Click the 'Clear factory' button (trash icon) in the top toolbar
    - expect: The factory is cleared. The main area returns to showing 'Add a product to get started'. The sidebar resets to Outputs (0), Inputs (0). The factory name may remain or reset

#### 8.2. View factory JSON dialog

**File:** `tests/e2e/toolbar/view-factory-json.spec.ts`

**Steps:**
  1. Navigate to http://localhost:3000 with the seed state applied
    - expect: The page loads with an empty factory
  2. Add Iron Plate as a product and select the standard Iron Plate recipe
    - expect: The factory has one production line
  3. Click the 'View factory JSON' button in the top toolbar
    - expect: A dialog opens titled 'Factory JSON' with a 'Copy to clipboard' button and a scrollable text area showing the factory's JSON representation including schemaVersion, id, name, and productionLines array
  4. Click the 'Copy to clipboard' button inside the dialog
    - expect: The button responds to the click (clipboard API is invoked)
  5. Click the 'Close' button
    - expect: The JSON dialog closes and the factory remains unchanged

#### 8.3. Save the factory manually

**File:** `tests/e2e/toolbar/save-factory.spec.ts`

**Steps:**
  1. Navigate to http://localhost:3000 with the seed state applied
    - expect: The page loads with an empty factory
  2. Rename the factory to 'My Iron Factory' using the name field
    - expect: The factory name field shows 'My Iron Factory'
  3. Add Iron Plate as a product and select the standard recipe
    - expect: The factory has one production line
  4. Click the 'Save' button in the top toolbar
    - expect: The factory is saved to localStorage. The factory appears in the factory library when opened
  5. Click the 'Open factory library' button
    - expect: The factory library dialog opens and shows 'My Iron Factory' in the list

#### 8.4. Toggle the autosave switch

**File:** `tests/e2e/toolbar/toggle-autosave.spec.ts`

**Steps:**
  1. Navigate to http://localhost:3000 with the seed state applied
    - expect: The page loads. The 'Autosave on' switch is visible in the toolbar and is toggled ON
  2. Click the 'Autosave on' switch
    - expect: The switch state changes to OFF and the label updates to 'Autosave off'
  3. Click the switch again
    - expect: The switch state changes back to ON and the label updates to 'Autosave on'

#### 8.5. Export the current factory as a JSON file

**File:** `tests/e2e/toolbar/export-factory.spec.ts`

**Steps:**
  1. Navigate to http://localhost:3000 with the seed state applied
    - expect: The page loads with an empty factory
  2. Rename the factory to 'Export Test' and add Iron Plate as a product with the standard recipe
    - expect: The factory has one production line
  3. Click the 'Export current factory' button in the top toolbar
    - expect: A JSON file download is triggered in the browser. The file is named after the factory (e.g., 'Export Test.json' or similar). The file contains the factory's JSON representation

### 9. Factory Library

**Seed:** `tests/e2e/seed.spec.ts`

#### 9.1. Open and close the factory library

**File:** `tests/e2e/library/open-close-library.spec.ts`

**Steps:**
  1. Navigate to http://localhost:3000 with the seed state applied
    - expect: The page loads with an empty factory
  2. Click the 'Open factory library' button (folder icon) at the top-left of the toolbar
    - expect: The factory library dialog opens with a 'Factories' heading, 'New factory', 'New folder', and 'Import' buttons, a list of saved factories, and an 'Export all' button
  3. Press Escape or click outside the dialog
    - expect: The factory library dialog closes and the main factory view is visible again

#### 9.2. Create a new factory from the library

**File:** `tests/e2e/library/create-new-factory.spec.ts`

**Steps:**
  1. Navigate to http://localhost:3000 with the seed state applied
    - expect: The page loads with an empty factory
  2. Add Iron Plate as a product and select the standard recipe so the current factory is non-empty
    - expect: The Iron Plate production line is visible
  3. Click 'Open factory library' and then click 'New factory' in the library dialog
    - expect: The library dialog closes and the main area resets to an empty factory showing 'Add a product to get started'. The factory name resets to 'Unnamed Factory'. The autosave switch shows 'Autosave off'

#### 9.3. Create a new folder in the library

**File:** `tests/e2e/library/create-new-folder.spec.ts`

**Steps:**
  1. Navigate to http://localhost:3000 with the seed state applied
    - expect: The page loads with an empty factory
  2. Click 'Open factory library' to open the library dialog
    - expect: The library dialog is open
  3. Click the 'New folder' button in the library dialog
    - expect: A new folder entry appears in the list with an inline text field pre-filled with 'New Folder' and focused for renaming
  4. Clear the folder name field, type 'Iron Factories', then press Enter or Tab
    - expect: The folder is created with the name 'Iron Factories' and appears in the library list

#### 9.4. Switch to a saved factory from the library

**File:** `tests/e2e/library/switch-factory-from-library.spec.ts`

**Steps:**
  1. Navigate to http://localhost:3000 with the seed state applied
    - expect: The page loads with an empty factory
  2. Rename the factory to 'Factory A', add Iron Plate as a product and select the standard recipe, then click Save
    - expect: 'Factory A' is saved to the library
  3. Click 'Open factory library', then click 'New factory' to create a new empty factory
    - expect: The main area shows an empty factory
  4. Click 'Open factory library' again and click on 'Factory A' in the list
    - expect: The library dialog closes and 'Factory A' loads with the Iron Plate production line visible. The factory name shows 'Factory A'

#### 9.5. Access factory actions menu (Rename, Duplicate, Delete)

**File:** `tests/e2e/library/factory-actions-menu.spec.ts`

**Steps:**
  1. Navigate to http://localhost:3000 with the seed state applied
    - expect: The page loads with an empty factory
  2. Rename the factory to 'Test Factory', add Iron Plate as a product, select the standard recipe, and click Save
    - expect: 'Test Factory' is saved to the library
  3. Click 'Open factory library' to open the library dialog
    - expect: The library dialog shows 'Test Factory' in the list
  4. Click the 'Actions' button (kebab/more icon) next to 'Test Factory'
    - expect: A context menu appears with options: Rename, Export, Duplicate, Move to folder, Delete
  5. Click 'Duplicate' in the actions menu
    - expect: A copy of 'Test Factory' appears in the library list, typically named 'Test Factory (copy)' or similar

#### 9.6. Delete a factory from the library

**File:** `tests/e2e/library/delete-factory-from-library.spec.ts`

**Steps:**
  1. Navigate to http://localhost:3000 with the seed state applied
    - expect: The page loads with an empty factory
  2. Rename the factory to 'Factory To Delete', add Iron Plate as a product, select the standard recipe, and click Save
    - expect: 'Factory To Delete' is saved to the library
  3. Click 'Open factory library', click the 'Actions' button next to 'Factory To Delete', then click 'Delete'
    - expect: A confirmation prompt or the factory is immediately deleted from the library. The library no longer shows 'Factory To Delete'
