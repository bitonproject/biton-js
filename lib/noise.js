'use strict'

const debug = require('debug')('biton:noise')
const bitonCrypto = require('./crypto')

const NOISE_XX_PROLOGUE = bitonCrypto.NOISE_PROTOCOL.replace('*', 'XX')

class noise {

  constructor (initiator) {
    this.initiator = initiator
    // Generate ephemeral keypair for noise session
    this._localKeypairDH = bitonCrypto.createKeyPair()
  }

  HandshakeInit (initiator, e) {
    // Send messages A and B
    const self = this
    bitonCrypto.ready(function () {

      // Initialize Noise handshake state
      // https://noiseexplorer.com/patterns/XX

      if (initiator) {
        // Send message A
        self._noiseXXMsgA()
      } else {
        // Send message B
        self._noiseXXMsgB(e)
      }
    })
  }

  HandshakeFinal (initiator, e, ee, s, es, se) {
    // Send message C and split
    const self = this
    bitonCrypto.ready(function () {
      if (initiator) {
        self._noiseXXMsgC()
      }
      // Split
    })
  }

  _noiseXXMsgA () {
    this._handshakeState = bitonCrypto.HandshakeState(NOISE_XX_PROLOGUE, bitonCrypto.constants.NOISE_ROLE_INITIATOR)
    this._handshakeState.Initialize(NOISE_XX_PROLOGUE, this._localKeypairDH.x25519.private, null, null)

    // Return message A [e]
    return  Buffer.from(this._localKeypairDH.x25519.public).toString('base64')
  }

  _noiseXXMsgB (msgA, remotePublicDH) {
    this._handshakeState = bitonCrypto.HandshakeState(NOISE_XX_PROLOGUE, bitonCrypto.constants.NOISE_ROLE_RESPONDER)
    this._handshakeState.Initialize(NOISE_XX_PROLOGUE, this._localKeypairDH.x25519.private,
      remotePublicDH, null)

    // Return message B [e, ee, s es]
    return '[e, ee, s es]'
  }

  _noiseXXMsgC () {
    // Return message C [s, se]
  }
}

module.exports = noise
