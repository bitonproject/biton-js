'use strict'

const debug = require('debug')('biton:crypto')

const supercop = require('supercop.wasm')
const ed25519ToX25519 = require('ed25519-to-x25519.wasm')
const noisec = require('noise-c.wasm')
const blake2 = require('blake2.wasm')
const bs58 = require('bs58')

// Noise_*_25519_ChaChaPoly_BLAKE2b ( https://noiseprotocol.org/noise.html )
const CRYPTOVERSION = 0
const CURVE = '25519'
const CIPHER = 'ChaChaPoly'
const HASH = 'BLAKE2b'
const HASHOUTLENGTH = 32
const NOISE_PROTOCOL = `Noise_*_${CURVE}_${CIPHER}_${HASH}`

function bitonCrypto() {

  debug('biton%s %s using noise-c.wasm', CRYPTOVERSION, NOISE_PROTOCOL)

  function createKeyPair (seed = null) {
    if (!seed) {
      seed = supercop.createSeed()
    }
    const keys = supercop.createKeyPair(seed)
    return {
      'seed': seed,
      'ed25519': {
        'public': keys.publicKey,
        'private': keys.secretKey
      },
      'x25519': {
        'public'	: ed25519ToX25519.convert_public_key(keys.publicKey),
        'private'	: ed25519ToX25519.convert_private_key(seed)
      }
    }
  }

  function blake2b_256 (data) {
      return blake2.Blake2b(HASHOUTLENGTH).update(data).final()
  }

  function ready (callback) {
    blake2.ready(function () {
      noisec.ready(function () {
        supercop.ready(function () {
          callback()
        })
      })
    })
  }

  return {
    VERSION: CRYPTOVERSION,
    NOISE_PROTOCOL: NOISE_PROTOCOL,
    constants: noisec.constants,
    ready: ready,
    blake2b_256: blake2b_256,
    base58: bs58,
    createKeyPair: createKeyPair,
    HandshakeState : noisec.HandshakeState
  }

}

module.exports = bitonCrypto()

/*
 * TODO Use Elligator 2 for indistinguishability
 * libsodium function for elligator representative to point
 * crypto_core_ed25519_from_uniform()
 * D. J. Bernstein, M. Hamburg, A. Krasnova, and T. Lange, “Elligator: Elliptic-curve points indistinguishable
 * from uniform random strings.” Cryptology ePrint Archive, Report 2013/325, 2013. http://eprint.iacr.org/2013/325
*/
