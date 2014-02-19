var Command = function(options, func) {
    this.run = func;
    this.args = options.args || 0;
    this.perm = options.perm || 'none';
    this.desc = options.desc || 'No description given.'
};
module.exports = Command;