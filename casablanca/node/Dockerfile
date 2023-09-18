FROM docker.io/golang:1.20-alpine AS base

RUN apk --update --no-cache add bash build-base

WORKDIR /build

COPY go.mod ./
COPY go.sum ./
RUN go mod download

COPY . ./

RUN mkdir -p bin
RUN go build -trimpath -o bin/ ./node/

ARG INSTANCE="docker-docker-single"

# TODO: This is not production ready.
# This line generates keys for the node.
# We will revisit this in the future before
# our beta release.

# TODO: we should also simplify this config script so
# that we don't have to pass "Null" to values we don't need.
RUN SKIP_GENKEY=true ./config_instance.sh docker-single \
    RPC_PORT 5157 \
    DB_PORT null \
    USE_CONTRACT true \
    METRICS_ENABLED false \
    METRICS_PORT null \
    LOG_NOCOLOR true \
    LOG_LEVEL info \
    NODE_REGISTRY ../node_registry.json

FROM alpine:latest

LABEL org.opencontainers.image.title="River Node"
LABEL org.opencontainers.image.description="River Node reference implementation, written in Go"
LABEL org.opencontainers.image.source="https://github.com/HereNotThere/harmony"
LABEL org.opencontainers.image.licenses="Apache-2.0"

COPY --from=base /build/bin/* /usr/bin/
COPY --from=base /build/run_files/docker-single /usr/config/run_files/docker-single
COPY --from=base /build/run_docker.sh /usr/bin/run_docker.sh

# ENV VARS FOR REFERENCE
#
# PORT 
# DBURL 
# CHAIN__CHAINID 
# CHAIN__NETWORKURL
# METRICS__ENABLED
# METRICS__PORT
# LOG__LEVEL
# LOG__NOCOLOR
# LOG__FORMAT

# This allows us to set the release version to anything, such as a commit hash, at build time.
ARG RELEASE_VERSION="Unreleased"
ENV RELEASE_VERSION=${RELEASE_VERSION}

WORKDIR /usr/config/run_files/docker-single
ENTRYPOINT [ "sh", "/usr/bin/run_docker.sh" ]
