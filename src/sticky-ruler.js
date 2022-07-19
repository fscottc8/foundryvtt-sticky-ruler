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
	// Clear the dragged entity
	this.draggedEntity = null;
	return wrapped(event, ...args);
}

async function rulerLeftClick(wrapped, event, ...args) {
	// If sticky-ruler is disabled, return immediately
	if (!game.settings.get(MODULE_NAME, "enabled")) {
		return wrapped(event, ...args);
	}

	// Find the center point
	const center = canvas.grid.getCenter(event.data.origin.x, event.data.origin.y);
	const centerPoint = new PIXI.Point(center[0], center[1]);

	const token = event.target
	if (token instanceof Token && token.owner && this.waypoints.length == 0) {
		// Is this ruler being used to measure from a token
		token.control();
		this._onDragStart(event);
		this.measure(centerPoint);
		this.draggedEntity = token;

		// If terrain-ruler is installed, enable it and the terrain
		if (game.modules.get("terrain-ruler")?.active) {
			canvas.terrain.visible = true;
			this.isTerrainRuler = true;
		}

		broadcastRulerUpdate(this, event);

		return wrapped(event, ...args);
	}

	// Find the center point and see if it's already a waypoint
	const location = this.waypoints.findIndex((waypoint) => waypoint.equals(centerPoint));

	if (location == -1)
	{
		// If we are dragging a token, check for collision
		if (this.draggedEntity != null && rulerCollision(this, centerPoint)) {
			// Collision found, print error message and do not add waypoint
			ui.notifications.error("ERROR.TokenCollide", {localize: true});
		} else {
			// Collision wasn't found, add a new waypoint
			this._state = Ruler.STATES.MEASURING;
			this._addWaypoint(centerPoint);
			this.measure(centerPoint);
			broadcastRulerUpdate(this, event);
		}
	} else if (location == (this.waypoints.length - 1)) {
		// If this is the last waypoint again, move the token and clear movement
		if (this.draggedEntity && this.waypoints.length == 1) {
			// There was only a single waypoint on the token itself, so deselect the token
			this.draggedEntity.release();
		}

		// Move the token
		this.draggedEntity = null;
		let result = await this.moveToken();
		if (result == false) {
			this._endMeasurement();
		}
	} else {
		// This is a previous waypoint, remove all after it
		const diff = this.waypoints.length - location - 1;
		for (var i = 0; i < diff; i++) {
			this._removeWaypoint(centerPoint);
		}
	}

	return wrapped(event, ...args);
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

