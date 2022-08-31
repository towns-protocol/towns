/* eslint-disable @typescript-eslint/no-non-null-assertion, @typescript-eslint/no-explicit-any */
import React from "react";
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
  const spaceManagerAddress = process.env.SPACE_MANAGER_ADDRESS!;
  const tokenModuleAddress = process.env.TOKEN_MODULE_ADDRESS!;
  const userModuleAddress = process.env.USER_MODULE_ADDRESS!;
  const councilNFTAddress = process.env.COUNCIL_NFT_ADDRESS!;
  const councilStakingAddress = process.env.COUNCIL_STAKING_ADDRESS!;
  Object.defineProperty(window, "ethereum", {
    value: provider,
    writable: true,
  });

  return (
    <ZionContextProvider
      homeServerUrl={homeServerUrl}
      spaceManagerAddress={spaceManagerAddress}
      tokenModuleAddress={tokenModuleAddress}
      userModuleAddress={userModuleAddress}
      councilNFTAddress={councilNFTAddress}
      councilStakingAddress={councilStakingAddress}
      disableEncryption={disableEncryption}
      getSignerFn={provider ? () => provider.wallet : undefined}
      defaultSpaceId={defaultSpaceId}
      defaultSpaceName={defaultSpaceName}
      defaultSpaceAvatarSrc={defaultSpaceAvatarSrc}
      initialSyncLimit={initialSyncLimit}
    >
      {children}
    </ZionContextProvider>
  );
};
