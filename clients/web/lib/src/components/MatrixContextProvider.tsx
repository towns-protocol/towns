import { Web3Provider } from "../hooks/use-web3";
import React, { createContext } from "react";
import { useZionClientListener } from "../hooks/use-zion-client-listener";
import { makeRoomIdentifier, ZionContext } from "../types/matrix-types";

export const MatrixContext = createContext<ZionContext>({});

interface Props {
  homeServerUrl: string;
  disableEncryption?: boolean;
  defaultSpaceId?: string;
  defaultSpaceName?: string; // name is temporary until peek() is implemented https://github.com/HereNotThere/harmony/issues/188
  defaultSpaceAvatarSrc?: string; // avatar is temporary until peek() is implemented https://github.com/HereNotThere/harmony/issues/188
  initialSyncLimit?: number;
  children: JSX.Element;
}

const DEFAULT_INITIAL_SYNC_LIMIT = 20;

export function MatrixContextProvider(props: Props): JSX.Element {
  const {
    homeServerUrl,
    disableEncryption,
    defaultSpaceId,
    defaultSpaceName,
    defaultSpaceAvatarSrc,
    initialSyncLimit,
  } = props;
  const { client } = useZionClientListener({
    homeServerUrl,
    disableEncryption,
    initialSyncLimit: initialSyncLimit ?? DEFAULT_INITIAL_SYNC_LIMIT,
  });
  return (
    <Web3Provider>
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
    </Web3Provider>
  );
}
