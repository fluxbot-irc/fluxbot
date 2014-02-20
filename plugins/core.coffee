repl = require 'repl'
Command = require '../command.js'
Core = {};
Core.modify = (g) ->
    g.hasPermission = (user, perm, channel, cb) =>
        g.db.smembers user + '/perms', (err, members) =>
            if perm == 'admin'
                if members.indexOf(perm) != -1
                    return cb(true)
                else
                    return cb(false)
            if members.indexOf(channel + ',' + perm) != -1
                cb(true)
            else
                cb(false)
Core.commands = {}
Core.name = 'core'
Core.desc = 'A set of built-in Fluxbot commands to make running your bot easy.'
Core.commands.help = new Command {usage: '[plugin] [command]', desc: 'Gives you help on commands and plugins. "list" will list the available plugins, "commands [plugin]" will list a plugin\'s commands.', args: 1}, (g, m, u, t) =>
    if m[0]
        tmp = false
        if g.plugins[m[0]]
            tmp = true
            g.bot.notice u, '[' + g.plugins[m[0]].name + ']: ' + g.plugins[m[0]].desc
        Object.keys(g.plugins).forEach (plugin) =>
            plugin = g.plugins[plugin];
            if plugin.commands[m[0]]
                tmp = true
                g.bot.notice u, g.config.chanprefix[t] + ' ' + m[0] + ' ' + plugin.commands[m[0]].usage
                g.bot.notice u, 'Description: ' + plugin.commands[m[0]].desc
                g.bot.notice u, 'From plugin ' + plugin.name + ' | Required permission: ' + plugin.commands[m[0]].perm
        if !tmp
            g.bot.notice u, 'No matches found.'
Core.commands.list = new Command {desc: 'Lists loaded plugins.'}, (g, m, u, t) =>
    g.bot.say u, 'Loaded plugins: ' + Object.keys(g.plugins).join(', ')
Core.commands.commands = new Command {usage: '[plugin]', desc:'Lists a plugin\'s commands', args: 1}, (g, m, u, t) =>
    if g.plugins[m[0]]
        if Object.keys(g.plugins[m[0]].commands).length == 0 && g.plugins[m[0]].modify
                g.bot.notice u, '[' + g.plugins[m[0]].name + '] is a code-only plugin.'
            else
                g.bot.notice u, '[' + g.plugins[m[0]].name + '] commands: ' + Object.keys(g.plugins[m[0]].commands).join ', '
    else
        g.bot.notice u, 'That plugin is not loaded.'
Core.commands.op = new Command {perm: 'op', usage: '[user]', desc: 'Ops you, or a specified user'}, (g, m, u, t) =>
    if m[0]
        u = m[0]
    g.bot.send 'MODE', t, '+o', u
Core.commands.deop = new Command {perm: 'op', usage: '[user]', desc: 'Deops you, or a specified user'}, (g, m, u, t) =>
    if m[0]
        u = m[0]
    g.bot.send 'MODE', t, '-o', u
Core.commands.voice = new Command {perm: 'voice', usage: '[user]', desc: 'Voices you, or a specified user'}, (g, m, u, t) =>
    if m[0]
        u = m[0]
    g.bot.send 'MODE', t, '+v', u
Core.commands.devoice = new Command {perm: 'voice', usage: '[user]', desc: 'Devoices you, or a specified user'}, (g, m, u, t) =>
    if m[0]
        u = m[0]
    g.bot.send 'MODE', t, '-v', u
Core.commands.kick = new Command {perm: 'op', args: 1, usage: '<user>', desc: 'Kicks a user from the channel'}, (g, m, u, t) =>
    g.bot.send 'KICK', t, m[0], 'Kicked by ' + u
Core.commands.remove = new Command {perm: 'op', args: 1, usage: '<user>', desc: 'Forcefully parts a user from the channel'}, (g, m, u, t) =>
    g.bot.send 'REMOVE', t, m[0], 'Removed by ' + u
Core.commands.ban = new Command {perm: 'op', args: 1, usage: '<user> (whois)', desc: 'Bans a user. Add "whois" to ban hostmask.'}, (g, m, u, t) =>
    g.bot.send 'MODE', t, '+b', m[0]
    if m[1] && m[1] == 'whois'
        g.bot.whois m[0], (whois) =>
            g.bot.send 'MODE', t, '+b', whois.host
    g.bot.send 'REMOVE', t, m[0], 'Banned by ' + u
Core.commands.unban = new Command {perm: 'op', args: 1, usage: '<user> (whois)', desc: 'Unbans a user. Add "whois" to unban hostmask.'}, (g, m, u, t) =>
    g.bot.send 'MODE', t, '-b', m[0]
    if m[1] && m[1] == 'whois'
        g.bot.whois m[0], (whois) =>
            g.bot.send 'MODE', t, '-b', whois.host
