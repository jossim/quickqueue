FROM node:4

MAINTAINER Joseph Simmons 'josephdsimmons@gmail.com'
ENV REFRESHED 2016-02-19
ENV NODE_PATH /usr/local/lib/node_modules/:/usr/local/lib/node_modules/quickqueue/node_modules/
ENV NODE_ENV development
VOLUME ["/opt/app"]
WORKDIR "/opt/app"
ADD package.json /opt/app/package.json
RUN npm install --global
RUN npm install --global lab@"^7.3.0" code@"^2.1.0"
