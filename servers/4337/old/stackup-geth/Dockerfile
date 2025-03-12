# This Dockerfile runs builds the geth client with stackup's native tracers and changes the chain id for dev mode to 31337
FROM golang:1.21-alpine

RUN apk update && \
    apk add --no-cache git make gcc libc-dev linux-headers

WORKDIR /app

RUN git clone https://github.com/stackup-wallet/erc-4337-execution-client-builder.git

WORKDIR /app/erc-4337-execution-client-builder

RUN git checkout 5fecc3ab35c8fea1f8f1164ed897615e69271711

RUN git submodule update --init go-ethereum

RUN sed 's/(1337)/(31337)/g' go-ethereum/params/config.go > /tmp/config.tmp && mv /tmp/config.tmp go-ethereum/params/config.go

RUN sh build_scripts/go-ethereum.sh

ENTRYPOINT [ "builds/go-ethereum/geth" ]