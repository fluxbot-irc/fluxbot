var coffee, irc, log, redis, repl, ready, requireDir,
    _this = this;
irc = require('irc');

coffee = require('coffee-script/register');

log = require('winston');

redis = require('redis');

ready = false;

repl = require('repl');

requireDir = require('require-dir');

global.config = require('./config.json');

global.plugins = requireDir('./plugins');

if (!config.port) {
    config.port = 6667;
}

global.bot = new irc.Client(config.server, config.nick, {
    channels: config.channels,
    port: config.port,
    password: config.nickserv_password,
    userName: config.nick,
    realName: 'Fluxbot ' + require('./package.json').version + ' - http://github.com/WeekendOfCode/fluxbot'
});

global.quit = function () {
    return process.exit(0);
};

Object.keys(plugins).forEach(function (plugin) {
    var pname;
    pname = plugin;
    plugin = plugins[plugin];
    plugin.name = pname;
    if (plugin.modify) {
        return plugin.modify(global);
    }
});

log.info('Starting Fluxbot ' + require('./package.json').version);
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
bot.on('message', function (from, to, message) {
    var caught;
    message = message.split(' ');
    if (message[0] === config.nick + ':' || message[0] == config.prefix) {
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
                        return bot.notice(from, 'Error: That command requires ' + plugin.commands[cmd].args + ' argument(s).');
                    }
                    global.hasPermission(from, plugin.commands[cmd].perm, to, function (perm) {
                        if (plugin.commands[cmd].perm !== 'none' && !perm) {
                            return bot.notice(from, 'Error: You don\'t have the "' + plugin.commands[cmd].perm + '" permission for that channel.');
                        } else {
                            return plugin.commands[cmd].run(global, args, from, to);
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
                    return bot.notice(from, 'Error: That command requires ' + plugin.commands[cmd].args + ' argument(s).');
                }
                return global.hasPermission(from, plugin.commands[cmd].perm, to, function (perm) {
                    if (plugin.commands[cmd].perm !== 'none' && !perm) {
                        return bot.notice(from, 'Error: You don\'t have the "' + plugin.commands[cmd].perm + '" permission for that channel.');
                    } else {
                        return plugin.commands[cmd].run(global, args, from, to);
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