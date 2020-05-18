'use strict'

const debug = require('debug')('biton')
const WebTorrent = require('webtorrent-hybrid')
const crypto = require('./lib/crypto')
const sha1 = require('simple-sha1')
const bitonExtension = require('./lib/biton-ext.js')
const path = require('path')

const bitonSeed = 'biton'

const VERSION = WebTorrent.VERSION

// Length of the node keypair seed in bytes
const HDSEEDLEN = crypto.noise.SEEDLEN || crypto.sodium.crypto_kx_SEEDBYTES

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

    let keypair
    debug('Generating node keypair')
    if (opts.seed) {
      try {
        let hdSeedBytes = Buffer.from(opts.seed, 0, HDSEEDLEN)
        keypair = crypto.noise.seedKeygen(hdSeedBytes)
      } catch (e) {
        debug('noise seedKeygen failed with ', e)
        console.log('Could not generate keypair from given seed. A valid seed is %s bytes', crypto.noise.SEEDLEN)
      }
    }

    if (keypair === undefined) {
      console.log('Generating a random node keypair')
      keypair = crypto.noise.keygen()
    }

    let hexKey = keypair.publicKey.toString('base64').toString('hex')
    debug('node public key %s', hexKey)

    // peerId = VERSION_PREFIX[0,10] + publicKey[0,8]
    let peerIdBuffer = Buffer.alloc(PEERIDLEN)
    peerIdBuffer = Buffer.concat([Buffer.from(VERSION_PREFIX, 'utf8'),
      Buffer.from(keypair.publicKey.toString('base64'))], peerIdBuffer.length)
    opts.peerId = peerIdBuffer

    super(opts)

    this._keypair = keypair
    this._infohashPrefix = opts.infohashPrefix || ''
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
