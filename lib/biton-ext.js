'use strict'

const debug = require('debug')('biton:ext')
const { EventEmitter } = require('events')
const bencode = require('bencode')
const bitonCrypto = require('./crypto')

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
      const bitonExt = this
      bitonCrypto.ready(function () {
        const localChallenge = bitonCrypto.blake2b_256(Uint8Array.from([bitonExt._challengeSeed, bitonExt._localPeerId,
          bitonExt._remotePeerId].join('&')))
        const remoteChallenge = bitonCrypto.blake2b_256(Uint8Array.from([bitonExt._challengeSeed,
          bitonExt._remotePeerId, bitonExt._localPeerId].join('&')))

        bitonExt._localChallenge = Buffer.from(localChallenge).toString('base64')
        bitonExt._remoteChallenge = Buffer.from(remoteChallenge).toString('base64')

        bitonExt._noiseHandshakeInit(initiator, null)
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
        if (dict.challenge && dict.challenge === this._localChallenge) {
          debug('peer %s succeeded in our challenge', this._wire.peerId)
          if (!this.initiator) {
            this._noiseHandshakeInit(this.initiator, dict.e)
          }
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

    _noiseHandshakeInit (initiator, remotePublicDH) {
      const bitonExt = this
      bitonCrypto.ready(function () {

        bitonExt._ownKeypairDH = bitonCrypto.createKeyPair()

        // Initialize Noise handshake state
        // https://noiseexplorer.com/patterns/XX
        if (initiator) {
          bitonExt._handshakeState = bitonCrypto.HandshakeState(bitonCrypto.NOISE_XX_PATTERN,
            bitonCrypto.constants.NOISE_ROLE_INITIATOR)
          bitonExt._handshakeState.Initialize('biton0_Noise_XX', bitonExt._ownKeypairDH.x25519.private, null, null)

          const dict = { challenge: bitonExt._remoteChallenge, identity: bitonExt._identity,
            e: Buffer.from(bitonExt._ownKeypairDH.x25519.public).toString('base64') }
          bitonExt._send(dict)
        } else {
          bitonExt._handshakeState = bitonCrypto.HandshakeState(bitonCrypto.NOISE_XX_PATTERN,
            bitonCrypto.constants.NOISE_ROLE_RESPONDER)
            bitonExt._handshakeState.Initialize('biton0_Noise_XX', bitonExt._ownKeypairDH.x25519.private,
              remotePublicDH, null)
        }
      })
    }
  }

  // Name of the bittorrent-protocol extension
  bitonExtension.prototype.name = extName

  return bitonExtension
}
