import { ICreateRoomOpts, MatrixClient, createClient } from "matrix-js-sdk";
import { LoginStatus, getUsernameFromId, toLowerCaseUsername } from "./login";
import { useCallback, useContext, useMemo } from "react";

import { CreateRoomInfo } from "../types/matrix-types";
import { MatrixContext } from "../components/MatrixContextProvider";
import { StatusCodes } from "http-status-codes";
import { useCredentialStore } from "../store/use-credential-store";
import { useMatrixStore } from "../store/use-matrix-store";
import { useMatrixWalletSignIn } from "./use-matrix-wallet-sign-in";

interface LoginServerResponse {
  accessToken: string | undefined;
  userId: string | undefined;
  homeServer: string | undefined;
  deviceId: string | undefined;
  error?: string;
}

/**
 * Matrix client API to interact with the Matrix server.
 */
export function useMatrixClient() {
  const {
    homeServer,
    username,
    setDeviceId,
    setLoginError,
    setLoginStatus,
    setUserId,
    setUsername,
  } = useMatrixStore();

  const { setAccessToken } = useCredentialStore();

  const matrixClient = useContext<MatrixClient | undefined>(MatrixContext);

  const { getIsWalletIdRegistered, loginWithWallet, registerWallet } =
    useMatrixWalletSignIn();

  const createRoom = useCallback(
    async function (createInfo: CreateRoomInfo): Promise<string | undefined> {
      try {
        if (matrixClient) {
          const options: ICreateRoomOpts = {
            //room_alias_name: "my_room_alias3",
            visibility: createInfo.visibility,
            name: createInfo.roomName,
            is_direct: createInfo.isDirectMessage,
          };
          const response = await matrixClient.createRoom(options);
          console.log(`Created room`, JSON.stringify(response));
          return response.room_id;
        } else {
          console.error(`Not logged in. Cannot create room`);
        }
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } catch (ex: any) {
        console.error(`Error creating room`, ex.stack);
      }
      return undefined;
    },
    [matrixClient]
  );

  const logout = useCallback(
    async function (): Promise<void> {
      setLoginStatus(LoginStatus.LoggingOut);
      if (matrixClient) {
        try {
          await matrixClient.logout();
          console.log(`Logged out`);
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } catch (ex: any) {
          console.error(`Error logging out:`, ex.stack);
        }
      }
      setLoginStatus(LoginStatus.LoggedOut);
      setAccessToken("");
    },
    [matrixClient]
  );

  const loginWithPassword = useCallback(
    async function (username: string, password: string): Promise<void> {
      await logout();
      setLoginStatus(LoginStatus.LoggingIn);
      const response = await matrixLoginWithPassword(
        homeServer,
        username,
        password
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
    [homeServer]
  );

  const registerNewUser = useCallback(
    async function (username: string, password: string): Promise<void> {
      await logout();
      setLoginStatus(LoginStatus.LoggingIn);
      const response = await matrixRegisterUser(homeServer, username, password);
      if (response.accessToken) {
        setAccessToken(response.accessToken);
        setDeviceId(response.deviceId);
        setUserId(response.userId);
        setUsername(getUsernameFromId(response.userId));
        setLoginStatus(LoginStatus.LoggedIn);
      }

      if (response.error) {
        setLoginError({
          code: StatusCodes.UNAUTHORIZED,
          message: response.error,
        });
      }
    },
    [homeServer]
  );

  const sendMessage = useCallback(async function (
    roomId: string,
    message: string
  ) {
    if (matrixClient) {
      const content = {
        body: `${message}`,
        msgtype: "m.text",
      };

      await matrixClient.sendEvent(
        roomId,
        "m.room.message",
        content,
        "",
        // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars
        function (err: any, res: any) {
          if (err) {
            console.error(err);
          }
        }
      );
    }
  },
  []);

  const leaveRoom = useCallback(async function (roomId: string) {
    if (matrixClient) {
      await matrixClient.leave(roomId);
      console.log(`Left room ${roomId}`);
    }
  }, []);

  const inviteUser = useCallback(async function (
    roomId: string,
    userId: string
  ) {
    if (matrixClient) {
      await matrixClient.invite(
        roomId,
        toLowerCaseUsername(userId),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars
        function (err: any, data: any) {
          if (err) {
            console.error(err);
          }
        }
      );
      console.log(`Invited user ${userId} to join room ${roomId}`);
    }
  },
  []);

  const joinRoom = useCallback(async function (roomId: string) {
    const opts = {
      syncRoom: true,
    };

    try {
      if (matrixClient) {
        await matrixClient.joinRoom(roomId, opts);
        console.log(`Joined room[${roomId}]`);
      }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (ex: any) {
      console.error(`Error joining room[${roomId}]`, ex.stack);
    }
  }, []);

  return {
    createRoom,
    getIsWalletIdRegistered,
    inviteUser,
    joinRoom,
    leaveRoom,
    loginWithPassword,
    loginWithWallet,
    logout,
    registerNewUser,
    registerWallet,
    sendMessage,
  };
}

async function matrixRegisterUser(
  homeServerUrl: string,
  username: string,
  password: string
): Promise<LoginServerResponse> {
  let error: string | undefined;
  try {
    const newClient = createClient(homeServerUrl);
    const response = await newClient.register(
      username.toLowerCase(),
      password,
      undefined,
      {
        type: "m.login.dummy",
        //type: "m.login.password",
      }
    );
    console.log(`response:`, JSON.stringify(response));
    return {
      accessToken: response.access_token,
      deviceId: response.device_id,
      homeServer: response.home_server,
      userId: response.user_id,
    };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (ex: any) {
    error = ex.message;
    console.error(`Error creating new user:`, ex.stack);
  }

  return {
    accessToken: undefined,
    deviceId: undefined,
    homeServer: undefined,
    userId: undefined,
    error,
  };
}

async function matrixLoginWithPassword(
  homeServerUrl: string,
  username: string,
  password: string
): Promise<LoginServerResponse> {
  let error: string | undefined;
  try {
    const newClient = createClient(homeServerUrl);
    const response = await newClient.loginWithPassword(username, password);
    //console.log(`response:`, JSON.stringify(response));
    return {
      accessToken: response.access_token,
      deviceId: response.device_id,
      homeServer: response.home_server,
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
    homeServer: undefined,
    userId: undefined,
    error,
  };
}
