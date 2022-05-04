# Overview

The Dendrite server is a subtree ofr our dendrite fork <https://github.com/HereNotThere/dendrite> from the upstream of <https://github.com/matrix-org/dendrite.git>

It was intially populated with:

```bash
git remote add dendrite-fork https://github.com/HereNotThere/dendrite.git
git fetch dendrite-fork
git subtree add --prefix=servers/dendrite dendrite-fork main
```

## Pulling changes from upstream

```bash
git fetch dendrite-fork
git subtree pull --prefix=servers/dendrite dendrite-fork main --squash
```

This command will pull the changes since the last time it ran and create a merge commit on top. Keep in mind that the pulled commits might be older than the latest commit of your code though, so they might not appear directly when you call git log.

## Pushing changes to upstream

There is a fork of <https://github.com/matrix-org/dendrite.git> at <https://github.com/HereNotThere/dendrite.git>. This fork is registerd as a remote named dendrite-fork. To push changes upstream we first push them to this fork, reconcile any changes, and then create a PR to Dendrite from this foork.

The fork was created with this command

```bash
git remote add dendrite-fork https://github.com/HereNotThere/dendrite.git
```

To push to the fork, use this command

```bash
git subtree push --prefix=servers/dendrite dendrite-fork main
```

Further reading about maintaininf the subtree may be found here:

<https://www.atlassian.com/git/tutorials/git-subtree>

## Build and run Dendrite

```bash
cd dendrite

./build.sh

# Generate a Matrix signing key for federation (required)
./bin/generate-keys --private-key matrix_key.pem

# Generate a self-signed certificate (optional, but a valid TLS certificate is normally# needed for Matrix federation/clients to work properly!)
 ./bin/generate-keys --tls-cert server.crt --tls-key server.key

# Copy and modify the config file - you'll need to set a server name and paths to the keys# at the very least, along with setting up the database connection strings.
cp dendrite-config.yaml dendrite.yaml

# update the public key authentication section of the yaml file:

#  # public key authentication
#  public_key_authentication:
#    ethereum:
#      enabled: true
#      version: 1
#      chain_ids: ["4"] # https://chainlist.org/


# Build and run the server:
./bin/dendrite-monolith-server --tls-cert server.crt --tls-key server.key --config dendrite.yaml

```

Then point your favourite Matrix client at <http://localhost:8008> or <https://localhost:8448>.

## Run Tests

### Get the latest test image

```bash
docker pull matrixdotorg/sytest-dendrite
```

### Run Go tests

```bash
cd <your-harmony-git>/servers/dendrite
# Check that building the dendrite server is successful
./build.sh

go test -v ./...
```

### Run specific Go test in VSCode

See servers/dendrite/.vscode/launch.json

### Run sytests

If you are running the tests from Harmony repo:

```bash
docker run --rm -v <your-harmony-git>/servers/dendrite:/src -v <your-harmony-git>/servers/dendrite/logs/test:/logs matrixdotorg/sytest-dendrite
```

If you are running the tests from dendrite main:

```bash
docker run --rm -v <your-dendrite-main-git>:/src -v <your-dendrite-main-git>/logs/test:/logs matrixdotorg/sytest-dendrite
```

### Run specific test

For example, if the test Local device key changes get to remote servers was marked as failing, find the test file (e.g via grep or via the CI log output it's tests/50federation/40devicelists.pl ) then to run Sytest:

If you are running the tests from Harmony repo:

```bash
docker run --rm --name sytest
-v <your-harmony-git>/servers/dendrite/syts:/sytest
-v <your-harmony-git>/servers/dendrite:/src
-v <your-harmony-git>/servers/dendrite/logs/test:/logs
-v ~/go/:/gopath
-e "POSTGRES=1" -e "DENDRITE_TRACE_HTTP=1"
matrixdotorg/sytest-dendrite:latest tests/50federation/40devicelists.pl
```

See sytest.md for the full description of these flags.

If you are running the tests from Dendrite main:

```bash
docker run --rm --name sytest
-v <your-dendrite-main-git>/syts:/sytest
-v <your-dendrite-main-git>:/src
-v <your-dendrite-main-git>/logs/test:/logs
-v ~/go/:/gopath
-e "POSTGRES=1" -e "DENDRITE_TRACE_HTTP=1"
matrixdotorg/sytest-dendrite:latest tests/50federation/40devicelists.pl
```
