# The biton overlay network

https://bitonproject.org

biton is a decentralized network for bypassing online censorship and
surveillance. It works by relaying requests through other biton users in order
to provide anonymous routing and file sharing. Moreover, it can be deployed over
mesh topologies and community networks, and in that way function during Internet
shutdowns. biton aims to defend against various tactics used by modern censors,
such as protocol fingerprinting, traffic analysis, and bridge enumeration.


### Project structure

This repository hosts the implementation of biton as an extension to
[WebTorrent](https://webtorrent.io), divided into the following modules:

  * `lib/biton-ext.js` the biton extension
  * `index.js` biton hybrid client integrating the biton extension
  * `bin/biton.js` command line and Web interface for the biton hybrid client
  * `bin/views/biton-browser.js` biton browser client


### Disclaimer

This proof of concept implementation is under development and must not be used
besides for simulations.


## Installation

### Setup the development environment

Install node.js and npm through the package manager of your operating system
([instructions here](https://nodejs.org/en/download/package-manager/)). Then,

```shell
# Fetch git repository
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


## Usage

### Running biton hybrid

```shell
DEBUG=biton* INFOHASHPREFIX=test node bin/biton.js
```

The Web interface is listening at `http://localhost:5000`. You can spawn a
biton browser client in the network with the infoHash prefix `test` by visiting
`http://localhost:5000/biton-browser`. Each tab is an independent biton client,
so you can open multiple tabs for simulating a swarm of peers.


### Environment variables

| Name      | Purpose                                         |
|-----------|-------------------------------------------------|
| `INFOHASHPREFIX` | Join demo biton networks.                |
| `HOST`    | The Web interface host address.                 |
| `PORT`    | The Web interface listening port.               |
| `DEBUG`   | Enables/disables specific debugging namespaces. |


### biton command

```shell
npm link

# Now you can start a biton hybrid client (bin/biton.js) by executing
biton
```

This has to be executed once and will keep track of your local modifications
(creates a symlink for `node ./bin/biton.js`).


### Running in Docker

Build the Docker image and start a container with the name `biton-hybrid-client`
by executing:

```shell
docker-compose up --build
```

The respective files are:

* `Dockerfile` an image for the biton hybrid client
* `docker-compose.yml` a provisioning script for the above image
