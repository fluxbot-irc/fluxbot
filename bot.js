/*
    Fluxbot, an IRC bot by whiskers75
    Warning: Contents may be coded badly.
*/

/* jshint asi: true, undef: false */

var irc = require('irc');
var coffee = require('coffee-script/register');
var winston = require('winston');
var redis = require('redis');
var ready = false;
var fs = require('fs');

global.config = require('./config.json');
if (!config.level && config.debug) {
    config.level = 'debug';
}
if (!config.level) {
    config.level = 'info';
}
log = new(winston.Logger)({
    transports: [
      new(winston.transports.Console)({
            level: config.level
        })
    ]
});

global.plugins = {};
global.loadPlugins = function () {
    log.debug('Loading plugins');
    var nomod = [];
    fs.readdirSync('./plugins').forEach(function (file) {
        var modify = true;
        if (require.cache[__dirname + '/plugins/' + file]) {
            delete require.cache[__dirname + '/plugins/' + file];
            nomod.push(file.split('.')[0]);
        }
        plugins[file.split('.')[0]] = require(__dirname + '/plugins/' + file);
        plugins[file.split('.')[0]].name = file.split('.')[0];
        if (typeof plugins[file.split('.')[0]].desc == 'undefined') {
            plugins[file.split('.')[0]].desc = 'No description given'
        }
        log.debug('Loaded plugin ' + file.split('.')[0] + ' - ' + plugins[file.split('.')[0]].desc);
    });
    fs.readdirSync('./node_modules').forEach(function (dir) {
        if (dir.indexOf('fluxbot-') != -1) {
            var modify = true;
            if (require.cache[__dirname + '/node_modules/' + dir + '/index.js']) {
                delete require.cache[__dirname + '/node_modules/' + dir + '/index.js'];
                nomod.push(file.split('.')[0]);
            }
            plugins[file.split('-')[1]] = require(__dirname + '/node_modules/' + dir + '/index.js');
            plugins[file.split('-')[1]].name = file.split('-')[1];
            if (typeof plugins[file.split('-')[1]].desc == 'undefined') {
                plugins[file.split('-')[1]].desc = 'No description given'
            }
            log.debug('Loaded plugin ' + dir.split('-')[1] + ' - ' + plugins[file.split('.')[0]].desc);
        }
    });
    log.debug('Resolving dependencies');
    var modified = [];
    var currentPlugin = 'none';

    function resolvePlugin(plugin, depth) {
        plugin = plugins[plugin];
        if (nomod.indexOf(plugin.name) != -1 || modified.indexOf(plugin.name) != -1) {
            modified.push(plugin.name); // no-op
            log.debug('Already satisfied plugin ' + plugin.name);
            return;
        }
        if (plugin.dependencies && plugin.modify) {
            log.debug('Resolving plugin ' + plugin.name);
            if (!depth) {
                currentPlugin = plugin.name;
            }
            var errors = false;
            plugin.dependencies.forEach(function (plugin) {
                if (depth) {
                    log.debug('Resolving dependency ' + plugin + ' [resolving: ' + currentPlugin + ']')
                } else {
                    log.debug('Resolving dependency ' + plugin)
                }
                if (!plugins[plugin]) {
                    log.error('Dependency not fulfilled: ' + plugin);
                    modified.push(plugin);
                    errors = true;
                    return;
                }
                if (plugin == currentPlugin) {
                    log.error('pls. circular dependency found in plugins: ' + currentPlugin + ' + ' + plugin);
                    errors = true;
                    modified.push(plugin);
                    return;
                }
                resolvePlugin(plugin, true);
            });
            if (!errors) {
                plugin.modify(global);
                modified.push(plugin.name);
                log.debug('Satisfied plugin ' + plugin.name);
            } else {
                log.error('Failed to satisfy plugin ' + plugin.name);
                delete plugins[plugin.name];
            }
        } else {
            if (plugin.modify) {
                plugin.modify(global);
            }
            modified.push(plugin.name);
            log.debug('Satisfied plugin ' + plugin.name);
        }
    }
    Object.keys(plugins).forEach(function (plugin) {
        resolvePlugin(plugin, false);
    });
    log.info('Plugin loading complete! \\o/');
}

if (!config.port) {
    config.port = 6667;
}
if (!config.chanprefix) {
    config.chanprefix = {};
}
global.bot = new irc.Client(config.server, config.nick, {
    channels: config.channels,
    port: config.port,
    password: config.nickserv_password,
    userName: config.nick,
    floodProtection: true,
    realName: 'Fluxbot ' + require('./package.json').version
});

