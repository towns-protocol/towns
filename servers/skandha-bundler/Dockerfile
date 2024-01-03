# do not go higher than 18
FROM node:18

RUN git clone https://github.com/etherspot/skandha.git bundler
WORKDIR /bundler

RUN yarn install
RUN yarn build && yarn bootstrap
# Copy our local config file which contains the correct entrypoint
COPY ./config.json /bundler/config.json
EXPOSE 14337