/* eslint-disable @typescript-eslint/no-non-null-assertion, @typescript-eslint/no-explicit-any */
import React from "react";
import { Wallet } from "ethers";
import { TestingUtils } from "eth-testing/lib/testing-utils";
import { MatrixContextProvider } from "../../../src/components/MatrixContextProvider";

interface Props {
  testingUtils: TestingUtils;
  wallet: Wallet;
  defaultSpaceId?: string;
  defaultSpaceName?: string;
  defaultSpaceAvatarSrc?: string;
  initialSyncLimit?: number;
  children: JSX.Element;
}

export const ZionTestApp = (props: Props) => {
  const {
    testingUtils,
    wallet,
    defaultSpaceId,
    defaultSpaceName,
    defaultSpaceAvatarSrc,
    initialSyncLimit,
    children,
  } = props;
  // pull environment variables from the process
  const chainId = process.env.CHAIN_ID!;
  const homeServerUrl = process.env.HOMESERVER!;
  const disableEncryption = process.env.DISABLE_ENCRYPTION === "true";
  // mock up the wallet
  testingUtils.mockChainId(chainId);
  testingUtils.mockRequestAccounts([wallet.address], { chainId: chainId });
  testingUtils.mockConnectedWallet([wallet.address], { chainId: chainId });
  testingUtils.lowLevel.mockRequest("personal_sign", async (params: any) => {
    return wallet.signMessage((params as string[])[0]);
  });
  return (
    <MatrixContextProvider
      homeServerUrl={homeServerUrl}
      disableEncryption={disableEncryption}
      defaultSpaceId={defaultSpaceId}
      defaultSpaceName={defaultSpaceName}
      defaultSpaceAvatarSrc={defaultSpaceAvatarSrc}
      initialSyncLimit={initialSyncLimit}
    >
      {children}
    </MatrixContextProvider>
  );
};
