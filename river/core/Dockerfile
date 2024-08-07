# Start with an Alpine image that includes Go.
# FROM golang:1.22.6-alpine3.20 as builder

# This is a temp hack to get go 1.22.6 while official image is not yet built:
# https://github.com/docker-library/official-images/pull/17316
# once the official image is built, uncomment line above and remove everything to ###########################

FROM alpine:3.20 AS build

ENV PATH /usr/local/go/bin:$PATH

ENV GOLANG_VERSION 1.22.6

RUN set -eux; \
    now="$(date '+%s')"; \
    apk add --no-cache --virtual .fetch-deps \
    ca-certificates \
    gnupg \
    # busybox's "tar" doesn't handle directory mtime correctly, so our SOURCE_DATE_EPOCH lookup doesn't work (the mtime of "/usr/local/go" always ends up being the extraction timestamp)
    tar \
    ; \
    arch="$(apk --print-arch)"; \
    url=; \
    case "$arch" in \
    'x86_64') \
    url='https://dl.google.com/go/go1.22.6.linux-amd64.tar.gz'; \
    sha256='999805bed7d9039ec3da1a53bfbcafc13e367da52aa823cb60b68ba22d44c616'; \
    ;; \
    'armhf') \
    url='https://dl.google.com/go/go1.22.6.linux-armv6l.tar.gz'; \
    sha256='b566484fe89a54c525dd1a4cbfec903c1f6e8f0b7b3dbaf94c79bc9145391083'; \
    ;; \
    'armv7') \
    url='https://dl.google.com/go/go1.22.6.linux-armv6l.tar.gz'; \
    sha256='b566484fe89a54c525dd1a4cbfec903c1f6e8f0b7b3dbaf94c79bc9145391083'; \
    ;; \
    'aarch64') \
    url='https://dl.google.com/go/go1.22.6.linux-arm64.tar.gz'; \
    sha256='c15fa895341b8eaf7f219fada25c36a610eb042985dc1a912410c1c90098eaf2'; \
    ;; \
    'x86') \
    url='https://dl.google.com/go/go1.22.6.linux-386.tar.gz'; \
    sha256='9e680027b058beab10ce5938607660964b6d2c564bf50bdb01aa090dc5beda98'; \
    ;; \
    'ppc64le') \
    url='https://dl.google.com/go/go1.22.6.linux-ppc64le.tar.gz'; \
    sha256='9d99fce3f6f72a76630fe91ec0884dfe3db828def4713368424900fa98bb2bd6'; \
    ;; \
    'riscv64') \
    url='https://dl.google.com/go/go1.22.6.linux-riscv64.tar.gz'; \
    sha256='30be9c9b9cc4f044d4da9a33ee601ab7b3aff4246107d323a79e08888710754e'; \
    ;; \
    's390x') \
    url='https://dl.google.com/go/go1.22.6.linux-s390x.tar.gz'; \
    sha256='82f3bae3ddb4ede45b848db48c5486fadb58551e74507bda45484257e7194a95'; \
    ;; \
    *) echo >&2 "error: unsupported architecture '$arch' (likely packaging update needed)"; exit 1 ;; \
    esac; \
    \
    wget -O go.tgz.asc "$url.asc"; \
    wget -O go.tgz "$url"; \
    echo "$sha256 *go.tgz" | sha256sum -c -; \
    \
    # https://github.com/golang/go/issues/14739#issuecomment-324767697
    GNUPGHOME="$(mktemp -d)"; export GNUPGHOME; \
    # https://www.google.com/linuxrepositories/
    gpg --batch --keyserver keyserver.ubuntu.com --recv-keys 'EB4C 1BFD 4F04 2F6D DDCC  EC91 7721 F63B D38B 4796'; \
    # let's also fetch the specific subkey of that key explicitly that we expect "go.tgz.asc" to be signed by, just to make sure we definitely have it
    gpg --batch --keyserver keyserver.ubuntu.com --recv-keys '2F52 8D36 D67B 69ED F998  D857 78BD 6547 3CB3 BD13'; \
    gpg --batch --verify go.tgz.asc go.tgz; \
    gpgconf --kill all; \
    rm -rf "$GNUPGHOME" go.tgz.asc; \
    \
    tar -C /usr/local -xzf go.tgz; \
    rm go.tgz; \
    \
    # save the timestamp from the tarball so we can restore it for reproducibility, if necessary (see below)
    SOURCE_DATE_EPOCH="$(stat -c '%Y' /usr/local/go)"; \
    export SOURCE_DATE_EPOCH; \
    touchy="$(date -d "@$SOURCE_DATE_EPOCH" '+%Y%m%d%H%M.%S')"; \
    # for logging validation/edification
    date --date "@$SOURCE_DATE_EPOCH" --rfc-2822; \
    # sanity check (detected value should be older than our wall clock)
    [ "$SOURCE_DATE_EPOCH" -lt "$now" ]; \
    \
    if [ "$arch" = 'armv7' ]; then \
    [ -s /usr/local/go/go.env ]; \
    before="$(go env GOARM)"; [ "$before" != '7' ]; \
    { \
    echo; \
    echo '# https://github.com/docker-library/golang/issues/494'; \
    echo 'GOARM=7'; \
    } >> /usr/local/go/go.env; \
    after="$(go env GOARM)"; [ "$after" = '7' ]; \
    # (re-)clamp timestamp for reproducibility (allows "COPY --link" to be more clever/useful)
    touch -t "$touchy" /usr/local/go/go.env /usr/local/go; \
    fi; \
    \
    # ideally at this point, we would just "COPY --link ... /usr/local/go/ /usr/local/go/" but BuildKit insists on creating the parent directories (perhaps related to https://github.com/opencontainers/image-spec/pull/970), and does so with unreproducible timestamps, so we instead create a whole new "directory tree" that we can "COPY --link" to accomplish what we want
    mkdir /target /target/usr /target/usr/local; \
    mv -vT /usr/local/go /target/usr/local/go; \
    ln -svfT /target/usr/local/go /usr/local/go; \
    touch -t "$touchy" /target/usr/local /target/usr /target; \
    \
    apk del --no-network .fetch-deps; \
    \
    # smoke test
    go version; \
    # make sure our reproducibile timestamp is probably still correct (best-effort inline reproducibility test)
    epoch="$(stat -c '%Y' /target/usr/local/go)"; \
    [ "$SOURCE_DATE_EPOCH" = "$epoch" ]; \
    find /target -newer /target/usr/local/go -exec sh -c 'ls -ld "$@" && exit "$#"' -- '{}' +

