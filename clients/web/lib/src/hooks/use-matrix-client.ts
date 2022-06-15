import { CreateRoomInfo, CreateSpaceInfo } from "../types/matrix-types";
import { ICreateRoomOpts, MatrixClient, createClient } from "matrix-js-sdk";
import { useCallback, useContext } from "react";

import type { IHierarchyRoom } from "matrix-js-sdk/lib/@types/spaces";
import { LoginStatus } from "./login";
import { MatrixContext } from "../components/MatrixContextProvider";
import { RoomHierarchy } from "matrix-js-sdk/lib/room-hierarchy";
import { StatusCodes } from "http-status-codes";
import { getUsernameFromId } from "../types/user-identifier";
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

  const syncSpace = useCallback(
    async function (spaceId: string): Promise<IHierarchyRoom[]> {
      if (!matrixClient) {
        return Promise.resolve([]);
      }
      const room = matrixClient.getRoom(spaceId);
      if (!room) {
        console.log("couldn't find room for spcaceId:", spaceId);
        return Promise.resolve([]);
      }
      const foo = new RoomHierarchy(room);
      return foo.load();
    },
    [matrixClient],
  );

  const createSpace = useCallback(
    async function (
      createSpaceInfo: CreateSpaceInfo,
    ): Promise<string | undefined> {
      try {
        if (matrixClient) {
          const options: ICreateRoomOpts = {
            visibility: createSpaceInfo.visibility,
            name: createSpaceInfo.spaceName,
            is_direct: false,
            creation_content: {
              type: "m.space",
            },
          };
          const response = await matrixClient.createRoom(options);
          console.log("Created space", JSON.stringify(response));
          return response.room_id;
        } else {
          console.error("Not logged in. Cannot create room");
        }
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } catch (ex: any) {
        console.error("Error creating room", ex.stack);
      }
      return undefined;
    },
    [matrixClient],
  );

  const createRoom = useCallback(
    async function (createInfo: CreateRoomInfo): Promise<string | undefined> {
      try {
        if (matrixClient) {
          // initial state
          const options: ICreateRoomOpts = {
            //room_alias_name: "my_room_alias3",
            visibility: createInfo.visibility,
            name: createInfo.roomName,
            is_direct: createInfo.isDirectMessage === true,
          };
          // add our parent room if we have one
          if (createInfo.parentSpaceId) {
            options.initial_state = [
              {
                type: "m.space.parent",
                state_key: createInfo.parentSpaceId,
                content: {
                  canonical: true,
                  via: [homeServer],
                },
              },
            ];
          }
          const response = await matrixClient.createRoom(options);
          console.log("Created room", JSON.stringify(response));
          if (createInfo.parentSpaceId) {
            await matrixClient.sendStateEvent(
              createInfo.parentSpaceId,
              "m.space.child",
              {
                auto_join: false,
                suggested: false,
                via: [homeServer],
              },
              response.room_id,
            );
          }

          return response.room_id;
        } else {
          console.error("Not logged in. Cannot create room");
        }
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } catch (ex: any) {
        console.error("Error creating room", ex.stack);
      }
      return undefined;
    },
    [homeServer, matrixClient],
  );

  const logout = useCallback(
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

  const loginWithPassword = useCallback(
    async function (username: string, password: string): Promise<void> {
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

  const registerPasswordUser = useCallback(
    async function (username: string, password: string): Promise<void> {
      await logout();
      setLoginStatus(LoginStatus.LoggingIn);
      const response = await matrixRegisterUser(
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

  const sendMessage = useCallback(
    async function (roomId: string, message: string) {
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
          },
        );
      }
    },
    [matrixClient],
  );

  const leaveRoom = useCallback(
    async function (roomId: string) {
      if (matrixClient) {
        await matrixClient.leave(roomId);
        console.log(`Left room ${roomId}`);
      }
    },
    [matrixClient],
  );

  const inviteUser = useCallback(
    async function (roomId: string, userId: string) {
      if (matrixClient) {
        await matrixClient.invite(
          roomId,
          userId.toLowerCase(),
          // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars
          function (err: any, data: any) {
            if (err) {
              console.error(err);
            }
          },
        );
        console.log(`Invited user ${userId} to join room ${roomId}`);
      }
    },
    [matrixClient],
  );

  const joinRoom = useCallback(
    async function (roomId: string) {
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
    },
    [matrixClient],
  );

  return {
    createRoom,
    createSpace,
    getIsWalletIdRegistered,
    inviteUser,
    joinRoom,
    leaveRoom,
    loginWithPassword,
    loginWithWallet,
    logout,
    registerPasswordUser,
    registerWallet,
    sendMessage,
    syncSpace,
  };
}

async function matrixRegisterUser(
  homeServerUrl: string,
  username: string,
  password: string,
): Promise<LoginServerResponse> {
  let error: string | undefined;
  try {
    const newClient = createClient(homeServerUrl);
    const sessionId = "";
    const response = await newClient.register(
      username.toLowerCase(),
      password,
      sessionId,
      {
        type: "m.login.dummy",
        //type: "m.login.password",
      },
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
