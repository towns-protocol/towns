# Instructions

- Before trying anything, make sure you allow your Docker daemon to connect to the volumes specified in `docker-compose.yml`. For example on Docker Desktop (for Mac), you should go to Settings > Resources > File Sharing and add the absolute path of the following directory in there: `harmony/servers/dendrite_docker_compose/volumes`. **make sure** you add the **absolute** path.

- Run `sh ./scripts/cert-and-key-gen.sh` to generate `server.crt`, `server.key` and `matrix_key.pem` files and place them inside `volumes/dendrite/config`. You can also do this manually if you choose to. As long as these files are inside the volume, the server will work.

- run `docker-compose up` to start dendrite with postgres