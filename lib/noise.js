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

    const message = this._writeHandshakeMessage()

    this._split()

    // Return message C [s, se]
    return message
  }

  _noiseXXMsgD (msgC) {
    // Parse message C [s, se]
    this._readHandshakeMessage(msgC)

    this._split()
  }

  _split () {
    if (!this._handshakeState.GetAction() === bitonCrypto.noiseConstants.NOISE_ACTION_SPLIT) {
     return false
    }

    const splitState = this._handshakeState.Split()
    this._sendCipherState = splitState[0]
    this._recvCipherState = splitState[1]

    //TODO need to .free() first?
    delete this._handshakeState

    this.isSplit = true

    return true
  }

  _sendEnc(plaintext) {
    if (!this.isSplit) {
      throw new Error('Noise is not ready to encrypt messages (wait for handshake to complete)')
    }
    const message = this._sendCipherState.EncryptWithAd(new Uint8Array(0), plaintext)
    this._sendCipherState.free()
    return message
  }

  _recvDec(ciphertext) {
    if (!this.isSplit) {
      throw new Error('Noise is not ready to decrypt messages (wait for handshake to complete)')
    }
    const message = this._recvCipherState.DecryptWithAd(new Uint8Array(0), ciphertext)
    this._recvCipherState.free()
    return message
  }

  _destroy () {
    if (this._handshakeState) {
      try {
        this._handshakeState.free()
      } finally {
        delete this._handshakeState
      }
    }
    if (this._sendCipherState) {
      this._sendCipherState.free()
      delete this._sendCipherState
    }
    if (this._recvCipherState) {
      this._recvCipherState.free()
      delete this._recvCipherState
    }
  }
}

module.exports = Noise
