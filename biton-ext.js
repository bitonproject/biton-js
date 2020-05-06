const { EventEmitter } = require('events')
const bencode = require('bencode')
const debug = require('debug')('biton-ext')
const sha1 = require('crypto-js/sha1')

const extName = 'biton'

const BITFIELD_GROW = 1E3
const PIECE_LENGTH = 1 << 14 // 16 KiB

module.exports = (challengeSeed, ownId) => {
    class bitonExtension extends EventEmitter {
        constructor(wire) {
            debug('load biton extension on wire with peerId %s', wire.peerId)
            super()

            this._wire = wire
            this._passedChallenge = false
            this._challengeSeed = challengeSeed
            this._ownId = ownId
        }

        onHandshake (infoHash, peerId, extensions) {
            this._infoHash = infoHash
            this._peerId = peerId
        }

        onExtendedHandshake (handshake) {
            // TODO Do not expose biton extension on handshake messages
            if (!handshake.m || !handshake.m.biton) {
                return this.emit('warning', new Error('Peer does not support biton'))
            }

            // TODO tie challenges to the IP:PORT of own and remote peers
            this._ownSolution = sha1([this._challengeSeed, this._ownId, this._peerId].join(' ')).toString()
            this._remoteChallenge = sha1([this._challengeSeed, this._peerId, this._ownId].join(' ')).toString()

            debug('attempting the challenge of peer %s', this._peerId)
            let dict = { challenge : this._remoteChallenge }
            this._send(dict)
        }

        /**
         * biton-extension messages are bencoded dictionaries.
         * First message is a challenge to the other party
         *
         * @param {Buffer} buf bencoded PEX dictionary
         */
        onMessage (buf) {
            let dict
            try {
                dict = bencode.decode(buf, 'utf-8')
                debug('received message %s', JSON.stringify(dict))
            } catch (err) {
                // drop invalid messages
                debug('peer %s sent invalid message: %s', this._wire.peerId, err)
                return
            }

            if (!this._passedChallenge || dict.challenge) {
                if (dict.challenge === this._ownSolution) {
                    debug('peer %s succeeded in our challenge', this._wire.peerId)
                    this._passedChallenge = true
                } else {
                    debug('peer %s failed our challenge', this._wire.peerId)
                    return
                }
            } else {
                debug('peer %s sent message: %s', this.wire.peerId, JSON.stringify(dict))
            }
        }

        _send (dict) {
            let buf = bencode.encode(dict, 'utf-8')
            this._wire.extended(extName, buf)
        }

    }

    // Name of the bittorrent-protocol extension
    bitonExtension.prototype.name = extName

    return bitonExtension
}
