FROM node:18-bookworm-slim

RUN apt-get update && apt-get install -y git nginx python3 python3-pip

COPY contracts/nginx.conf /etc/nginx/nginx.conf

WORKDIR /account-abstraction

RUN git clone https://github.com/eth-infinitism/account-abstraction.git .

RUN git checkout v0.6.0

RUN yarn install

RUN yarn run compile

COPY contracts/run_retry.sh /run_retry.sh

ENTRYPOINT ["/run_retry.sh"]
