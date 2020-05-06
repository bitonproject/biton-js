const bitonClient = require('../../')

const moment = require('moment')
const P2PGraph = require('p2p-graph')
const prettierBytes = require('prettier-bytes')
const throttle = require('throttleit')

module.exports = function () {
    let graph
    let hero = document.querySelector('#hero')
    let torrent

    // Don't start the demo automatically on mobile.
    if (window.innerWidth <= 899) {
        let beginButton = document.createElement('a')
        beginButton.href = '#'
        beginButton.id = 'begin'
        beginButton.className = 'btn large'
        beginButton.textContent = 'Begin Demo'

        beginButton.addEventListener('click', function onClick () {
            beginButton.removeEventListener('click', onClick, false)
            beginButton.parentNode.removeChild(beginButton)
            beginButton = null

            init()
        })
        hero.appendChild(beginButton)
    } else {
        init()
    }

    function init () {
        // Display video and related information.
        hero.className = 'loading'
        hero = null

        graph = window.graph = new P2PGraph('.torrent-graph')
        graph.add({ id: 'You', name: 'You', me: true })

        // Create client for the test network
        const client = window.client = new bitonClient({private: false, infohashPrefix: 'test'})
        client.on('warning', onWarning)
        client.on('error', onError)

        // Create torrent
        torrent = client.joinRootSwarm({ontorrent: onTorrent})
        torrent.on('wire', onWire)
    }

    const $body = document.body
    const $progressBar = document.querySelector('#progressBar')
    const $numPeers = document.querySelector('#numPeers')
    const $downloaded = document.querySelector('#downloaded')
    const $total = document.querySelector('#total')
    const $remaining = document.querySelector('#remaining')

    function onTorrent () {
        const opts = {
            autoplay: true,
            muted: true
        }

        torrent.on('done', onDone)
        torrent.on('download', throttle(onProgress, 250))
        torrent.on('upload', throttle(onProgress, 250))
        setInterval(onProgress, 5000)
        onProgress()
    }

    function onWire (wire) {
        const id = wire.peerId.toString()
        graph.add({ id: id, name: wire.remoteAddress || 'Unknown' })
        graph.connect('You', id)
        wire.once('close', function () {
            graph.disconnect('You', id)
            graph.remove(id)
        })
    }

    function onProgress () {
        const percent = Math.round(torrent.progress * 100 * 100) / 100
        $progressBar.style.width = percent + '%'
        $numPeers.innerHTML = torrent.numPeers + (torrent.numPeers === 1 ? ' peer' : ' peers')

        $downloaded.innerHTML = prettierBytes(torrent.downloaded)
        $total.innerHTML = prettierBytes(torrent.length)

        let remaining
        if (torrent.done) {
            remaining = 'Done.'
        } else {
            remaining = moment.duration(torrent.timeRemaining / 1000, 'seconds').humanize()
            remaining = remaining[0].toUpperCase() + remaining.substring(1) + ' remaining.'
        }
        $remaining.innerHTML = remaining
    }

    function onDone () {
        $body.className += ' is-seed'
        onProgress()
    }

    function onError (err) {
        if (err) {
            window.alert(err)
            console.error(err)
        }
    }

    function onWarning (err) {
        if (err) {
            console.error(err)
        }
    }
}
