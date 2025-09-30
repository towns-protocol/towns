# Start with an Alpine image that includes Go.
FROM golang:1.25.1-alpine AS builder

# Install build-base for GCC (C compiler and related tools), git, and other dependencies.
# Install libsecp256k1-dev if available or compile it from source.
RUN apk add --no-cache build-base git libsecp256k1-dev

ARG VER_VERSION=version_unset
ARG VER_BRANCH=branch_unset
ARG VER_COMMIT=commit_unset

# Prepare build environment
WORKDIR /build
COPY . .
RUN go mod download

# Build river_node
WORKDIR /build
RUN go build \
    -trimpath \
    -o /bin/river_node \
    -ldflags="-X github.com/towns-protocol/towns/core/river_node/version.version=$VER_VERSION -X github.com/towns-protocol/towns/core/river_node/version.branch=$VER_BRANCH -X github.com/towns-protocol/towns/core/river_node/version.commit=$VER_COMMIT" \
    ./river_node

RUN go build \
    -trimpath \
    -o /bin/river_node_race \
    -race \
    -ldflags="-X github.com/towns-protocol/towns/core/river_node/version.version=$VER_VERSION -X github.com/towns-protocol/towns/core/river_node/version.branch=$VER_BRANCH -X github.com/towns-protocol/towns/core/river_node/version.commit=$VER_COMMIT" \
    ./river_node

# Final stage
FROM alpine:latest
LABEL org.opencontainers.image.title="River Node" \
    org.opencontainers.image.description="River Node reference implementation, written in Go" \
    org.opencontainers.image.source="https://github.com/towns-protocol/towns" \
    org.opencontainers.image.licenses="MIT"

# Install dependencies
RUN apk add --no-cache libcap curl libgcc
RUN adduser -D riveruser

COPY docker/run.sh /etc/run.sh
COPY --from=builder /bin/river_node /usr/bin/river_node
COPY --from=builder /bin/river_node_race /usr/bin/river_node_race
COPY --from=builder /build/env /riveruser/river_node/env

# Use setcap to allow the web server binary to bind to privileged ports
RUN setcap 'cap_net_bind_service=+ep' /usr/bin/river_node
RUN setcap 'cap_net_bind_service=+ep' /usr/bin/river_node_race

COPY --from=builder /build/node/default_config.yaml /riveruser/river_node/config/config.yaml

RUN mkdir -p /riveruser/river_node/logs
RUN chown riveruser:riveruser /riveruser/river_node/logs

# Set non-root user
USER riveruser

# Environment variables setup
ARG GIT_SHA
ARG DD_GIT_REPOSITORY_URL="https://github.com/towns-protocol/towns"

ENV DD_GIT_REPOSITORY_URL=${DD_GIT_REPOSITORY_URL} \
    DD_GIT_COMMIT_SHA=${GIT_SHA}

CMD ["sh", "/etc/run.sh"]
