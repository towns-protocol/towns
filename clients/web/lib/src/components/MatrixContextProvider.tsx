import { Web3Provider } from "../hooks/use-web3";
import React, { createContext } from "react";
import { useZionClientListener } from "../hooks/use-zion-client-listener";
import { makeRoomIdentifier, ZionContext } from "../types/matrix-types";
import { ethers } from "ethers";

export const MatrixContext = createContext<ZionContext>({});

interface Props {
  homeServerUrl: string;
  disableEncryption?: boolean;
  getSignerFn?: () => ethers.Signer;
  defaultSpaceId?: string;
  defaultSpaceName?: string; // name is temporary until peek() is implemented https://github.com/HereNotThere/harmony/issues/188
  defaultSpaceAvatarSrc?: string; // avatar is temporary until peek() is implemented https://github.com/HereNotThere/harmony/issues/188
  initialSyncLimit?: number;
  children: JSX.Element;
}

const DEFAULT_INITIAL_SYNC_LIMIT = 20;

export function MatrixContextProvider(props: Props): JSX.Element {
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
    disableEncryption,
    getSignerFn,
    defaultSpaceId,
    defaultSpaceName,
    defaultSpaceAvatarSrc,
    initialSyncLimit,
  } = props;
  const { client } = useZionClientListener(
    homeServerUrl,
    initialSyncLimit ?? DEFAULT_INITIAL_SYNC_LIMIT,
    disableEncryption,
    getSignerFn,
  );
  return (
    <MatrixContext.Provider
      value={{
        client: client,
        homeServer: homeServerUrl,
        disableEncryption: disableEncryption,
        defaultSpaceId: defaultSpaceId
          ? makeRoomIdentifier(defaultSpaceId)
          : undefined,
        defaultSpaceName: defaultSpaceName,
        defaultSpaceAvatarSrc: defaultSpaceAvatarSrc,
      }}
    >
      {props.children}
    </MatrixContext.Provider>
  );
};
