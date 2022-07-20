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
	} catch (e) {
		console.error(`Failed to initialize ${MODULE_NAME}: `, e);
	}
})

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

	// Add, then pop, a waypoint, to compare against previously added waypoints
	// This is done in case any other rulers are doing adjustments for waypoint locations
	addRulerWaypoint(this, event, centerPoint, false);
	const currWaypoint = this.waypoints.pop();

	// THIS IS OK EVEN WITHOUT THE ADDON; clean up code and make it only work during combat! THIS STILL DOES NOT WORK WELL WITH DRAG RULER; the range counting gets messed up
	let currentWaypoints = this.waypoints.filter(waypoint => !waypoint.isPrevious);
	const waypointIndex = currentWaypoints.findIndex((waypoint) => waypoint.equals(currWaypoint));

	if (waypointIndex == -1)
	{
		// If we are moving a token, check for collision
		if (false && this.tokenToMove != null && rulerCollision(this, currWaypoint)) {
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
		}

		// This is needed so that Drag-Ruler doesn't block the call to moveToken()
		this.draggedEntity = null;


		// HISTORY TEST TODO CLEAN UP!!!!
		const allWaypoints = [...this.waypoints];
		currentWaypoints = this.waypoints.filter(waypoint => !waypoint.isPrevious);
		// this.dragRulerClearWaypoints();
		clearWaypoints(this);
		for (const waypoint of currentWaypoints) {
			addRulerWaypoint(this, event, waypoint, false);
		}
		const test = currentWaypoints.pop()
		// END TEST BLOCK


		// Move the token
		let result = await this.moveToken();
		if (result == false) {
			this._endMeasurement();
		} else {
			// TODO: History waypoint test
			// this.dragRulerAddWaypointHistory(allWaypoints);
			addWaypointHistory(this, allWaypoints);
			this._state = Ruler.STATES.MEASURING;
			this.draggedEntity = this.tokenToMove;
			addRulerWaypoint(this, event, test);
			// recalculateWaypoints(this, event, test);
			// end test block
		}
	} else {
		// This is a previous waypoint, remove all after it
		const diff = this.waypoints.length - waypointIndex - 1;
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

function rulerCollision(ruler, point) {
	let rays = ruler._getRaysFromWaypoints(ruler.waypoints.slice(-1), point);
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

