# Docker-compose configuration

Runs Blockscout locally in Docker containers with [docker-compose](https://github.com/docker/compose).

## Building Docker containers from source

```bash
docker-compose up --build
```

This command uses by-default `docker-compose.yml`, which builds the explorer into the Docker image and runs 6 Docker containers:

- Postgres 14.x database, which will be available at port 7432 on localhost.
- Redis database of latest version, which will be available at port 6379 on localhost.
- Blockscout explorer at http://localhost:4000.

and 3 Rust microservices:

- [Smart-contract-verifier](https://github.com/blockscout/blockscout-rs/tree/main/smart-contract-verifier) service, which will be available at port 8150 on the host machine.
- [Sig-provider](https://github.com/blockscout/blockscout-rs/tree/main/sig-provider) service, which will be available at port 8151 on the host machine.
- [Sol2UML visualizer](https://github.com/blockscout/blockscout-rs/tree/main/visualizer) service, which will be available at port 8152 on the host machine.

Note for Linux users: Linux users need to run the local node on http://0.0.0.0/ rather than http://127.0.0.1/

## Configs for different Ethereum clients

All of the configs assume the Ethereum JSON RPC is running at http://localhost:8545.

You can adjust BlockScout environment variables from `./envs/common-blockscout.env`. Descriptions of the ENVs are available in [the docs](https://docs.blockscout.com/for-developers/information-and-settings/env-variables).

## Additional Notes for HNT Devs

- You can start blockscout via a vs-code task `> Tasks: Run Task: Start Local Blockscout`, or via `/scripts/start-local-blockscout.sh`.
- The block explorer won't show anything unless anvil is running on localhost.
- Make sure your filesystem permissions allow shared volumes between your host OS and your docker containers. If you're running this on Mac, you may want to checkout Docker Desktop > Settings > Resources > File Sharing.
- When you start the block explorer for the first time, you may see some transient fatal error logs for a few moments. These are probably because the database is still booting, and the migrations haven't run yet. Just let it sit for 3-5 minutes before you start troubleshooting.
