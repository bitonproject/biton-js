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

    destroy () {
        debug('Destroying biton wires...')
        this.destroy()
        if (typeof window.localStorage != "undefined") {
            window.localStorage.removeItem('debug')
        }
    }
}

module.exports = bitonClient
