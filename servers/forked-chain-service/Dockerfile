FROM ghcr.io/foundry-rs/foundry:latest

COPY './run.sh' '/run.sh'

RUN apk add --no-cache curl jq

ENTRYPOINT ["sh", "/run.sh"]