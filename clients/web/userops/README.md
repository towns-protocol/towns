# Userop testing

## Background

This suite of tests is designed to test user operations against sepolia contracts via SpaceDapp.

## Running the tests

### Random users

These tests rely on a local geth node running with 4337 related contracts deployed, as well as a local_multi River environment configured with Base contracts deployed. These tests do not interact with River.

The easiest way to achieve this is to just run the VSCode task `4337: Start Local Dev`. Then from another terminal, within this package:

```
yarn test:userops:random-wallet
```

An alternative is to run `scripts/setup-4337-and-run-userops-test.sh` from the root of harmony. This script will start the local geth node and run the tests.

### Other test scenarios

These tests are able to be run for 3 scenarios: random (new) users, privy (established) users, and with strict paymaster limits. The default scenario is random users, following the above instructions.

To run the other scenarios, you may need to restart the stackup worker, and run the tests with the appropriate command.

So in either VSCode or by running the script noted above, kill the stackup worker.

Then from within this package:

```
yarn test:userops:privy-wallet
```

To test stackup worker with strict daily limits imposed:

Start stackup worker with the following command:

```
sh scripts/run-stackup-worker-development.sh -l
```

Then from within this package:

```
yarn test:userops:paymaster-limits
```
