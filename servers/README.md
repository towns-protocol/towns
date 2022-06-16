# Overview

Harmony repo does not have a direct relationship with dendrite (main). It has a subtree
relationship with dendrite-fork. The dendrite-fork's <https://github.com/HereNotThere/dendrite> upstream is
dendrite (main) <https://github.com/matrix-org/dendrite.git>. dendrite-fork has all of our server changes
including the ones which are not accepted by dendrite main.

It was intially populated with:

```bash
git remote add dendrite-fork https://github.com/HereNotThere/dendrite.git
git fetch dendrite-fork
git subtree add --prefix servers/dendrite dendrite-fork main
```

The repo relationships:

```text
harmony\servers\dendrite
<----------------------->
        |
        |
        | (subtree)
        |
        |
        V
dendrite-fork (hnt's fork)
<------------------------>
        |
        |
        | (upstream)
        |
        |
        V
dendrite (main)
<------------->
```

The next few sections describe the steps to pull and push changes between each repo.

- [Pulling from dendrite-fork into harmony repo](#pulling-from-dendrite-fork-into-harmony-repo)
- [Pushing changes from harmony repo to dendrite-fork](#pushing-changes-from-harmony-repo-to-dendrite-fork)
- [Pulling changes from dendrite (main) into dendrite-fork](#pulling-changes-from-dendrite-main-into-dendrite-fork)
- [Pushing changes to dendrite main](#pushing-changes-to-dendrite-main)

This is followed by information about building and running the dendrite server,
building and running tests, etc.

## Pulling from dendrite-fork into harmony repo

```bash
git checkout -b some-name
git subtree pull --prefix servers/dendrite dendrite-fork main
git push --set-upstream origin some-name
```

Create a PR, and merge the latest subtree changes to the harmony repo.

This command will pull the changes since the last time it ran and create a merge
commit on top. Keep in mind that the pulled commits might be older than the latest
commit of your code though, so they might not appear directly when you call git log.

Further reading about maintaining the subtree may be found here:
<https://www.atlassian.com/git/tutorials/git-subtree>

## Pushing changes from harmony repo to dendrite-fork

You should be able to push changes to a branch using the command:

```bash
git subtree push --prefix servers/dendrite dendrite-fork my-feature-branch
```

This should create a branch in the remote dendrite-fork, and allow you
to create and submit a PR.
Go to <https://github.com/HereNotThere/dendrite>. Make sure to change the
base repository from matrix-org/dendrite to `HereNotThere/dendrite`.

Once the PR is approved and merged, pull the changes into your local harmony with:

```bash
git checkout -b some-name
git subtree pull --prefix servers/dendrite dendrite-fork main
git push --set-upstream origin some-name
```

Create a PR, and merge the latest subtree changes to the harmony repo.

## Pulling changes from dendrite (main) into dendrite-fork

Periodically, we should pull the latest from dendrite main (upstream) into our fork
to make sure that our fork picks up the latest features and bug fixes in main.

To sync the upstream dendrite main repo, follow the general steps at
<https://docs.github.com/en/pull-requests/collaborating-with-pull-requests/working-with-forks/syncing-a-fork>.

If the merge conflicts are difficult to resolve, the cleanest way is to clone
dendrite-fork outside of the harmony repo and do it with simple git commands.

Then do the usual merge conflict resolution, commit and push the branch to
the remote dendrite fork.

Go to <https://github.com/HereNotThere/dendrite>. Make sure to change the
base repository from matrix-org/dendrite to `HereNotThere/dendrite`.
Submit a PR to merge.

## Pushing changes to dendrite main

Since our dendrite fork contains our stuff, it may have hard-to-resolve merge conflicts
with dendrite main. The cleanest way to submit changes to dendrite main is to create
a fork of <https://github.com/matrix-org/dendrite>, and then follow their
[Contributing to Dendrite](https://github.com/matrix-org/dendrite/blob/main/docs/CONTRIBUTING.md#contributing-to-dendrite)
process.

General steps to fork a repo <https://docs.github.com/en/get-started/quickstart/fork-a-repo>

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
#      chain_ids: [4] # https://chainlist.org/


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
