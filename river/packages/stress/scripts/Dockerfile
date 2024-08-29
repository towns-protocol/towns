FROM node:20

WORKDIR /app

# Copy all files from the root of the repo
COPY . .

# Enable Corepack and install Yarn
RUN corepack enable

# Set the Yarn version
ENV YARN_VERSION=3.8.0

# Install Yarn globally
RUN corepack prepare yarn@$YARN_VERSION --activate

# Verify Yarn installation
RUN yarn --version

# Set the image name
LABEL org.opencontainers.image.name="stress-local"

# Set the default command (optional)
# CMD ["yarn", "start"]
# Copy CA files from host

# Register CA files
RUN mkdir -p /usr/local/share/ca-certificates && \
    cp /app/river-ca-cert.pem /usr/local/share/ca-certificates/river-ca.crt && \
    update-ca-certificates

# Install uuidgen
RUN apt-get update && apt-get install -y uuid-runtime

# Install Foundry
RUN curl -L https://foundry.paradigm.xyz | bash
RUN /root/.foundry/bin/foundryup

# Add Foundry binaries to PATH
ENV PATH="/root/.foundry/bin:${PATH}"

# Install dependencies
RUN yarn install
RUN yarn build
