'use strict'

const debug = require('debug')('biton-crypto')

// Noise_*_25519_ChaChaPoly_BLAKE2b ( https://noiseprotocol.org/noise.html )
const CURVE = '25519'
const CIPHER = 'ChaChaPoly'
const HASH = 'BLAKE2b'
const HASHOUTLENGTH = 32
const NOISE_PROTOCOL = `Noise_*_${CURVE}_${CIPHER}_${HASH}`

function bitonCrypto(supercop, ed25519ToX25519, noisec, blake2) {
  function create_keypair (seed = null) {
    if (!seed) {
      debug('generating keypair from random seed')
      seed = supercop.createSeed()
    }
    let keys = supercop.createKeyPair(seed)
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
          debug('initialization complete for bitonCrypto %s',NOISE_PROTOCOL)
          callback()
        })
      })
    })
  }

  return {
    ready: ready,
    create_keypair: create_keypair,
    blake2b_256: blake2b_256
  }

}

if (typeof define === 'function' && define.amd) {
  define(['supercop.wasm', 'ed25519-to-x25519.wasm', 'noise-c.wasm', 'blake2.wasm'], bitonCrypto)
} else if (typeof exports === 'object') {
  module.exports = bitonCrypto(require('supercop.wasm'), require('ed25519-to-x25519.wasm'),
    require('noise-c.wasm'), require('blake2.wasm'))
} else {
  this.bitonCrypto = bitonCrypto(this.supercop_wasm, this.ed25519_to_x25519_wasm, this.noise_c_wasm, this.blake2_wasm)
}
