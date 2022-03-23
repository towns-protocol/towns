import {
  CreateRoomOptions,
  MatrixClient,
  createClient,
  request,
} from "matrix-js-sdk";
import { LogInStatus, LogInCompletedResponse, getUsernamePart } from "./login";
import { useCallback, useContext } from "react";

import { CreateRoomInfo } from "../types/matrix-types";
import { MatrixContext } from "../components/MatrixContextProvider";
import { useCredentialStore } from "../store/use-credential-store";
import { useMatrixStore } from "../store/use-matrix-store";
import { useMatrixWalletSignIn } from "./use-matrix-wallet-sign-in";

interface LogInServerResponse {
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
    setLogInStatus,
    setRoomName,
    setUserId,
    setUsername,
  } = useMatrixStore();

  const { setAccessToken } = useCredentialStore();

  const matrixClient = useContext<MatrixClient | undefined>(MatrixContext);

  const { loginWithWallet } = useMatrixWalletSignIn();

  const createRoom = useCallback(async function (
    createInfo: CreateRoomInfo
  ): Promise<string | undefined> {
    try {
      if (matrixClient) {
        const options: CreateRoomOptions = {
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
  []);

  const logout = useCallback(async function (): Promise<void> {
    setLogInStatus(LogInStatus.LoggingOut);
    if (matrixClient) {
      try {
        await matrixClient.logout();
        console.log(`Logged out`);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } catch (ex: any) {
        console.error(`Error logging out:`, ex.stack);
      }
    }
    setLogInStatus(LogInStatus.LoggedOut);
    setAccessToken("");
  }, []);

  const loginWithPassword = useCallback(
    async function (
      username: string,
      password: string
    ): Promise<LogInCompletedResponse> {
      await logout();
      setLogInStatus(LogInStatus.LoggingIn);
      const response = await matrixLoginWithPassword(
        homeServer,
        username,
        password
      );
      if (response.accessToken) {
        setAccessToken(response.accessToken);
        setDeviceId(response.deviceId);
        setUserId(response.userId);
        setUsername(getUsernamePart(response.userId));
        setLogInStatus(LogInStatus.LoggedIn);
      } else {
        setLogInStatus(LogInStatus.LoggedOut);
      }

      const isAuthenticated = response.accessToken ? true : false;
      return {
        isAuthenticated,
        error: response.error,
      };
    },
    [homeServer]
  );

  const registerNewUser = useCallback(
    async function (
      username: string,
      password: string
    ): Promise<LogInCompletedResponse> {
      await logout();
      setLogInStatus(LogInStatus.LoggingIn);
      const response = await matrixRegisterUser(homeServer, username, password);
      if (response.accessToken) {
        setAccessToken(response.accessToken);
        setDeviceId(response.deviceId);
        setUserId(response.userId);
        setUsername(getUsernamePart(response.userId));
        setLogInStatus(LogInStatus.LoggedIn);
      }

      const isAuthenticated = response.accessToken ? true : false;
      return {
        isAuthenticated,
        error: response.error,
      };
    },
    [homeServer]
  );

  const sendMessage = useCallback(
    async function (roomId: string, message: string) {
      if (matrixClient) {
        const content = {
          body: `${username}: ${message}`,
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
    [username]
  );

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
        userId,
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

  const syncRoom = useCallback(async function (roomId: string) {
    try {
      if (matrixClient) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const roomNameEvent: any = await matrixClient.getStateEvent(
          roomId,
          "m.room.name"
        );

        if (roomNameEvent?.name) {
          setRoomName(roomId, roomNameEvent.name);
        } else {
          console.log(`Querying "m.room.name" got nothing`);
        }
      }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (ex: any) {
      console.error(`Error syncing room ${roomId}`, ex.stack);
    }
  }, []);

  return {
    createRoom,
    inviteUser,
    joinRoom,
    leaveRoom,
    loginWithPassword,
    loginWithWallet,
    logout,
    registerNewUser,
    sendMessage,
    syncRoom,
  };
}

async function matrixRegisterUser(
  homeServerUrl: string,
  username: string,
  password: string
): Promise<LogInServerResponse> {
  let error: string | undefined;
  try {
    const newClient = createClient(homeServerUrl);
    const response = await newClient.register(username, password, undefined, {
      type: "m.login.dummy",
      //type: "m.login.password",
    });
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
): Promise<LogInServerResponse> {
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
