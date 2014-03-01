var redis = require('redis');
var db;
var config = {};
var readline = require('readline');
var fs = require('fs');
var rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

console.log('Welcome to the Fluxbot setup wizard!');
console.log('------------------------------------');
console.log('\nYour fluxbot needs a Redis database to run. Please enter the details:');
rl.question('Redis: Host> ', function (host) {
    config.redis_host = host;
    rl.question('Redis: Port> ', function (port) {
        config.redis_port = port;
        rl.question('Redis: Password (if any)> ', function (pass) {
            config.redis_password = pass;
            console.log('\nConnecting to database...');
            db = redis.createClient(config.redis_port, config.redis_host);
            if (config.redis_password) {
                db.auth(config.redis_password);
            }
            db.on('error', function (err) {
                throw err;
            });
            db.on('ready', function () {
                console.log('Connection successful.');
                console.log('\nPlease type in the hostmask of the user you want to be given admin permissions.');
                console.log('Example: *@unaffiliated/whiskers75');
                rl.question('IRC: Admin> ', function (admin) {
                    db.hget('acl', admin, function (err, permlist) {
                        if (!permlist) {
                            permlist = '';
                        }
                        permlist = permlist.split('|');
                        permlist.push('admin');
                        db.hset('acl', admin, permlist.join('|'));
                        console.log('\nSetting admin complete.');
                        console.log('We will now configure your IRC server.');
                        rl.question('IRC: Host> ', function (host2) {
                            config.server = host2;
                            rl.question('IRC: Port> ', function (port2) {
                                config.port = port2;
                                rl.question('IRC: Nick> ', function (nick) {
                                    config.nick = nick;
                                    rl.question('IRC: NickServ or other password> ', function (passw) {
                                        config.nickserv_password = passw;
                                        console.log('You will now need to pick a prefix for your bot. This is what it will respond to.')
                                        console.log('Example (prefix »): "» help"');
                                        rl.question('IRC: Prefix> ', function (prefix) {
                                            config.prefix = prefix;
                                            console.log('\n\nConfiguration complete.\nWriting to config.json...');
                                            fs.writeFileSync('./config.json', JSON.stringify(config));
                                            console.log('\nDone!');
                                            rl.close();
                                            process.exit(0);
                                        });
                                    });
                                });
                            })
                        })
                    });
                });
            })
        })
    });
});