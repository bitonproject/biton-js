'use strict'

const { SodiumPlus } = require('sodium-plus')
const simplesha1 = require('simple-sha1')
const debug = require('debug')('biton-crypto')

module.exports = {
  sha1: simplesha1,
}
