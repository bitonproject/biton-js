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
          ? '#8A2BE2' // blueviolet
          : '#00BFFF' // deepskyblue
    },
    hover: '#A9A9A9',
    dep: '#252929'
  }
}


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

P2PGraph.prototype.swapColor = function(id) {
  const index = graph._getNodeIndex(id)
  if (index === -1) throw new Error('node does not exist')
  this._model.nodes[index].seeder = !this._model.nodes[index].seeder
  this._update()
}

module.exports = P2PGraph
