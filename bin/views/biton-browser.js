const debug = require('debug')('biton:browser')
localStorage.debug = 'biton*'

const bitonClient = require('../../')
const bitonCrypto = require('../../lib/crypto')

const moment = require('moment')
const P2PGraph = require('p2p-graph')
const prettierBytes = require('prettier-bytes')
const throttle = require('throttleit')


var STYLE = {
  links: {
    width: 0.7, // default link thickness
    maxWidth: 5.0, // max thickness
    maxBytes: 2097152 // link max thickness at 2MB
  }
}

var COLORS = {
  links: {
    color: '#C8C8C8'
  },
  text: {
    subtitle: '#C8C8C8'
  },
  nodes: {
    method: function (d, i) {
      return d.me
        ? '#F1E116' // yellow
        : d.seeder
          ? '#10C284' // green
          : '#1D87CB' // blue
    },
    hover: '#A9A9A9',
    dep: '#252929'
  }
}

module.exports = function () {
  let graph
  let hero = document.querySelector('#hero')

  const $log = document.querySelector('#clientLog')

  let client, torrent

  // Don't start the demo automatically.
  let $startBtn = document.querySelector('#startBtn')

  $startBtn.addEventListener('click', function onClick () {
    $startBtn.removeEventListener('click', onClick, false)
    $startBtn.parentNode.removeChild($startBtn)
    $startBtn = null

    init()
  })

  function initGraph() {
    // Display video and related information.
    hero.className = 'loading'
    hero = null

    P2PGraph.prototype._update = function () {
      var self = this

      self._link = self._link.data(self._model.links)
      self._node = self._node.data(self._model.nodes, function (d) {
        return d.id
      })

      self._link.enter()
        .insert('line', '.node')
        .attr('class', 'link')
        .style('stroke', COLORS.links.color)
        .style('opacity', 0.5)

      self._link
        .exit()
        .remove()

      self._link.style('stroke-width', function (d) {
        // setting thickness
        return d.rate
          ? d.rate < STYLE.links.width ? STYLE.links.width : d.rate
          : STYLE.links.width
      })

      var g = self._node.enter()
        .append('g')
        .attr('class', 'node')

      g.append('circle')
        .on('click', function (d) {
          if (!d) return
          self._model.focused = d
          self.emit('select', d.id)
        })

      self._node
        .select('circle')
        .attr('r', function (d) {
          return self._scale() * (d.me ? 15 : 10)
        })
        .style('fill', COLORS.nodes.method)

      g.append('text')
        .attr('class', 'text')
        .text(function (d) {
          return d.name
        })

      self._node
        .select('text')
        .attr('font-size', function (d) {
          return d.me ? 16 * self._scale() : 12 * self._scale()
        })
        .attr('dx', 0)
        .attr('dy', function (d) {
          return d.me ? -22 * self._scale() : -15 * self._scale()
        })

      self._node
        .exit()
        .remove()

      self._force
        .linkDistance(100 * self._scale())
        .charge(-200 * self._scale())
        .start()
    }

    P2PGraph.prototype.swapNoise = function(id) {
      const index = graph._getNodeIndex(id)
      if (index === -1) throw new Error('node does not exist')
      this._model.nodes[index].seeder = !this._model.nodes[index].seeder
      this._update()
    }

    graph = window.graph = new P2PGraph('.torrent-graph')
    graph.add({ id: 'Me', name: 'Me ' + Buffer.from(client.peerId, 'hex').toString('utf-8'), me: true })

    graph.on('select', function (id) {
      if (!id) return // deselected a node
      graph.swapNoise(id)
      torrent._peers[id].wire.biton.emit('sendPing')
    })

  }

  function init () {
    bitonCrypto.ready(function () {
      // Create client for the test network
      client = window.client = new bitonClient({ private: false, netMagic: 'test' })
      client.on('warning', onWarning)
      client.on('error', onError)

      client.on('newIdentity', onIdentity)
      client.getNewIdentity()

      initGraph()
    })
  }

  function onIdentity () {
    torrent = client.joinGlobalSwarm({}, onTorrent)
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
    graph.add({ id: id, name: Buffer.from(wire.peerId, 'hex').toString() || 'Unknown' })
    graph.connect('Me', id)
    onPeerUpdate()
    self = this
    wire.once('wireNoiseReady', function() {
      debug('peer %s completed noise handshake', id)
      graph.seed(id, true)
    })
    wire.on('receivedPing', function () {
      graph.swapNoise(id)
    })
    wire.once('close', function () {
      graph.disconnect('Me', id)
      graph.remove(id)
      onPeerUpdate()
    })
  }

  function onPeerUpdate () {
    $numPeers.innerHTML = torrent.numPeers + (torrent.numPeers === 1 ? ' peer' : ' peers')
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
