# lib

Common lib for Harmony clients.

## Build the library

```bash
cd clients/web/lib
yarn  # note, yarn install doesn't always work from this folder, try from root
yarn build
```

## Tests

We've implemented integration tests that run against a live server. See Start Local Dev in root readme to launch your environment

```bash
#from client root
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

See Run Start Local Dev instructions in parent for running watches

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
