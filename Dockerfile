FROM iojs
MAINTAINER Joseph Simmons 'josephdsimmons@gmail.com'
ENV REFRESHED 2015-07-27
ENV NODE_PATH /usr/local/lib/node_modules/quickqueue/node_modules/
VOLUME ["/opt/app"]
WORKDIR "/opt/app"
ADD package.json /opt/app/package.json
RUN npm install --global
RUN npm install --global mocha
