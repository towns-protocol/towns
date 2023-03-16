# lib

Common lib for Harmony clients.

## Build the library

```bash
cd clients/web/lib
yarn install # note, yarn install doesn't always work from this folder, try from root
yarn build
```

## Tests

We've implemented integration tests that run against a live server. See [Build and run Dendrite](../../../servers/README.md) to run a dendrite server locally
And run against a local blockchain, See [Zion-Governance](https://github.com:HereNotThere/zion-governance)

```bash
#from client root
./scripts/start-local-dendrite.sh
./scripts/start-local-casablanca.sh
./scripts/start-local-blockchain.sh
./scripts/deploy-zion-governance-contracts.sh
./scripts/run-integration-tests.sh
# OR - run a single tests from visual studio code via F5 or the "Jest: current file in 'web/lib/` commmand
```

## Architecture

```html
<ZionContextProvider {...props}>
  <SpaceContextProvider spaceId="{...}">
    <ChannelContextProvider channelId="{...}">
      <!--
            function getContent(t: TimelineEvent) {
              // the protocol can change and content can be undefined
              if (!t.content) { return undefined; }
              // switch over the kind type
              switch (t.content.kind) {
                case ZTEvent.RoomMessage:
                  // through the magic of union type differentiation, content is now typed to RoomMessageEvent
                  return makeRoomMessageCompoennt(t.content)
                default:
                  staticAssertNever(t.content) // optional, will enforce compile time check for enum exhaustion
                  return defaultComponent(t.fallbackContent)
              }
            }
            function myComponent() {
                const timeline = useChannelTimeline()
                return (<ul>{timeline.map((t) => <li>{getContent(t)}</li>)}</ul>)
            }
        -->
    </ChannelContextProvider>
  </SpaceContextProvider>
</ZionContextProvider>
```

## Tips and Tricks

### Watch

If you're iterating on the sample app, use the following to automatically rebuild your typescript. These changes should get picked up by the running app

```bash
# these are all handled by the vscode task '~ Start Local Dev ~'
cd clients/web/lib
yarn watch

cd casablanca/sdk
yarn watch
```

### Fund your local wallet

If you're on metamask, make sure the localhost network is set to chain id `31337` Metamask returns the chain id in it's own settings, not the id returned by the network itself (why!!! :))

### MITM yourself

You can use [mitmweb](https://mitmproxy.org/) to watch the calls to your local server

Run:

```
brew install mitmproxy
mitmweb -p 8009 --mode reverse:http://localhost:8008/

```

Then change all instances of http://localhost:8008/ in your app to http://localhost:8009/

- for the sample app, change clients/web/sample-app/env.local
- for the tests, change clients/web/lib/jest-setup.ts
- for the app, change the app url in clients/web/app/src/App.tsk

### Non-idempotence of deploy-zion-governance-contracts.sh per local anvil instance

Contract addresses in deploy script are generated deterministically based on account, nonce tuple
of deploy account. In local development, this is a local anvil instance with deterministic accounts.

That said, running the deploy script multiple times increments the account nonce, therefore generating
new contract addreses, which will break Dendrite since Dendrite is made aware of contract addresses via
a `go:embed` of the addresses at build time.

Rule of thumb to avoid issues: Every time you deploy\*sh to re-deploy contracts for local testing or development,
`./scripts/start-local-dendrite.sh` as well, which will re-build dendrite with the new addreses.
