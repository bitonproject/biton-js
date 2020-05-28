'use strict'

const debug = require('debug')('biton:hybrid')
const WebTorrent = require('webtorrent-hybrid')
const bitonCrypto = require('./lib/crypto')
const bitonExtension = require('./lib/biton-ext')
const path = require('path')

const bitonSEED = 'biton' + bitonCrypto.VERSION

const WEBTORRENT_VERSION = WebTorrent.VERSION

// Length of peerId in bytes
const PEERIDLEN = 20

// Generate nodeId version prefix as in WebTorrent
// https://github.com/webtorrent/webtorrent/blob/master/index.js#L21
// For a reference to BitTorrent client prefixes see the npm module 'bittorrent-peerid'
// and BEP 20 "Peer ID Conventions"
const VERSION_STR = WEBTORRENT_VERSION
  .replace(/\d*./g, v => `0${v % 100}`.slice(-2))
  .slice(0, 4)
const VERSION_PREFIX = `-WW${VERSION_STR}-`

/**
 * biton Client
 * @param {Object=} opts
 */
class bitonClient extends WebTorrent {
  constructor (opts) {

    // Set default WebTorrent options

    /* Uncomment to avoid starting connections with peers while constructing client
    // Disable trackers and dht
    opts.tracker = opts.tracker || false
    opts.dht = opts.dht || false
    // Set max connections to 0
    opts.maxConns = opts.maxConns || 0
    */

    // Do not share torrent infohashes over MainlineDHT or PEX (BEP11)
    opts.private = (typeof opts.private === 'boolean') ? opts.private : true
    // Where to store torrents
    opts.path = opts.path || path.join(__dirname + './bitondb/')
    // Disable Web Seeds (BEP19)
    opts.webSeeds = opts.webSeeds || false

    super(opts)
    debug('new biton-hybrid client (peerId %s, nodeId %s, port %s)', this.peerId, this.nodeId, this.torrentPort)
    this._infohashPrefix = opts.infohashPrefix || ''
  }

  getNewIdentity (keypair, seed = null) {
    const client = this
    bitonCrypto.ready(function () {
      if (!keypair) {
        debug('Generating node keypair with %s seed', seed || 'random')
        keypair = bitonCrypto.createKeyPair(seed)
      }

      let identity = Buffer.from(keypair.x25519.public).toString('base64')

      // BitTorrent client peerId = VERSION_PREFIX[0,10] + publicKey[0,8]
      let peerIdBuffer = Buffer.alloc(PEERIDLEN)
      peerIdBuffer = Buffer.concat([Buffer.from(VERSION_PREFIX), Buffer.from(identity)], peerIdBuffer.length)

      let peerId = peerIdBuffer.toString('hex')

      debug('new identity %s and peerId %s (%s)', identity, peerId, peerIdBuffer)

      client._identity = identity
      client._keypair = keypair
      client.peerId = peerId
      client._peerIdBuffer = peerIdBuffer

      client.emit('newIdentity')
    })
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
    const combinedSeed = [this._infohashPrefix, swarmSeed, bitonSEED].filter(Boolean).join(' ')
    const challengeSeed = [combinedSeed, secret].filter(Boolean).join(' ')

    const swarmInfohashBytes = bitonCrypto.blake2b_256(Uint8Array.from(combinedSeed))
    const swarmInfohash = Buffer.from(swarmInfohashBytes.subarray(0, 20)).toString('hex')
    debug('joining biton swarm with swarm seed "%s" and info-hash "%s"', combinedSeed, swarmInfohash)

    const torrent = this.add(swarmInfohash, opts, ontorrent)

    const ownPeerId = this.peerId
    // Only use the biton extension for torrents that correspond to biton swarms
    torrent.on('wire', function (wire, addr) {
      debug('swarm "%s": connected to peer with address %s', combinedSeed, addr)
      debug('supported extensions: ' + JSON.stringify(wire.peerExtensions))
      wire.use(bitonExtension(challengeSeed, ownPeerId))
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
