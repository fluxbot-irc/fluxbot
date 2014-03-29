### Fluxbot
-------

A [Weekend of Code](http://blog.whiskers75.co.uk/weekend-of-code) project by [whiskers75](http://whiskers75.co.uk).

Fluxbot is a lightweight, easy to use IRC bot. It is extensible, like a supybot, and can perform all normal bot tasks easily, with a permission system to regulate who can do what.

To get running, set up a [Redis](http://redis.io) database somewhere, and configure `config.json` to point to it. While you're there, configure your IRC server, nick and channels to join. Optionally, you may want to add a NickServ password. Then, `node bot.js` to start the ball rolling! You can drop custom plugins in `plugins/` - in the form of JavaScript or CoffeeScript files. This is documented below.

### Writing Plugins

Documentation on writing plugins can be found in /PLUGINS.md.