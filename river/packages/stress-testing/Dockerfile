FROM docker.io/golang:1.22.2-bookworm

# Install curl and software-properties-common, necessary for adding repositories
RUN apt-get update && apt-get install -y curl software-properties-common gnupg2

# Add the NodeSource Node.js 20.x repo for Debian-based distributions
RUN curl -fsSL https://deb.nodesource.com/setup_20.x | bash -

# Now install Node.js (which includes npm) and other dependencies
RUN apt-get update && apt-get install -y \
    nodejs \
    bash \
    git \
    curl \
    protobuf-compiler \
    python3 \
    python3-pip \
    make \
    uuid-runtime \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# Python config
RUN pip3 install --break-system-packages --no-cache --upgrade pip setuptools

# Install buf
RUN GO111MODULE=on GOBIN=/usr/local/bin go install \
    github.com/bufbuild/buf/cmd/buf@v1.28.1

# Install yarn
RUN npm install -g corepack@0.24.1
RUN corepack enable
RUN yarn set version 3.5.1

# Copy files
COPY . /monorepo

WORKDIR /monorepo

RUN yarn
RUN yarn csb:build

ENV MONOREPO_ROOT=/monorepo

ENTRYPOINT [ "./packages/stress-testing/scripts/start-node.sh" ]
