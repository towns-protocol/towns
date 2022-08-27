import { Web3Provider } from "../hooks/use-web3";
import React, { createContext, useMemo } from "react";
import { useZionClientListener } from "../hooks/use-zion-client-listener";
import { makeRoomIdentifier, RoomIdentifier } from "../types/matrix-types";
import { ethers } from "ethers";
import { ZionClient } from "client/ZionClient";

export interface IZionContext {
  client?: ZionClient;
  homeServer?: string;
  disableEncryption?: boolean; // TODO remove this when we support olm in the browser https://github.com/HereNotThere/harmony/issues/223
  defaultSpaceId?: RoomIdentifier;
  defaultSpaceName?: string;
  defaultSpaceAvatarSrc?: string;
}

export const ZionContext = createContext<IZionContext | undefined>(undefined);

/**
 * use instead of React.useContext
 * and will throw assert if not in a Provider
 */
export function useZionContext(): IZionContext {
  const context = React.useContext(ZionContext);
  if (!context) {
    throw new Error("useZionContext must be used in a ZionContextProvider");
  }
  return context;
}

interface Props {
  homeServerUrl: string;
  spaceManagerAddress: string;
  userModuleAddress: string;
  councilNFTAddress: string;
  councilStakingAddress: string;
  disableEncryption?: boolean;
  getSignerFn?: () => ethers.Signer;
  defaultSpaceId?: string;
  defaultSpaceName?: string; // name is temporary until peek() is implemented https://github.com/HereNotThere/harmony/issues/188
  defaultSpaceAvatarSrc?: string; // avatar is temporary until peek() is implemented https://github.com/HereNotThere/harmony/issues/188
  initialSyncLimit?: number;
  children: JSX.Element;
}

const DEFAULT_INITIAL_SYNC_LIMIT = 20;

export function ZionContextProvider(props: Props): JSX.Element {
  return (
    <Web3Provider>
      <ContextImpl {...props}></ContextImpl>
    </Web3Provider>
  );
}

/// the zion client needs to be nested inside a Web3 provider, hence the need for this component
const ContextImpl = (props: Props): JSX.Element => {
  const {
    homeServerUrl,
    spaceManagerAddress,
    userModuleAddress,
    councilNFTAddress,
    councilStakingAddress,
    disableEncryption,
    getSignerFn,
    defaultSpaceId,
    defaultSpaceName,
    defaultSpaceAvatarSrc,
    initialSyncLimit,
  } = props;
  const { client } = useZionClientListener(
    homeServerUrl,
    spaceManagerAddress,
    userModuleAddress,
    councilNFTAddress,
    councilStakingAddress,
    initialSyncLimit ?? DEFAULT_INITIAL_SYNC_LIMIT,
    disableEncryption,
    getSignerFn,
  );
  const convertedDefaultSpaceId = useMemo(
    () => (defaultSpaceId ? makeRoomIdentifier(defaultSpaceId) : undefined),
    [defaultSpaceId],
  );
  return (
    <ZionContext.Provider
      value={{
        client: client,
        homeServer: homeServerUrl,
        disableEncryption: disableEncryption,
        defaultSpaceId: convertedDefaultSpaceId,
        defaultSpaceName: defaultSpaceName,
        defaultSpaceAvatarSrc: defaultSpaceAvatarSrc,
      }}
    >
      {props.children}
    </ZionContext.Provider>
  );
};
