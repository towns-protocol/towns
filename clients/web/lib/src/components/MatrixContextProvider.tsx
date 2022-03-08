import { MatrixClient } from "matrix-js-sdk";
import { createContext } from "react";
import { useMatrixClientListener } from "../hooks/use-matrix-client-listener";

export const MatrixContext = createContext<MatrixClient | undefined>(undefined);

interface Props {
  homeServerUrl: string;
  children: JSX.Element;
}

export function MatrixContextProvider(props: Props): JSX.Element {
  const { matrixClient } = useMatrixClientListener(props.homeServerUrl);

  return (
    <MatrixContext.Provider value={matrixClient}>
      {props.children}
    </MatrixContext.Provider>
  );
}
