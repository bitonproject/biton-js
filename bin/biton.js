#!/usr/bin/env node

const bitonClient = require('../')

console.log('biton webtorrent-hybrid client')
console.log(processs.argv);

let client = new bitonClient({tracker: false, store: __dirname + 'bitondb'})

const torrentId = 'magnet:?xt=urn:btih:6a9759bffd5c0af65319979fb7832189f4f3c35d'
