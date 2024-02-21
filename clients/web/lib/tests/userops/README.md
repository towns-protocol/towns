# Userop testing

## Background

This suite of tests is designed to test user operations against sepolia contracts, deployed river node, and stackup account abstraction infrastructure. Other integration tests continue to use the EOA flow. The tests in this suite should focus on testing user operations with a minimal amount of River functionality to prove a successful user experience.
I.E. - test a user can join a town after creating it with a user operation, but not test that the user can send a message to the town.

## Running the tests

First setup the local stackup worker:

1. in harmony/servers/workers/stackup-woker, create a `.dev.vars` file with the following values:

```
PAYMASTER_ADDRESS=<get from stackup dashboard>
STACKUP_API_TOKEN=<get from stackup dashboard>
AUTH_SECRET=foo
ENVIRONMENT=gamma

// true if you want to skip all verification checks (skip privy and limit checks) - enable if running yarn test:userops:random-wallet
SKIP_TOWNID_VERIFICATION=

// true if you want to enable verfication checks, but bypass the daily limit check, allowing tests to complete as many userops as needed - enable if running yarn test:userops:privy-wallet
SKIP_LIMIT_VERIFICATION=


// optional values if you are running yarn test:userops:privy-wallet
ALCHEMY_API_KEY=<get from alchemy>
PRIVY_APP_KEY=<get from privy>
PRIVY_APP_ID=<get from privy>
```

2. run `yarn dev:local` from the same directory

Then from within this package:

1. cp .env.test.userops-sample to .env.test.userops in the root of this package.
2. Run `yarn test:userops`
