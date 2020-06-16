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


### Project structure

This repository hosts the implementation of `biton0_BitTorrent` as an extension
to [WebTorrent](https://webtorrent.io), divided into the following modules:

  *  [`lib/biton-ext.js`](lib/biton-ext.js) the biton extension
  *  [`biton-hybrid.js`](biton-hybrid.js) biton hybrid client integrating the
  biton extension
  *  [`bin/biton-hybrid-app.js`](bin/biton-hybrid-app.js) command
  line and Web interface for the biton hybrid client
  *  [`bin/views/entangled.js`](bin/views/entangled.js) entangled Web demo


### Disclaimer

This proof of concept implementation is under development and must not be used
besides for simulations.


## Install

### Setup the development environment

Install node.js and npm through the package manager of your operating system
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

### Running biton-hybrid-app

```shell
DEBUG=biton* NETMAGIC=test npm start
```

The Web interface is listening at <http://localhost:5000>. `biton-hybrid`
clients are extending `webtorrent-hybrid` and can connect to both TCP/uTP and
WebRTC nodes.


### Environment variables

| Name      | Purpose                                         |
|-----------|-------------------------------------------------|
| `SWARMSEED` | Join biton swarms (e.g. `orbit#biton`).   |
| `NETMAGIC` | Join demo biton networks.                      |
| `HOST`    | The Web interface host address.                 |
| `PORT`    | The Web interface listening port.               |
| `DEBUG`   | Enables/disables specific debugging namespaces. |
| `NODE_ENV` | If `production` bind to `HOST` or `0.0.0.0`    |


### Running biton-browser

You can spawn a biton browser client in the network with the infoHash prefix
`test` by visiting <http://localhost:5000/biton-browser>. Each tab is an
independent biton client, so you can open multiple tabs for simulating a swarm
of peers.

If you are visiting a local `biton-hybrid-app` with Firefox, make sure that you
are not blocking all third-party cookies (custom enhanced tracking protection),
as this prevents connections to BitTorrent trackers. You can whitelist localhost
via the shield in the URL address bar
([instructions here](https://support.mozilla.org/kb/enhanced-tracking-protection-firefox-preview#w_turn-protections-onoff-for-individual-sites)).


### Running in Docker

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
