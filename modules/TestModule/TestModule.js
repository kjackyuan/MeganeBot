const CommandModule = require.main.exports.getRequire('commandmodule');
module.exports = class TestModule extends CommandModule{
    constructor(client){
        super(client, {
            name: "testmodule",
            description: "A module for some test commands. Should be owner only.",
            ownerOnly: true
        });

        let testcmd = require('./test');
        this.addCommand(testcmd);
    }
}