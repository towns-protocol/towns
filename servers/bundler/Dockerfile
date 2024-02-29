FROM node:16

RUN git clone https://github.com/eth-infinitism/bundler.git bundler
WORKDIR /bundler

RUN yarn install
# Copy our local config file which contains the correct entrypoint
COPY ./bundler.config.json /bundler/packages/bundler/localconfig/bundler.config.json
RUN yarn preprocess
EXPOSE 4337