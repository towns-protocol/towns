import { LoginServerResponse, LoginStatus } from "../login";
import { StatusCodes } from "http-status-codes";
import { createClient } from "matrix-js-sdk";
import { useCallback, useContext } from "react";
import { useCredentialStore } from "../../store/use-credential-store";
import { useMatrixStore } from "../../store/use-matrix-store";
import { getUsernameFromId } from "../../types/user-identifier";
import { useLogout } from "./useLogout";
import { useZionContext } from "../../components/ZionContextProvider";

export const useLoginWithPassword = () => {
  const { setDeviceId, setLoginError, setLoginStatus, setUserId, setUsername } =
    useMatrixStore();

  const { homeServer } = useZionContext();
  const { setAccessToken } = useCredentialStore();
  const logout: () => Promise<void> = useLogout();

  return useCallback(
    async (username: string, password: string): Promise<void> => {
      await logout();
      setLoginStatus(LoginStatus.LoggingIn);
      const response = await matrixLoginWithPassword(
        homeServer ?? "",
        username,
        password,
      );
      if (response.accessToken) {
        setAccessToken(response.accessToken);
        setDeviceId(response.deviceId);
        setUserId(response.userId);
        setUsername(getUsernameFromId(response.userId));
        setLoginStatus(LoginStatus.LoggedIn);
      } else {
        setLoginStatus(LoginStatus.LoggedOut);
      }

      if (response.error) {
        setLoginError({
          code: StatusCodes.UNAUTHORIZED,
          message: response.error,
        });
      }
    },
    [
      homeServer,
      logout,
      setAccessToken,
      setDeviceId,
      setLoginError,
      setLoginStatus,
      setUserId,
      setUsername,
    ],
  );
};

async function matrixLoginWithPassword(
  homeServerUrl: string,
  username: string,
  password: string,
): Promise<LoginServerResponse> {
  let error: string | undefined;
  try {
    const newClient = createClient(homeServerUrl);
    const response = await newClient.loginWithPassword(username, password);
    //console.log(`response:`, JSON.stringify(response));
    return {
      accessToken: response.access_token,
      deviceId: response.device_id,
      userId: response.user_id,
    };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (ex: any) {
    error = ex.message;
    console.error(`Error logging in:`, ex.stack);
  }

  return {
    accessToken: undefined,
    deviceId: undefined,
    userId: undefined,
    error,
  };
}
