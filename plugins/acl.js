var ACL = {};
var wc = require('wildcard');
var Command = require('../command.js');
ACL.desc = 'Built in Access Control List for your fluxbot.'
ACL.modify = function (g) {
    g.hasPermission = function (hostmask, perm, channel, callback) {
        var perms = [];
        g.db.hkeys('acl', function (err, acls) {
            if (err) {
                throw err;
            }
            acls.forEach(function (key) {
                var wc1, wc2;
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
ACL.commands = {};
ACL.commands.givePerm = new Command({
    args: 2,
    perm: 'admin',
    usage: '<hostmask> <perm>',
    desc: 'Gives <hostmask> the <perm> permission.'
}, function (g, m, u, t) {
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

ACL.commands.takePerm = new Command({
    args: 2,
    perm: 'admin',
    usage: '<hostmask> <perm>',
    desc: 'Takes away <perm> from <hostmask>'
}, function (g, m, u, t) {
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
ACL.commands.perm = new Command({
    desc: 'List perms of <hostmask>',
    args: 1,
    usage: '<hostmask>',
    perm: 'admin'
}, function (g, m, u, t) {
    return g.db.hget('acl', String(m[0]), function (err, permlist) {
        if (!permlist) {
            permlist = '';
        }
        permlist = permlist.split('|');
        return g.bot.say(t, m[0] + ' perms: ' + permlist.join(' '));
    });
});
module.exports = ACL;