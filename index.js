'use strict'

const WebTorrent = require('webtorrent-hybrid')
const debug = require('debug')('biton')
const bitonExtension = require('./biton-ext.js')
const sha1 = require('sha1')

const bitonSwarmSeed = 'biton info-hash'
const infohashPrefix = process.env.INFOHASHPREFIX || ''

/**
 * biton Client
 * @param {Object=} opts
 */
class bitonClient extends WebTorrent {
    constructor (opts={tracker: false, private: true, path: __dirname + './bitondb/'}) {
        super()
        debug('Constructed biton client')
    }

    /**
     * Join a swarm
     * @param  {string} swarmSeed
     * @param  {Object=} opts
     * @param  {function=} onseed called when torrent is seeding
     * @return {torrent}
     */
    joinSwarm (swarmSeed, opts, onseed, torrent) {
        let swarmInfohash = sha1(infohashPrefix + swarmSeed + bitonSwarmSeed);
        debug('Joining biton swarm with swarm seed %s and info-hash %s', swarmSeed, swarmInfohash)
        this.add(swarmInfohash, opts, onseed, torrent)
    }

    joinRootSwarm (opts, onseed, torrent) {
        this.joinSwarm('', opts, onseed, torrent)
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
