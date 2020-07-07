const debug = require('debug')('biton:entangled')
localStorage.debug = 'biton*'

const biton = require('../../')
const bitonCrypto = require('../../lib/crypto')

const P2PGraph = require('p2p-graph')


const STYLE = {
  links: {
    width: 0.7, // default link thickness
    maxWidth: 5.0, // max thickness
    maxBytes: 2097152 // link max thickness at 2MB
  }
}

const COLORS = {
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
  let node, swarm

  // Do not start the demo automatically.
  let $startBtn = document.querySelector('#startBtn')
  const $body = document.body
  let $numPeers = document.querySelector('#numPeers')
  let hero = document.querySelector('#hero')


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
      const self = this

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

      const g = self._node.enter()
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
        .linkDistance(150 * self._scale())
        .start()
    }

    P2PGraph.prototype.swapNoise = function(id) {
      const index = graph._getNodeIndex(id)
      if (index === -1) throw new Error('node does not exist')
      this._model.nodes[index].seeder = !this._model.nodes[index].seeder
      this._update()
    }

    graph = window.graph = new P2PGraph('.torrent-graph')
    graph.add({ id: 'Me', name: shortName(node.peerId), me: true })

    graph.on('select', function (id) {
      if (id !== 'Me') {
        graph.swapNoise(id)
        // Send ping to the selected peer
        debug('sending ping message to peer %s', shortName(id))
        swarm._peers[id].wire.biton.emit('sendPing')
      }
    })

  }

  function init () {
    bitonCrypto.ready(function () {
      // Create client for the test network
      node = window.client = new biton({ opennet: true,  netMagic: 'test' })
      node.on('warning', onWarning)
      node.on('error', onError)

      node.once('newIdentity', onIdentity)
      node.getNewIdentity()

      initGraph()
    })
  }

  function onIdentity () {
    swarm = node.joinRootSwarm('entangled')
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
    self = this
    wire.once('wireNoiseReady', function() {
      debug('peer %s completed noise handshake', shortName(id))
      graph.seed(id, true)
    })
    wire.on('receivedPing', function () {
      debug('peer %s sent ping', shortName(id))
      graph.swapNoise(id)
    })
    wire.once('close', function () {
      graph.disconnect('Me', id)
      graph.remove(id)
      onPeerUpdate()
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
