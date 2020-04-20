'use strict'

const WebTorrent = require('webtorrent-hybrid')
const fs = require('fs')

const PORT = process.env.PORT || 5000
const HOST = '0.0.0.0'

console.log('biton webtorrent-hybrid client')
console.log(`Running on http://${HOST}:${PORT}`)
