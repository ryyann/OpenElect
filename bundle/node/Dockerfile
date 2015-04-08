#
# Dockerfile for node
#

FROM    dockerfile/nodejs-bower-grunt

# Install dependencies
RUN     npm install -g nodemon
ADD package.json /tmp/package.json
RUN cd /tmp && npm install
RUN cp -a /tmp/node_modules /opt/node_modules

WORKDIR /opt/app
ADD . /opt/app

EXPOSE  8080

# CMD		["npm", "start"]
