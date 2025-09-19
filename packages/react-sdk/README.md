# @towns-protocol/react-sdk

React Hooks for River SDK.

# Installation

in the future:

```sh
yarn add @towns-protocol/react-sdk
```

# Usage

## Connect to River

`@towns-protocol/react-sdk` suggests you to use Wagmi to connect to Towns Protocol.
Wrap your app with `TownsSyncProvider` and use the `useAgentConnection` hook to connect to Towns Protocol.

> [!NOTE]
> You'll need to use `useEthersSigner` to get the signer from viem wallet client.
> You can get the hook from [wagmi docs](https://wagmi.sh/react/guides/ethers#usage-1).

```tsx
import {
  TownsSyncProvider,
  useAgentConnection,
} from "@towns-protocol/react-sdk";
import { townsEnv } from "@towns-protocol/sdk";
import { WagmiProvider } from "wagmi";
import { useEthersSigner } from "./utils/viem-to-ethers";
import { wagmiConfig } from "./config/wagmi";

const riverConfig = townsEnv().makeTownsConfig("gamma");

const App = ({ children }: { children: React.ReactNode }) => {
  return (
    <WagmiProvider config={wagmiConfig}>
      <TownsSyncProvider>{children}</TownsSyncProvider>
    </WagmiProvider>
  );
};

const ConnectTowns = () => {
  const { connect, isConnecting, isConnected } = useAgentConnection();
  const signer = useEthersSigner();

  return (
    <>
      <button
        onClick={async () => {
          if (!signer) {
            return;
          }
          connect(signer, { riverConfig });
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
