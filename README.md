# The biton overlay network
https://bitonproject.org

### Setup the development environment

Install node.js and npm through the package manager of your Operating System.
Clone this repository and switch to its directory in your machine. Then,

```shell
# Install node modules
npm install
```

### Source code structure

  * ```biton-ext.js``` the biton extension
  * ```index.js``` biton hybrid client integrating the biton extension
  * ```bin/biton.js``` CLI interface for the biton hybrid client


### Running biton

```shell
DEBUG=* node bin/biton.js
```

Or, install the biton hybrid client and make it available with the ```biton```
command (keeps track of your local changes) with: 
```shell
npm init
```

### Running biton in Docker

The Docker files are:

  * ```Dockerfile``` an image for the biton hybrid client
  * ```docker-compose.yml``` a provisioning script for the above image


```shell
docker-compose up --build
```
