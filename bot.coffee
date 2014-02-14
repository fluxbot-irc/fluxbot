irc = require 'irc'
coffee = require 'coffee-script/register'
log = require 'winston'
redis = require 'redis'
repl = require 'repl'
requireDir = require 'require-dir'
global.config = require './config.json'
global.plugins = requireDir './plugins'
global.bot = new irc.Client config.server, config.nick, {channels: [], ident: 'fluxbot', realName: 'Fluxbot'}
global.quit = () ->
    process.exit(0)
Object.keys(plugins).forEach (plugin) =>
    pname = plugin
    plugin = plugins[plugin]
    plugin.name = pname
    if plugin.modify
        plugin.modify global
log.info 'Starting Fluxbot 0.0.1'
log.info 'Loaded plugins:', Object.keys(plugins).join ', '
log.info 'Connecting to', config.server
log.info 'Connecting to Redis DB...'
global.db = redis.createClient(config.redis_port, config.redis_host);
if config.redis_password
    db.auth(config.redis_password)
db.on 'ready', () =>
    log.info 'Connected to Redis'
db.on 'error', (err) =>
    log.info 'DB error:', err
bot.on 'raw', (data) =>
    if config.debug
        log.info data.command, data.args.join ' '
    switch data.command
        when "rpl_endofmotd"
            log.info 'Connected to IRC'
            if config.nickserv_password
                if config.nickserv_password == true
                    config.nickserv_password = process.env.NICKSERV
                bot.say 'NickServ', 'IDENTIFY ' + config.nickserv_password
                log.info 'Identifying to NickServ'
bot.on 'notice', (from, to, message) =>
    if from == 'NickServ'
        if message.indexOf('You are now identified') != -1
            log.info 'Identified with NickServ'
            log.info 'Joining channels...'
            config.channels.forEach (channel) =>
                log.info 'Joining ' + channel + '...'
                bot.join channel
bot.on 'invite', (channel, from) =>
    bot.join(channel)
bot.on 'message', (from, to, message) =>
    message = message.split(' ')
    if message[0] == config.nick + ':'
        caught = false;
        Object.keys(plugins).forEach (plugin) =>
            plugin = plugins[plugin]
            if message[1] == plugin.name.toLowerCase()
                if plugin.commands[message[2]]
                    cmd = message[2]
                    args = message
                    args.splice(0, 3);
                    caught = true
                    if args.length < plugin.commands[cmd].args
                        return bot.notice from, 'Error: That command requires ' + plugin.commands[cmd].args + ' argument(s).'
                    global.hasPermission from, plugin.commands[cmd].perm, to, (perm) =>
                        if plugin.commands[cmd].perm != 'none' && !perm
                            return bot.notice from, 'Error: You don\'t have the "' + plugin.commands[cmd].perm + '" permission for that channel.'
                        else
                            return plugin.commands[cmd].run(global, args, from, to)
            if Object.keys(plugin.commands).indexOf(message[1]) != -1
                cmd = message[1]
                args = message
                args.splice(0, 2);
                caught = true
                if args.length < plugin.commands[cmd].args
                    return bot.notice from, 'Error: That command requires ' + plugin.commands[cmd].args + ' argument(s).'
                global.hasPermission from, plugin.commands[cmd].perm, to, (perm) =>
                    if plugin.commands[cmd].perm != 'none' && !perm
                        return bot.notice from, 'Error: You don\'t have the "' + plugin.commands[cmd].perm + '" permission for that channel.'
                    else
                        return plugin.commands[cmd].run(global, args, from, to)
        if !caught
            bot.notice from, 'Error: Command not found. Try "' + g.config.nick + ': help [plugin]" for a list of loaded plugins or commands of a specific plugin.'
bot.on 'error', (err) =>
    log.error err
