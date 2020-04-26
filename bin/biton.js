#!/usr/bin/env node

const bitonClient = require('../')

console.log('biton webtorrent-hybrid client')

let client = new bitonClient()

function exitHandler(options, exitCode) {
    console.log('\nDestroying biton wires..')
    if (!client.destroyed)
      client.destroy()
    process.exit()
}

// Attach exit handlers
// process.on('exit', exitHandler.bind())
process.on('SIGINT', exitHandler.bind())
process.on('SIGTERM', exitHandler.bind())
process.on('SIGUSR1', exitHandler.bind())
process.on('SIGUSR2', exitHandler.bind())
process.on('uncaughtException', exitHandler.bind())
