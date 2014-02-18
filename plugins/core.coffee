repl = require 'repl'
coffee = require 'coffee-script/register'
Command = require '../command.coffee'
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
Core.commands.help = new Command {}, (g, m, u, t) =>
    if m[0]
        if g.plugins[m[0]]
            if Object.keys(g.plugins[m[0]].commands).length == 0 && g.plugins[m[0]].modify
                g.bot.say t, u + ': [' + g.plugins[m[0]].name + '] is a code-only plugin.'
            else
                g.bot.say t, u + ': [' + g.plugins[m[0]].name + '] commands: ' + Object.keys(g.plugins[m[0]].commands).join ', '
        else
            g.bot.notice u, 'That plugin is not loaded.'
    else
        g.bot.say t, u + ': Loaded plugins: ' + Object.keys(g.plugins).join(', ')
Core.commands.op = new Command {perm: 'op'}, (g, m, u, t) =>
    if m[0]
        u = m[0]
    g.bot.send 'MODE', t, '+o', u
Core.commands.deop = new Command {perm: 'op'}, (g, m, u, t) =>
    if m[0]
        u = m[0]
    g.bot.send 'MODE', t, '-o', u
Core.commands.voice = new Command {perm: 'voice'}, (g, m, u, t) =>
    if m[0]
        u = m[0]
    g.bot.send 'MODE', t, '+v', u
Core.commands.devoice = new Command {perm: 'voice'}, (g, m, u, t) =>
    if m[0]
        u = m[0]
    g.bot.send 'MODE', t, '-v', u
Core.commands.kick = new Command {perm: 'op', args: 1}, (g, m, u, t) =>
    g.bot.send 'KICK', t, m[0], 'Kicked by ' + u
Core.commands.remove = new Command {perm: 'op', args: 1}, (g, m, u, t) =>
    g.bot.send 'REMOVE', t, m[0], 'Removed by ' + u
Core.commands.ban = new Command {perm: 'op', args: 1}, (g, m, u, t) =>
    g.bot.send 'MODE', t, '+b', m[0]
    g.bot.whois m[0], (whois) =>
        g.bot.send 'MODE', t, '+b', whois.host
        g.bot.send 'REMOVE', t, m[0], 'Banned by ' + u
Core.commands.unban = new Command {perm: 'op', args: 1}, (g, m, u, t) =>
    g.bot.send 'MODE', t, '-b', m[0]
    g.bot.whois m[0], (whois) =>
        g.bot.send 'MODE', t, '-b', whois.host
Core.commands.die = new Command {perm: 'admin'}, (g, m, u, t) =>
    g.bot.part(t, "Fluxbot is shutting down...")
    setTimeout () =>
        process.exit(0)
    , 5000
Core.commands.repl = new Command {perm: 'admin'}, (g, m, u, t) =>
    g.bot.say t, u + ': Started a REPL!'
    repl.start {prompt: "fluxbot> ", input: process.stdin, output: process.stdout, useGlobal: true}
Core.commands.givePerm = new Command {args: 2, perm: 'admin'}, (g, m, u, t) =>
    g.db.sadd(m[0] + '/perms', t + ',' + m[1]);
    g.bot.say t, u + ': Giving ' + m[0] + ' the permission ' + t + ',' + m[1]
Core.commands.takePerm = new Command {args: 2, perm: 'admin'}, (g, m, u, t) =>
    g.db.srem(m[0] + '/perms', t + ',' + m[1]);
    g.bot.say t, u + ': Taking ' + m[0] + '\'s permission ' + t + ',' + m[1]
Core.commands.cycle = new Command {perm: 'admin'}, (g, m, u, t) =>
    g.bot.part(t, "Cycling channel..");
    g.bot.join(t);
Core.commands.mode = new Command {perm: 'op', args: 2}, (g, m, u, t) =>
    g.bot.send 'MODE', t, m[0], m[1]
Core.commands.cmode = new Command {perm: 'op', args: 1}, (g, m, u, t) =>
    g.bot.send 'MODE', t, m[0]
Core.commands.join = new Command {perm: 'admin', args: 1}, (g, m, u, t) =>
    g.bot.notice u, 'Joining ' + m[0]
    g.bot.join m[0]
Core.commands.part = new Command {perm: 'admin', args: 1}, (g, m, u, t) =>
    g.bot.notice u, 'Leaving ' + m[0]
    g.bot.part m[0]
Core.commands.say = new Command {perm: 'op', args: 1}, (g, m, u, t) =>
    g.bot.say t, m.join ' '
Core.commands.myperms = new Command {}, (g, m, u, t) =>
    g.db.smembers u + '/perms', (err, perms) =>
        g.bot.say t, u + ': ' + perms.join(' ')
Core.commands.chanperms = new Command {}, (g, m, u, t) =>
    g.db.smembers u + '/perms', (err, perms) =>
        perms.forEach (perm, i) =>
            if perm.indexOf(t) == -1
                perms.splice i, 1
            else
                perm = perm.replace(t + ',', '')
        g.bot.say t, u + ': ' + perms.join(' ');
Core.commands.chanstats = new Command {}, (g, m, u, t) =>
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
module.exports = Core