const CommandModule = require('../../CommandModule');
module.exports = class BotAdminModule extends CommandModule {
    constructor(client) {
        super(client, {
            name: "BotAdminModule",
            usage: "A module for manage the bot",
            description: `Has commands to set display pic, update the bot, etc...`
        });
        this.addCommandsIn(require('path').join(__dirname, "Commands"));
    }
}