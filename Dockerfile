FROM node:12.16.2
# Specific node version with pre-built WebRTC binaries

# If using node-alpine install wrtc dependencies
# RUN apk --no-cache add python git ncurses openssl nss expat
# RUN apk --no-cache --allow-untrusted -X https://apkproxy.herokuapp.com/sgerrand/alpine-pkg-glibc add glibc glibc-bin

# Switch to the non-root user node
USER node

ENV NPM_CONFIG_PREFIX=/home/node/.npm-global
ENV PATH=$PATH:/home/node/.npm-global/bin

WORKDIR /home/node

# Install app dependencies
COPY --chown=node:node package*.json ./

RUN npm install
# If you are building your code for production
# RUN npm ci --only=production

# Bundle app source
COPY --chown=node:node . .

RUN npm run-script build

RUN npm link

EXPOSE 5000
CMD [ "biton" ]
