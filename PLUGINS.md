#### Writing Plugins

Plugins come in the form of JavaScript or CoffeeScript files placed in the `plugins/` folder. A plugin can define multiple features:

- `Plugin.name` - human readable name. Used to call your plugin: `fluxbot: [plugin name] [command]`
- `Plugin.modify(global)` - your chance to customize the global object or initialize some external dependency. Gets called on plugin load. Set to `false` if you don't use this.
- `Plugin.onMessage(global, from, to, message, is_directed_at_me)` - a listener for arbitrary messages.
- `Plugin.desc` - describe your plugin.
- `Plugin.dependencies` - array of plugins which should be loaded before this one (runs their global function)
- `Plugin.commands` - an object containing commands.
- `Plugin.commands.[command]` - a `new Command()`

### Defined objects in the global object

- `global.bot` - An instance of [node-irc](https://node-irc.readthedocs.org/en/latest/API.html#client) - basically the bot object. Go wild!
- `global.config` - The current loaded configuration. You can use this for your own needs, but please under your own namespace.
- `global.log` - A [winston](https://www.npmjs.org/package/winston) logger.

### The Command() object
You will probably want to `require()` this to get anything useful done in the way of commands. This is done like so:
    var Command = require('../command.js');
    
To create a command, you can assign `Plugin.commands.[command]` to a `new Command(options, function(global, message, from, to))`. `options` are defined like so:
- `args` - amount of *required* arguments for the command to run
- `perm` - Required permission, or 'none' if not needed.
- `desc` - Description of what the command does.
- `usage` - Arguments, formatted like so: '[optional argument name] <mandatory argument name>'
