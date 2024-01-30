FROM alpine:latest

COPY './register-public-ip.sh' '/register-public-ip.sh'

RUN apk add --no-cache curl jq aws-cli

ENTRYPOINT ["sh", "/register-public-ip.sh"]