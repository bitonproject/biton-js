'use strict'

const debug = require('debug')('biton:noise')
const bitonCrypto = require('./crypto')

const NOISE_XX_PROLOGUE = bitonCrypto.NOISE_PROTOCOL.replace('*', 'XX')

class Noise {

  constructor (initiator) {
    this.initiator = initiator
    // Generate ephemeral keypair for noise session
    this._localKeypairDH = bitonCrypto.createKeyPair()

    // Instantiate Noise handshake state
    // https://noiseexplorer.com/patterns/XX
    if (this.initiator) {
      this._handshakeState = bitonCrypto.HandshakeState(NOISE_XX_PROLOGUE, bitonCrypto.constants.NOISE_ROLE_INITIATOR)
    } else {
      this._handshakeState = bitonCrypto.HandshakeState(NOISE_XX_PROLOGUE, bitonCrypto.constants.NOISE_ROLE_RESPONDER)
    }
  }

  HandshakeFinal (initiator, e, ee, s, es, se) {
    // Send message C and split
    if (initiator) {
      self._noiseXXMsgC()
    }
    //TODO Split
  }

  _noiseXXMsgA () {
    this._handshakeState.Initialize(NOISE_XX_PROLOGUE, this._localKeypairDH.x25519.private, null, null)

    // Return message A [e]
    return  Buffer.from(this._localKeypairDH.x25519.public).toString('base64')
  }

  _noiseXXMsgB (msgA) {
    this._handshakeState.Initialize(NOISE_XX_PROLOGUE, this._localKeypairDH.x25519.private, msgA, null)

    // Return message B [e, ee, s es]
    return '[e, ee, s es]'
  }

  _noiseXXMsgC () {
    // Return message C [s, se]
  }

}

module.exports = Noise
