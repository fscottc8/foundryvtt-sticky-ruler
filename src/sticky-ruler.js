import {MODULE_NAME} from './constants.js'
import {registerSettings} from './settings.js'
import {libWrapper} from './libWrapper.js'

Hooks.once("init", () => {
	registerSettings();
})

Hooks.on('ready', function() {
	try {
		libWrapper.register(MODULE_NAME, 'Ruler.prototype._onClickLeft', rulerLeftClick, "WRAPPER");
		libWrapper.register(MODULE_NAME, 'Ruler.prototype._endMeasurement', rulerEndMeasurement, "WRAPPER");
		libWrapper.register(MODULE_NAME, 'Game.prototype.activeTool', forceRuler, "MIXED");
	} catch (e) {
		console.error(`Failed to initialize ${MODULE_NAME}: `, e);
	}
})

// Temporary solution to force the player touch table to use only the ruler
function forceRuler(wrapped, event, ...args) {
    if (!game.user.isGM && game.settings.get(MODULE_NAME, "forceRuler")) {
        return "ruler";
    }

    return wrapped(event, ...args);
}

function rulerEndMeasurement(wrapped, event, ...args) {
	this.draggedEntity = null;
	return wrapped(event, ...args);
}

async function rulerLeftClick(wrapped, event, ...args) {
	// If sticky-ruler is disabled, return immediately
	if (!game.settings.get(MODULE_NAME, "enabled")) {
		return wrapped(event, ...args);
	}

	// If this is a gridless map, and the setting is off, return immediately
	if (canvas.grid.type == CONST.GRID_TYPES.GRIDLESS && game.settings.get(MODULE_NAME, "gridlessDisabled")) {
		return wrapped(event, ...args);
	}

	// Find the center point of the grid space that was clicked on
	const center = canvas.grid.getCenter(event.data.origin.x, event.data.origin.y);
	const centerPoint = new PIXI.Point(center[0], center[1]);

	const token = event.target
	if (token instanceof Token && token.owner && this.waypoints.length == 0) {
		token.control();
		this.tokenToMove = token;
		this.draggedEntity = token;

		// If terrain-ruler is installed, enable it and the terrain
		if (game.modules.get("terrain-ruler")?.active) {
			canvas.terrain.visible = true;
			this.isTerrainRuler = true;
		}

		// If drag-ruler is installed, enable it
		if (game.modules.get("drag-ruler")?.active) {
			this.rulerOffset = {x: 0, y: 0};
			this.dragRulerStart();
		} else {
			this._onDragStart(event);
			this.measure(centerPoint);
		}

		broadcastRulerUpdate(this, event);
		return wrapped(event, ...args);
	}

	// Add, then remove, a waypoint to compare against previously added waypoints
	// This is done in case any other rulers are making adjustments to waypoint positions
	addRulerWaypoint(this, event, centerPoint, false);
	const currWaypoint = this.waypoints.pop();
	this.labels.removeChild(this.labels.children.pop());

	// Find, and index, an array of the current waypoints, to see if the current waypoint overlaps
	const currentWaypoints = this.waypoints.filter(waypoint => !waypoint.isPrevious);
	const waypointIndex = currentWaypoints.findIndex((waypoint) => waypoint.equals(currWaypoint));

	if (waypointIndex == -1)
	{
		// If we are moving a token, check for collision
		if (this.tokenToMove != null && rulerCollision(this, currentWaypoints, currWaypoint)) {
			// Collision found, print error message and do not add waypoint
			ui.notifications.error("ERROR.TokenCollide", {localize: true});
		} else {
			// If draggedEntity is null and tokenToMove is not, then we know this
			// is a new ruler that is not for a token, so clear the token selection
			if (this.draggedEntity == null && this.tokenToMove != null) {
				this.tokenToMove.release();
				this.tokenToMove = null;
			}

			// Collision wasn't found, add a new waypoint
			addRulerWaypoint(this, event, currWaypoint);
		}
	} else if (waypointIndex == (currentWaypoints.length - 1)) {
		// If this is the last waypoint again, move the token and clear movement
		if (this.tokenToMove && currentWaypoints.length == 1) {
			// There was only a single waypoint on the token itself, so deselect the token
			this.tokenToMove.release();
			this.tokenToMove = null;
		}

		// This is needed so that Drag-Ruler doesn't block the call to moveToken()
		this.draggedEntity = null;

		// Get a copy of all waypoints to be added as a "history" later
		const allWaypoints = [...this.waypoints];

		// Clear all waypoints and re-add the "current" ones
		clearWaypoints(this);
		for (const waypoint of currentWaypoints) {
			addRulerWaypoint(this, event, waypoint, false);
		}
		const currentLocation = currentWaypoints.pop()

		// Move the token
		let result = await this.moveToken();
		if (result == false) {
			this._endMeasurement();
		} else {
			// Add all the waypoints as history; Reinitialze the ruler
			addWaypointHistory(this, allWaypoints);
			this._state = Ruler.STATES.MEASURING;
			this.draggedEntity = this.tokenToMove;
			addRulerWaypoint(this, event, currentLocation);
		}
	} else {
		// This is a previous waypoint, remove all after it
		const diff = currentWaypoints.length - waypointIndex - 1;
		for (var i = 0; i < diff; i++) {
			removeRulerWaypoint(this, event, currWaypoint);
		}
	}

	return wrapped(event, ...args);
}

function clearWaypoints(ruler) {
	ruler.waypoints = [];
	ruler.labels.removeChildren().forEach(c => c.destroy());
}

function addWaypointHistory(ruler, waypoints) {
	waypoints.forEach(waypoint => waypoint.isPrevious = true);
	ruler.waypoints = ruler.waypoints.concat(waypoints);
	for (const waypoint of waypoints) {
		ruler.labels.addChild(new PreciseText("", CONFIG.canvasTextStyle));
	}
}

function recalculateWaypoints(ruler, event, point) {
	ruler.destination = point;
	ruler.measure(ruler.destination);
	broadcastRulerUpdate(ruler, event);
}

function addRulerWaypoint(ruler, event, point, recalculate = true) {
	ruler._state = Ruler.STATES.MEASURING;

	if (game.modules.get("drag-ruler")?.active) {
		ruler.dragRulerAddWaypoint(point);
	} else {
		ruler._addWaypoint(point);
	}

	if (recalculate) {
		recalculateWaypoints(ruler, event, point);
	}
}

function removeRulerWaypoint(ruler, event, point, recalculate = true) {
	ruler._state = Ruler.STATES.MEASURING;

	if (game.modules.get("drag-ruler")?.active) {
		ruler.dragRulerDeleteWaypoint();
	} else {
		ruler._removeWaypoint(point);
	}

	if (recalculate) {
		recalculateWaypoints(ruler, event, point);
	}
}

function isHostileToken(token) {
	if (!(token instanceof Token)) {
		return false;
	}
	return token.data.disposition == CONST.TOKEN_DISPOSITIONS.HOSTILE;
}

function rulerCollision(ruler, waypoints, point) {
	let rays = ruler._getRaysFromWaypoints(waypoints.slice(-1), point);
	return rays.some(r => canvas.walls.checkCollision(r));
}

function broadcastRulerUpdate(ruler, event) {
	// Broadcast updated ruler information
	const sc = game.user.hasPermission("SHOW_CURSOR");
	const sr = game.user.hasPermission("SHOW_RULER");
	if (sc || sr) {
		const position = event.data.getLocalPosition(ruler);
		const sRuler = sr ? ruler.toJSON() : null;
		game.user.broadcastActivity({cursor: position, ruler: sRuler});
	}
}

