FROM node:20

WORKDIR /app

# Copy all files from the root of the repo
COPY . .

# Enable Corepack and install Pnpm
RUN corepack enable

ENV PNPM_VERSION=10.7.1
# Install pnpm v10.7 using corepack
RUN corepack prepare pnpm@$PNPM_VERSION --activate

# Verify pnpm installation
RUN pnpm --version

# Set the image name
LABEL org.opencontainers.image.name="stress-local"

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
RUN pnpm install
RUN pnpm build
