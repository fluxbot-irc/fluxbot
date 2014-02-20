var Command = function(options, func) {
    this.run = func; // How to run your thing (function(global, args, from, to))
    this.args = options.args || 0; // Amount of *required* arguments
    this.perm = options.perm || 'none'; // Required permission (omit if not needed)
    this.desc = options.desc || 'No description given.'; // Describe what it does
    this.usage = options.usage || '' // Describe the arguments, like "[user]". Will be shown in help: "> command " + usage
};
module.exports = Command;