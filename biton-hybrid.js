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

// Main network magic bytes
const NETMAGICMAIN = Buffer.from([0, 0, 0, 0])

/**
 * biton Client
 * @param {Object=} opts
 */
class bitonNode extends WebTorrent {
  constructor (opts) {
    // Disable connections with other peers while node is bootstrapping
    opts.maxConns = 0

    // Whether to participate in the strangers peer discovery (overwrites WebTorrent dht option)
    // (will announce IP address to the BitTorrent Mainline DHT and connect to strangers)
    opts.strangers = (typeof opts.strangers === 'boolean') ? opts.strangers : false

    debug('strangers peer discovery over BitTorrent Mainline DHT: %s', opts.strangers)

    // If strangers peer discovery disabled, disable dht, trackers and Web Seeds (BEP19)
    opts.dht = opts.strangers
    opts.tracker = opts.strangers
    opts.webSeeds = opts.strangers

    // Set path for persistent biton store — includes confidential data!
    opts.path = opts.path || path.join(__dirname + './bitonstore/')

    super(opts)
    debug('new biton-hybrid node (peerId %s, nodeId %s, port %s)', this.peerId, this.nodeId, this.torrentPort)

    this.strangers = opts.strangers

    // Get magic bytes for specifying an independent network to connect to
    // Used as prefix in deriving user, swarm, and chunk Ids
    if (opts.netMagic) {
      // Demo networks (e.g. 'test')
      this._magicBuffer = Buffer.concat([Buffer.from(opts.netMagic), NETMAGICMAIN], 4)
    } else {
      // Main network
      this._magicBuffer = NETMAGICMAIN
    }

    //TODO Perform other tasks that need to take place during node bootstrapping and emit `bitonReady`
    // Developers once.('bitonReady') expect the node to be able to connect with other peers
    this.once('newIdentity', function (keypair) {
      this.maxConns = Number(opts.maxConns) || 50 // Hardcoded maxConns value in WebTorrent
      this.emit('bitonReady')
    })
  }

  /**
   * Generate a new identity for a given keypair or seed, or for a random seed.
   * Emits 'newIdentity' after client has updated identifiers (peerId)
   *
   * @param keypair x25519 keypair
   * @param seed the seed to use if keypair is null (default is random seed)
   */
  getNewIdentity (keypair, seed = null) {
    const self = this
    bitonCrypto.ready(function () {
      if (!keypair) {
        debug('generating node keypair with %s seed', seed || 'random')
        keypair = bitonCrypto.createKeyPair(seed)
      }

      const identity = bitonCrypto.base58.encode(Buffer.from(keypair.x25519.public))

      // BitTorrent client peerId = VERSION_PREFIX[0,10] + publicKey[0,8]
      let peerIdBuffer = Buffer.alloc(PEERIDLEN)
      peerIdBuffer = Buffer.concat([Buffer.from(VERSION_PREFIX), Buffer.from(identity)], peerIdBuffer.length)

      const peerId = peerIdBuffer.toString('hex')

      debug('new identity %s and peerId %s (%s)', identity, peerId, peerIdBuffer)

      self._identity = identity
      self._keypair = keypair
      self.peerId = peerId
      self._peerIdBuffer = peerIdBuffer

      self.emit('newIdentity', identity)
    })
  }

  /**
     * Join a biton swarm
     * @param  {string} swarmSeed
     * @param  {string} challengeSecret
     * @param  {number} swarmPath
     * @param  {Object=} opts
     * @param  {function=} onSwarm called when torrent is seeding
     * @return {swarm}
     */
  joinSwarm (swarmSeed, challengeSecret, swarmPath, opts, onSwarm) {
    opts = opts || { }
    // If strangers peer discovery enabled, share swarm infohashes over MainlineDHT and PEX (BEP11)
    opts.private = !this.strangers

    const combinedSeed = [bitonSEED, this._magicBuffer, swarmSeed, swarmPath].join('&')
    const challengeSeed = [combinedSeed, challengeSecret].join('&')

    const swarmInfohashBytes = bitonCrypto.blake2b_256(combinedSeed)
    const swarmInfohash = Buffer.from(swarmInfohashBytes.subarray(0, 20)).toString('hex')
    debug('joining biton swarm with swarm seed "%s" and info-hash "%s"', combinedSeed, swarmInfohash)

    const swarm = this.add(swarmInfohash, opts, onSwarm)

    const { _identity, _keypair, peerId } = this
    // Only use the biton extension for torrents that correspond to biton swarms
    swarm.on('wire', function (wire, addr) {
      debug('swarm "%s": connected to peer %s net address %s', combinedSeed, wire.peerId, addr)
      debug('supported extensions: ' + JSON.stringify(wire.peerExtensions))
      const initiator = this._peers[wire.peerId].conn.initiator

      wire.use(bitonExtension(challengeSeed, peerId, _identity, _keypair, initiator))
    })

    return swarm
  }

  joinRootSwarm (swarmSeed, secret, opts, onSwarm) {
    // Connect to the root (top level) swarm of the given swarmSeed
    return this.joinSwarm(swarmSeed, secret, 0, opts, onSwarm)
  }

  joinGlobalNet (opts, onSwarm) {
    return this.joinRootSwarm('', '', opts, onSwarm)
  }

  joinLocalNet (swarmSeed, opts, onSwarm) {
    return this.joinRootSwarm(swarmSeed)
  }

  /**
     * Destroy node
     * @param  {function} cb
     */
  destroy (cb) {
    super.destroy(cb)
    delete this._keypair
    //TODO Destory NOISE sessions
    if (typeof localStorage !== 'undefined') {
      window.localStorage.removeItem('debug')
    }
  }
}

module.exports = bitonNode