global.quit = function () {
    return process.exit(0);
};

Object.keys(plugins).forEach(function (plugin) {
    if (plugin.modify) {
        plugin.modify(global);
    }
    if (!plugin.desc) {
        plugin.desc = 'No description given'
    }
});

log.info('Starting Fluxbot ' + require('./package.json').version);
log.info('Log level: ' + config.level);
loadPlugins();
log.info('Loaded plugins:', Object.keys(plugins).join(', '));
log.info('Connecting to IRC [', config.server + ':' + config.port + ']');
log.info('Connecting to Redis [' + config.redis_host + ':' + config.redis_port + ']');

global.db = redis.createClient(config.redis_port, config.redis_host);

if (config.redis_password) {
    db.auth(config.redis_password);
}

db.on('ready', function () {
    if (!ready) {
        log.info('Connected to Redis');
        ready = true;
    }
});
bot.on('raw', function (data) {
    log.debug(data.prefix, data.command, data.args.join(' '));
    switch (data.command) {
    case "001":
        log.info('Connected to IRC [' + config.server + ':' + config.port + ']');
    }
});

bot.on('notice', function (from, to, message) {
    if (from === 'NickServ') {
        if (message.indexOf('You are now identified') !== -1) {
            return log.info('Identified with NickServ');
        }
    }
});

bot.on('message', function (from, to, message, raw) {
    var caught;
    message = message.split(' ');
    if (!config.chanprefix[to]) {
        config.chanprefix[to] = config.prefix;
    }
    caught = false;
    Object.keys(plugins).forEach(function (plugin) {
        if (plugin.onMessage) {
            plugin.onMessage(global, from, to, message, (message[0] === config.nick + ':' || message[0] == config.chanprefix[to]));
            caught = true;
        }
    });
    if ((message[0] === config.nick + ':' || message[0] == config.chanprefix[to]) && !caught) {
        Object.keys(plugins).forEach(function (plugin) {
            var args, cmd;
            plugin = plugins[plugin];
            if (message[1] === plugin.name.toLowerCase()) {
                if (plugin.commands[message[2]]) {
                    cmd = message[2];
                    args = message;
                    args.splice(0, 3);
                    caught = true;
                    if (args.length < plugin.commands[cmd].args) {
                        bot.notice(from, 'Error: That command requires ' + plugin.commands[cmd].args + ' argument(s).');
                        bot.notice(from, config.chanprefix[to] + ' ' + cmd + ' ' + plugin.commands[cmd].usage);
                        return bot.notice(from, 'Description: ' + plugin.commands[cmd].desc);
                    }
                    if (plugin.commands[cmd].perm == 'none') {
                        return plugin.commands[cmd].run(global, args, from, to, raw);
                    } else {
                        global.hasPermission(raw.user + '@' + raw.host, plugin.commands[cmd].perm, to, function (perm) {
                            if (!perm) {
                                return bot.notice(from, 'Error: You do not have the "' + plugin.commands[cmd].perm + '" permission for ' + to + '.');
                            } else {
                                return plugin.commands[cmd].run(global, args, from, to, raw);
                            }
                        });
                    }
                }
            }
            if (Object.keys(plugin.commands).indexOf(message[1]) !== -1) {
                cmd = message[1];
                args = message;
                args.splice(0, 2);
                caught = true;
                if (args.length < plugin.commands[cmd].args) {
                    bot.notice(from, 'That command requires ' + plugin.commands[cmd].args + ' argument(s).');
                    bot.notice(from, config.chanprefix[to] + ' ' + cmd + ' ' + plugin.commands[cmd].usage);
                    return bot.notice(from, 'Description: ' + plugin.commands[cmd].desc);
                }
                if (plugin.commands[cmd].perm == 'none') {
                    return plugin.commands[cmd].run(global, args, from, to, raw);
                } else {
                    global.hasPermission(raw.user + '@' + raw.host, plugin.commands[cmd].perm, to, function (perm) {
                        if (!perm) {
                            return bot.notice(from, 'Error: You do not have the "' + plugin.commands[cmd].perm + '" permission for ' + to + '.');
                        } else {
                            return plugin.commands[cmd].run(global, args, from, to, raw);
                        }
                    });
                }
            }
        });
        if (!caught) {
            return bot.notice(from, 'Error: Command not found. Try "' + config.nick + ': help [plugin]" for a list of loaded plugins or commands of a specific plugin.');
        }
    }
});

bot.on('error', function (err) {
    return log.error(err);
});