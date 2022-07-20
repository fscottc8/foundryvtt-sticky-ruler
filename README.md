# Sticky Ruler
This module changes the default behavior of the ruler in foundryvtt. Whenever the ruler tool is selected, this module allows a user to left click to add waypoints. Sticky Ruler is being developed to make it easier to move tokens around when using a TV equipped with a touch screen for players to interact with. Instead of needing to drag their tokens around players can simply left-click a token, then left-click anywhere on the map to move!

## Behavior
Sticky Ruler changes the default ruler behavior as follows:
- Add a waypoint in the center of a square/hex you left-click on (or where ever you left-click on a gridless map)
  - If the first waypoint added is on a token, the token will also be selected, and all other entities will be deselected
- If you left-click the most recent waypoint that was added, the ruler is removed
  - If your first waypoint was on a token, it will move the token along the ruler path
  - If your first and last (only) waypoint is on a token, the token will also be deselected
- If you left-click an existing waypoint, all waypoints that were added after the one that was clicked on are removed

⚠️ Sticky Ruler does not work well with gridless maps since it's difficult to left-click on the exact waypoint location when it's not centered in a hex/square. There is an option if you want to enable it for gridless maps

## Features
- Collision checks for each attempt to add a waypoint when moving a token

## Compatible with
- [touch-vtt](https://github.com/Oromis/touch-vtt)
  - If you use touchvtt, anywhere you tap on the screen is considered a "left-click" for purposes of the instructions above
- [foundryvtt-drag-ruler](https://github.com/manuelVo/foundryvtt-Drag-Ruler)
  - ❗ Doesn't work with "movement history"
  - ❗ Doesn't work with the "Pathfinding" option enabled
- [foundryvtt-terrain-ruler](https://github.com/manuelVo/foundryvtt-terrain-ruler)
  - ⚠️ Terrain-Ruler integration is only used by Sticky-Ruler when the starting waypoint is on a token (IE you are using Sticky-Ruler to move a token)
