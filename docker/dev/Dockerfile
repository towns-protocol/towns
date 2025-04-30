# syntax=docker/dockerfile:1

# To build:
#
#    docker build -t river-dev-container -f docker/dev/Dockerfile .
#
# To run with current repo mounted under /src:
#
#    docker run --rm -v "$(pwd)":/src -w /src -it river-dev-container 

FROM ubuntu:25.04

ENV NODE_VERSION=20

RUN apt-get update

# Intall tzdata non-interactively
RUN ln -fs /usr/share/zoneinfo/America/New_York /etc/localtime
RUN DEBIAN_FRONTEND=noninteractive apt-get install -y tzdata
RUN dpkg-reconfigure --frontend noninteractive tzdata

# Install tools
RUN apt-get install -y wget gnupg2 curl just git net-tools lsof sudo netcat-openbsd

# Install go
RUN apt-get install -y golang=2:1.24~2

# Download Go dependencies
WORKDIR /cache
COPY core/go.mod core/go.sum core/lint.sh ./
RUN go mod download && ./lint.sh --install
WORKDIR /

# Install foundry
RUN curl -L https://foundry.paradigm.xyz | bash
RUN root/.foundry/bin/foundryup

# Install postgres
RUN apt-get install -y postgresql

# Configure PostgreSQL
COPY docker/dev/postgresql.conf /etc/postgresql/17/main/postgresql.conf
COPY docker/dev/pg_hba.conf /etc/postgresql/17/main/pg_hba.conf
RUN chown postgres:postgres /etc/postgresql/17/main/postgresql.conf
RUN chown postgres:postgres /etc/postgresql/17/main/pg_hba.conf

# Initialize credentials and river database during build
COPY docker/dev/init_db.sql /init/init_db.sql
RUN service postgresql start && \
    su postgres -c "psql -v ON_ERROR_STOP=1 -f /init/init_db.sql" && \
    service postgresql stop

# Create dev CA
COPY core/scripts/register-ca.sh /init/register-ca.sh
RUN /init/register-ca.sh

# Install NVM and node
RUN curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.3/install.sh | bash
ENV NVM_DIR=/root/.nvm
RUN bash -c "source $NVM_DIR/nvm.sh && nvm install $NODE_VERSION"
RUN bash -c "source $NVM_DIR/nvm.sh && corepack enable && corepack install -g yarn"
ENV COREPACK_ENABLE_DOWNLOAD_PROMPT=0

# Expose PostgreSQL port
EXPOSE 5433

COPY docker/dev/entrypoint.sh /usr/local/bin/entrypoint.sh
RUN chmod +x /usr/local/bin/entrypoint.sh

ENTRYPOINT ["/usr/local/bin/entrypoint.sh"]
CMD ["/bin/bash"]
