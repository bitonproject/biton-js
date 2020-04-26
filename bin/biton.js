#!/usr/bin/env node

const bitonClient = require('../')
const express = require('express')
const pug = require('pug')

const PORT = process.env.PORT || 5000
const HOST = '0.0.0.0'

console.log('biton webtorrent-hybrid client')

let client = new bitonClient()
const app = express()

app.get('/', (request, response) => {
    response.send(pug.render('p Hello world!'))
})

app.listen(PORT, () => {
    console.log('HTTP server running at ' + HOST + ':' + PORT)
})


/*
* Graceful shutdown. Close active connections. Delete logs and uncompleted chunks
* */

function exitHandler(options, exitCode) {
    console.log('\nDestroying biton wires..')
    if (app.listening) {
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
