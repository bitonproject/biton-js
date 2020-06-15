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
      this._handshakeState = bitonCrypto.HandshakeState(NOISE_XX_PROLOGUE,
        bitonCrypto.noiseConstants.NOISE_ROLE_INITIATOR)
    } else {
      this._handshakeState = bitonCrypto.HandshakeState(NOISE_XX_PROLOGUE,
        bitonCrypto.noiseConstants.NOISE_ROLE_RESPONDER)
    }
  }

  _writeHandshakeMessage () {
    if (this._handshakeState && this._handshakeState.GetAction() ===
      bitonCrypto.noiseConstants.NOISE_ACTION_WRITE_MESSAGE) {
      return this._handshakeState.WriteMessage()
    }
  }

  _readHandshakeMessage (message) {
    if (this._handshakeState && this._handshakeState.GetAction() ===
      bitonCrypto.noiseConstants.NOISE_ACTION_READ_MESSAGE) {
      this._handshakeState.ReadMessage(message)
    }
  }

  _noiseXXMsgA () {
    this._handshakeState.Initialize(NOISE_XX_PROLOGUE, this._localKeypairDH.x25519.private, null, null)

    // Return message A [e]
    return this._writeHandshakeMessage()
  }

  _noiseXXMsgB (msgA) {
    this._handshakeState.Initialize(NOISE_XX_PROLOGUE, this._localKeypairDH.x25519.private, null, null)

    // Parse message A [e]
    this._readHandshakeMessage(msgA)

    // Return message B [e, ee, s es]
    return this._writeHandshakeMessage()
  }

  _noiseXXMsgC (msgB) {
    // Parse message B [e, ee, s es]
    this._readHandshakeMessage(msgB)

    this._split()

    return this._writeHandshakeMessage()
  }

  _noiseXXMsgD (msgC) {
    // Parse message C [s, se]
    this._readHandshakeMessage(msgC)

    this._split()

    return this._writeHandshakeMessage()
  }

  _split () {

  }

}

module.exports = Noise
