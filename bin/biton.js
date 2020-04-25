#!/usr/bin/env node

const bitonClient = require('../')

console.log('biton webtorrent-hybrid client')

const torrentId = 'magnet:?xt=urn:btih:6a9759bffd5c0af65319979fb7832189f4f3c35d'

let client = new bitonClient()

client.add(torrentId, function (torrent) {
  console.log('Client is downloading:', torrent.infoHash)

  // Torrents can contain many files. Let's use the .mp4 file
  var file = torrent.files.find(function (file) {
    return file.name.endsWith('.mp4')
  })
})

function exitHandler(options, exitCode) {
    console.log('Destroying biton wires..')
    if (!client.destroyed)
      client.destroy()
    process.exit();
}

// Attach exit handlers
process.on('exit', exitHandler.bind());
process.on('SIGINT', exitHandler.bind());
process.on('SIGTERM', exitHandler.bind());
process.on('SIGUSR1', exitHandler.bind());
process.on('SIGUSR2', exitHandler.bind());
process.on('uncaughtException', exitHandler.bind());
