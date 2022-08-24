/* eslint-disable @typescript-eslint/no-non-null-assertion, @typescript-eslint/no-explicit-any */
import React from "react";
import { MatrixContextProvider } from "../../../src/components/MatrixContextProvider";
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
  const spaceManagerAddress = process.env.SPACEMANAGER_ADDRESS!;
  const userModuleAddress = process.env.USERMODULE_ADDRESS!;

  Object.defineProperty(window, "ethereum", {
    value: provider,
    writable: true,
  });

  return (
    <MatrixContextProvider
      homeServerUrl={homeServerUrl}
      spaceManagerAddress={spaceManagerAddress}
      userModuleAddress={userModuleAddress}
      disableEncryption={disableEncryption}
      getSignerFn={provider ? () => provider.wallet : undefined}
      defaultSpaceId={defaultSpaceId}
      defaultSpaceName={defaultSpaceName}
      defaultSpaceAvatarSrc={defaultSpaceAvatarSrc}
      initialSyncLimit={initialSyncLimit}
    >
      {children}
    </MatrixContextProvider>
  );
};
