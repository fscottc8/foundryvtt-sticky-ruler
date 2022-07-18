# Sticky Ruler
This module changes the default behavior of the ruler in foundryvtt. Whenever the ruler tool is selected, this module allows a user to left click to add waypoints, instead of dragging the ruler around. Sticky Ruler is being developed to make it easier to move tokens around when using a TV equipped with a touch screen for players to interact with. Instead of needed to drag their tokens around, they can now simply tap their token, then tap anywhere on the map to move!

## Behavior
Sticky Ruler changes the default ruler behavior as follows:
- When you tap on the map, it adds a waypoint
- If you tap (a second time) the most recent waypoint that was added, then the ruler is removed
  - If your first waypoint was on a token, it will move along the ruler path
- If you tap an existing waypoint, all waypoints that were added after the one that was tapped are removed

## Features
- Collision checks for each attempt to add a waypoint

## Compatibility
Works with:
- [foundryvtt-terrain-ruler](https://github.com/manuelVo/foundryvtt-terrain-ruler)

## Feature Ideas
- Incoroporate libRuler module?
  - Required to work with the Height Ruler Module
- Incorporate Drag-Ruler? If not:
  - Have highlight color change based on movement speed, if attempting to move a token
  - Movement history
  - Path Finding
- Block movement through hostiles
  - Enable/disable setting
  - Based on token size difference via a setting
- Allow for multiple token control?
- Have a grid of movement show up when starting your move
  - Highlight all the areas your token can move to, based on the Token movement speed, while considering walls and other blockers
- Register with foundryvtt modules page
