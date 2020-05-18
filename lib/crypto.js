'use strict'

const debug = require('debug')('biton-crypto')
const sodium = require('sodium-universal')
const noise = require('noise-protocol')

module.exports = {
  sodium: sodium,
  noise: noise
}
