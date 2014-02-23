var Command, Core, repl, wc;

repl = require('repl');

Command = require('../command.js');

wc = require('wildcard');

Core = {};

Core.modify = function (g) {
    g.hasPermission = function (hostmask, perm, channel, callback) {
        var perms = [];
        g.db.hkeys('acl', function (err, acls) {
            if (err) {
                throw err;
            }
            acls.forEach(function (key) {
                var wc1, wc2
                    wc1 = key.replace('@', '.');
                wc1 = wc1.replace('/', '.');
                wc2 = hostmask.replace('@', '.');
                wc2 = wc2.replace('/', '.');
                if (wc(wc1, wc2)) {
                    g.db.hget('acl', key, function (err2, permlist) {
                        if (err2) {
                            throw err2;
                        }
                        if (!permlist) {
                            permlist = '';
                        }
                        permlist = permlist.split('|');
                        permlist.forEach(function (p) {
                            perms.push(p);
                        });
                    });
                }
            });
            g.db.once('idle', function () {
                setTimeout(function () {
                    if (perms.indexOf(perm) !== -1) {
                        callback(true);
                    } else {
                        if (perms.indexOf(channel + ',' + perm) !== -1) {
                            callback(true);
                        } else {
                            callback(false);
                        }
                    }
                }, 200);
            });
        });
    }
};

Core.commands = {};

Core.name = 'core';

Core.desc = 'A set of built-in Fluxbot commands to make running your bot easy.';

Core.commands.help = new Command({
        usage: '[plugin] [command]',
        desc: 'Gives you help on commands and plugins. "list" will list the available plugins, "commands [plugin]" will list a plugin\'s commands.',
        args: 1
    },
    function (g, m, u, t) {
        var tmp;
        if (m[0]) {
            tmp = false;
            if (g.plugins[m[0]]) {
                tmp = true;
                g.bot.notice(u, '[' + g.plugins[m[0]].name + ']: ' + g.plugins[m[0]].desc);
            }
            Object.keys(g.plugins).forEach(function (plugin) {
                plugin = g.plugins[plugin];
                if (plugin.commands[m[0]]) {
                    tmp = true;
                    g.bot.notice(u, g.config.chanprefix[t] + ' ' + m[0] + ' ' + plugin.commands[m[0]].usage);
                    g.bot.notice(u, 'Description: ' + plugin.commands[m[0]].desc);
                    return g.bot.notice(u, 'From plugin ' + plugin.name + ' | Required permission: ' + plugin.commands[m[0]].perm);
                }
            });
            if (!tmp) {
                return g.bot.notice(u, 'No matches found.');
            }
        }
    });

Core.commands.list = new Command({
    desc: 'Lists loaded plugins.'
}, function (g, m, u, t) {
    return g.bot.say(u, 'Loaded plugins: ' + Object.keys(g.plugins).join(', '));
});

Core.commands.commands = new Command({
        usage: '[plugin]',
        desc: 'Lists a plugin\'s commands',
        args: 1
    },
    function (g, m, u, t) {
        if (g.plugins[m[0]]) {
            if (Object.keys(g.plugins[m[0]].commands).length === 0 && g.plugins[m[0]].modify) {
                return g.bot.notice(u, '[' + g.plugins[m[0]].name + '] is a code-only plugin.');
            } else {
                return g.bot.notice(u, '[' + g.plugins[m[0]].name + '] commands: ' + Object.keys(g.plugins[m[0]].commands).join(', '));
            }
        } else {
            return g.bot.notice(u, 'That plugin is not loaded.');
        }

    });

Core.commands.op = new Command({
    perm: 'op',
    usage: '[user]',
    desc: 'Ops you, or a specified user'
}, function (g, m, u, t) {
    if (m[0]) {
        u = m[0];
    }
    return g.bot.send('MODE', t, '+o', u);
});

Core.commands.deop = new Command({
        perm: 'op',
        usage: '[user]',
        desc: 'Deops you, or a specified user'
    },
    function (g, m, u, t) {
        if (m[0]) {
            u = m[0];
        }
        return g.bot.send('MODE', t, '-o', u);

    });

Core.commands.voice = new Command({
        perm: 'voice',
        usage: '[user]',
        desc: 'Voices you, or a specified user'
    },
    function (g, m, u, t) {
        if (m[0]) {
            u = m[0];
        }
        return g.bot.send('MODE', t, '+v', u);

    });

Core.commands.devoice = new Command({
        perm: 'voice',
        usage: '[user]',
        desc: 'Devoices you, or a specified user'
    },
    function (g, m, u, t) {
        if (m[0]) {
            u = m[0];
        }
        return g.bot.send('MODE', t, '-v', u);

    });

Core.commands.kick = new Command({
        perm: 'op',
        args: 1,
        usage: '<user> [reason]',
        desc: 'Kicks a user from the channel'
    },
    function (g, m, u, t) {
        var reason, user;
        if (!m[1]) {
            m[1] = m[0];
        }
        user = m[0];
        m.shift();
        reason = m.join(' ');
        return g.bot.send('KICK', t, user, reason);

    });

Core.commands.remove = new Command({
        perm: 'op',
        args: 1,
        usage: '<user> [reason]',
        desc: 'Forcefully parts a user from the channel'
    },
    function (g, m, u, t) {
        var reason, user;
        if (!m[1]) {
            m[1] = m[0];
        }
        user = m[0];
        m.shift();
        reason = m.join(' ');
        return g.bot.send('REMOVE', t, user, reason);

    });

