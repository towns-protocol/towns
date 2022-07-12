import { MatrixContext } from "../../components/MatrixContextProvider";
import { useCallback, useContext } from "react";
import { useCredentialStore } from "../../store/use-credential-store";
import { useMatrixStore } from "../../store/use-matrix-store";
import { LoginStatus } from "../login";
import { ZionContext } from "types/matrix-types";

export const useLogout = () => {
  const { setLoginStatus } = useMatrixStore();
  const { setAccessToken } = useCredentialStore();

  const { matrixClient } = useContext<ZionContext>(MatrixContext);

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
