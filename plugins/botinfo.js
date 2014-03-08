var botinfo = {};
botinfo.desc = 'https://gist.github.com/nyuszika7h/97e20caf62dd0d33bd91';

botinfo.modify = function (g) {
    g.botinfo = {};
    g.botinfo.props = {
        version: '\x01BOTINFO version:' + require('../package.json').version + '\x01',
        type: '\x01BOTINFO type:fluxbot\x01',
        prefix: '\x01BOTINFO prefix:' + g.config.prefix + '\x01',
        plugins: '\x01BOTINFO plugins:' + Object.keys(g.plugins).join(',') + '\x01'
    };
    g.botinfo.handleInfo = function (from, prop) {
        if (g.botinfo.props[prop]) {
            g.bot.notice(from, g.botinfo.props[prop]);
        } else {
            g.bot.notice(from, '\x01ERRMSG BOTINFO :' + prop);
        }
    }
    g.bot.on('ctcp', function (from, to, text, type, message) {
        text = text.split(' ');
        if (text[0] == 'BOTINFO') {
            if (!text[1]) {
                Object.keys(g.botinfo.props).forEach(function (prop) {
                    g.botinfo.handleInfo(from, prop);
                });
                g.bot.notice(from, '\x01BOTINFO\x01');
                return;
            }
            text[1] = text[1].split(',');
            text[1].forEach(function (prop) {
                g.botinfo.handleInfo(from, prop);
            });
            g.bot.notice(from, '\x01BOTINFO\x01');
        }
    });
}
botinfo.commands = {};
module.exports = botinfo;