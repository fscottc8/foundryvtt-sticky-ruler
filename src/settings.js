import {MODULE_NAME} from './constants.js'

export function registerSettings() {
    game.settings.register(MODULE_NAME, "enabled", {
        name: "Enabled",
        hint: `Enable/Disable the use of ${MODULE_NAME}`,
        scope: "client",
        config: true,
        type: Boolean,
        default: true,
    });
}
