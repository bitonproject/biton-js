const { EventEmitter } = require('events')
const debug = require('debug')('biton-ext')

module.exports = () => {
    class bitonExtension extends EventEmitter {
        constructor(wire) {
            debug('load biton extension on wire with peerId %s', wire.peerId)
            super()
        }
    }

    // Name of the bittorrent-protocol extension
    bitonExtension.prototype.name = 'biton'

    return bitonExtension
}
