FROM node:latest

# Switch to the non-root user node
USER node

ENV NPM_CONFIG_PREFIX=/home/node/.npm-global
ENV PATH=$PATH:/home/node/.npm-global/bin

WORKDIR /home/node

# Install app dependencies
COPY --chown=node:node package*.json ./

RUN npm install --dev
# If you are building your code for production
# RUN npm ci --only=production

# Bundle app source
COPY --chown=node:node . .

RUN npm build

RUN npm link

EXPOSE 5000
CMD [ "biton" ]
