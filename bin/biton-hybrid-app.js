#!/usr/bin/env node

'use strict'

const debug = require('debug')('biton:hybrid-app')
const biton = require('../biton-hybrid')
const express = require('express')
const http = require('http')
const path = require('path')

/* Parse environment configuration variables */

// Participate in peer discovery over Mainline DHT (default false)
// Fallback bootstrapping mechanism when the user cannot connect through trusted nodes
const STRANGERNET = process.env.OPENNET || false
// Join the global biton swarm (default false)
// Recommended unless nodes are behind bandwidth capped connections
const JOINGLOBAL = process.env.JOINGLOBAL || false
// Optional seed for joining a local swarm (e.g. 'myApp')
const LOCALSWARM = process.env.LOCALSWARM
// Magic bytes for connecting to independent networks
const NETMAGIC = process.env.NETMAGIC

const PORT = process.env.PORT || 5000
const HOST = process.env.HOST || process.env.NODE_ENV === 'production' ? '0.0.0.0' : '127.0.0.1'

console.log('biton webtorrent-hybrid client')

// Setup express behind the http module
const app = express()
const server = http.createServer(app)

// Serve static files in the public directory
app.use(express.static(path.join(__dirname, '/public')))

// Attach HTTP endpoints
app.get('/', function (req, res) {
  res.redirect('/entangled')
})

app.get('/entangled', function (req, res) {
  res.sendFile(path.join(__dirname, 'views/entangled.html'))
})

// Handle 404 for unrecognized URLs
app.get('*', function (req, res) {
  res.status(404).send('404 Not Found')
})

server.listen(PORT, HOST, function () {
  console.log('HTTP server running at http://%s:%s', server.address().address, server.address().port)
})

server.on('error', function (e) {
  if (e.code === 'EADDRINUSE') {
    console.log('Another application (a biton client or container?) is already listening on port %s', PORT)
  } else {
    console.log('Unexpected error at the HTTP server: ' + e.code)
  }
  exitHandler()
})

// Graceful shutdown. Close active connections. Delete logs and uncompleted chunks
function exitHandler (options = {}) {
  if (server && server.listening) {
    server.close()
  }
  if (node && !node.destroyed) {
    console.log('Destroying biton wires...')
    node.destroy()
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
const node = new biton({ strangernet: STRANGERNET, netMagic: NETMAGIC})

// Wait for node to generate a new identity and to be ready to join
node.once('newIdentity',function () {
  if (JOINGLOBAL) {
    console.log('Connecting to the global biton network')
    const globalSwarm = node.joinGlobalNetwork()
  }

  if (LOCALSWARM) {
    console.log('Connecting to local swarm %s', LOCALSWARM)
    const localSwarm = node.joinRootSwarm(LOCALSWARM)
  }
})

node.getNewIdentity()