FROM alpine:3.20 as builder

RUN apk add --no-cache ca-certificates

ENV GOLANG_VERSION 1.22.6

# don't auto-upgrade the gotoolchain
# https://github.com/docker-library/golang/issues/472
ENV GOTOOLCHAIN=local

ENV GOPATH /go
ENV PATH $GOPATH/bin:/usr/local/go/bin:$PATH
# (see notes above about "COPY --link")
COPY --from=build --link /target/ /
RUN mkdir -p "$GOPATH/src" "$GOPATH/bin" && chmod -R 1777 "$GOPATH"
WORKDIR $GOPATH

########################### end of temp hack


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
    -ldflags="-X github.com/river-build/river/core/river_node/version.version=$VER_VERSION -X github.com/river-build/river/core/river_node/version.branch=$VER_BRANCH -X github.com/river-build/river/core/river_node/version.commit=$VER_COMMIT" \
    ./river_node

# Final stage
FROM alpine:latest
LABEL org.opencontainers.image.title="River Node" \
    org.opencontainers.image.description="River Node reference implementation, written in Go" \
    org.opencontainers.image.source="https://github.com/river-build/river" \
    org.opencontainers.image.licenses="MIT"

# Install dependencies
RUN apk add --no-cache libcap supervisor && \
    adduser -D riveruser

COPY docker/run.sh /etc/run.sh
COPY docker/full_node.supervisord.conf /etc/full_node.supervisord.conf
COPY docker/archive_node.supervisord.conf /etc/archive_node.supervisord.conf
COPY --from=builder /bin/river_node /usr/bin/river_node

# Use setcap to allow the web server binary to bind to privileged ports
RUN setcap 'cap_net_bind_service=+ep' /usr/bin/river_node

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
