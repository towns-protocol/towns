FROM docker.io/golang:1.20-alpine AS base

RUN apk --update --no-cache add bash build-base

WORKDIR /build

COPY go.mod ./
COPY go.sum ./
RUN go mod download

COPY . /build

RUN mkdir -p bin
RUN go build -trimpath -o bin/ ./node/

FROM alpine:latest

LABEL org.opencontainers.image.title="Towns Protocol (Node)"
LABEL org.opencontainers.image.description="Towns Protocol Node reference implementation, written in Go"
LABEL org.opencontainers.image.source="https://github.com/HereNotThere/harmony"
LABEL org.opencontainers.image.licenses="Apache-2.0"

COPY --from=base /build/bin/* /usr/bin/

# TODO: this is only temporary. we can't be using our dev.yaml configuration inside the dockerfile.
# next step should be moving to environment variables.
COPY --from=base /build/dev.yaml /usr/etc/config.yaml

ENTRYPOINT /usr/bin/node run \
    --config /usr/etc/config.yaml \
    --log_level info \
    --log_file /var/log/casablanca.log \
    --events_file /var/log/casablanca_events.log 
