FROM node:20-alpine

# Install dependencies
RUN apk add --no-cache bash curl git gettext

# Clone the specific release of the repository
RUN git clone --depth 1 --branch v1.2.2 https://github.com/pimlicolabs/alto.git /app

EXPOSE 4337

RUN corepack enable && corepack prepare pnpm@9.11.0 --activate

# Set working directory
WORKDIR /app

# install dependencies
RUN pnpm install

# copy source code
RUN pnpm build

# Copy and substitute environment variables in config
COPY config.local.json /app/config/config.json.template
# RUN envsubst < /app/config/config.json.template > /app/config/config.json


# Set up the CMD to replace environment variables and then start the application
CMD /bin/sh -c "envsubst < /app/config/config.json.template > /app/config/config.json && echo 'Generated config:' && cat /app/config/config.json && /app/alto --config /app/config/config.json"

# # Print the config
# RUN echo "Config:"
# RUN cat /app/config/config.json

# # Set the entrypoint
# ENTRYPOINT ["/app/alto", "--config", "/app/config/config.json"]

# # Allow passing additional arguments
# CMD []