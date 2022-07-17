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
	const token = event.target
	if (token instanceof Token && token.owner && this.waypoints.length == 0) {
		token.control(false);
		this._onDragStart(event);
		this.measure(event.data.origin);

		// TODO: Use drag ruler dynamically (or implement my own path finding?)
		// TODO: There is an issue with moving around things and using drag-ruler
		// this.dragRulerAddWaypoint(event.data.origin);
		// this.measure(event.data.origin);
		// this.draggedEntity = token;

		// TODO: Use terrain ruler dynamically (or implement my own version?)
		// canvas.terrain.visible = true;
		// this.isTerrainRuler = true;
		return wrapped(event, ...args);
	}

	const center = canvas.grid.getCenter(event.data.origin.x, event.data.origin.y);
	const point = new PIXI.Point(center[0], center[1]);
	const location = this.waypoints.findIndex((waypoint) => waypoint.equals(point));

	if (location == -1)
	{
		// New potential location found; Check for collision first
		let rays = this._getRaysFromWaypoints(this.waypoints.slice(-1), event.data.origin);
		let hasCollision = rays.some(r => canvas.walls.checkCollision(r));
		if (!hasCollision) {
			// Collision wasn't found, add a new waypoint
			this._state = Ruler.STATES.MEASURING;
			this._addWaypoint(event.data.origin);
			this.measure(event.data.origin);

			// TODO: Use drag ruler dynamically?
			// this.measure(event.data.origin);
			// this.dragRulerAddWaypoint(event.data.origin);

			// Broadcast updated waypoint
			const sc = game.user.hasPermission("SHOW_CURSOR");
			const sr = game.user.hasPermission("SHOW_RULER");
			if (sc || sr) {
				const position = event.data.getLocalPosition(this);
				const ruler = sr ? this.toJSON() : null;
				game.user.broadcastActivity({cursor: position, ruler: ruler});
			}
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
		console.log(diff)
		console.log("")
		for (var i = 0; i < diff; i++) {
			this._removeWaypoint(event.data.origin);
		}
	}

	return wrapped(event, ...args);
}

function isHostileToken(token) {
	return token.data.disposition == CONST.TOKEN_DISPOSITIONS.HOSTILE;
}
