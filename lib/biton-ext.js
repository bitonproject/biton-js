'use strict'

const debug = require('debug')('biton:ext')
const { EventEmitter } = require('events')
const bencode = require('bencode')
const bitonCrypto = require('./crypto')
const Noise = require('./noise')

const extName = 'biton'

const BITFIELD_GROW = 1E3
const METADATA_LENGTH = 1 << 14 // 16 KiB

module.exports = (challengeSeed, localPeerId, identity, identityKeypair, initiator) => {
  class bitonExtension extends EventEmitter {
    constructor (wire) {
      debug('load biton extension on wire with peerId %s', wire.peerId)
      super()

      this._wire = wire
      this.abort = false
      this._passedChallenge = false
      this._challengeSeed = challengeSeed
      this._localPeerId = localPeerId
      this._identity = identity
      this._keypair = identityKeypair
      this.initiator = initiator
      this._noise = new Noise(initiator)

      this.on('noiseReady', this._onNoiseReady)
    }

    onHandshake (infoHash, peerId, extensions) {
      if (this.abort) return

      this._infoHash = infoHash
      this._remotePeerId = peerId
    }

    onExtendedHandshake (handshake) {
      if (this.abort) return

      // TODO Do not expose biton extension on handshake messages
      if (!handshake.m || !handshake.m.biton) {
        return this.emit('warning', new Error('Peer does not support biton'))
      }

      debug('attempting the challenge of peer %s', this._remotePeerId)
      // TODO tie challenges to the IP:PORT of own and remote peers (e.g. peerIds should encode this )
      // TODO challenge for a public key with a valid prefix
      const localChallenge = bitonCrypto.blake2b_256(Uint8Array.from([this._challengeSeed, this._localPeerId,
        this._remotePeerId].join('&')))
      const remoteChallenge = bitonCrypto.blake2b_256(Uint8Array.from([this._challengeSeed, this._remotePeerId,
        this._localPeerId].join('&')))

      this._localChallenge = Buffer.from(localChallenge).toString('base64')
      this._remoteChallenge = Buffer.from(remoteChallenge).toString('base64')

      if (this.initiator) {
        const e = this._noise._noiseXXMsgA()
        const dictSend = { challenge: this._remoteChallenge, A: e }
        this._send(dictSend)
      }

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

      let dictRecv
      try {
        dictRecv = bencode.decode(buf, 'utf-8')
        debug('received message %s', JSON.stringify(dictRecv))
      } catch (err) {
        // Drop invalid messages
        debug('peer %s sent invalid message: %s', this._wire.peerId, err)
        return
      }

      if (!this._passedChallenge) {
        if (dictRecv.challenge && dictRecv.challenge === this._localChallenge) {
          debug('peer %s succeeded in our challenge', this._wire.peerId)
          if (!this.initiator) {
            // received message A
            const e = this._noise._noiseXXMsgB(dictRecv.A)
            // Send challenge and message B [e, ee, s, es]
            const dictSend = { challenge: this._remoteChallenge, B: '' }
            this._send(dictSend)
          } else {
            // received message B
          }
          this._passedChallenge = true
        } else {
          debug('peer %s failed our challenge', this._wire.peerId)
          this.abort = true
          return
        }
      } else {
        debug('peer %s sent message: %s', this._wire.peerId, JSON.stringify(dictRecv))
      }
    }

    _send (dict) {
      const buf = bencode.encode(dict, 'utf-8')
      this._wire.extended(extName, buf)
    }

    _onNoiseReady () {

    }

  }

  // Name of the bittorrent-protocol extension
  bitonExtension.prototype.name = extName

  return bitonExtension
}
