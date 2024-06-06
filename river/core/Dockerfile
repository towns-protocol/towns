# Start with an Alpine image that includes Go.
FROM golang:1.22.2-alpine3.19 as builder

# Install build-base for GCC (C compiler and related tools), git, and other dependencies.
# Install libsecp256k1-dev if available or compile it from source.
RUN apk add --no-cache build-base git libsecp256k1-dev

ARG VER_VERSION=version_unset
ARG VER_BRANCH=branch_unset
ARG VER_COMMIT=commit_unset

# Prepare build environment
WORKDIR /build
COPY node node
COPY xchain xchain
COPY go.* .
RUN go mod download

# Build stream_node
WORKDIR /build/node
RUN go build \
    -trimpath \
    -o /bin/stream_node \
    -ldflags="-X github.com/river-build/river/core/node/node/version.version=$VER_VERSION -X github.com/river-build/river/core/node/node/version.branch=$VER_BRANCH -X github.com/river-build/river/core/node/node/version.commit=$VER_COMMIT" \
    ./node

# Build xchain_node
WORKDIR /build/xchain
RUN go build -trimpath -o /bin/xchain_node ./node

# Final stage
FROM alpine:latest
LABEL org.opencontainers.image.title="River Node" \
    org.opencontainers.image.description="River Node reference implementation, written in Go" \
    org.opencontainers.image.source="https://github.com/river-build/river" \
    org.opencontainers.image.licenses="MIT"

# Install dependencies
RUN apk add --no-cache libcap supervisor && \
    adduser -D riveruser

COPY run.sh /etc/run.sh
COPY full_node.supervisord.conf /etc/full_node.supervisord.conf
COPY archive_node.supervisord.conf /etc/archive_node.supervisord.conf
COPY --from=builder /bin/stream_node /usr/bin/stream_node
COPY --from=builder /bin/xchain_node /usr/bin/xchain_node

# Use setcap to allow the web server binary to bind to privileged ports
RUN setcap 'cap_net_bind_service=+ep' /usr/bin/stream_node

COPY --from=builder /build/node/default_config.yaml /riveruser/stream_node/config/config.yaml
COPY --from=builder /build/node/default_config.yaml /riveruser/xchain_node/config/config.yaml

RUN mkdir -p /riveruser/stream_node/logs
RUN mkdir -p /riveruser/xchain_node/logs
RUN mkdir -p /riveruser/supervisord/logs
RUN chown riveruser:riveruser /riveruser/stream_node/logs
RUN chown riveruser:riveruser /riveruser/xchain_node/logs
RUN chown riveruser:riveruser /riveruser/supervisord/logs

# Set non-root user
USER riveruser

# Environment variables setup
ARG GIT_SHA
ARG DD_GIT_REPOSITORY_URL="https://github.com/river-build/river"

ENV DD_GIT_REPOSITORY_URL=${DD_GIT_REPOSITORY_URL} \
    DD_GIT_COMMIT_SHA=${GIT_SHA}

CMD ["sh", "/etc/run.sh"]