Core.commands.ban = new Command({
        perm: 'op',
        args: 1,
        usage: '<user> (whois)',
        desc: 'Bans a user. Add "whois" to ban hostmask.'
    },
    function (g, m, u, t) {
        var error;
        g.bot.send('MODE', t, '+b', m[0]);
        if (m[1] && m[1] === 'whois') {
            try {
                g.bot.whois(m[0], function (whois) {
                    return g.bot.send('MODE', t, '+b', whois.host);
                });
            } catch (_error) {
                error = _error;
                g.bot.say(t, u + ': Error when banning with whois.');
            }
        }
        return g.bot.send('REMOVE', t, m[0], 'Banned by ' + u);

    });

Core.commands.unban = new Command({
        perm: 'op',
        args: 1,
        usage: '<user> (whois)',
        desc: 'Unbans a user. Add "whois" to unban hostmask.'
    },
    function (g, m, u, t) {
        var error;
        g.bot.send('MODE', t, '-b', m[0]);
        if (m[1] && m[1] === 'whois') {
            try {
                return g.bot.whois(m[0], function (whois) {
                    return g.bot.send('MODE', t, '-b', whois.host);
                });
            } catch (_error) {
                error = _error;
                return g.bot.say(t, u + ': Error when unbanning with whois.');
            }
        }

    });

Core.commands.die = new Command({
        perm: 'admin',
        usage: '',
        desc: 'Shuts the bot down. For admins only.'
    },
    function (g, m, u, t) {
        g.bot.say(t, u + ': *urk*');
        return process.exit(0);

    });

Core.commands.repl = new Command({
        perm: 'admin',
        usage: '',
        desc: 'Starts a REPL (Read-Eval-Print-Loop) on the terminal where the bot is running.'
    },
    function (g, m, u, t) {
        g.bot.say(t, u + ': Started a REPL!');
        return repl.start({
            prompt: "fluxbot> ",
            input: process.stdin,
            output: process.stdout,
            useGlobal: true
        });

    });

Core.commands.givePerm = new Command({
        args: 2,
        perm: 'admin',
        usage: '<hostmask> <perm>',
        desc: 'Gives <hostmask> the <perm> permission.'
    },
    function (g, m, u, t) {
        return g.db.hget('acl', m[0], function (err, permlist) {
            if (!permlist) {
                permlist = '';
            }
            permlist = permlist.split('|');
            permlist.push(m[1]);
            g.db.hset('acl', m[0], permlist.join('|'));
            return g.bot.say(t, u + ': ACL modified.');
        });

    });

Core.commands.takePerm = new Command({
        args: 2,
        perm: 'admin',
        usage: '<hostmask> <perm>',
        desc: 'Takes away <perm> from <hostmask>'
    },
    function (g, m, u, t) {
        return g.db.hget('acl', m[0], function (err, permlist) {
            if (!permlist) {
                permlist = '';
            }
            permlist = permlist.split('|');
            permlist.splice(permlist.indexOf(m[1]), 1);
            g.db.hset('acl', m[0], permlist.join('|'));
            return g.bot.say(t, u + ': ACL modified.');
        });

    });

Core.commands.perm = new Command({
        desc: 'List perms of <hostmask>',
        args: 1,
        usage: '<hostmask>',
        perm: 'admin'
    },
    function (g, m, u, t) {
        return g.db.hget('acl', String(m[0]), function (err, permlist) {
            if (!permlist) {
                permlist = '';
            }
            permlist = permlist.split('|');
            return g.bot.say(t, m[0] + ' perms: ' + permlist.join(' '));
        });

    });

Core.commands.cycle = new Command({
        perm: 'admin',
        usage: '',
        desc: 'Parts then rejoins the channel.'
    },
    function (g, m, u, t) {
        g.bot.part(t, "Cycling channel..");
        return g.bot.join(t);

    });

Core.commands.mode = new Command({
        perm: 'op',
        args: 2,
        usage: '<user> <mode>',
        desc: 'Sets a mode on a user.'
    },
    function (g, m, u, t) {
        return g.bot.send('MODE', t, m[0], m[1]);

    });

Core.commands.cmode = new Command({
        perm: 'op',
        args: 1,
        usage: '<mode>',
        desc: 'Sets a mode on the channel.'
    },
    function (g, m, u, t) {
        return g.bot.send('MODE', t, m[0]);

    });

Core.commands.join = new Command({
        perm: 'admin',
        args: 1,
        usage: '<channel>',
        desc: 'Joins <channel>.'
    },
    function (g, m, u, t) {
        g.bot.notice(u, 'Joining ' + m[0]);
        return g.bot.join(m[0]);

    });

Core.commands.part = new Command({
        perm: 'admin',
        args: 1,
        usage: '<channel>',
        desc: 'Parts <channel>.'
    },
    function (g, m, u, t) {
        g.bot.notice(u, 'Leaving ' + m[0]);
        return g.bot.part(m[0]);

    });

Core.commands.say = new Command({
        perm: 'op',
        args: 1,
        usage: '<text>',
        desc: 'Says <text>.'
    },
    function (g, m, u, t) {
        return g.bot.say(t, m.join(' '));

    });

Core.commands.action = new Command({
        perm: 'op',
        args: 1,
        usage: '<text>',
        desc: 'Actions <text>.'
    },
    function (g, m, u, t) {
        return g.bot.action(t, m.join(' '));

    });

Core.commands.version = new Command({
        usage: '',
        desc: 'Get info about the bot.'
    },
    function (g, m, u, t) {
        return g.bot.say(t, u + ': Fluxbot version ' + require('../package.json').version + ' by whiskers75 - http://fluxbot-irc.github.io');

    });

Core.commands.hotboot = new Command({
        perm: 'admin',
        usage: '',
        desc: 'Reload all plugins.'
    },
    function (g, m, u, t) {
        g.bot.say(t, u + ': Reloading Fluxbot...');
        g.loadPlugins();
        return g.bot.say(t, u + ': Reload complete.');

    });
module.exports = Core;