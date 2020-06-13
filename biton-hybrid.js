'use strict'

const debug = require('debug')('biton:hybrid')
const WebTorrent = require('webtorrent-hybrid')
const bitonCrypto = require('./lib/crypto')
const bitonExtension = require('./lib/biton-ext')
const path = require('path')

const bitonSEED = 'biton' + bitonCrypto.VERSION

const WEBTORRENT_VERSION = WebTorrent.VERSION

// Generate nodeId version prefix as in WebTorrent
// https://github.com/webtorrent/webtorrent/blob/master/index.js#L21
// For a reference to BitTorrent client prefixes see the npm module 'bittorrent-peerid'
// and BEP 20 "Peer ID Conventions"
const VERSION_STR = WEBTORRENT_VERSION
  .replace(/\d*./g, v => `0${v % 100}`.slice(-2))
  .slice(0, 4)
const VERSION_PREFIX = `-WW${VERSION_STR}-`

// Length of peerId in bytes
const PEERIDLEN = 20

// Magic bytes for connecting to biton main net
const NETMAGICMAIN = Buffer.from([0, 0, 0, 0])

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

    // Get magic bytes for specifying a demo network to connect to (used to derive swarmId and chunkId prefixes)
    if (opts.netMagic) {
      // Demo networks
      this._magicBuffer = Buffer.concat([Buffer.from(opts.netMagic), NETMAGICMAIN], 4)
    } else {
      // Main network
      this._magicBuffer = NETMAGICMAIN
    }
  }

  /**
   * Generate a new identity for a given keypair or seed, or for a random seed.
   * Emits 'newIdentity' after client has updated identifiers (peerId)
   *
   * @param keypair x25519 keypair
   * @param seed the seed to use if keypair is null (default is random seed)
   */
  getNewIdentity (keypair, seed = null) {
    const client = this
    bitonCrypto.ready(function () {
      if (!keypair) {
        debug('Generating node keypair with %s seed', seed || 'random')
        keypair = bitonCrypto.createKeyPair(seed)
      }

      let identity = bitonCrypto.base58.encode(Buffer.from(keypair.x25519.public))

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
     * @param  {string} challengeSecret
     * @param  {number} swarmPath
     * @param  {Object=} opts
     * @param  {function=} ontorrent called when torrent is seeding
     * @return {torrent}
     */
  joinSwarm (swarmSeed, challengeSecret, swarmPath, opts, ontorrent) {
    const combinedSeed = [bitonSEED, this._magicBuffer, swarmSeed, swarmPath].join('&')
    const challengeSeed = [combinedSeed, challengeSecret].join('&')

    const swarmInfohashBytes = bitonCrypto.blake2b_256(combinedSeed)
    const swarmInfohash = Buffer.from(swarmInfohashBytes.subarray(0, 20)).toString('hex')
    debug('joining biton swarm with swarm seed "%s" and info-hash "%s"', combinedSeed, swarmInfohash)

    const torrent = this.add(swarmInfohash, opts, ontorrent)

    const ownPeerId = this.peerId
    const noiseKeypair = this._keypair
    // Only use the biton extension for torrents that correspond to biton swarms
    torrent.on('wire', function (wire, addr) {
      debug('swarm "%s": connected to peer with address %s', combinedSeed, addr)
      debug('supported extensions: ' + JSON.stringify(wire.peerExtensions))
      wire.use(bitonExtension(challengeSeed, ownPeerId, noiseKeypair))
    })

    return torrent
  }

  joinRootSwarm (swarmSeed, secret, opts, ontorrent) {
    // Connect to the root (top level) of that swarm
    return this.joinSwarm(swarmSeed, secret, 0, opts, ontorrent)
  }

  joinGlobalSwarm (opts, ontorrent) {
    return this.joinRootSwarm('', '', opts, ontorrent)
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
