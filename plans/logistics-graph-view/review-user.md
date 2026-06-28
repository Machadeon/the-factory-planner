# User Review

## Critical Findings

These findings describe how the graph is practically unusable in its current state.

- Initial layout is absolutely terrible. Nodes overlap other nodes, there's a giant empty area between nodes on left and
  nodes on right. Load "Power Factory" for a sample and calculate overlap and empty space. Initial layout should ensure
  burndown-style layout with no overlapping. Default number of rows in an assembly line should be set to a value that
  causes the node to approach a 16:9 aspect ratio.
- Maximizing should maintain the center of the graph instead of the top left corner
- Only **factory** byproducts should be highlighted. Individual recipe byproducts should not receive unique treatment.
  And it should be the byproduct's sink node that gets highlighted, not the output of the recipe.
- The zoom control buttons do not respect the current light/dark theme (always light)
- The minimap should match the current light/dark theme (always light)
- Machine row inputs have up/down controls that do not match the current light/dark theme (always light)

## Important Changes

These findings demonstrate how users have to fight the graph to get the information they need instead of it being a
pleasant UX.

- Make the node icon and recipe name large and centered in the node
- Hovering over an edge should highlight it and display its part and rate
- Remove the little white circles where edges meet nodes. Place the part icon (circle or rounded rectangle) centered on
  the border of the node so half of it is outside the node.
- Machine count per node and per row should be displayed. Clock speed and somersloop count should be displayed on the
  node.
- Edge width scaling is not good. Try linear scaling, and the maximum width should be based on the factory maximum or
  780, whichever is greater

## Future Revisions

These items bring strong improvements to the graph.

- Allow the user to resize the nodes by dragging its edges (it still must snap to an integer number of rows)
- Individual machine footprints should be rendered within the node
- User should be able to toggle "actual node size" - when off, all nodes are the minimum size and individual machine foot prints are not rendered
