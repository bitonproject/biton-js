# The biton overlay network
https://bitonproject.org

### Setup the development environment

Install node.js and npm through the package manager of your operating system ([instructions here](https://nodejs.org/en/download/package-manager/)).
Clone this repository and change to its directory. Then,

```shell
# Install node modules
npm install
```

### Source code structure

  * ```biton-ext.js``` the biton extension
  * ```index.js``` biton hybrid client integrating the biton extension
  * ```bin/biton.js``` CLI and Web interface for the biton hybrid client


### Running biton

```shell
DEBUG=* INFOHASHPREFIX=test node bin/biton.js
```

Or, install the biton hybrid client and make it available with the ```biton```
command (keeps track of your local changes) with: 
```shell
npm init
```

The Web interface is available at ```http://localhost:5000```

### Running in Docker

The Docker files are:

  * ```Dockerfile``` an image for the biton hybrid client
  * ```docker-compose.yml``` a provisioning script for the above image

Build the Docker image and run a container with the name ```biton-hybrid-client```
```shell
docker-compose up --build
```
