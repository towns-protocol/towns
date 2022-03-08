import { MatrixClient } from "matrix-js-sdk";
import { createContext } from "react";
import { useMatrixClientListener } from "../hooks/use-matrix-client-listener";

const MATRIX_HOMESERVER_URL =
  process.env.MATRIX_HOME_SERVER ?? "http://localhost:8008";

export const MatrixContext = createContext<MatrixClient | undefined>(undefined);

export function MatrixContextProvider({ children }): JSX.Element {
  const { matrixClient } = useMatrixClientListener(MATRIX_HOMESERVER_URL);

  return (
    <MatrixContext.Provider value={matrixClient}>
      {children}
    </MatrixContext.Provider>
  );
}
