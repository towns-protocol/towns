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
./scripts/start-local-blockchain.sh
./scripts/deploy-local-zion-governance-contracts.sh
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
cd clients/web/lib
yarn watch
```

### Fund your local wallet

If you're on metamask, make sure the localhost network is set to chain id `31337` Metamask returns the chain id in it's own settings, not the id returned by the network itself (why!!! :))
