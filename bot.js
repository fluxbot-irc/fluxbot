var coffee, irc, log, redis, repl, ready, fs,
    _this = this;
irc = require('irc');

coffee = require('coffee-script/register');

log = require('winston');

redis = require('redis');

ready = false;

repl = require('repl');

fs = require('fs');

global.config = require('./config.json');
global.plugins = {};
global.loadPlugins = function () {
    log.info('Loading plugins');
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
        log.info('Loaded plugin ' + file.split('.')[0] + ' - ' + plugins[file.split('.')[0]].desc);
    });
    log.info('Resolving dependencies');
    var modified = [];
    var currentPlugin = 'none';
    function resolvePlugin(plugin, depth) {
        plugin = plugins[plugin];
        if (nomod.indexOf(plugin.name) != -1 || modified.indexOf(plugin.name) != -1) {
            modified.push(plugin.name); // no-op
            log.info('Already satisfied plugin ' + plugin.name);
            return;
        }
        if (plugin.dependencies && plugin.modify) {
            log.info('Resolving plugin ' + plugin.name);
            if (!depth) {
                currentPlugin = plugin.name;
            }
            var errors = false;
            plugin.dependencies.forEach(function (plugin) {
                if (depth) {
                    log.info('Resolving dependency ' + plugin + ' [resolving: ' + currentPlugin + ']')
                }
                else {
                    log.info('Resolving dependency ' + plugin)
                }
                if (!plugins[plugin]) {
                    log.error('Dependency not fulfilled: ' + plugin);
                    modified.push(plugin);
                    errors = true;
                    return;
                }
                if (plugin == currentPlugin) {
                    log.error('Circular dependency found in plugins: ' + currentPlugin + ' + ' + plugin);
                    errors = true;
                    modified.push(plugin);
                    return;
                }
                resolvePlugin(plugin, true);
            });
            if (!errors) {
                plugin.modify(global);
                modified.push(plugin.name);
                log.info('Satisfied plugin ' + plugin.name);
            } else {
                log.error('Failed to satisfy plugin ' + plugin.name);
                delete plugins[plugin.name];
            }
        } else {
            if (plugin.modify) {
                plugin.modify(global);
            }
            modified.push(plugin.name);
            log.info('Satisfied plugin ' + plugin.name);
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
loadPlugins();
log.info('Loaded plugins:', Object.keys(plugins).join(', '));
log.info('Connecting to', config.server);
log.info('Connecting to Redis DB...');

global.db = redis.createClient(config.redis_port, config.redis_host);

if (config.redis_password) {
    db.auth(config.redis_password);
}

db.on('ready', function () {
    if (!ready) {
        return log.info('Connected to Redis');
        ready = true
    }
});
bot.on('raw', function (data) {
    if (config.debug) {
        log.info(data.command, data.args.join(' '));
    }
    switch (data.command) {
    case "rpl_endofmotd":
        log.info('Connected to ' + config.server);
    }
});

bot.on('notice', function (from, to, message) {
    if (from === 'NickServ') {
        if (message.indexOf('You are now identified') !== -1) {
            return log.info('Identified with NickServ');
        }
    }
});

bot.on('invite', function (channel, from) {
    return bot.join(channel);
    bot.notice(from, 'Joining ' + channel);
});
bot.on('message', function (from, to, message, raw) {
    var caught;
    message = message.split(' ');
    if (!config.chanprefix[to]) {
        config.chanprefix[to] = config.prefix;
    }
    Object.keys(plugins).forEach(function (plugin) {
        if (plugin.onMessage) {
            plugin.onMessage(global, from, to, message, (message[0] === config.nick + ':' || message[0] == config.chanprefix[to]));
        }
    });
    if (message[0] === config.nick + ':' || message[0] == config.chanprefix[to]) {
        caught = false;
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
                        bot.notice(from, 'That command requires ' + plugin.commands[cmd].args + ' argument(s).');
                        bot.notice(from, config.chanprefix[to] + ' ' + cmd + ' ' + plugin.commands[cmd].usage);
                        return bot.notice(from, 'Description: ' + plugin.commands[cmd].desc);
                    }
                    global.hasPermission(raw.host, plugin.commands[cmd].perm, to, function (perm) {
                        if (plugin.commands[cmd].perm !== 'none' && !perm) {
                            return bot.notice(from, 'Error: *!*@' + raw.host + ' does not have the "' + plugin.commands[cmd].perm + '" permission for that channel.');
                        } else {
                            return plugin.commands[cmd].run(global, args, from, to, raw);
                        }
                    });
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
                return global.hasPermission(raw.host, plugin.commands[cmd].perm, to, function (perm) {
                    if (plugin.commands[cmd].perm !== 'none' && !perm) {
                        return bot.notice(from, 'Error: *!*@' + raw.host + ' does not have the "' + plugin.commands[cmd].perm + '" permission for that channel.');
                    } else {
                        return plugin.commands[cmd].run(global, args, from, to, raw);
                    }
                });
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