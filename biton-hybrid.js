'use strict'

const debug = require('debug')('biton')
const WebTorrent = require('webtorrent-hybrid')
const sha1 = require('simple-sha1')
const bitonCrypto = require('./lib/crypto')
const bitonExtension = require('./lib/biton-ext')
const path = require('path')

const bitonSeed = 'biton0'

const VERSION = WebTorrent.VERSION

// Length of peerId in bytes
const PEERIDLEN = 20

// Generate nodeId version prefix as in WebTorrent
// https://github.com/webtorrent/webtorrent/blob/master/index.js#L21
// For a reference to BitTorrent client prefixes see the npm module 'bittorrent-peerid'
const VERSION_STR = VERSION
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
    // Disable trackers
    // opts.tracker = opts.tracker || false
    // Do not share torrent infohashes over MainlineDHT or PEX (BEP11)
    opts.private = (typeof opts.private === 'boolean') ? opts.private : true
    // Where to store torrents
    opts.path = opts.path || path.join(__dirname + './bitondb/')
    // Disable Web Seeds (BEP19)
    opts.webSeeds = opts.webSeeds || false

    super(opts)

    bitonCrypto.ready(function () {
      let keypair = opts.keypair
      if (!keypair) {
        let seed = opts.seed || null
        debug('Generating node keypair with seed %s', seed)
        keypair = bitonCrypto.create_keypair(seed)
      }

      let hexKey = Buffer.from(keypair.x25519.public, 'base64').toString('hex')
      debug('node public key %s', hexKey)

      // BitTorrent client peerId = VERSION_PREFIX[0,10] + publicKey[0,8]
      let peerIdBuffer = Buffer.alloc(PEERIDLEN)
      peerIdBuffer = Buffer.concat([Buffer.from(VERSION_PREFIX, 'utf8'),
        Buffer.from(keypair.x25519.public, 'base64')], peerIdBuffer.length)

      this.peerId = peerIdBuffer.toString('hex')
      this._keypair = keypair
      this._hexKey = hexKey
      this._infohashPrefix = opts.infohashPrefix || ''
      debug('new biton client (peerId %s, nodeId %s, port %s)', this.peerId, this.nodeId, this.torrentPort)
    }())
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
    const combinedSeed = [this._infohashPrefix, swarmSeed, bitonSeed].filter(Boolean).join(' ')
    const challengeSeed = [combinedSeed, secret].filter(Boolean).join(' ')

    const swarmInfohash = sha1.sync(combinedSeed)
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
