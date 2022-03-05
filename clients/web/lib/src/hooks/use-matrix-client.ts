import {
  CreateClientOption,
  CreateRoomOptions,
  MatrixClient,
  createClient,
} from "matrix-js-sdk";
import { useCallback, useEffect, useRef } from "react";

import { CreateRoomInfo, Room } from "../types/matrix-types";
import { useMatrixStore } from "../store/store";

const MATRIX_HOMESERVER_URL =
  process.env.MATRIX_HOME_SERVER ?? "http://localhost:8008";

interface LoginResult {
  accessToken: string | undefined;
  userId: string | undefined;
  homeServer: string | undefined;
  deviceId: string | undefined;
  error?: string;
}

export function useMatrixClient() {
  const {
    accessToken,
    homeServer,
    isAuthenticated,
    rooms,
    userId,
    username,
    setAccessToken,
    setDeviceId,
    setHomeServer,
    setIsAuthenticated,
    setRoomName,
    setUserId,
    setUsername,
  } = useMatrixStore();

  const matrixClientRef = useRef<MatrixClient | null>();

  useEffect(
    function () {
      if (isAuthenticated) {
        if (accessToken && homeServer && userId) {
          const options: CreateClientOption = {
            baseUrl: homeServer,
            accessToken: accessToken,
            userId: userId,
          };
          matrixClientRef.current = createClient(options);
        }
      } else {
        matrixClientRef.current = null;
      }
    },
    [accessToken, homeServer, isAuthenticated, userId]
  );

  const createRoom = useCallback(async function (
    createInfo: CreateRoomInfo
  ): Promise<string | undefined> {
    try {
      if (matrixClientRef.current) {
        const options: CreateRoomOptions = {
          //room_alias_name: "my_room_alias3",
          visibility: createInfo.visibility,
          name: createInfo.roomName,
          is_direct: createInfo.isDirectMessage,
        };
        const response = await matrixClientRef.current.createRoom(options);
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

  const logout = useCallback(
    async function (): Promise<void> {
      if (accessToken) {
        await matrixLogout(MATRIX_HOMESERVER_URL, accessToken);
      }
      setIsAuthenticated(false);
    },
    [accessToken, setIsAuthenticated]
  );

  const loginWithPassword = useCallback(
    async function (username: string, password: string): Promise<LoginResult> {
      await logout();
      const response = await matrixLoginWithPassword(
        MATRIX_HOMESERVER_URL,
        username,
        password
      );
      if (response.accessToken) {
        setAccessToken(response.accessToken);
        setDeviceId(response.deviceId);
        setHomeServer(getHomeServerUrl(response.homeServer));
        setUserId(response.userId);
        setUsername(getUserNamePart(response.userId));
        setIsAuthenticated(true);
      }

      return response;
    },
    [
      logout,
      setAccessToken,
      setDeviceId,
      setHomeServer,
      setIsAuthenticated,
      setUserId,
      setUsername,
    ]
  );

  const registerNewUser = useCallback(
    async function (username: string, password: string): Promise<LoginResult> {
      await logout();
      const response = await matrixRegisterUser(
        MATRIX_HOMESERVER_URL,
        username,
        password
      );
      if (response.accessToken) {
        setAccessToken(response.accessToken);
        setDeviceId(response.deviceId);
        setHomeServer(getHomeServerUrl(response.homeServer));
        setUserId(response.userId);
        setUsername(getUserNamePart(response.userId));
        setIsAuthenticated(true);
      }

      return response;
    },
    [
      logout,
      setAccessToken,
      setDeviceId,
      setHomeServer,
      setIsAuthenticated,
      setUserId,
      setUsername,
    ]
  );

  const sendMessage = useCallback(
    async function (roomId: string, message: string) {
      if (matrixClientRef.current) {
        const content = {
          body: `${username}: ${message}`,
          msgtype: "m.text",
        };

        await matrixClientRef.current.sendEvent(
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
    if (matrixClientRef.current) {
      await matrixClientRef.current.leave(roomId);
      console.log(`Left room ${roomId}`);
    }
  }, []);

  const inviteUser = useCallback(async function (
    roomId: string,
    userId: string
  ) {
    if (matrixClientRef.current) {
      await matrixClientRef.current.invite(
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
      if (matrixClientRef.current) {
        await matrixClientRef.current.joinRoom(roomId, opts);
        console.log(`Joined room[${roomId}]`);
      }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (ex: any) {
      console.error(`Error joining room[${roomId}]`, ex.stack);
    }
  }, []);

  const syncRoom = useCallback(async function (roomId: string) {
    try {
      if (matrixClientRef.current) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const roomNameEvent: any = await matrixClientRef.current.getStateEvent(
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
    logout,
    registerNewUser,
    sendMessage,
    syncRoom,
  };
}

function getUserNamePart(userId: string | undefined): string | undefined {
  if (userId) {
    const regexName = /^@(?<name>\w+):/;
    const match = regexName.exec(userId);
    const username = match?.groups?.name ?? undefined;
    return username;
  }

  return undefined;
}

function getHomeServerUrl(homeServer: string | undefined): string | undefined {
  if (homeServer) {
    if (homeServer.startsWith("http://") || homeServer.startsWith("https://")) {
      return homeServer;
    } else {
      return `http://${homeServer}`;
    }
  }

  return undefined;
}

async function matrixRegisterUser(
  homeServerUrl: string,
  username: string,
  password: string
): Promise<LoginResult> {
  let error: string | undefined;
  try {
    const newClient = createClient(homeServerUrl);
    const response = await newClient.register(username, password, undefined, {
      type: "m.login.dummy",
      //type: "m.login.password",
    });
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
): Promise<LoginResult> {
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

async function matrixLogout(
  homeServerUrl: string,
  accessToken: string
): Promise<void> {
  const options: CreateClientOption = {
    baseUrl: homeServerUrl,
    accessToken,
  };
  try {
    const newClient = createClient(options);
    await newClient.logout();
    console.log(`Logged out`);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (ex: any) {
    console.error(`Error logging out:`, ex.stack);
  }
}
