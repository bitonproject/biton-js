const { utMetadata } = require('ut-metadata')
const debug = require('debug')('biton-extension')
const bencode = require('bencode')

class bitonExtension extends utMetadata {
    constructor (wire) {
        super()
    }
}

module.exports = bitonExtension
