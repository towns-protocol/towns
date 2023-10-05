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
harmony\servers\dendrite   (See #pulling-from-dendrite-fork-into-harmony-repo)
<----------------------->
        |
        |
        | (subtree)
        |
        |
        V
dendrite-fork (hnt's fork)  (See #pushing-changes-to-the-dendrite-fork,
<------------------------>   #pulling-changes-from-dendrite-main-into-dendrite-fork)
        |
        |
        | (upstream)
        |
        |
        V
dendrite (main)             (See #pushing-changes-to-dendrite-main)
<------------->
```

The next few sections describe the steps to pull and push changes between each repo.

- [Pulling from dendrite-fork into harmony repo](#pulling-from-dendrite-fork-into-harmony-repo)
- [Pushing changes to the dendrite-fork](#pushing-changes-to-the-dendrite-fork)
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

## Pushing changes to the dendrite-fork

The cleanest way to push changes to the dendrite-fork is to clone the repo,
create your PR, merge the changes, and then follow the steps in
[Pulling from dendrite-fork into harmony repo](#pulling-from-dendrite-fork-into-harmony-repo)
to pull the changes into the harmony subtree.

```bash
# clone the dendrite fork
git clone git@github.com:HereNotThere/dendrite.git
```

Now make your changes in a local git branch. Push it to remote.
This should create a branch in the remote dendrite-fork, and allow you
to create and submit a PR.
Go to <https://github.com/HereNotThere/dendrite>. Make sure to change the
base repository from matrix-org/dendrite to `HereNotThere/dendrite`.

Once the PR is merged, pull the changes into your local harmony with:

```bash
git checkout -b some-name
git subtree pull --prefix servers/dendrite dendrite-fork main
git push --set-upstream origin some-name
```

Create a PR, check that ci passes, then merge the changes into main over the commandline

```bash
git checkout main
git pull
git merge some-name
git push origin main
```

## Pulling changes from dendrite (main) into dendrite-fork

Periodically, we should pull the latest from dendrite main (upstream) into our fork
to make sure that our fork picks up the latest features and bug fixes in main.

To sync the upstream dendrite main repo, follow the general steps at
<https://docs.github.com/en/pull-requests/collaborating-with-pull-requests/working-with-forks/syncing-a-fork>.

If the merge conflicts are difficult to resolve, the cleanest way is to clone
dendrite-fork outside of the harmony repo and do it with simple git commands.

```bash
# branch1: dendrite-upstream
git checkout main
git checkout -b pr/dendrite-upstream
# force the branch to point to the upstream HEAD
# https://stackoverflow.com/questions/25518883/git-how-to-force-pull-from-an-upstream-remote-and-ignore-commits-in-your-local
git reset --hard upstream/main

# branch2: dendrite-fork
git checkout main
git checkout -b pr/dendrite-fork
# merge the upstream into the fork
git merge pr/dendrite-upstream

# resolve the conflict(s)

# build, lint, run test to make sure everything works.
# broken out into individual steps so you can run them separately and debug if needed.
# or run ./build/scripts/build-test-lint.sh 
go clean -modcache
go mod tidy
./build.sh
golangci-lint run
go test ./…

# add and commit the changes.
git add .
git commit -S -m "sync upstream changes"
git push --set-upstream origin pr/dendrite-fork

```

Create a PR at <https://github.com/HereNotThere/dendrite>. Make sure to change the
base repository from matrix-org/dendrite to `HereNotThere/dendrite`.

When merging to main, choose **Create a merge commit** to preserve the commit
history.

## Pushing changes to dendrite main

Since our dendrite fork contains our stuff, it may have hard-to-resolve merge conflicts
with dendrite main. The cleanest way to submit changes to dendrite main is to create
a fork of <https://github.com/matrix-org/dendrite>, and then follow their
[Contributing to Dendrite](https://github.com/matrix-org/dendrite/blob/main/docs/CONTRIBUTING.md#contributing-to-dendrite)
process.

General steps to fork a repo <https://docs.github.com/en/get-started/quickstart/fork-a-repo>.

## Build and run Dendrite

```bash
cd dendrite

./build.sh

# Generate a Matrix signing key for federation (required)
./bin/generate-keys --private-key matrix_key.pem

# Generate a self-signed certificate (optional, but a valid TLS certificate is normally
# needed for Matrix federation/clients to work properly!)
 ./bin/generate-keys --tls-cert server.crt --tls-key server.key

# Copy and modify the config file - you'll need to set a server name and paths to the keys
# at the very least, along with setting up the database connection strings.
cp dendrite-sample.monolith.yaml dendrite.yaml

# In lieu of configuring the sample monolith config from scratch,
# you can copy a pre-configured monolith config suitable for local
# sqlite based deploys.
cp ../dendrite_local_test/dendrite.yaml dendrite.yaml
```

Update the public key authentication section of the yaml file:

```yaml
# Configuration for the Client API.
client_api:
  # ... other settings

  # Prevents new users from being able to register on this homeserver, except when
  # using the registration shared secret below.
  registration_disabled: false

  # Enable or disable password authentication.
  password_authentication_disabled: true

  # public key authentication
  public_key_authentication:
    ethereum:
      enabled: true
      version: 1
      chain_id: 31337
      networkUrl: "http://127.0.0.1:8545"
```

## Build and run the server

```bash
./bin/dendrite \
--tls-cert server.crt \
--tls-key server.key \
--config dendrite.yaml \
--really-enable-open-registration

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
docker run --rm \
-v <your-harmony-git>/servers/dendrite:/src \
-v <your-harmony-git>/servers/dendrite/logs/test:/logs \
matrixdotorg/sytest-dendrite tests/50federation/40devicelists.pl
```

See sytest.md for the full description of these flags.

If you are running the tests from Dendrite main:

```bash
docker run --rm \
-v <your-dendrite-main-git>:/src \
-v <your-dendrite-main-git>/logs/test:/logs \
matrixdotorg/sytest-dendrite:latest tests/50federation/40devicelists.pl
```

### Run tests through MITM

Install mit proxy

```console
brew install mitmproxy
```

Then start the proxy listening on 8009

```console
mitmweb -p 8009 --mode reverse:http://localhost:8008/
```

Then change the jest config in jest-setup.ts to point to 8009

```
process.env.CASABLANCA_SERVER_URL = 'http://localhost:5157'; 
```

### Run the profiler


#### CPU
```console
go tool pprof -http=localhost:23456 http://node1.towns.com:65432/debug/pprof/profile\?seconds\=30
```

This will wait for 30 seconds to collect profiling data, then open a browser window with the results.

#### Heap

```console
go tool pprof -http=localhost:23456 http://node1.towns.com:65432/debug/pprof/heap
```

This will open a browser window with the results.


#### More info

Go to `servers/dendrite/docs/development/PROFILING.md` to read more about profiling the dendrite server.




### Connecting to pgadmin on a remote environment

#### IP Whitelisting

To connect to pgadmin, your IP address must be whitelisted on the load balancer's security group. To do this, go to the security group for the load balancer and add a new "inbound" rule for your IP address. 

Example: For production, go to: `https://us-east-1.console.aws.amazon.com/ec2/home?region=us-east-1#SecurityGroup:groupId=sg-0aaf35fb0fc05b1d9`. Then click "Edit inbound rules" and add a new rule for your IP address on port `5433`. There is a "My IP" button that will automatically fill in your IP address. Leave a meaningful description for the rule, such as "Brian's IP address".

#### Connection URL

Each environment's "primary" node domain name also serves as the pgadmin domain name. For example, for production, `node1.towns.com` will be the pgadmin server. For staging, it will be `node1-staging.towns.com`. 

We use the port `5433` for pgadmin. For production, the connection URL will be `node1.towns.com:5433`. For staging, it will be `node1-staging.towns.com:5433`.


#### Credentials


The email address is `admin@hntlabs.com`.

PGAdmin passwords are stored in aws secrets manager. The secret name is `<environment>-pgadmin-password`. 

Example: To see the secret for `production`, go to `https://us-east-1.console.aws.amazon.com/secretsmanager/secret?name=production-pgadmin-password&region=us-east-1` and click "Retrieve secret value". 


#### Connecting to the database

Once you have the connection URL, whitelisted IP and credentials, you can connect to the database. You'll see that the database is already added for you in the sidebar, so you can immediately connect and start running queries. Note that this is a read-only connection, so you won't be able to make any changes to the database.