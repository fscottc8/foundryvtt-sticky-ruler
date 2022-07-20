import {MODULE_NAME} from './constants.js'

export function registerSettings() {
    game.settings.register(MODULE_NAME, "enabled", {
        name: "Enabled",
        hint: `Enable the use of ${MODULE_NAME}`,
        scope: "client",
        config: true,
        type: Boolean,
        default: true,
    });

    game.settings.register(MODULE_NAME, "gridlessDisabled", {
        name: "Disabled on Gridless",
        hint: `Disable the use of ${MODULE_NAME} on gridless maps`,
        scope: "client",
        config: true,
        type: Boolean,
        default: true,
    });
}
