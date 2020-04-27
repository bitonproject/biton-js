#!/usr/bin/env node

const bitonClient = require('../')
const express = require('express')
const http = require('http')
const pug = require('pug')

const PORT = process.env.PORT || 5000
const HOST = '127.0.0.1'

console.log('biton webtorrent-hybrid client')

let client = new bitonClient()

// Setup express behind the http module
let app = express()
let server = http.createServer(app)

// Serve static files in the public directory
app.use(express.static(__dirname + "/public"))

// Setup pug for rendering views
app.set('views', __dirname + '/views/')
app.set('view engine', 'pug')
app.engine('pug', pug.renderFile)

app.get('/', function (req, res) {
    res.render('index')
})


server.listen(PORT, HOST, () => {
    console.log('HTTP server running at http://%s:%s', server.address().address, server.address().port)
})


/*
* Graceful shutdown. Close active connections. Delete logs and uncompleted chunks
* */

function exitHandler(options, exitCode) {
    console.log('\nDestroying biton wires..')
    if (server.listening) {
        server.close()
        app.close()
    }
    if (!client.destroyed) {
        client.destroy()
    }
    process.exit()
}

// Attach exit handlers
// process.on('exit', exitHandler.bind())
process.on('SIGINT', exitHandler.bind())
process.on('SIGTERM', exitHandler.bind())
process.on('SIGUSR1', exitHandler.bind())
process.on('SIGUSR2', exitHandler.bind())
process.on('uncaughtException', exitHandler.bind())
