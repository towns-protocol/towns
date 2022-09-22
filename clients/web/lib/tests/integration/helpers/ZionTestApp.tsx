/* eslint-disable @typescript-eslint/no-non-null-assertion, @typescript-eslint/no-explicit-any */
import React, { useEffect } from "react";
import { useConnect } from "wagmi";
import { ZionContextProvider } from "../../../src/components/ZionContextProvider";
import { ZionTestWeb3Provider } from "./ZionTestWeb3Provider";

interface Props {
  provider: ZionTestWeb3Provider;
  defaultSpaceId?: string;
  defaultSpaceName?: string;
  defaultSpaceAvatarSrc?: string;
  initialSyncLimit?: number;
  children: JSX.Element;
}

export const ZionTestApp = (props: Props) => {
  const {
    provider,
    defaultSpaceId,
    defaultSpaceName,
    defaultSpaceAvatarSrc,
    initialSyncLimit,
    children,
  } = props;
  // pull environment variables from the process
  const homeServerUrl = process.env.HOMESERVER!;
  const disableEncryption = process.env.DISABLE_ENCRYPTION === "true";
  Object.defineProperty(window, "ethereum", {
    value: provider,
    writable: true,
  });

  return (
    <ZionContextProvider
      homeServerUrl={homeServerUrl}
      disableEncryption={disableEncryption}
      getSignerFn={provider ? () => provider.wallet : undefined}
      defaultSpaceId={defaultSpaceId}
      defaultSpaceName={defaultSpaceName}
      defaultSpaceAvatarSrc={defaultSpaceAvatarSrc}
      initialSyncLimit={initialSyncLimit}
    >
      <ZionWalletAutoConnect children={children} />
    </ZionContextProvider>
  );
};

interface AutoConnectProps {
  children: JSX.Element;
}

/// in the tests we make a custom provider that wraps our random wallet
/// go ahead and connect to the wallet automatically, so we don't have to do it in every test
const ZionWalletAutoConnect = (props: AutoConnectProps) => {
  const { connect, connectors, error, status, data } = useConnect();
  // automatically connect to the wallet if it's available
  useEffect(() => {
    if (connectors.length > 0) {
      console.log("ZionTestApp: connecting to wallet");
      connect({ connector: connectors[0] });
    }
  }, [connect, connectors]);
  // log state
  useEffect(() => {
    console.log("ZionTestApp: wallet connection status", {
      error,
      status,
      data,
    });
  }, [error, status, data]);
  return <>{props.children}</>;
};
