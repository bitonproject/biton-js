#!/usr/bin/env node

'use strict'

const debug = require('debug')('biton:hybrid-app')
const bitonClient = require('../biton-hybrid')
const express = require('express')
const http = require('http')
const path = require('path')

const PORT = process.env.PORT || 5000
const HOST = process.env.HOST || '127.0.0.1'
const NETMAGIC = process.env.NETMAGIC

console.log('biton webtorrent-hybrid client')

// Setup express behind the http module
const app = express()
const server = http.createServer(app)

// Serve static files in the public directory
app.use(express.static(path.join(__dirname, '/public')))

// Attach HTTP endpoints
app.get('/', function (req, res) {
  res.sendFile(path.join(__dirname, 'views/entangled.html'))
})

// Handle 404 for unrecognized URLs
app.get('*', function (req, res) {
  res.status(404).send('404 Not Found')
})

server.listen(PORT, HOST, () => {
  console.log('HTTP server running at http://%s:%s', server.address().address, server.address().port)
})

server.on('error', function (e) {
  if (e.code === 'EADDRINUSE') {
    console.log('Another application (a biton client or container?) is already listening on port %s', PORT)
    exitHandler()
  } else {
    console.log('Unexpected error at the HTTP server: ' + e.code)
  }
})

// Graceful shutdown. Close active connections. Delete logs and uncompleted chunks
function exitHandler (options = {}) {
  if (server && server.listening) {
    server.close()
  }
  if (client && !client.destroyed) {
    console.log('Destroying biton wires...')
    client.destroy()
  }
  const exitCode = options.exitCode || 0
  process.exit(exitCode)
}

// Attach exit handlers
// process.on('exit', exitHandler.bind())
process.on('SIGINT', exitHandler.bind())
process.on('SIGTERM', exitHandler.bind())
process.on('SIGUSR1', exitHandler.bind())
process.on('SIGUSR2', exitHandler.bind())
process.on('uncaughtException', function (err) {
  debug('uncaught exception: ', err.stack)
  exitHandler({ exitCode: 1 })
})

// Start a biton client
const client = new bitonClient({ private: false, netMagic: NETMAGIC })

// Generate new identity and join root swarm
client.once('newIdentity', client.joinGlobalSwarm)
client.getNewIdentity()