Core.commands.die = new Command {perm: 'admin', usage: '', desc: 'Shuts the bot down. For admins only.'}, (g, m, u, t) =>
    g.bot.say t, u + ': *urk*'
    process.exit(0);
Core.commands.repl = new Command {perm: 'admin', usage: '', desc: 'Starts a REPL (Read-Eval-Print-Loop) on the terminal where the bot is running.'}, (g, m, u, t) =>
    g.bot.say t, u + ': Started a REPL!'
    repl.start {prompt: "fluxbot> ", input: process.stdin, output: process.stdout, useGlobal: true}
Core.commands.givePerm = new Command {args: 2, perm: 'admin', usage: '<user> <perm>', desc: 'Gives <user> the <perm> permission.'}, (g, m, u, t) =>
    g.db.sadd(m[0] + '/perms', t + ',' + m[1]);
    g.bot.say t, u + ': Giving ' + m[0] + ' the permission ' + t + ',' + m[1]
Core.commands.takePerm = new Command {args: 2, perm: 'admin', usage: '<user> <perm>', desc: 'Takes away <perm> from <user>'}, (g, m, u, t) =>
    g.db.srem(m[0] + '/perms', t + ',' + m[1]);
    g.bot.say t, u + ': Taking ' + m[0] + '\'s permission ' + t + ',' + m[1]
Core.commands.cycle = new Command {perm: 'admin', usage: '', desc: 'Parts then rejoins the channel.'}, (g, m, u, t) =>
    g.bot.part(t, "Cycling channel..");
    g.bot.join(t);
Core.commands.mode = new Command {perm: 'op', args: 2, usage: '<user> <mode>', desc: 'Sets a mode on a user.'}, (g, m, u, t) =>
    g.bot.send 'MODE', t, m[0], m[1]
Core.commands.cmode = new Command {perm: 'op', args: 1, usage: '<mode>', desc: 'Sets a mode on the channel.'}, (g, m, u, t) =>
    g.bot.send 'MODE', t, m[0]
Core.commands.join = new Command {perm: 'admin', args: 1, usage: '<channel>', desc: 'Joins <channel>.'}, (g, m, u, t) =>
    g.bot.notice u, 'Joining ' + m[0]
    g.bot.join m[0]
Core.commands.part = new Command {perm: 'admin', args: 1, usage: '<channel>', desc: 'Parts <channel>.'}, (g, m, u, t) =>
    g.bot.notice u, 'Leaving ' + m[0]
    g.bot.part m[0]
Core.commands.say = new Command {perm: 'op', args: 1, usage: '<text>', desc: 'Says <text>.'}, (g, m, u, t) =>
    g.bot.say t, m.join ' '
Core.commands.action = new Command {perm: 'op', args: 1, usage: '<text>', desc: 'Actions <text>.'}, (g, m, u, t) =>
    g.bot.action t, m.join ' '
Core.commands.myperms = new Command {usage: '', desc: 'Lists your global permissions.'}, (g, m, u, t) =>
    g.db.smembers u + '/perms', (err, perms) =>
        g.bot.say u, 'Your permissions: ' + perms.join(' ')
Core.commands.chanperms = new Command {usage: '', desc: 'Lists your permissons for this channel.'}, (g, m, u, t) =>
    g.db.smembers u + '/perms', (err, perms) =>
        perms.forEach (perm, i) =>
            if perm.indexOf(t) == -1
                perms.splice i, 1
            else
                perm = perm.replace(t + ',', '')
        g.bot.say u, 'Your permissions for ' + t + ': ' + perms.join(' ');
Core.commands.chanstats = new Command {usage: '', desc: 'Lists your permissions in a human-readable way.'}, (g, m, u, t) =>
    g.db.smembers u + '/perms', (err, perms) =>
        str = u + ': '
        if perms.indexOf('admin') != -1
            str += 'You are a fluxbot admin! | '
        else
            str += ''
        if perms.indexOf(t + ',op') != -1
            str += 'Operator: true | '
        else
            str += 'Operator: false | '
        if perms.indexOf(t + ',autoop') != -1
            str += 'Auto-op: true | '
        else
            str += 'Auto-op: false | '
        if perms.indexOf(t + ',voice') != -1
            str += 'Voice: true'
        else
            str += 'Voice: false'
        g.bot.say t, str
Core.commands.version = new Command {usage: '', desc: 'Get info about the bot.'}, (g, m, u, t) =>
    g.bot.say t, u + ': Fluxbot version ' + require('../package.json').version + ' by whiskers75 - https://github.com/WeekendOfCode/fluxbot'
Core.commands.hotboot = new Command {perm: 'admin', usage: '', desc: 'Reload all plugins.'}, (g, m, u, t) =>
    g.bot.say t, u + ': Reloading Fluxbot...'
    g.loadPlugins();
    g.bot.say t, u + ': Reload complete.'
module.exports = Core