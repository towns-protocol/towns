import { MatrixContext } from "../../components/MatrixContextProvider";
import { MatrixClient } from "matrix-js-sdk";
import { useCallback, useContext } from "react";
import { useCredentialStore } from "../../store/use-credential-store";
import { useMatrixStore } from "../../store/use-matrix-store";
import { LoginStatus } from "../login";

export const useLogout = () => {
  const { setLoginStatus } = useMatrixStore();
  const { setAccessToken } = useCredentialStore();

  const matrixClient = useContext<MatrixClient | undefined>(MatrixContext);

  return useCallback(
    async function (): Promise<void> {
      setLoginStatus(LoginStatus.LoggingOut);
      if (matrixClient) {
        try {
          await matrixClient.logout();
          console.log("Logged out");
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } catch (ex: any) {
          console.error("Error logging out:", ex.stack);
        }
      }
      setLoginStatus(LoginStatus.LoggedOut);
      setAccessToken("");
    },
    [matrixClient, setAccessToken, setLoginStatus],
  );
};
