import {MODULE_NAME} from './constants.js'
import {registerSettings} from "./settings.js"
import {libWrapper} from './libWrapper.js'

Hooks.once("init", () => {
	registerSettings();
})

Hooks.on('ready', function() {
	try {
		libWrapper.register(MODULE_NAME, 'Ruler.prototype._onClickLeft', rulerLeftClick, "WRAPPER");
	} catch (e) {
		console.error(`Failed to initialize ${MODULE_NAME}: `, e);
	}
})

function rulerLeftClick(wrapped, event, ...args) {
	// TODO: Check if this player/account type has this option "enabled"

	// Find the center point
	const center = canvas.grid.getCenter(event.data.origin.x, event.data.origin.y);
	const centerPoint = new PIXI.Point(center[0], center[1]);

	const token = event.target
	if (token instanceof Token && token.owner && this.waypoints.length == 0) {
		token.control(false);
		this._onDragStart(event);
		this.measure(centerPoint);

		if (game.modules.get("terrain-ruler")?.active) {
			// If terrain-ruler is installed, enable it and the terrain
			canvas.terrain.visible = true;
			this.isTerrainRuler = true;
		}

		return wrapped(event, ...args);
	}

	// Find the center point and see if it's already a waypoint
	const location = this.waypoints.findIndex((waypoint) => waypoint.equals(centerPoint));

	if (location == -1)
	{
		if (!game.user.isGM && isHostileToken(token)) {
			ui.notifications.error("ERROR: You cannot move through a hostile!", {localize: true});
			return wrapped(event, ...args);
		}

		// New potential location found; Check for collision
		if (!rulerCollision(this, centerPoint)) {
			// Collision wasn't found, add a new waypoint
			this._state = Ruler.STATES.MEASURING;
			this._addWaypoint(centerPoint);
			this.measure(centerPoint);
			broadcastRulerUpdate(this, event);
		} else {
			// Collision found, print error message and do not add waypoint
			ui.notifications.error("ERROR.TokenCollide", {localize: true});
		}
	} else if (location == (this.waypoints.length - 1)) {
		// If this is the last waypoint again, move the token and clear movement
		this.moveToken();
		this._endMeasurement();
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

// TODO: Check for hostile collision tokens too?
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
