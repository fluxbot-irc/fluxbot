### Fluxbot
-------

A [Weekend of Code](http://blog.whiskers75.co.uk/weekend-of-code) project by [whiskers75](http://whiskers75.co.uk).

Fluxbot is a lightweight, easy to use IRC bot. It is extensible, like a supybot, and can perform all normal bot tasks easily, with a permission system to regulate who can do what.

To get running, compile the code (`bot.coffee`) with [CoffeeScript](http://coffeescript.org), set up a [Redis](http://redis.io) database somewhere, and configure `config.json` to point to it. While you're there, configure your IRC server, nick and channels to join. Optionally, you may want to add a NickServ password.

#### Writing Plugins

Plugins come in the form of CoffeeScript (or JavaScript) files placed in the `plugins/` folder. 

API documentation:

- `Plugin.name` - human readable name. Used to call your plugin: `fluxbot: [plugin name] [command]`
- `Plugin.modify(global)` - your chance to customize the global object or initialize some external dependency. Gets called on plugin load.
- `Plugin.commands` - an object containing commands.
- `Plugin.commands.[command]` - a `new Command()`

### The `Command()` object
```
var Command = require('../command.js')
Plugin.commands.foo = new Command({
    args: 1, // The amount of arguments your command takes (optional)
    perm: 'fooer', // Required permission for your command (optional)
}, function(global, args, from, to) {
    // 'global' is the global object
    // 'args' is an array of arguments
    // 'from' is a username - who the command was from
    // 'to' is a channel or username - where the command was sent to
});
```