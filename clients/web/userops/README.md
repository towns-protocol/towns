# Userop testing

## Background

This suite of tests is designed to test user operations against sepolia contracts via SpaceDapp. It does not test full integration with River.

## Running the tests

First setup the local stackup worker:

1. from root of harmony run `scripts/run-stackup-worker.sh`, optional `-p` flag to run with privy checks. You may be required to add env vars to stackup-worker/.dev.vars

Then from within this package:

2. cp .env.test-sample to .env.test in the root of this package. Fill in the values.

3. in another terminal, from root of harmony run `sh scripts/run-userops-package-tests.sh`, optional `-p` flag to run with privy checks. Steps 1 and 3 should either both have `-p` or neither.
