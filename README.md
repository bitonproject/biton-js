# The biton overlay network
[![travis][travis-image]][travis-url] [![javascript style guide][standard-image]][standard-url]

[travis-image]: https://img.shields.io/travis/bitonproject/biton/master.svg
[travis-url]: https://travis-ci.org/bitonproject/biton
[standard-image]: https://img.shields.io/badge/code_style-standard-brightgreen.svg
[standard-url]: https://standardjs.com


### Bypassing information controls with biton
<https://bitonproject.org>

biton is a decentralized network for bypassing online censorship and
surveillance. It works by relaying requests through other biton users in order
to provide anonymous routing and file sharing. Moreover, it can be deployed over
mesh topologies and community networks, and in that way function during Internet
shutdowns. biton aims to defend against various tactics used by modern censors,
such as protocol fingerprinting, traffic analysis, and bridge enumeration.

Visit <https://demo.bitonproject.org> for a live demo of the Web interface.


### Project structure

Reference implementation of [`biton0_BitTorrent`](https://bitonproject.org/guide/tech/specification.html)
as an extension to [WebTorrent](https://webtorrent.io).
In specific, this package exports [biton-hybrid](biton-hybrid.js) as a Node.js
module which extends [`webtorrent-hybrid`](https://github.com/webtorrent/webtorrent-hybrid)
and can therefore connect to both TCP/uTP and WebRTC nodes.

  *  [`lib/biton-ext.js`](lib/biton-ext.js) the biton extension
  *  [`biton-hybrid.js`](biton-hybrid.js) main module, the biton hybrid node
  using `lib/biton-ext`
  *  [`bin/biton-hybrid-app.js`](bin/biton-hybrid-app.js) command line and Web
  interface for `biton-hybrid`
  *  [`bin/views/entangled.js`](bin/views/entangled.js) entangled Web demo

See [here](https://bitonproject.org/guide/run/) for instructions on how to run
the biton hybrid app on your computer, and [here](https://bitonproject.org/guide/intro/developers.html)
about integrating biton into your own project.

### Disclaimer

**UNDER DEVELOPMENT**. This proof of concept implementation must not be used
besides for simulations.


## Install

### Setup the development environment

Install Node.js and npm through the package manager of your operating system
([instructions here](https://nodejs.org/en/download/package-manager/)). Then,

```shell
# Clone git repository
git clone git@github.com:bitonproject/biton
cd biton

# Install node modules
npm install
```


### Compile browser client resources

```shell
npm run-script build
```

This will compile `views/index.js` and its dependencies into
`bin/public/bundle.js`.


#### biton command (optional)

```shell
npm link

# Now you can start a biton hybrid client by executing
biton
```

This has to be executed once and will keep track of your local modifications
(creates a symlink for `node bin/biton-hybrid-app.js`).


## Usage

### Integrate biton into your Node.js project

Install the biton npm module
```shell
cd MyApp/
npm install --save biton
```

Join biton swarms and listen for events
```js
const biton = require('biton')

const opts = {
  strangers: true,  // Enable peer discovery over the BitTorrent Mainline DHT
  netMagic: 'test'  // Connect to the test network
}
const node = new biton(opts)

// Wait for node to generate a biton identity
node.once('bitonReady', onNodeReady)

// Generate new identity
node.getNewIdentity()

function onNodeReady() {
  // Join the 'MyApp' local network
  const myAppNet= node.joinLocalNet('MyApp')
  // Attach listener for new connections in the 'MyApp' swarm
  myAppNet.on('wire', onMyAppWire)

  // Join the global biton network
  // (recommended unless nodes are behind bandwidth capped connections, e.g. mobile Internet)
  const globalNet = node.joinGlobalNet()
}

// Handle new connections
function onMyAppWire (wire) {
  const peerId = wire.peerId
  const bitonExt = wire._ext.biton

  bitonExt.once('wireNoiseReady', function() {
      console.log('Completed noise handshake with peer %s', peerId)
  })
}
```

### Embedding biton in websites

biton can be bundled into a javascript file that can be embedded into any
website, e.g. with [Browserify](https://browserify.org/) as we do in this
repository.  connect with biton nodes that support WebRTC. For that you can use
For that you will also need to serve
the `.wasm` files, since they are not included in Browserify (as in `bin/public`).

For more information about how to develop applications for biton visit the
[developers guide](https://bitonproject.org/guide/intro/developers.html).


### Running biton Node.js app

Start `bin/biton-hybrid-app.js`. Set `biton*` debug namespace, enable opennet
peer discovery over BitTorrent Mainline DHT, and connect to the global biton
swarm.

```shell
DEBUG=biton* OPENNET=true JOINGLOBAL=true npm start
```

#### Environment variables

| Name         | Purpose                                                          |
|--------------|------------------------------------------------------------------|
| `DEBUG`      | Specify debugging namespaces (e.g. ```biton*```)                 |
| `OPENNET`    | Connect to strangers via Mainline DHT (default `false`)          |
| `JOINGLOBAL` | Join the global biton swarm (default `false`)                    |
| `SWARMSEED`  | Join a biton community swarm (default is the global biton swarm) |
| `NETMAGIC`   | Join independent biton networks (default is the main net)        |
| `PORT`       | The Web interface listening port (default `5000`)                |
| `HOST`       | The Web interface host address (default `127.0.0.1`)             |
| `NODE_ENV=production` | Expose Web interface to public requests                 |

#### Access the local Web interface

The Web interface is listening at <http://localhost:5000>.

If you are accessing a local `biton-hybrid-app` with Firefox and cannot
discover opennet peers, make sure that you are not blocking all third-party
cookies, as this prevents connections to Mainline DHT seed nodes. You can
temporarily whitelist localhost via the shield in the URL address bar
([instructions here](https://support.mozilla.org/kb/enhanced-tracking-protection-firefox-preview#w_turn-protections-onoff-for-individual-sites)).

#### Running in Docker

Build the Docker image and start a container with the name `biton-hybrid-client`
by executing:

```shell
docker-compose up --build
```

The respective files are:

* [`Dockerfile`](Dockerfile) an image for the biton hybrid client
* [`docker-compose.yml`](docker-compose.yml) a provisioning script for the above
image


## License
[BSD 3-Clause](LICENSE)
