FROM node:16

RUN git clone https://github.com/HereNotThere/eth-infinitism-bundler --branch evan/anvil-compat bundler
# Copy our local config file which contains the correct entrypoint
COPY ./bundler.config.json /bundler/packages/localconfig/bundler.config.json
WORKDIR /bundler

RUN yarn install
RUN yarn preprocess
EXPOSE 4337