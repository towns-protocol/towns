import { MatrixClient } from "matrix-js-sdk";
import { Web3Provider } from "../hooks/use-web3";
import React, { createContext } from "react";
import { useMatrixClientListener } from "../hooks/use-matrix-client-listener";

export const MatrixContext = createContext<MatrixClient | undefined>(undefined);

interface Props {
  homeServerUrl: string;
  initialSyncLimit?: number;
  children: JSX.Element;
}

export function MatrixContextProvider(props: Props): JSX.Element {
  const { matrixClient } = useMatrixClientListener(
    props.homeServerUrl,
    props.initialSyncLimit,
  );

  return (
    <Web3Provider>
      <MatrixContext.Provider value={matrixClient}>
        {props.children}
      </MatrixContext.Provider>
    </Web3Provider>
  );
}
