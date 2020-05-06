'use strict'

const WebTorrent = require('webtorrent-hybrid')
const debug = require('debug')('biton')
const crypto = require('./lib/crypto')
const bitonExtension = require('./lib/biton-ext.js')

const bitonSeed = 'biton'

/**
 * biton Client
 * @param {Object=} opts
 */
class bitonClient extends WebTorrent {
    constructor (opts={tracker: false, private: true, path: __dirname + './bitondb/'}) {
        super(opts)

        this._infohashPrefix = process.env.INFOHASHPREFIX || opts.infohashPrefix || ''
        debug('new biton client (peerId %s, nodeId %s, port %s)', this.peerId, this.nodeId, this.torrentPort)
    }

    /**
     * Join a biton swarm
     * @param  {string} swarmSeed
     * @param  {string} secret
     * @param  {Object=} opts
     * @param  {function=} ontorrent called when torrent is seeding
     * @return {torrent}
     */
    joinSwarm (swarmSeed, secret, opts, ontorrent) {
        let combinedSeed = [this._infohashPrefix, swarmSeed, bitonSeed].filter(Boolean).join(' ');
        let challengeSeed = [combinedSeed, secret].filter(Boolean).join(' ')

        let swarmInfohash = crypto.sha1.sync(combinedSeed);
        debug('joining biton swarm with swarm seed "%s" and info-hash "%s"', combinedSeed, swarmInfohash)

        let torrent = this.add(swarmInfohash, opts, ontorrent)

        let ownId = this.peerId
        // Only use the biton extension for torrents that correspond to biton swarms
        torrent.on('wire', function (wire, addr) {
            debug('swarm "%s": connected to peer with address %s', combinedSeed, addr)
            debug('supported extensions: ' + JSON.stringify(wire.peerExtensions))
            wire.use(bitonExtension(challengeSeed, ownId))
        })

        return torrent
    }

    joinRootSwarm (secret, opts, ontorrent) {
        return this.joinSwarm('', secret, opts, ontorrent)
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
