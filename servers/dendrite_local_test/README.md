# Run local dendirete test server

Build dendrite:

```bash
./build.sh
```

Modify `vars.env` and `dendrite.yaml` as desired and deploy:

```bash
./deploy.sh
```

Run all dendrites in background:

```bash
./run_all.sh
```

Stop all dendrites runnign in background:

```bash
./stop_all.sh
```

Run single dendrite number N in foreground:

```bash
./run_single.sh 0
```

Delete deployment:

```bash
./clean.sh 0
```

### DOCKER COMPOSE ###

# Instructions

- Before trying anything, make sure you allow your Docker daemon to connect to the volumes specified in `docker-compose.yml`. For example on Docker Desktop (for Mac), you should go to Settings > Resources > File Sharing and add the absolute path of the following directory in there: `harmony/servers/dendrite_local_test/volumes`. **make sure** you add the **absolute** path.

- Run `./scripts/cert-and-key-gen.sh` to generate `server.crt`, `server.key` and `matrix_key.pem`. These files will be placed under `volumes/dendrite/config`.

- run `docker-compose up` to start dendrite with postgres

- If you want to simulate what's on production, comment out the "LOCAL DEV CONFIGURATION" section under docker-compose.yml, and uncomment the "PROD-LIKE CONFIGURATION" section. And grab the docker image version you want to run, and replace the docker-compose.yml `image` field with it.

- If you want ~Start Local Dev~ to be run with this alternative docker-compose setup, go to `.vscode/tasks.json`, uncomment `"Dendrite (from docker compose)"` and comment out `"Dendrite (from source)"`. Then run `~Start Local Dev~` as you normally would.