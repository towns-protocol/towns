import { Web3Provider } from "../hooks/use-web3";
import React, { createContext } from "react";
import { useMatrixClientListener } from "../hooks/use-matrix-client-listener";
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

export function MatrixContextProvider(props: Props): JSX.Element {
  const {
    homeServerUrl,
    disableEncryption,
    defaultSpaceId,
    defaultSpaceName,
    defaultSpaceAvatarSrc,
    initialSyncLimit,
  } = props;

  const { matrixClient } = useMatrixClientListener(
    homeServerUrl,
    disableEncryption,
    initialSyncLimit,
  );
  return (
    <Web3Provider>
      <MatrixContext.Provider
        value={{
          matrixClient: matrixClient,
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
