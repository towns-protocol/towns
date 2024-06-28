FROM node:18-bookworm-slim

RUN apt-get update && apt-get install -y git nginx python3 python3-pip

COPY contracts/nginx.conf /etc/nginx/nginx.conf

WORKDIR /account-abstraction

RUN git clone --recurse-submodules https://github.com/stackup-wallet/contracts.git .

RUN git fetch && git checkout 8339e2526c2aea85ce1aaa4ed174ba7cbac5c7c8

RUN cp .env.example .env

RUN yarn install

RUN yarn run compile

COPY contracts/run_retry.sh /run_retry.sh

ENTRYPOINT ["/run_retry.sh"]
