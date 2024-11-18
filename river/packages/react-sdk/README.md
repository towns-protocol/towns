# @river-build/react-sdk

React Hooks for River SDK.

# Installation

in the future:

```sh
yarn add @river-build/react-sdk
```

# Usage

## Connect to River

`@river-build/react-sdk` suggests you to use Wagmi to connect to River.
Wrap your app with `RiverSyncProvider` and use the `useAgentConnection` hook to connect to River.

> [!NOTE]
> You'll need to use `useEthersSigner` to get the signer from viem wallet client.
> You can get the hook from [wagmi docs](https://wagmi.sh/react/guides/ethers#usage-1).

```tsx
import { RiverSyncProvider, useAgentConnection } from "@river-build/react-sdk";
import { makeRiverConfig } from "@river-build/sdk";
import { WagmiProvider } from "wagmi";
import { useEthersSigner } from "./utils/viem-to-ethers";

const riverConfig = makeRiverConfig("gamma");

const App = ({ children }: { children: React.ReactNode }) => {
  return (
    <WagmiProvider config={wagmiConfig}>
      <RiverSyncProvider>{children}</RiverSyncProvider>
    </WagmiProvider>
  );
};

const ConnectRiver = () => {
  const { connect, isConnecting, isConnected } = useAgentConnection();
  const signer = useEthersSigner();

  return (
    <>
      <button
        onClick={() => {
          if (signer) {
            connect(signer, { riverConfig });
          }
        }}
      >
        {isConnecting ? "Disconnect" : "Connect"}
      </button>
      {isConnected && <span>Connected!</span>}
    </>
  );
};
```

## Get information about an account

## Post messages to a stream

## Subscribe to a stream

## Addding persistance
