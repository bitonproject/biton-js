const debug = require('debug')('biton:entangled')
localStorage.debug = 'biton*'

const biton = require('../../biton-hybrid')
const bitonCrypto = require('../../lib/crypto')

const P2PGraph = require('./p2p-graph')

module.exports = function () {
  let graph
  let node, swarm

  // Do not start the demo automatically.
  let $startBtn = document.querySelector('#startBtn')
  let $numPeers = document.querySelector('#numPeers')
  let $hero = document.querySelector('#hero')


  $startBtn.addEventListener('click', function onClick () {
    $startBtn.removeEventListener('click', onClick, false)
    $startBtn.parentNode.removeChild($startBtn)
    $startBtn = null

    init()
  })

  function initGraph() {
    // Display video and related information.
    $hero.className = 'loading'
    $hero = null

    graph = window.graph = new P2PGraph('.torrent-graph')
    graph.add({ id: 'Me', name: shortName(node.peerId), me: true })

    graph.on('select', function (id) {
      if (id !== 'Me') {
        graph.swapColor(id)
        // Send ping to the selected peer
        debug('sending ping message to peer %s', shortName(id))
        swarm._peers[id].wire.biton.sendPing()
      }
    })

  }

  function init () {
    bitonCrypto.ready(function (identity) {
      // Create node for the test network
      node = window.node = new biton({ strangers: true,  netMagic: 'test' })
      node.on('warning', onWarning)
      node.on('error', onError)

      node.once('bitonReady', onbitonReady)
      node.getNewIdentity()

      initGraph()
    })
  }

  function onbitonReady () {
    swarm = node.joinLocalNet('entangled')
    swarm.on('wire', onWire)
  }

  function shortName (peerId) {
    return Buffer.from(peerId, 'hex').subarray(9, 20).toString('utf-8')
  }

  function onWire (wire) {
    const id = wire.peerId.toString()

    graph.add({ id: id, name: shortName(id) || 'Unknown' })
    graph.connect('Me', id)
    onPeerUpdate()

    wire.once('close', function () {
      graph.disconnect('Me', id)
      graph.remove(id)
      onPeerUpdate()
    })

    wire._ext.biton.once('noiseReady', function() {
      debug('peer %s completed noise handshake', shortName(id))
    })
    wire._ext.biton.on('ping', function () {
      debug('peer %s sent ping', shortName(id))
      graph.swapColor(id)
    })
  }

  function onPeerUpdate () {
    $numPeers.innerHTML = swarm.numPeers + (swarm.numPeers === 1 ? ' peer' : ' peers')
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
