Command = (options, func) ->
    this.run = func
    this.args = options.args || 0
    this.perm = options.perm || 'none'
    return this
module.exports = Command