FROM docker.io/golang:1.21-bookworm

# Install core binaries
RUN apt-get update
RUN apt-get upgrade -y
RUN apt-get install -y nodejs bash git npm curl protobuf-compiler python3 python3-pip make

# Python config
RUN pip3 install --break-system-packages --no-cache --upgrade pip setuptools

# Install buf
RUN GO111MODULE=on GOBIN=/usr/local/bin go install \
    github.com/bufbuild/buf/cmd/buf@v1.28.1

# Install yarn
RUN npm install -g corepack
RUN corepack enable
RUN yarn set version 3.5.1

# Copy files
COPY . /monorepo

WORKDIR /monorepo

RUN yarn
RUN yarn csb:build

ENV MONOREPO_ROOT=/monorepo

ENTRYPOINT [ "./servers/load-testing/scripts/start-node.sh" ]
