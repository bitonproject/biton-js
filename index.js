'use strict'

const WebTorrent = require('webtorrent-hybrid')
const debug = require('debug')('webtorrent')


/**
 * biton Client
 * @param {Object=} opts
 */
class bitonClient extends WebTorrent {
    constructor (opts={tracker: false, private: true, path: __dirname + './bitondb/'}) {
        super()
    }

    destroy (cb) {
        debug('Destroying biton wires...')
        super.destroy(cb)
        if (typeof localStorage != "undefined") {
            window.localStorage.removeItem('debug')
        }
    }
}


module.exports = bitonClient
