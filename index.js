'use strict'

const WebTorrent = require('webtorrent-hybrid')
const debug = require('debug')('biton')
const bitonExtension = require('./biton-ext.js')

const bitonSwarmSeed = 'biton'

/**
 * biton Client
 * @param {Object=} opts
 */
class bitonClient extends WebTorrent {
    constructor (opts={tracker: false, private: true, path: __dirname + './bitondb/'}) {
        super()
    }

    /**
     * Join a swarm
     * @param  {string }swarmSeed
     * @param  {Object=} opts
     * @param  {function=} onseed called when torrent is seeding
     * @return {torrent}
     */
    joinSwarm (swarmSeed = bitonSwarmSeed, opts = {name: 'biton'}, onseed) {
    }

    /**
     * Destroy the client, including all torrents and connections to peers.
     * @param  {function} cb
     */
    destroy (cb) {
        super.destroy(cb)
        if (typeof localStorage !== 'undefined') {
            window.localStorage.removeItem('debug')
        }
    }
}


module.exports = bitonClient
