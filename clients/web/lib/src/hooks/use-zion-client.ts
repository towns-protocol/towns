import { useContext, useMemo } from "react";
import { MatrixContext } from "../components/MatrixContextProvider";
import {
  CreateChannelInfo,
  CreateSpaceInfo,
  PowerLevel,
  RoomIdentifier,
  SendMessageOptions,
  SpaceChild,
  ZionContext,
} from "../types/matrix-types";
import { useMatrixWalletSignIn } from "./use-matrix-wallet-sign-in";
import { useSyncSpace } from "./MatrixClient/useSyncSpace";
import { useLogout } from "./MatrixClient/useLogout";
import { useLoginWithPassword } from "./MatrixClient/useLoginWithPassword";
import { useRegisterPasswordUser } from "./MatrixClient/useRegisterPasswordUser";
import { useJoinRoom } from "./MatrixClient/useJoinRoom";

/**
 * Matrix client API to interact with the Matrix server.
 */
interface ZionClientImpl {
  clientRunning: boolean;
  createSpace: (
    createInfo: CreateSpaceInfo,
  ) => Promise<RoomIdentifier | undefined>;
  createChannel: (
    createInfo: CreateChannelInfo,
  ) => Promise<RoomIdentifier | undefined>;
  getIsWalletIdRegistered: () => Promise<boolean>;
  inviteUser: (roomId: RoomIdentifier, userId: string) => Promise<void>;
  joinRoom: (roomId: RoomIdentifier) => Promise<void>;
  leaveRoom: (roomId: RoomIdentifier) => Promise<void>;
  logout: () => Promise<void>;
  loginWithPassword: (username: string, password: string) => Promise<void>;
  loginWithWallet: (statement: string) => Promise<void>;
  registerPasswordUser: (username: string, password: string) => Promise<void>;
  registerWallet: (statement: string) => Promise<void>;
  sendMessage: (
    roomId: RoomIdentifier,
    message: string,
    options?: SendMessageOptions,
  ) => Promise<void>;
  setPowerLevel: (
    roomId: RoomIdentifier,
    current: string | PowerLevel,
    newValue: number,
  ) => Promise<void>;
  setAvatarUrl: (ravatarUrl: string) => Promise<void>;
  setDisplayName: (displayName: string) => Promise<void>;
  syncSpace: (spaceId: RoomIdentifier) => Promise<SpaceChild[]>;
}

export function useZionClient(): ZionClientImpl {
  const { getIsWalletIdRegistered, loginWithWallet, registerWallet } =
    useMatrixWalletSignIn();
  const { client } = useContext<ZionContext>(MatrixContext);

  const withCatch = <T extends Array<any>, U>(
    fn?: (...args: T) => Promise<U | undefined>,
  ) => {
    return (...args: T): Promise<U | undefined> => {
      if (client && fn) {
        try {
          return fn.apply(client, args);
        } catch (ex: any) {
          console.error("Error", ex.stack, ex);
          return Promise.resolve(undefined);
        }
      } else {
        console.error("Not logged in");
        return Promise.resolve(undefined);
      }
    };
  };

  const clientRunning = useMemo(
    () => client?.clientRunning == true,
    [client?.clientRunning],
  );
  const joinRoom = useJoinRoom();
  const loginWithPassword = useLoginWithPassword();
  const logout = useLogout();
  const registerPasswordUser = useRegisterPasswordUser();
  const syncSpace = useSyncSpace();

  return {
    clientRunning,
    createChannel: withCatch(client?.createChannel),
    createSpace: withCatch(client?.createSpace),
    getIsWalletIdRegistered,
    inviteUser: withCatch(client?.inviteUser),
    joinRoom,
    leaveRoom: withCatch(client?.leave),
    loginWithPassword,
    loginWithWallet,
    logout,
    registerPasswordUser,
    registerWallet,
    sendMessage: withCatch(client?.sendMessage),
    setPowerLevel: withCatch(client?.setPowerLevel),
    syncSpace,
    setDisplayName: withCatch(client?.setDisplayName),
    setAvatarUrl: withCatch(client?.setAvatarUrl),
  };
}
