# Start with an Alpine image that includes Go.
FROM golang:1.21-alpine as builder

# Install build-base for GCC (C compiler and related tools), git, and other dependencies.
# Install libsecp256k1-dev if available or compile it from source.
RUN apk add --no-cache build-base git libsecp256k1-dev

ARG VER_VERSION=version_unset
ARG VER_BRANCH=branch_unset
ARG VER_COMMIT=commit_unset

# Build node_app
WORKDIR /build/node
COPY node/go.* /build/node/
RUN go mod download
COPY node/ /build/node/
RUN go build \
    -trimpath \
    -o /bin/stream_node \
    -ldflags="-X github.com/river-build/river/core/node/node/version.version=$VER_VERSION -X github.com/river-build/river/core/node/node/version.branch=$VER_BRANCH -X github.com/river-build/river/core/node/node/version.commit=$VER_COMMIT" \
    ./node

# Build xchain_app
WORKDIR /build/xchain
COPY xchain/go.* /build/xchain/xchain/
COPY node/ /build/xchain/node/
RUN cd xchain && go mod download
COPY xchain/ /build/xchain/xchain/
RUN cd xchain && go build -trimpath -o /bin/xchain_node ./node

# Final stage
FROM alpine:latest
LABEL org.opencontainers.image.title="River Node" \
    org.opencontainers.image.description="River Node reference implementation, written in Go" \
    org.opencontainers.image.source="https://github.com/river-build/river-stage" \
    org.opencontainers.image.licenses="Apache-2.0"

# Install dependencies
RUN apk add --no-cache libcap supervisor && \
    adduser -D riveruser

COPY supervisord.conf /etc/supervisord.conf
COPY --from=builder /bin/stream_node /usr/bin/stream_node
COPY --from=builder /bin/xchain_node /usr/bin/xchain_node

# Use setcap to allow the web server binary to bind to privileged ports
RUN setcap 'cap_net_bind_service=+ep' /usr/bin/stream_node

COPY --from=builder /build/node/default_config.yaml /riveruser/stream_node/config/config.yaml
COPY --from=builder /build/xchain/xchain/default_config.yaml /riveruser/xchain_node/config/config.yaml

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
ARG RELEASE_VERSION="Unreleased"
ARG DD_GIT_REPOSITORY_URL="https://github.com/river-build/river-stage"

ENV RELEASE_VERSION=${RELEASE_VERSION} \
    DD_GIT_REPOSITORY_URL=${DD_GIT_REPOSITORY_URL} \
    DD_GIT_COMMIT_SHA=${GIT_SHA}

CMD ["/usr/bin/supervisord", "-c", "/etc/supervisord.conf"]
