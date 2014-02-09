n = require 'npm'
coffee = require 'coffee-script/register'
Command = require '../command.coffee'
NPM = {}
NPM.name = 'npm'
NPM.modify = () =>
    n.load({});
NPM.commands = {}
NPM.commands.info = new Command {args: 1}, (g, m, u, t) =>
    g.bot.say t, u + ': Searching the NPM registry...'
    n.info m[0], (err, info) =>
        if !info
            return g.bot.say t, u + ': That package does not exist.'
        info = info[Object.keys(info)[0]];
        str = String('[npm] ' + info.name + ' ' + info.version + ': ' + info.description + ' -> http://npmjs.org/package/' + info.name)
        g.bot.say t, str
module.exports = NPM