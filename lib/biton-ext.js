'use strict'

const debug = require('debug')('biton:ext')
const { EventEmitter } = require('events')
const bencode = require('bencode')
const bitonCrypto = require('./crypto')

const extName = 'biton'

const BITFIELD_GROW = 1E3
const METADATA_LENGTH = 1 << 14 // 16 KiB

module.exports = (challengeSeed, ownId, noiseKeypair) => {
  class bitonExtension extends EventEmitter {
    constructor (wire) {
      debug('load biton extension on wire with peerId %s', wire.peerId)
      super()

      this._wire = wire
      this.abort = false
      this._passedChallenge = false
      this._challengeSeed = challengeSeed
      this._ownPeerId = ownId
      this._keypair = noiseKeypair
      this.wireIdentity = bitonCrypto.base58.encode(Buffer.from(noiseKeypair.x25519.public))
    }

    onHandshake (infoHash, peerId, extensions) {
      if (this.abort) return

      this._infoHash = infoHash
      this._otherPeerId = peerId
    }

    onExtendedHandshake (handshake) {
      if (this.abort) return

      // TODO Do not expose biton extension on handshake messages
      if (!handshake.m || !handshake.m.biton) {
        return this.emit('warning', new Error('Peer does not support biton'))
      }

      debug('attempting the challenge of peer %s', this._otherPeerId)
      // TODO tie challenges to the IP:PORT of own and remote peers (e.g. peerIds should encode this )
      // TODO challenge for a public key with a valid prefix
      let bitonExt = this
      bitonCrypto.ready(function () {
        let ownSolution = bitonCrypto.blake2b_256(Uint8Array.from([bitonExt._challengeSeed, bitonExt._ownPeerId,
          bitonExt._otherPeerId].join(' ')))
        let remoteChallenge =  bitonCrypto.blake2b_256(Uint8Array.from([bitonExt._challengeSeed,
          bitonExt._otherPeerId, bitonExt._ownPeerId].join(' ')))

        bitonExt._ownSolution = Buffer.from(ownSolution).toString('base64')
        bitonExt._remoteChallenge = Buffer.from(remoteChallenge).toString('base64')

        const dict = { challenge: bitonExt._remoteChallenge, noisePubKey: bitonExt.wireIdentity}
        bitonExt._send(dict)
      })

    }

    /**
     * biton-extension messages are bencoded dictionaries.
     * First message is a challenge to the other party
     *
     * @param {Buffer} buf bencoded PEX dictionary
     */
    onMessage (buf) {
      if (this.abort) {
        debug('peer %s sent a message to biton-ext after failing our challenge; dropping message')
        return
      }

      let dict
      try {
        dict = bencode.decode(buf, 'utf-8')
        debug('received message %s', JSON.stringify(dict))
      } catch (err) {
        // drop invalid messages
        debug('peer %s sent invalid message: %s', this._wire.peerId, err)
        return
      }

      if (!this._passedChallenge) {
        if (dict.challenge && dict.challenge === this._ownSolution) {
          debug('peer %s succeeded in our challenge', this._wire.peerId)
          this._passedChallenge = true
        } else {
          debug('peer %s failed our challenge', this._wire.peerId)
          this.abort = true
          return
        }
      } else {
        debug('peer %s sent message: %s', this._wire.peerId, JSON.stringify(dict))
      }
    }

    _send (dict) {
      const buf = bencode.encode(dict, 'utf-8')
      this._wire.extended(extName, buf)
    }
  }

  // Name of the bittorrent-protocol extension
  bitonExtension.prototype.name = extName

  return bitonExtension
}
