FROM node:8

MAINTAINER Joseph Simmons 'josephdsimmons@gmail.com'
ENV REFRESHED 2017-12-11
ENV NODE_PATH /usr/local/lib/node_modules/:/usr/local/lib/node_modules/quickqueue/node_modules/
ENV NODE_ENV development
VOLUME ["/opt/app"]
WORKDIR "/opt/app"
ADD package.json /opt/app/package.json
RUN npm install --global
RUN npm install --global lab@"^13.0.1" code@"^4.0.0"
